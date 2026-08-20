const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
let registered = false;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function issueReset(accountType, accountId, email) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  await pool.query(`UPDATE password_reset_tokens SET used_at=NOW() WHERE account_type=$1 AND account_id=$2 AND used_at IS NULL`, [accountType, accountId]);
  await pool.query(
    `INSERT INTO password_reset_tokens (id,account_type,account_id,token_hash,expires_at)
     VALUES ($1,$2,$3,$4,NOW()+INTERVAL '30 minutes')`,
    [`reset_${crypto.randomUUID()}`, accountType, accountId, tokenHash]
  );

  // Delivery is intentionally provider-neutral. The token is returned only to an
  // explicitly configured development delivery adapter, never logged.
  const resetUrl = `${process.env.PASSWORD_RESET_BASE_URL || process.env.PUBLIC_SITE_URL || ''}/auth/reset?token=${rawToken}`;
  if (process.env.PASSWORD_RESET_DELIVERY_URL && process.env.PASSWORD_RESET_DELIVERY_SECRET) {
    try {
      await fetch(process.env.PASSWORD_RESET_DELIVERY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PASSWORD_RESET_DELIVERY_SECRET}` },
        body: JSON.stringify({ accountType, accountId, email, resetUrl, expiresInMinutes: 30 }),
      });
    } catch (error) {
      console.error('[Password Reset] delivery adapter failed:', error.message);
    }
  }
  return resetUrl;
}

function register(app) {
  if (registered) return;
  registered = true;

  app.post('/api/auth/forgot-password', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });
    try {
      const doctor = await pool.query('SELECT id,email FROM doctors WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
      const patient = await pool.query('SELECT id,email FROM patient_accounts WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
      if (doctor.rows[0]) await issueReset('doctor', doctor.rows[0].id, doctor.rows[0].email);
      else if (patient.rows[0]) await issueReset('patient', patient.rows[0].id, patient.rows[0].email);
      // Avoid account enumeration.
      res.json({ success: true, message: 'If the account exists, a password reset link has been sent.' });
    } catch (error) {
      console.error('[Password Reset] request failed:', error.message);
      res.status(500).json({ success: false, error: 'Unable to process password reset.' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (!token || password.length < 10) return res.status(400).json({ success: false, error: 'A valid reset token and password of at least 10 characters are required.' });
    try {
      const result = await pool.query(
        `SELECT * FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() LIMIT 1`,
        [hashToken(token)]
      );
      const reset = result.rows[0];
      if (!reset) return res.status(400).json({ success: false, error: 'Reset link is invalid or expired.' });

      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 12);
      if (reset.account_type === 'doctor') {
        await pool.query('UPDATE doctors SET password=$1 WHERE id=$2', [passwordHash, reset.account_id]);
      } else {
        await pool.query('UPDATE patient_accounts SET password_hash=$1, updated_at=NOW() WHERE id=$2', [passwordHash, reset.account_id]);
      }
      await pool.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [reset.id]);
      res.json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
      console.error('[Password Reset] update failed:', error.message);
      res.status(500).json({ success: false, error: 'Unable to reset password.' });
    }
  });
}

const express = require('express');
const originalUse = express.application.use;
express.application.use = function (...args) {
  const result = originalUse.apply(this, args);
  if (!registered && args.length && typeof args[0] === 'function') {
    try { register(this); } catch (error) { console.error('[Password Reset API] registration failed:', error); }
  }
  return result;
};
