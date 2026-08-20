const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = __dirname;
const serverPath = path.join(root, 'server.js');
const jwtSecret = process.env.JWT_SECRET || '';
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);

if (process.env.NODE_ENV === 'production') {
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!corsOrigins.length) throw new Error('CORS_ORIGINS is required. Wildcard CORS is disabled.');
  if (process.env.BOOTSTRAP_DOCTOR === 'true' && (!process.env.DOCTOR_EMAIL || !process.env.DOCTOR_PASSWORD)) {
    throw new Error('DOCTOR_EMAIL and DOCTOR_PASSWORD are required when BOOTSTRAP_DOCTOR=true.');
  }
}

let source = fs.readFileSync(serverPath, 'utf8');

source = source.replace(
  'origin: "*",\n    methods: ["GET", "POST", "PUT", "DELETE"],',
  'origin: (process.env.CORS_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean),\n    methods: ["GET", "POST", "PUT", "DELETE"],'
);
source = source.replace(
  'origin: "*",\n        methods: ["GET", "POST"]',
  'origin: (process.env.CORS_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean),\n        methods: ["GET", "POST"]'
);
source = source.replace(
  "app.use(express.json({ limit: '50mb' }));",
  "app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));"
);
source = source.replace(
  "const doctorEmail = 'drvarshabandi@gmail.com';",
  "const doctorEmail = process.env.DOCTOR_EMAIL;"
);
source = source.replace(
  "if (checkDoctor.rows.length === 0) {\n            const defaultId = 'doc_varsha';\n            const hashedPassword = await bcrypt.hash('drvarsha@07', 10);",
  "if (checkDoctor.rows.length === 0 && process.env.BOOTSTRAP_DOCTOR === 'true') {\n            const defaultId = process.env.DOCTOR_ID || 'doc_varsha';\n            const hashedPassword = await bcrypt.hash(process.env.DOCTOR_PASSWORD, 10);"
);
source = source.replace(
  "        // Migrate existing appointments to patients table automatically\n        const existingAppts = await pool.query('SELECT * FROM appointments;');",
  "        if (process.env.RUN_DATA_MIGRATION !== 'true') {\n            console.log('Legacy appointment migration skipped; use the versioned migration runner.');\n            return;\n        }\n        const existingAppts = await pool.query('SELECT * FROM appointments;');"
);
source = source.replace(
  "console.log(`[Password Reset] Token for ${email}: ${resetToken}`);",
  "console.log(`[Password Reset] Reset requested for ${email}; token intentionally not logged.`);"
);
const healthBlock = `\napp.set('trust proxy', 1);\napp.get('/health', (req, res) => res.json({ ok: true, service: 'doctor-telehealth' }));\napp.get('/ready', async (req, res) => {\n  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'ready' }); }\n  catch (error) { res.status(503).json({ ok: false, database: 'unavailable' }); }\n});\nconst rateBucket = new Map();\nconst rateLimit = (limit, windowMs) => (req, res, next) => {\n  const key = `\${req.ip}:\${req.path}`;\n  const now = Date.now();\n  const entry = rateBucket.get(key);\n  if (!entry || now - entry.startedAt > windowMs) { rateBucket.set(key, { startedAt: now, count: 1 }); return next(); }\n  entry.count += 1;\n  if (entry.count > limit) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });\n  next();\n};\napp.use('/api/auth/login', rateLimit(10, 60_000));\napp.use('/api/patient/login', rateLimit(10, 60_000));\napp.use('/api/patient/forgot-password', rateLimit(5, 60_000));\napp.use('/api/appointments', (req, res, next) => req.method === 'POST' ? rateLimit(20, 60_000)(req, res, next) : next());\n`;
source = source.replace("app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));", "app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));" + healthBlock);

const appointmentActions = `\n// Agency-grade doctor appointment lifecycle API.\napp.get('/api/doctor/appointments', authenticateToken, async (req, res) => {\n  try { const result = await pool.query('SELECT * FROM appointments ORDER BY date ASC, time ASC'); res.json(result.rows); }\n  catch (error) { res.status(500).json({ success: false, error: 'Failed to load appointments.' }); }\n});\napp.post('/api/doctor/appointments/:id/action', authenticateToken, async (req, res) => {\n  const { action, roomName } = req.body || {};\n  const allowed = new Set(['accept','reject','confirm','start','complete']);\n  if (!allowed.has(action)) return res.status(400).json({ success: false, error: 'Invalid appointment action.' });\n  try {\n    const current = await pool.query('SELECT * FROM appointments WHERE id = $1 FOR UPDATE', [req.params.id]);\n    if (!current.rows[0]) return res.status(404).json({ success: false, error: 'Appointment not found.' });\n    const appt = current.rows[0];\n    const transitions = {\n      accept: ['Pending'],\n      reject: ['Pending'],\n      confirm: ['Accepted','Payment Pending','Paid'],\n      start: ['Confirmed'],\n      complete: ['Confirmed','In Progress']\n    };\n    if (!transitions[action].includes(appt.status)) return res.status(409).json({ success: false, error: `Cannot ${action} an appointment in state ${appt.status}.` });\n    if (action === 'confirm' && process.env.REQUIRE_PAYMENT_FOR_CONFIRM === 'true' && appt.payment_status !== 'Paid') {\n      return res.status(409).json({ success: false, error: 'Verified payment is required before confirmation.' });\n    }\n    const statusMap = { accept: 'Accepted', reject: 'Rejected', confirm: 'Confirmed', start: 'In Progress', complete: 'Completed' };\n    let meetingStatus = appt.meeting_status || 'PENDING';\n    let videoRoom = appt.video_room;\n    if (action === 'start') {\n      videoRoom = roomName || `drvarsha-${appt.id}`;\n      meetingStatus = 'READY';\n    }\n    if (action === 'complete') meetingStatus = 'COMPLETED';\n    const updated = await pool.query(`UPDATE appointments SET status = $1, meeting_status = $2, video_room = $3, consultation_status = CASE WHEN $1 = 'In Progress' THEN 'In Progress' WHEN $1 = 'Completed' THEN 'Completed' ELSE consultation_status END WHERE id = $4 RETURNING *`, [statusMap[action], meetingStatus, videoRoom, appt.id]);\n    io.emit('appointment_updated', updated.rows[0]);\n    res.json({ success: true, appointment: updated.rows[0] });\n  } catch (error) {\n    console.error('Doctor appointment action error:', error);\n    res.status(500).json({ success: false, error: 'Appointment action failed.' });\n  }\n});\n`;
source = source.replace("// ─────────────────────────────────────────────────────────────\n// SOCKET.IO — Real-Time Event Hub", appointmentActions + "\n// ─────────────────────────────────────────────────────────────\n// SOCKET.IO — Real-Time Event Hub");

const patched = new Module(serverPath, module.parent);
patched.filename = serverPath;
patched.paths = Module._nodeModulePaths(root);
patched._compile(source, serverPath);
