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
    "if (checkDoctor.rows.length === 0 && process.env.BOOTSTRAP_DOCTOR === 'true') {\n            const defaultId = process.env.DOCTOR_ID || 'doc_varsha';\n            if (!process.env.DOCTOR_EMAIL || !process.env.DOCTOR_PASSWORD) throw new Error('DOCTOR_EMAIL and DOCTOR_PASSWORD are required when BOOTSTRAP_DOCTOR=true.');\n            const hashedPassword = await bcrypt.hash(process.env.DOCTOR_PASSWORD, 10);"
);
source = source.replace(
    "        // Migrate existing appointments to patients table automatically\n        const existingAppts = await pool.query('SELECT * FROM appointments;');",
    "        // Legacy data migration is opt-in. Do not scan and rewrite every appointment on each restart.\n        if (process.env.RUN_DATA_MIGRATION !== 'true') {\n            console.log('ℹ️ Legacy appointment migration skipped. Set RUN_DATA_MIGRATION=true for a controlled migration.');\n            return;\n        }\n        const existingAppts = await pool.query('SELECT * FROM appointments;');"
);
source = source.replace(
    "        console.log(`[Password Reset] Token for ${email}: ${resetToken}`);",
    "        console.log(`[Password Reset] Reset requested for ${email}; token is intentionally not logged.`);"
);

source = source.replace(
    "    const { name, category, size, file_data } = req.body;\n    const id = 'doc_' + Date.now();",
    "    const { name, category, size, file_data } = req.body;\n    if (!file_data || typeof file_data !== 'string' || file_data.length > 8_000_000) {\n        return res.status(413).json({ success: false, error: 'Document is missing or exceeds the 8MB upload limit.' });\n    }\n    const id = 'doc_' + Date.now();"
);
source = source.replace(
    "    const { name, category, size, file_data, appointment_id } = req.body;\n    const id = 'pdoc_' + Date.now();",
    "    const { name, category, size, file_data, appointment_id } = req.body;\n    if (!file_data || typeof file_data !== 'string' || file_data.length > 8_000_000) {\n        return res.status(413).json({ success: false, error: 'Document is missing or exceeds the 8MB upload limit.' });\n    }\n    const id = 'pdoc_' + Date.now();"
);

source = source.replace(
    "    socket.on('confirm_and_share_link', async ({ appointmentId, roomName }) => {\n        try {",
    "    socket.on('confirm_and_share_link', async ({ appointmentId, roomName }) => {\n        try {\n            const token = socket.handshake.auth?.token;\n            if (!token) return;\n            const user = jwt.verify(token, process.env.JWT_SECRET);\n            if (!user?.id || !user?.email) return;"
);

const patched = new Module(serverPath, module.parent);
patched.filename = serverPath;
patched.paths = Module._nodeModulePaths(root);
patched._compile(source, serverPath);
