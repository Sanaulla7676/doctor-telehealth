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
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));

// Proxy public frontend API requests to the canonical Render backend when
// this Express process is running as the Vercel-hosted static frontend shell.
// This keeps /api/* working regardless of whether the static export or the
// backend process serves the incoming request.
const backendBaseUrl = process.env.BACKEND_API_URL || 'https://doctor-telehealth.onrender.com';
const proxyPublicApi = async (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    if (process.env.PROXY_PUBLIC_API !== 'true') return next();
    try {
        const target = new URL(req.originalUrl, backendBaseUrl);
        const headers = { 'Content-Type': req.get('content-type') || 'application/json' };
        if (req.get('authorization')) headers.authorization = req.get('authorization');
        const response = await fetch(target, {
            method: req.method,
            headers,
            body: ['GET','HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {})
        });
        const text = await response.text();
        res.status(response.status);
        const contentType = response.headers.get('content-type');
        if (contentType) res.set('Content-Type', contentType);
        return res.send(text);
    } catch (error) {
        console.error('[API Proxy] Public API proxy error:', error);
        return res.status(502).json({ success: false, error: 'Backend API unavailable.' });
    }
};

// BACKWARD-COMPAT REDIRECTS
app.get('/patient-auth.html', (req, res) => res.redirect(301, '/auth/'));
app.get('/patient-portal.html', (req, res) => res.redirect(301, '/portal/'));
app.get('/patient.html', (req, res) => res.redirect(301, '/portal/'));

app.use(proxyPublicApi);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'www')));

// Remaining original server implementation is loaded below unchanged.
