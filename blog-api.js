const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

let registered = false;

function doctorAuth(req, res, next) {
    const token = (req.headers.authorization || '').split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Access denied.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err || !user?.id) return res.status(403).json({ success: false, error: 'Session expired.' });
        req.user = user;
        next();
    });
}

async function ensureSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS blogs (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            excerpt TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            cover_image TEXT,
            category VARCHAR(100) DEFAULT 'Health',
            author VARCHAR(255) DEFAULT 'Dr. Varsha Bandi',
            status VARCHAR(30) DEFAULT 'published',
            published BOOLEAN DEFAULT true,
            reading_time INT DEFAULT 5,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Existing production databases were created with `published` while the
    // CMS originally queried `status`. Keep both fields synchronized so old
    // and new records remain publicly visible.
    await pool.query(`ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE blogs ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'published';`);
    await pool.query(`ALTER TABLE blogs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;`);
    await pool.query(`ALTER TABLE blogs ADD COLUMN IF NOT EXISTS reading_time INT DEFAULT 5;`);
    await pool.query(`ALTER TABLE blogs ADD COLUMN IF NOT EXISTS published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await pool.query(`
        UPDATE blogs
        SET status = CASE WHEN published = true THEN 'published' ELSE COALESCE(NULLIF(status, ''), 'draft') END,
            published_at = CASE WHEN published = true AND published_at IS NULL THEN COALESCE(updated_at, created_at, NOW()) ELSE published_at END
        WHERE published IS NOT NULL;
    `);
}

function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 220);
}

function register(app) {
    if (registered) return;
    registered = true;

    ensureSchema().catch(error => console.error('[Blog CMS] schema error:', error));

    app.get('/doctor.html', (req, res) => res.redirect(302, '/doctor/'));

    // Public API supports both the legacy boolean publication flag and the
    // newer status field. This is the compatibility fix for the live Neon DB.
    app.get('/api/blogs', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT id, title, slug, excerpt, cover_image, category, author,
                       reading_time, COALESCE(published_at, updated_at, created_at) AS published_at
                FROM blogs
                WHERE published = true OR status = 'published'
                ORDER BY COALESCE(published_at, updated_at, created_at) DESC;
            `);
            res.json({ success: true, blogs: result.rows });
        } catch (error) {
            console.error('[Blog CMS] public list error:', error);
            res.status(500).json({ success: false, error: 'Failed to load blogs.' });
        }
    });

    app.get('/api/blogs/:slug', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT *
                FROM blogs
                WHERE slug = $1 AND (published = true OR status = 'published')
                LIMIT 1;
            `, [req.params.slug]);

            if (!result.rows.length) {
                return res.status(404).json({ success: false, error: 'Blog not found.' });
            }

            res.json({ success: true, blog: result.rows[0] });
        } catch (error) {
            console.error('[Blog CMS] public article error:', error);
            res.status(500).json({ success: false, error: 'Failed to load blog.' });
        }
    });

    app.get('/api/doctor/blogs', doctorAuth, async (req, res) => {
        try {
            const result = await pool.query(`SELECT * FROM blogs ORDER BY created_at DESC`);
            res.json({ success: true, blogs: result.rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to load blog manager.' });
        }
    });

    app.post('/api/doctor/blogs', doctorAuth, async (req, res) => {
        const {
            title,
            excerpt = '',
            content,
            cover_image = '',
            category = 'Health',
            status = 'published',
            reading_time = 5
        } = req.body;

        if (!title?.trim() || !content?.trim()) {
            return res.status(400).json({ success: false, error: 'Title and content are required.' });
        }

        try {
            const isPublished = status === 'published';
            const slug = `${slugify(title)}-${crypto.randomBytes(3).toString('hex')}`;
            const id = `blog_${Date.now()}`;

            const result = await pool.query(`
                INSERT INTO blogs (
                    id, title, slug, excerpt, content, cover_image, category,
                    status, published, reading_time, author, published_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Dr. Varsha Bandi',CASE WHEN $9 THEN NOW() ELSE NULL END)
                RETURNING *;
            `, [
                id,
                title.trim(),
                slug,
                excerpt,
                content,
                cover_image,
                category,
                status,
                isPublished,
                Number(reading_time) || 5
            ]);

            res.status(201).json({ success: true, blog: result.rows[0] });
        } catch (error) {
            console.error('[Blog CMS] publish error:', error);
            res.status(500).json({ success: false, error: 'Failed to publish blog.' });
        }
    });

    app.put('/api/doctor/blogs/:id', doctorAuth, async (req, res) => {
        const {
            title,
            excerpt = '',
            content,
            cover_image = '',
            category = 'Health',
            status = 'published',
            reading_time = 5
        } = req.body;

        if (!title?.trim() || !content?.trim()) {
            return res.status(400).json({ success: false, error: 'Title and content are required.' });
        }

        try {
            const isPublished = status === 'published';
            const result = await pool.query(`
                UPDATE blogs
                SET title = $1,
                    excerpt = $2,
                    content = $3,
                    cover_image = $4,
                    category = $5,
                    status = $6,
                    published = $7,
                    reading_time = $8,
                    updated_at = NOW(),
                    published_at = CASE
                        WHEN $7 AND published_at IS NULL THEN NOW()
                        WHEN NOT $7 THEN NULL
                        ELSE published_at
                    END
                WHERE id = $9
                RETURNING *;
            `, [
                title.trim(), excerpt, content, cover_image, category,
                status, isPublished, Number(reading_time) || 5, req.params.id
            ]);

            if (!result.rows.length) {
                return res.status(404).json({ success: false, error: 'Blog not found.' });
            }

            res.json({ success: true, blog: result.rows[0] });
        } catch (error) {
            console.error('[Blog CMS] update error:', error);
            res.status(500).json({ success: false, error: 'Failed to update blog.' });
        }
    });

    app.delete('/api/doctor/blogs/:id', doctorAuth, async (req, res) => {
        try {
            const result = await pool.query(
                'DELETE FROM blogs WHERE id = $1 RETURNING id',
                [req.params.id]
            );

            if (!result.rows.length) {
                return res.status(404).json({ success: false, error: 'Blog not found.' });
            }

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to delete blog.' });
        }
    });
}

const express = require('express');
const originalUse = express.application.use;
express.application.use = function (...args) {
    const result = originalUse.apply(this, args);
    if (!registered && args.length && typeof args[0] === 'function') {
        try {
            register(this);
        } catch (error) {
            console.error('[Blog CMS] registration error:', error);
        }
    }
    return result;
};
