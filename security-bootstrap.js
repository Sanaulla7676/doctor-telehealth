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

const patched = new Module(serverPath, module.parent);
patched.filename = serverPath;
patched.paths = Module._nodeModulePaths(root);
patched._compile(source, serverPath);
