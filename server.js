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

// Use JSON fallback if DATABASE_URL is missing
let pool;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    console.log("⚠️ DATABASE_URL not found. Falling back to local JSON database.");
    const { JSONPool } = require('./db_fallback');
    pool = new JSONPool();
}

const JWT_SECRET = process.env.JWT_SECRET || 'doctor_clinical_portal_secret_2026';

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

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'www')));

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ─────────────────────────────────────────────────────────────
// DATABASE INITIALIZATION
// ─────────────────────────────────────────────────────────────
async function initDb() {
    try {
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
                service_name VARCHAR(255),
                consultation_fee INT,
                payment_status VARCHAR(50) DEFAULT 'Unpaid',
                consultation_status VARCHAR(50) DEFAULT 'Pending'
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS doctors (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clinical_notes (
                id VARCHAR(255) PRIMARY KEY,
                appointment_id VARCHAR(255) UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
                subjective TEXT,
                objective TEXT,
                assessment TEXT,
                plan TEXT,
                prescription TEXT,
                medicines TEXT,
                advice TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
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
        await pool.query(`
            CREATE TABLE IF NOT EXISTS followup_reminders (
                reminder_id VARCHAR(255) PRIMARY KEY,
                followup_id VARCHAR(255) REFERENCES followups(followup_id) ON DELETE CASCADE,
                reminder_date VARCHAR(255) NOT NULL,
                stage VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending'
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                size VARCHAR(50) NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                file_data TEXT,
                patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL,
                appointment_id VARCHAR(255) REFERENCES appointments(id) ON DELETE SET NULL
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'Unread',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed Default Doctor
        const doctorEmail = 'drvarshabandi@gmail.com';
        const checkDoctor = await pool.query('SELECT * FROM doctors WHERE email = $1;', [doctorEmail]);
        if (checkDoctor.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('drvarsha@07', 10);
            await pool.query(`
                INSERT INTO doctors (id, name, email, password)
                VALUES ('doc_varsha', 'Dr. Varsha Bandi', $1, $2);
            `, [doctorEmail, hashedPassword]);
        }
        console.log('✅ Database initialized successfully.');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
}
initDb();

// ─────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM doctors WHERE email = $1;', [email]);
        if (result.rows.length === 0) return res.status(401).json({ success: false, error: 'Doctor not found' });

        const doctor = result.rows[0];
        const validPass = await bcrypt.compare(password, doctor.password);
        if (!validPass) return res.status(401).json({ success: false, error: 'Invalid password' });

        const token = jwt.sign({ id: doctor.id, email: doctor.email }, JWT_SECRET);
        res.json({ success: true, token, doctorName: doctor.name });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ─────────────────────────────────────────────────────────────
// APPOINTMENT ROUTES
// ─────────────────────────────────────────────────────────────

app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM appointments ORDER BY date ASC, time ASC;');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send([]);
    }
});

app.post('/api/appointments', async (req, res) => {
    const appt = req.body;
    const id = appt.id || 'appt_' + Date.now();
    try {
        // Ensure patient exists or create mock
        let patientId = appt.patientId || 'pat_' + Date.now();
        await pool.query('INSERT INTO patients (id, name, phone) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;',
            [patientId, appt.name, appt.phone || '0000000000']);

        const result = await pool.query(`
            INSERT INTO appointments (id, name, email, phone, date, time, reason, status, patient_id, service_name, consultation_fee)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;
        `, [id, appt.name, appt.email, appt.phone, appt.date, appt.time, appt.reason, 'Pending', patientId, appt.service_name, appt.consultation_fee]);

        io.emit('new_booking_notification', { appointment: result.rows[0] });
        res.json({ success: true, appointment: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/appointments/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await pool.query('UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *;', [status, id]);
        io.emit('appointment_updated', result.rows[0]);
        res.json({ success: true, appointment: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/meeting/start', authenticateToken, async (req, res) => {
    const { appointmentId, roomName } = req.body;
    try {
        await pool.query('UPDATE appointments SET status = $1, video_room = $2 WHERE id = $3;', ['Confirmed', roomName, appointmentId]);
        res.json({ success: true, roomName });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ─────────────────────────────────────────────────────────────
// PATIENT & CLINICAL ROUTES
// ─────────────────────────────────────────────────────────────

app.get('/api/patients', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM patients ORDER BY name ASC;');
        res.json({ success: true, patients: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, patients: [] });
    }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
    const p = req.body;
    const id = 'pat_' + Date.now();
    try {
        await pool.query(`
            INSERT INTO patients (id, name, phone, age, gender, address, medical_history, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [id, p.name, p.phone, p.age, p.gender, p.address, p.medical_history, p.notes]);
        res.json({ ...p, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
    const n = req.body;
    const id = 'note_' + Date.now();
    try {
        await pool.query(`
            INSERT INTO clinical_notes (id, appointment_id, subjective, objective, assessment, plan, prescription, medicines, advice)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (appointment_id) DO UPDATE SET
            subjective=EXCLUDED.subjective, objective=EXCLUDED.objective, assessment=EXCLUDED.assessment,
            plan=EXCLUDED.plan, prescription=EXCLUDED.prescription, medicines=EXCLUDED.medicines, advice=EXCLUDED.advice;
        `, [id, n.appointmentId, n.subjective, n.objective, n.assessment, n.plan, n.prescription, n.medicines, n.advice]);
        res.json({ success: true });
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
// FOLLOW-UP & DOCUMENT ROUTES
// ─────────────────────────────────────────────────────────────

app.post('/api/followups', authenticateToken, async (req, res) => {
    const f = req.body;
    if (f.disabled) {
        await pool.query('DELETE FROM followups WHERE consultation_id = $1;', [f.consultationId]);
        return res.json({ success: true });
    }
    const id = 'fup_' + Date.now();
    try {
        await pool.query(`
            INSERT INTO followups (followup_id, patient_id, consultation_id, last_visit_date, followup_date, doctor_notes)
            VALUES ($1, $2, $3, $4, $5, $6);
        `, [id, f.patientId, f.consultationId, f.lastVisitDate, f.followupDate, f.doctorNotes]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/followups', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT f.*, p.name as patient_name, p.phone as patient_phone
            FROM followups f JOIN patients p ON f.patient_id = p.id;
        `);
        res.json({ success: true, followups: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, followups: [] });
    }
});

app.get('/api/dashboard/all-reminders', authenticateToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const result = await pool.query(`
            SELECT p.name as patient_name, p.phone as contact_number, f.last_visit_date, f.followup_date,
            f.doctor_notes as summary, f.followup_id, 'DAY_0' as stage, 'rem_today' as reminder_id,
            'Pending' as reminder_status, 'Reminder: Your appointment with Dr. Varsha is today.' as prepared_message
            FROM followups f JOIN patients p ON f.patient_id = p.id WHERE f.followup_date = $1;
        `, [today]);
        res.json({ success: true, followupsToday: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, followupsToday: [] });
    }
});

app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, category, size, uploaded_at, file_data FROM documents;');
        res.json({ success: true, documents: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, documents: [] });
    }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
    const { name, category, size, file_data } = req.body;
    const id = 'doc_' + Date.now();
    try {
        await pool.query(`
            INSERT INTO documents (id, name, category, size, file_data)
            VALUES ($1, $2, $3, $4, $5);
        `, [id, name, category, size, file_data]);
        res.json({ success: true, document: { id, name, category, size } });
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

app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50;');
        res.json({ success: true, notifications: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, notifications: [] });
    }
});

app.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET status = 'Read';");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ─────────────────────────────────────────────────────────────
// SERVER START
// ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EMR Server running on port ${PORT}`);
});
