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
    ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));

// The Vercel deployment serves a static frontend while the canonical API lives
// on Render. Proxy only public GET API calls here so the browser can use the
// same relative /api URL in production and staging. Authenticated doctor APIs
// remain handled by the canonical backend.
const backendBaseUrl = process.env.BACKEND_API_URL || 'https://doctor-telehealth.onrender.com';
const proxyPublicGetApi = async (req, res, next) => {
    if (req.method !== 'GET' || !req.path.startsWith('/api/')) return next();
    try {
        const target = new URL(req.originalUrl, backendBaseUrl);
        const response = await fetch(target, {
            method: 'GET',
            headers: { 'Accept': req.get('accept') || 'application/json' }
        });
        const text = await response.text();
        res.status(response.status);
        const contentType = response.headers.get('content-type');
        if (contentType) res.set('Content-Type', contentType);
        return res.send(text);
    } catch (error) {
        console.error('[Public API proxy] error:', error);
        return res.status(502).json({ success: false, error: 'Backend API unavailable.' });
    }
};

app.get('/patient-auth.html', (req, res) => res.redirect(301, '/auth/'));
app.get('/patient-portal.html', (req, res) => res.redirect(301, '/portal/'));
app.get('/patient.html', (req, res) => res.redirect(301, '/portal/'));
app.use(proxyPublicGetApi);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'www')));
