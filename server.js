require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for Express APIs
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────
// DATABASE INITIALIZATION
// ─────────────────────────────────────────────────────────────
async function initDb() {
    try {
        // 1. Patients Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patients (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) UNIQUE NOT NULL,
                age INT,
                gender VARCHAR(50),
                address TEXT,
                medical_history TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Appointments Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                date VARCHAR(255) NOT NULL,
                time VARCHAR(255) NOT NULL,
                reason TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                meeting_status VARCHAR(50) DEFAULT 'PENDING',
                video_room VARCHAR(255),
                patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL,
                patient_account_id VARCHAR(255)
            );
        `);
        await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
        await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL;`);
        await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_status VARCHAR(50) DEFAULT 'PENDING';`);
        await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_room VARCHAR(255);`);
        await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_account_id VARCHAR(255);`);

        // 3. Doctors Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS doctors (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);

        // 4. Patient Accounts Table (NEW)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patient_accounts (
                id VARCHAR(255) PRIMARY KEY,
                patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                email_verified BOOLEAN DEFAULT false,
                status VARCHAR(50) DEFAULT 'active'
            );
        `);
        // Migrations/Alters for patient_accounts schema differences
        await pool.query(`ALTER TABLE patient_accounts ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`);
        await pool.query(`ALTER TABLE patient_accounts ALTER COLUMN phone DROP NOT NULL;`);
        await pool.query(`ALTER TABLE patient_accounts DROP CONSTRAINT IF EXISTS patient_accounts_phone_key;`);
        await pool.query(`ALTER TABLE patient_accounts DROP CONSTRAINT IF EXISTS patient_accounts_phone_not_null;`);
        await pool.query(`ALTER TABLE patient_accounts DROP CONSTRAINT IF EXISTS patient_accounts_patient_id_key;`);

        // 5. Clinical Notes Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clinical_notes (
                id VARCHAR(255) PRIMARY KEY,
                appointment_id VARCHAR(255) UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
                subjective TEXT,
                objective TEXT,
                assessment TEXT,
                plan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 6. Followups Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS followups (
                followup_id VARCHAR(255) PRIMARY KEY,
                patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE CASCADE,
                consultation_id VARCHAR(255) REFERENCES appointments(id) ON DELETE CASCADE,
                last_visit_date VARCHAR(255) NOT NULL,
                followup_date VARCHAR(255) NOT NULL,
                current_stage VARCHAR(50),
                message TEXT,
                message_status VARCHAR(50) DEFAULT 'Pending',
                doctor_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 7. Followup Reminders Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS followup_reminders (
                reminder_id VARCHAR(255) PRIMARY KEY,
                followup_id VARCHAR(255) REFERENCES followups(followup_id) ON DELETE CASCADE,
                reminder_date VARCHAR(255) NOT NULL,
                stage VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending'
            );
        `);

        // 8. Documents Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                size VARCHAR(50) NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                file_data TEXT
            );
        `);

        // 9. Notifications Table (doctor-facing)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'Unread',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 10. Patient Notifications Table (patient-facing)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patient_notifications (
                id VARCHAR(255) PRIMARY KEY,
                patient_account_id VARCHAR(255) NOT NULL REFERENCES patient_accounts(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                status VARCHAR(50) DEFAULT 'Unread',
                appointment_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Register default doctor
        const doctorEmail = 'drvarshabandi@gmail.com';
        const checkDoctor = await pool.query('SELECT * FROM doctors WHERE email = $1;', [doctorEmail]);
        if (checkDoctor.rows.length === 0) {
            const defaultId = 'doc_varsha';
            const hashedPassword = await bcrypt.hash('drvarsha@07', 10);
            await pool.query(`
                INSERT INTO doctors (id, name, email, password)
                VALUES ($1, 'Dr. Varsha Bandi', $2, $3);
            `, [defaultId, doctorEmail, hashedPassword]);
        }

        // Migrate existing appointments to patients table automatically
        const existingAppts = await pool.query('SELECT * FROM appointments;');
        for (const appt of existingAppts.rows) {
            let patientPhone = appt.phone || 'no_phone_' + appt.id;
            const checkPat = await pool.query('SELECT * FROM patients WHERE phone = $1 OR name = $2;', [patientPhone, appt.name]);
            let patientId;
            if (checkPat.rows.length === 0) {
                patientId = 'pat_' + appt.id;
                await pool.query(`
                    INSERT INTO patients (id, name, phone, created_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT DO NOTHING;
                `, [patientId, appt.name, patientPhone]);
            } else {
                patientId = checkPat.rows[0].id;
            }
            await pool.query('UPDATE appointments SET patient_id = $1 WHERE id = $2 AND patient_id IS NULL;', [patientId, appt.id]);
        }

        console.log('✅ Database and EMR schemas verified successfully.');
    } catch (err) {
        console.error('❌ Error initializing database tables:', err);
    }
}
initDb();

// ─────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────
function offsetDateString(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

function generateStageMessage(patientName, followupDate, stage) {
    const messages = {
        DAY_MINUS_3: `Dear ${patientName}, your follow-up consultation is scheduled for ${followupDate} (3 days from now). Please prepare any recent reports or questions for the doctor.`,
        DAY_MINUS_2: `Dear ${patientName}, reminder: your follow-up consultation is on ${followupDate} (day after tomorrow). Please ensure you are available.`,
        DAY_MINUS_1: `Dear ${patientName}, your follow-up consultation is tomorrow, ${followupDate}. Please be ready for the session.`,
        DAY_0: `Dear ${patientName}, today is your follow-up consultation day (${followupDate}). Please join as scheduled. Wishing you good health.`
    };
    return messages[stage] || `Follow-up reminder for ${patientName} on ${followupDate}.`;
}

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE — Doctor JWT Authentication
// ─────────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: "Access denied." });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: "Session expired." });
        req.user = user;
        next();
    });
}

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE — Patient JWT Authentication
// ─────────────────────────────────────────────────────────────
function authenticatePatientToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: "Patient access denied." });
    jwt.verify(token, process.env.JWT_SECRET, (err, patient) => {
        if (err) return res.status(403).json({ success: false, error: "Patient session expired." });
        if (!patient.patientAccountId) return res.status(403).json({ success: false, error: "Invalid patient token." });
        req.patient = patient;
        next();
    });
}

// ─────────────────────────────────────────────────────────────
// SOCKET.IO — Real-Time Event Hub
// ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Doctor confirms appointment and creates meeting room
    // FIX: Server now handles this event, saves to DB, and broadcasts to all clients
    socket.on('confirm_and_share_link', async ({ appointmentId, roomName }) => {
        try {
            await pool.query(`
                UPDATE appointments
                SET status = 'Confirmed', meeting_status = 'READY', video_room = $1
                WHERE id = $2;
            `, [roomName, appointmentId]);

            const apptResult = await pool.query('SELECT * FROM appointments WHERE id = $1;', [appointmentId]);
            const appt = apptResult.rows[0];

            if (appt && appt.patient_account_id) {
                // Create patient notification
                const notifId = 'pnotif_' + Date.now();
                await pool.query(`
                    INSERT INTO patient_notifications (id, patient_account_id, title, message, type, appointment_id)
                    VALUES ($1, $2, $3, $4, 'meeting_ready', $5);
                `, [
                    notifId,
                    appt.patient_account_id,
                    'Doctor is Ready',
                    `Dr. Varsha Bandi is ready for your consultation. Click "Join Consultation" to start.`,
                    appointmentId
                ]);
            }

            // Broadcast updated appointment to ALL connected clients (doctor + patient dashboards)
            io.emit('appointment_updated', {
                id: appointmentId,
                status: 'Confirmed',
                meeting_status: 'READY',
                videoRoom: roomName,
                video_room: roomName,
                patient_account_id: appt ? appt.patient_account_id : null
            });

            console.log(`[Socket] Meeting READY emitted for appointment: ${appointmentId}`);
        } catch (err) {
            console.error('[Socket] confirm_and_share_link error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// ─────────────────────────────────────────────────────────────
// DOCTOR AUTH APIS
// ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM doctors WHERE email = $1;', [email]);
        const doctor = result.rows[0];
        if (!doctor) return res.status(400).json({ success: false, error: "Invalid credentials" });
        const isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) return res.status(400).json({ success: false, error: "Invalid credentials" });
        const token = jwt.sign({ id: doctor.id, email: doctor.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, doctorName: doctor.name });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server authentication error" });
    }
});

// ─────────────────────────────────────────────────────────────
// PATIENT AUTH APIS
// ─────────────────────────────────────────────────────────────

// Register
app.post('/api/patient/register', async (req, res) => {
    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({ success: false, error: "Full name, email, and password are required." });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }

    try {
        const existing = await pool.query('SELECT id FROM patient_accounts WHERE email = $1;', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: "An account with this email already exists." });
        }

        if (phone) {
            const existingPhone = await pool.query('SELECT id FROM patient_accounts WHERE phone = $1;', [phone]);
            if (existingPhone.rows.length > 0) {
                return res.status(400).json({ success: false, error: "An account with this phone number already exists." });
            }
        }

        const accountId = 'pacct_' + Date.now();
        const passwordHash = await bcrypt.hash(password, 10);

        // Also create a patient profile record
        const patientPhone = phone || 'no_phone_' + accountId;
        let patientId;
        const existingPatient = await pool.query('SELECT id FROM patients WHERE phone = $1;', [patientPhone]);
        if (existingPatient.rows.length > 0) {
            patientId = existingPatient.rows[0].id;
        } else {
            patientId = 'pat_' + Date.now();
            await pool.query(`
                INSERT INTO patients (id, name, phone, created_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT DO NOTHING;
            `, [patientId, full_name, patientPhone]);
        }

        await pool.query(`
            INSERT INTO patient_accounts (id, patient_id, email, phone, password_hash, full_name)
            VALUES ($1, $2, $3, $4, $5, $6);
        `, [accountId, patientId, email, phone || null, passwordHash, full_name]);

        const token = jwt.sign(
            { patientAccountId: accountId, email, full_name, patientId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ success: true, token, full_name, email, patientAccountId: accountId });
    } catch (err) {
        console.error('Patient register error:', err);
        if (err.code === '23505') {
            if (err.detail && err.detail.includes('email')) {
                return res.status(400).json({ success: false, error: "An account with this email already exists." });
            }
            if (err.detail && err.detail.includes('phone')) {
                return res.status(400).json({ success: false, error: "An account with this phone number already exists." });
            }
            if (err.detail && err.detail.includes('patient_id')) {
                return res.status(400).json({ success: false, error: "This patient profile is already registered." });
            }
        }
        res.status(500).json({ success: false, error: "Registration failed. Please try again." });
    }
});

// Login
app.post('/api/patient/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email and password are required." });
    }
    try {
        const result = await pool.query('SELECT * FROM patient_accounts WHERE email = $1;', [email]);
        const account = result.rows[0];
        if (!account) return res.status(400).json({ success: false, error: "Invalid email or password." });

        const isMatch = await bcrypt.compare(password, account.password_hash);
        if (!isMatch) return res.status(400).json({ success: false, error: "Invalid email or password." });

        if (account.status !== 'active') {
            return res.status(403).json({ success: false, error: "Your account has been suspended." });
        }

        await pool.query('UPDATE patient_accounts SET last_login = NOW() WHERE id = $1;', [account.id]);

        const token = jwt.sign(
            { patientAccountId: account.id, email: account.email, full_name: account.full_name, patientId: account.patient_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ success: true, token, full_name: account.full_name, email: account.email, patientAccountId: account.id });
    } catch (err) {
        console.error('Patient login error:', err);
        res.status(500).json({ success: false, error: "Login failed. Please try again." });
    }
});

// Forgot Password (stub — logs reset token)
app.post('/api/patient/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query('SELECT id, full_name FROM patient_accounts WHERE email = $1;', [email]);
        if (result.rows.length === 0) {
            // Return success anyway to prevent email enumeration
            return res.json({ success: true, message: "If this email exists, a reset link has been sent." });
        }
        // In production: send email with reset link
        // For now, log the reset token
        const resetToken = jwt.sign({ email, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log(`[Password Reset] Token for ${email}: ${resetToken}`);
        res.json({ success: true, message: "If this email exists, a reset link has been sent." });
    } catch (err) {
        res.status(500).json({ success: false, error: "Request failed." });
    }
});

// Get patient profile
app.get('/api/patient/profile', authenticatePatientToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT pa.id, pa.email, pa.phone, pa.full_name, pa.created_at, pa.last_login,
                   p.age, p.gender, p.address, p.medical_history, p.notes
            FROM patient_accounts pa
            LEFT JOIN patients p ON pa.patient_id = p.id
            WHERE pa.id = $1;
        `, [req.patient.patientAccountId]);

        if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Profile not found." });
        res.json({ success: true, profile: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to load profile." });
    }
});

// Update patient profile
app.put('/api/patient/profile', authenticatePatientToken, async (req, res) => {
    const { phone, age, gender, address, medical_history, notes } = req.body;
    try {
        await pool.query('UPDATE patient_accounts SET phone = $1, updated_at = NOW() WHERE id = $2;', [phone, req.patient.patientAccountId]);

        const acct = await pool.query('SELECT patient_id FROM patient_accounts WHERE id = $1;', [req.patient.patientAccountId]);
        if (acct.rows[0] && acct.rows[0].patient_id) {
            await pool.query(`
                UPDATE patients SET age = $1, gender = $2, address = $3, medical_history = $4, notes = $5
                WHERE id = $6;
            `, [age || null, gender || null, address || null, medical_history || null, notes || null, acct.rows[0].patient_id]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: "Profile update failed." });
    }
});

// ─────────────────────────────────────────────────────────────
// PATIENT APPOINTMENT APIS
// ─────────────────────────────────────────────────────────────

// Get all appointments for logged-in patient
app.get('/api/patient/appointments', authenticatePatientToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, cn.subjective, cn.objective, cn.assessment, cn.plan,
                   f.followup_date, f.doctor_notes as followup_notes
            FROM appointments a
            LEFT JOIN clinical_notes cn ON a.id = cn.appointment_id
            LEFT JOIN followups f ON a.id = f.consultation_id
            WHERE a.patient_account_id = $1
            ORDER BY a.date DESC, a.time DESC;
        `, [req.patient.patientAccountId]);

        res.json({ success: true, appointments: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to load appointments." });
    }
});

// Get single appointment for patient
app.get('/api/patient/appointments/:id', authenticatePatientToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, cn.subjective, cn.objective, cn.assessment, cn.plan,
                   f.followup_date, f.doctor_notes as followup_notes
            FROM appointments a
            LEFT JOIN clinical_notes cn ON a.id = cn.appointment_id
            LEFT JOIN followups f ON a.id = f.consultation_id
            WHERE a.id = $1 AND a.patient_account_id = $2;
        `, [req.params.id, req.patient.patientAccountId]);

        if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Appointment not found." });
        res.json({ success: true, appointment: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to load appointment." });
    }
});

// Get patient notifications
app.get('/api/patient/notifications', authenticatePatientToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM patient_notifications
            WHERE patient_account_id = $1
            ORDER BY created_at DESC LIMIT 50;
        `, [req.patient.patientAccountId]);

        const unread = result.rows.filter(n => n.status === 'Unread').length;
        res.json({ success: true, notifications: result.rows, unreadCount: unread });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to load notifications." });
    }
});

// Mark patient notifications as read
app.post('/api/patient/notifications/mark-read', authenticatePatientToken, async (req, res) => {
    try {
        await pool.query(`UPDATE patient_notifications SET status = 'Read' WHERE patient_account_id = $1;`, [req.patient.patientAccountId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to mark notifications." });
    }
});

// ─────────────────────────────────────────────────────────────
// MEETING LIFECYCLE APIS
// ─────────────────────────────────────────────────────────────

// Start meeting (Doctor triggers — saves room, sets status = READY, notifies patient)
app.post('/api/meeting/start', authenticateToken, async (req, res) => {
    const { appointmentId, roomName } = req.body;
    try {
        await pool.query(`
            UPDATE appointments
            SET status = 'Confirmed', meeting_status = 'READY', video_room = $1
            WHERE id = $2;
        `, [roomName, appointmentId]);

        const apptResult = await pool.query('SELECT * FROM appointments WHERE id = $1;', [appointmentId]);
        const appt = apptResult.rows[0];

        if (appt && appt.patient_account_id) {
            const notifId = 'pnotif_' + Date.now();
            await pool.query(`
                INSERT INTO patient_notifications (id, patient_account_id, title, message, type, appointment_id)
                VALUES ($1, $2, $3, $4, 'meeting_ready', $5);
            `, [
                notifId,
                appt.patient_account_id,
                'Doctor is Ready for Your Consultation',
                `Dr. Varsha Bandi has confirmed your appointment and is ready. Click "Join Consultation" to start your session.`,
                appointmentId
            ]);
        }

        // Broadcast to all connected clients
        io.emit('appointment_updated', {
            id: appointmentId,
            status: 'Confirmed',
            meeting_status: 'READY',
            videoRoom: roomName,
            video_room: roomName,
            patient_account_id: appt ? appt.patient_account_id : null
        });

        res.json({ success: true, roomName });
    } catch (err) {
        console.error('Meeting start error:', err);
        res.status(500).json({ success: false, error: "Failed to start meeting." });
    }
});

// Get meeting info for a patient (validates they own this appointment)
app.get('/api/meeting/:appointmentId', authenticatePatientToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, meeting_status, video_room, status, date, time, name, reason
            FROM appointments WHERE id = $1 AND patient_account_id = $2;
        `, [req.params.appointmentId, req.patient.patientAccountId]);

        if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Meeting not found." });
        res.json({ success: true, meeting: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to load meeting." });
    }
});

// End meeting (Doctor triggers)
app.post('/api/meeting/end', authenticateToken, async (req, res) => {
    const { appointmentId } = req.body;
    try {
        await pool.query(`UPDATE appointments SET meeting_status = 'ENDED' WHERE id = $1;`, [appointmentId]);

        const apptResult = await pool.query('SELECT * FROM appointments WHERE id = $1;', [appointmentId]);
        const appt = apptResult.rows[0];

        if (appt && appt.patient_account_id) {
            const notifId = 'pnotif_end_' + Date.now();
            await pool.query(`
                INSERT INTO patient_notifications (id, patient_account_id, title, message, type, appointment_id)
                VALUES ($1, $2, $3, $4, 'consultation_ended', $5);
            `, [
                notifId,
                appt.patient_account_id,
                'Consultation Completed',
                `Your consultation with Dr. Varsha Bandi has ended. Your prescription and SOAP notes will be available in your portal shortly.`,
                appointmentId
            ]);
        }

        io.emit('appointment_updated', {
            id: appointmentId,
            meeting_status: 'ENDED',
            patient_account_id: appt ? appt.patient_account_id : null
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to end meeting." });
    }
});

// ─────────────────────────────────────────────────────────────
// PUBLIC BOOKING API (now supports optional patient account link)
// ─────────────────────────────────────────────────────────────
app.post('/api/appointments', async (req, res) => {
    let { name, email, phone, date, time, reason, patient_account_id } = req.body;
    const appointmentId = Date.now().toString();

    if (!phone || phone.trim() === "") {
        phone = 'no_phone_' + appointmentId;
    }

    try {
        let patientResult = await pool.query('SELECT id FROM patients WHERE phone = $1;', [phone]);
        let patientId;
        if (patientResult.rows.length === 0) {
            patientId = 'pat_' + Date.now();
            await pool.query(`
                INSERT INTO patients (id, name, phone, created_at)
                VALUES ($1, $2, $3, NOW());
            `, [patientId, name, phone]);
        } else {
            patientId = patientResult.rows[0].id;
        }

        // If patient_account_id provided, verify it exists
        let verifiedAccountId = null;
        if (patient_account_id) {
            const acctCheck = await pool.query('SELECT id FROM patient_accounts WHERE id = $1;', [patient_account_id]);
            if (acctCheck.rows.length > 0) {
                verifiedAccountId = patient_account_id;
            }
        }

        const query = `
            INSERT INTO appointments (id, name, email, phone, date, time, reason, status, meeting_status, patient_id, patient_account_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', 'PENDING', $8, $9)
            RETURNING *;
        `;
        const result = await pool.query(query, [appointmentId, name, email, phone, date, time, reason, patientId, verifiedAccountId]);

        const notificationId = 'notif_' + Date.now();
        await pool.query(`
            INSERT INTO notifications (id, title, message, status, created_at)
            VALUES ($1, $2, $3, 'Unread', NOW());
        `, [notificationId, 'New Appointment Booking', `Patient ${name} booked an appointment for ${date} at ${time}.`]);

        io.emit('new_booking_notification', { appointment: result.rows[0], notificationId });
        res.status(201).json({ success: true, appointment: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// ─────────────────────────────────────────────────────────────
// DOCTOR — APPOINTMENT MANAGEMENT APIS
// ─────────────────────────────────────────────────────────────
app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM appointments ORDER BY date ASC, time ASC;');
        res.json(result.rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            date: row.date,
            time: row.time,
            reason: row.reason,
            status: row.status,
            meeting_status: row.meeting_status || 'PENDING',
            videoRoom: row.video_room,
            patientId: row.patient_id,
            patient_account_id: row.patient_account_id
        })));
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Update appointment status (cancel / reschedule)
app.put('/api/appointments/:id/status', authenticateToken, async (req, res) => {
    const { status, meeting_status, date, time } = req.body;
    try {
        let query = 'UPDATE appointments SET status = $1';
        const params = [status];
        let paramCount = 1;

        if (meeting_status) {
            paramCount++;
            query += `, meeting_status = $${paramCount}`;
            params.push(meeting_status);
        }
        if (date) {
            paramCount++;
            query += `, date = $${paramCount}`;
            params.push(date);
        }
        if (time) {
            paramCount++;
            query += `, time = $${paramCount}`;
            params.push(time);
        }

        paramCount++;
        query += ` WHERE id = $${paramCount} RETURNING *;`;
        params.push(req.params.id);

        const result = await pool.query(query, params);
        const appt = result.rows[0];

        // Notify patient if cancelled
        if (status === 'Cancelled' && appt && appt.patient_account_id) {
            const notifId = 'pnotif_cancel_' + Date.now();
            await pool.query(`
                INSERT INTO patient_notifications (id, patient_account_id, title, message, type, appointment_id)
                VALUES ($1, $2, $3, $4, 'cancelled', $5);
            `, [notifId, appt.patient_account_id, 'Appointment Cancelled', `Your appointment on ${appt.date} at ${appt.time} has been cancelled. Please book a new slot.`, appt.id]);
        }

        // Notify patient if rescheduled
        if ((date || time) && appt && appt.patient_account_id) {
            const notifId = 'pnotif_reschedule_' + Date.now();
            await pool.query(`
                INSERT INTO patient_notifications (id, patient_account_id, title, message, type, appointment_id)
                VALUES ($1, $2, $3, $4, 'rescheduled', $5);
            `, [notifId, appt.patient_account_id, 'Appointment Rescheduled', `Your appointment has been rescheduled to ${appt.date} at ${appt.time}.`, appt.id]);
        }

        io.emit('appointment_updated', { id: req.params.id, status, meeting_status, date: appt.date, time: appt.time });
        res.json({ success: true, appointment: appt });
    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ success: false, error: "Failed to update status." });
    }
});

// ─────────────────────────────────────────────────────────────
// PATIENTS MANAGEMENT APIS
// ─────────────────────────────────────────────────────────────
app.get('/api/patients', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT
                p.id, p.name, p.phone, p.age, p.gender, p.address, p.medical_history, p.notes, p.created_at,
                MAX(a.date) as last_visit_date,
                COUNT(a.id) as total_visits
            FROM patients p
            LEFT JOIN appointments a ON p.id = a.patient_id
            GROUP BY p.id
            ORDER BY p.name ASC;
        `;
        const result = await pool.query(query);
        res.json({ success: true, patients: result.rows });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
    const { name, phone, age, gender, address, medical_history, notes } = req.body;
    const id = 'pat_' + Date.now();
    try {
        const query = `
            INSERT INTO patients (id, name, phone, age, gender, address, medical_history, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const result = await pool.query(query, [id, name, phone, age || null, gender || null, address || null, medical_history || null, notes || null]);
        res.json({ success: true, patient: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ success: false, error: "A patient with this phone number already exists." });
        } else {
            res.status(500).json({ success: false, error: "Database error creating patient." });
        }
    }
});

app.get('/api/patients/:id/timeline', authenticateToken, async (req, res) => {
    try {
        const patientResult = await pool.query('SELECT * FROM patients WHERE id = $1;', [req.params.id]);
        if (patientResult.rows.length === 0) return res.status(404).json({ success: false, error: "Patient not found." });

        const timelineQuery = `
            SELECT
                a.id as appointment_id,
                a.date,
                a.time,
                a.reason,
                a.status,
                a.meeting_status,
                cn.subjective,
                cn.objective,
                cn.assessment,
                cn.plan,
                f.followup_date,
                f.doctor_notes as followup_summary
            FROM appointments a
            LEFT JOIN clinical_notes cn ON a.id = cn.appointment_id
            LEFT JOIN followups f ON a.id = f.consultation_id
            WHERE a.patient_id = $1
            ORDER BY a.date DESC, a.time DESC;
        `;
        const timelineResult = await pool.query(timelineQuery, [req.params.id]);

        res.json({
            success: true,
            patient: patientResult.rows[0],
            visits: timelineResult.rows
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ─────────────────────────────────────────────────────────────
// DOCUMENTS APIS
// ─────────────────────────────────────────────────────────────
app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, category, size, uploaded_at FROM documents ORDER BY uploaded_at DESC;');
        res.json({ success: true, documents: result.rows });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
    const { name, category, size, file_data } = req.body;
    const id = 'doc_' + Date.now();
    try {
        const query = `
            INSERT INTO documents (id, name, category, size, file_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, category, size, uploaded_at;
        `;
        const result = await pool.query(query, [id, name, category, size, file_data]);
        res.json({ success: true, document: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/documents/:id/preview', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT name, category, file_data FROM documents WHERE id = $1;', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: "File not found." });
        res.json({ success: true, file: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.put('/api/documents/:id', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('UPDATE documents SET name = $1 WHERE id = $2;', [name, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM documents WHERE id = $1;', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS APIS (Doctor-facing)
// ─────────────────────────────────────────────────────────────
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50;');
        const unreadResult = await pool.query("SELECT COUNT(id) FROM notifications WHERE status = 'Unread';");
        res.json({ success: true, notifications: result.rows, unreadCount: parseInt(unreadResult.rows[0].count) });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET status = 'Read' WHERE status = 'Unread';");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ─────────────────────────────────────────────────────────────
// CLINICAL NOTES APIS
// ─────────────────────────────────────────────────────────────
app.post('/api/notes', authenticateToken, async (req, res) => {
    const { appointmentId, subjective, objective, assessment, plan } = req.body;
    const noteId = 'note_' + Date.now();
    try {
        const query = `
            INSERT INTO clinical_notes (id, appointment_id, subjective, objective, assessment, plan)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (appointment_id)
            DO UPDATE SET subjective = EXCLUDED.subjective, objective = EXCLUDED.objective, assessment = EXCLUDED.assessment, plan = EXCLUDED.plan
            RETURNING *;
        `;
        const result = await pool.query(query, [noteId, appointmentId, subjective, objective, assessment, plan]);

        // Notify patient that prescription/notes are available
        const apptResult = await pool.query('SELECT patient_account_id FROM appointments WHERE id = $1;', [appointmentId]);
        if (apptResult.rows[0] && apptResult.rows[0].patient_account_id) {
            const notifId = 'pnotif_notes_' + Date.now();
            await pool.query(`
                INSERT INTO patient_notifications (id, patient_account_id, title, message, type, appointment_id)
                VALUES ($1, $2, $3, $4, 'prescription', $5)
                ON CONFLICT DO NOTHING;
            `, [notifId, apptResult.rows[0].patient_account_id, 'Prescription Available', 'Your consultation notes and prescription have been updated. View them in your portal.', appointmentId]);

            io.emit('appointment_updated', {
                id: appointmentId,
                type: 'notes_saved',
                patient_account_id: apptResult.rows[0].patient_account_id
            });
        }

        res.json({ success: true, note: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/notes/:appointmentId', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clinical_notes WHERE appointment_id = $1;', [req.params.appointmentId]);
        res.json({ success: true, note: result.rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ─────────────────────────────────────────────────────────────
// FOLLOWUPS APIS
// ─────────────────────────────────────────────────────────────
app.post('/api/followups', authenticateToken, async (req, res) => {
    const { consultationId, patientId, lastVisitDate, followupDate, doctorNotes, disabled } = req.body;
    try {
        if (disabled) {
            await pool.query('DELETE FROM followups WHERE consultation_id = $1;', [consultationId]);
            return res.json({ success: true });
        }
        const followupId = 'fup_' + Date.now();
        await pool.query('DELETE FROM followups WHERE consultation_id = $1;', [consultationId]);

        const insertFup = `
            INSERT INTO followups (followup_id, patient_id, consultation_id, last_visit_date, followup_date, doctor_notes, message_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
            RETURNING *;
        `;
        const fupResult = await pool.query(insertFup, [followupId, patientId, consultationId, lastVisitDate, followupDate, doctorNotes]);

        const reminders = [
            { stage: 'DAY_MINUS_3', offset: -3 },
            { stage: 'DAY_MINUS_2', offset: -2 },
            { stage: 'DAY_MINUS_1', offset: -1 },
            { stage: 'DAY_0', offset: 0 }
        ];
        for (const rem of reminders) {
            const remDate = offsetDateString(followupDate, rem.offset);
            const remId = `rem_${rem.stage}_${Date.now()}`;
            await pool.query(`
                INSERT INTO followup_reminders (reminder_id, followup_id, reminder_date, stage, status)
                VALUES ($1, $2, $3, $4, 'Pending');
            `, [remId, followupId, remDate, rem.stage]);
        }

        // Notify patient about follow-up
        const apptResult = await pool.query('SELECT patient_account_id FROM appointments WHERE id = $1;', [consultationId]);
        if (apptResult.rows[0] && apptResult.rows[0].patient_account_id) {
            const notifId = 'pnotif_fup_' + Date.now();
            await pool.query(`
                INSERT INTO patient_notifications (id, patient_account_id, title, message, type, appointment_id)
                VALUES ($1, $2, $3, $4, 'followup', $5);
            `, [notifId, apptResult.rows[0].patient_account_id, 'Follow-up Scheduled', `Your follow-up appointment has been scheduled for ${followupDate}. We will remind you closer to the date.`, consultationId]);
        }

        res.json({ success: true, followup: fupResult.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/followups/:appointmentId', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM followups WHERE consultation_id = $1;', [req.params.appointmentId]);
        res.json({ success: true, followup: result.rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/dashboard/all-reminders', authenticateToken, async (req, res) => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
        const query = `
            SELECT
                a.name as patient_name,
                a.phone as contact_number,
                f.last_visit_date,
                f.followup_date,
                f.doctor_notes as summary,
                f.followup_id,
                r.stage,
                r.reminder_id,
                r.status as reminder_status
            FROM followup_reminders r
            JOIN followups f ON r.followup_id = f.followup_id
            JOIN appointments a ON f.patient_id = a.id
            WHERE r.reminder_date = $1;
        `;
        const result = await pool.query(query, [todayStr]);
        const mappedList = result.rows.map(row => ({
            ...row,
            prepared_message: generateStageMessage(row.patient_name, row.followup_date, row.stage)
        }));
        res.json({ success: true, followupsToday: mappedList });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/reminders/mark-prepared', authenticateToken, async (req, res) => {
    const { reminderId } = req.body;
    try {
        await pool.query("UPDATE followup_reminders SET status = 'Message Prepared' WHERE reminder_id = $1;", [reminderId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ─────────────────────────────────────────────────────────────
// SERVER START
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});