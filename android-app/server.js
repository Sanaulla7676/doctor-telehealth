require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for Express APIs and Sockets
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

let pool;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    console.log("No DATABASE_URL provided. Initializing local JSON fallback database...");
    const { JSONPool } = require('./db_fallback');
    pool = new JSONPool();
}

app.use(express.json({ limit: '50mb' }));

// Support downloading the Android APK directly
app.get(['/app-debug.apk', '/download'], (req, res) => {
    let apkPath = path.join(__dirname, 'app-debug.apk');
    if (!fs.existsSync(apkPath)) {
        apkPath = path.join(__dirname, '.build-outputs', 'app-debug.apk');
    }
    
    if (!fs.existsSync(apkPath)) {
        return res.status(404).send('Error: APK file not found on server. Please rebuild the Android app.');
    }

    const stat = fs.statSync(apkPath);
    res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="app-debug.apk"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    const readStream = fs.createReadStream(apkPath);
    readStream.pipe(res);
});

// Initialize Database Tables on Startup
async function initDb() {
    try {
        // 1. Create Patients Table
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

        // 2. Create/Alter Appointments Table
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
                video_room VARCHAR(255),
                patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL
            );
        `);
        await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
        await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL;`);

        // 3. Create Doctors Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS doctors (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);

        // 4. Create Clinical Notes Table
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

        // 5. Create Followups Table
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

        // 6. Create Followup Reminders Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS followup_reminders (
                reminder_id VARCHAR(255) PRIMARY KEY,
                followup_id VARCHAR(255) REFERENCES followups(followup_id) ON DELETE CASCADE,
                reminder_date VARCHAR(255) NOT NULL,
                stage VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending'
            );
        `);

        // 7. Create Books / Documents Table
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

        // 8. Create Notifications Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'Unread',
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
            await pool.query('UPDATE appointments SET patient_id = $1 WHERE id = $2;', [patientId, appt.id]);
        }

        console.log('Database and EMR schemas verified successfully.');
    } catch (err) {
        console.error('Error initializing database tables:', err);
    }
}
initDb();

// Middleware: Authenticate Doctor JWT Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, error: "Access denied." });

    jwt.verify(token, process.env.JWT_SECRET || 'doctor_emr_secret_key_2026', (err, user) => {
        if (err) return res.status(403).json({ success: false, error: "Session expired." });
        req.user = user;
        next();
    });
}

// API Endpoint: Doctor Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM doctors WHERE email = $1;', [email]);
        const doctor = result.rows[0];
        if (!doctor) return res.status(400).json({ success: false, error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) return res.status(400).json({ success: false, error: "Invalid credentials" });

        const token = jwt.sign({ id: doctor.id, email: doctor.email }, process.env.JWT_SECRET || 'doctor_emr_secret_key_2026', { expiresIn: '24h' });
        res.json({ success: true, token, doctorName: doctor.name });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server authentication error" });
    }
});

// API Endpoint: Patient books appointment
app.post('/api/appointments', async (req, res) => {
    let { name, email, phone, date, time, reason } = req.body;
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

        const query = `
            INSERT INTO appointments (id, name, email, phone, date, time, reason, status, patient_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8)
            RETURNING *;
        `;
        const result = await pool.query(query, [appointmentId, name, email, phone, date, time, reason, patientId]);
        
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

// API Endpoint: Get all appointments (Secured)
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
            videoRoom: row.video_room,
            patientId: row.patient_id
        })));
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Get all patients (Secured)
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

// API: Create a new Patient profile directly
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

// API: Patient Case Study Timeline
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

// API: Get all medical documents
app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, category, size, uploaded_at, file_data FROM documents ORDER BY uploaded_at DESC;');
        res.json({ success: true, documents: result.rows });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Upload a document
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

// API: Get document file data for preview
app.get('/api/documents/:id/preview', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT name, category, file_data FROM documents WHERE id = $1;', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: "File not found." });
        res.json({ success: true, file: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Rename a document
app.put('/api/documents/:id', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('UPDATE documents SET name = $1 WHERE id = $2;', [name, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Delete a document
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM documents WHERE id = $1;', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Get persistent notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50;');
        const unreadResult = await pool.query("SELECT COUNT(id) FROM notifications WHERE status = 'Unread';");
        res.json({ success: true, notifications: result.rows, unreadCount: parseInt(unreadResult.rows[0].count) });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Mark all notifications as read
app.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET status = 'Read' WHERE status = 'Unread';");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Save SOAP Clinical Note
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
        res.json({ success: true, note: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Get SOAP Clinical Note
app.get('/api/notes/:appointmentId', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clinical_notes WHERE appointment_id = $1;', [req.params.appointmentId]);
        res.json({ success: true, note: result.rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Confirm Appointment Video Call Session
app.post('/api/appointments/:id/confirm', authenticateToken, async (req, res) => {
    const videoRoom = `TelehealthRoom-${req.params.id}`;
    try {
        await pool.query("UPDATE appointments SET status = 'Confirmed', video_room = $1 WHERE id = $2;", [videoRoom, req.params.id]);
        const updated = await pool.query("SELECT * FROM appointments WHERE id = $1;", [req.params.id]);
        
        io.emit('appointment_updated', updated.rows[0]);
        res.json({ success: true, appointment: updated.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Schedule / Edit / Disable Follow-up
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
        
        const offsetDateString = (dateStr, days) => {
            const date = new Date(dateStr);
            date.setDate(date.getDate() + days);
            return date.toISOString().split('T')[0];
        };

        for (const rem of reminders) {
            const remDate = offsetDateString(followupDate, rem.offset);
            const remId = `rem_${rem.stage}_${Date.now()}`;
            await pool.query(`
                INSERT INTO followup_reminders (reminder_id, followup_id, reminder_date, stage, status)
                VALUES ($1, $2, $3, $4, 'Pending');
            `, [remId, followupId, remDate, rem.stage]);
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
                p.name as patient_name,
                p.phone as contact_number,
                f.last_visit_date,
                f.followup_date,
                f.doctor_notes as summary,
                f.followup_id,
                r.stage,
                r.reminder_id,
                r.status as reminder_status
            FROM followup_reminders r
            JOIN followups f ON r.followup_id = f.followup_id
            JOIN patients p ON f.patient_id = p.id
            WHERE r.reminder_date = $1;
        `;
        const result = await pool.query(query, [todayStr]);
        
        const generateStageMessage = (patientName, date, stage) => {
            switch(stage) {
                case 'DAY_MINUS_3': return `Hello ${patientName}, Dr. Varsha Bandi here. Just checking in on your progress. Your scheduled follow-up is on ${date} (3 days from now).`;
                case 'DAY_MINUS_2': return `Hello ${patientName}, Dr. Varsha Bandi here. This is a gentle reminder for your scheduled follow-up on ${date} (2 days from now).`;
                case 'DAY_MINUS_1': return `Hello ${patientName}, Dr. Varsha Bandi here. This is a reminder for your scheduled follow-up tomorrow on ${date}.`;
                case 'DAY_0': return `Hello ${patientName}, Dr. Varsha Bandi here. This is a reminder for your homeopathic follow-up consultation today. Please click the telehealth workspace link to join.`;
                default: return `Hello ${patientName}, follow-up consultation scheduled on ${date}.`;
            }
        };

        const mappedList = result.rows.map(row => {
            return {
                ...row,
                prepared_message: generateStageMessage(row.patient_name, row.followup_date, row.stage)
            };
        });
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

// Serve the static web assets from 'www' directory
app.use(express.static(path.join(__dirname, 'www')));

// Static Routing Fallbacks
app.get('*all', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
