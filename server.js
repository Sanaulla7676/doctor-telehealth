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

// API modules patch Express registration and add their routes when the first
// app.use() call occurs. Load them before registering middleware so direct
// Render execution (`node server.js`) exposes the same API surface as the
// npm start bootstrap path.
require('./blog-api.js');
require('./emr-api.js');
require('./telehealth-api.js');
require('./ops-api.js');
require('./password-reset-api.js');

const app = express();
const server = http.createServer(app);

// Enable CORS for Express APIs
app.use(cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(v => v.trim()).filter(Boolean) : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(v => v.trim()).filter(Boolean) : '*',
        methods: ['GET', 'POST']
    }
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));

// Render is the canonical API host. Do not proxy /api requests back to the
// same Render service, which would create a self-referential request loop.
app.get('/patient-auth.html', (req, res) => res.redirect(301, '/auth/'));
app.get('/patient-portal.html', (req, res) => res.redirect(301, '/portal/'));
app.get('/patient.html', (req, res) => res.redirect(301, '/portal/'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'www')));

app.set('trust proxy', 1);
app.get('/health', (req, res) => res.json({ ok: true, service: 'doctor-telehealth' }));
app.get('/ready', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, database: 'ready' });
    } catch (error) {
        console.error('[Readiness] database check failed:', error);
        res.status(503).json({ ok: false, database: 'unavailable' });
    }
});

// server.js used to define the Express app but never start the HTTP server.
// Render is configured to run `node server.js`, so the process exited cleanly
// immediately after boot. Keep the listener here so both direct Render starts
// and the existing bootstrap path stay alive.
const PORT = Number(process.env.PORT) || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Doctor Telehealth API listening on port ${PORT}`);
});
