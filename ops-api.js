const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
let registered = false;

function safeActor(req) {
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    if (!token) return { type: 'system', id: null };
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.patientAccountId) return { type: 'patient', id: user.patientAccountId };
    if (user.id) return { type: 'doctor', id: user.id };
  } catch (_) { /* audit middleware must never break requests */ }
  return { type: 'unknown', id: null };
}

async function insertAudit(actorType, actorId, action, resourceType, resourceId, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (id,actor_type,actor_id,action,resource_type,resource_id,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [`audit_${crypto.randomUUID()}`, actorType, actorId, action, resourceType, resourceId, JSON.stringify(metadata)]
    );
  } catch (error) { console.error('[Ops Audit]', error.message); }
}

function cronGuard(req, res, next) {
  const configured = process.env.CRON_SECRET;
  if (!configured) return res.status(503).json({ success: false, error: 'CRON_SECRET is not configured.' });
  const supplied = req.headers['x-cron-secret'];
  if (!supplied || supplied !== configured) return res.status(401).json({ success: false, error: 'Invalid cron secret.' });
  next();
}

function register(app) {
  if (registered) return;
  registered = true;

  app.use('/api/doctor/appointments', (req, res, next) => {
    if (req.method !== 'POST' || !req.path.endsWith('/action')) return next();
    const appointmentId = req.path.split('/').filter(Boolean).slice(-2)[0];
    const actor = safeActor(req);
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        insertAudit(actor.type, actor.id, 'appointment_action', 'appointment', appointmentId, { statusCode: res.statusCode });
      }
    });
    next();
  });

  app.use('/api/appointments', (req, res, next) => {
    if (req.method !== 'POST' || req.path !== '/') return next();
    res.on('finish', async () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      try {
        const body = req.body || {};
        await pool.query(
          `INSERT INTO notifications (id,title,message,status) VALUES ($1,'New appointment','A new patient appointment has been booked.','Unread')`,
          [`notif_${crypto.randomUUID()}`]
        );
        if (body.patient_account_id) {
          await pool.query(
            `INSERT INTO patient_notifications (id,patient_account_id,title,message,type,appointment_id) VALUES ($1,$2,'Appointment received','Your appointment request has been received. The clinic will review it shortly.','appointment',$3)`,
            [`pnotif_${crypto.randomUUID()}`, body.patient_account_id, body.id || null]
          );
        }
      } catch (error) { console.error('[Notifications] booking event:', error.message); }
    });
    next();
  });

  app.post('/api/internal/followup-reminders/run', cronGuard, async (req, res) => {
    try {
      const reminders = await pool.query(
        `SELECT fr.reminder_id, fr.followup_id, fr.stage, f.followup_date, f.patient_id, p.name, pa.id AS patient_account_id
         FROM followup_reminders fr
         JOIN followups f ON f.followup_id=fr.followup_id
         JOIN patients p ON p.id=f.patient_id
         LEFT JOIN patient_accounts pa ON pa.patient_id=p.id
         WHERE fr.reminder_date=CURRENT_DATE::text AND fr.status='Pending'`
      );
      let sent = 0;
      for (const reminder of reminders.rows) {
        if (reminder.patient_account_id) {
          await pool.query(
            `INSERT INTO patient_notifications (id,patient_account_id,title,message,type) VALUES ($1,$2,'Follow-up reminder',$3,'followup')`,
            [`pnotif_${crypto.randomUUID()}`, reminder.patient_account_id, `Your follow-up consultation is scheduled for ${reminder.followup_date}. Please be prepared for your appointment.`]
          );
        }
        await pool.query(`UPDATE followup_reminders SET status='Sent' WHERE reminder_id=$1`, [reminder.reminder_id]);
        sent += 1;
      }
      res.json({ success: true, processed: reminders.rows.length, sent });
    } catch (error) {
      console.error('[Notifications] follow-up processor:', error);
      res.status(500).json({ success: false, error: 'Reminder processing failed.' });
    }
  });

  app.get('/api/doctor/notifications/unread-count', async (req, res) => {
    const actor = safeActor(req);
    if (actor.type !== 'doctor') return res.status(401).json({ success: false, error: 'Doctor authentication required.' });
    try {
      const result = await pool.query("SELECT COUNT(*)::int AS count FROM notifications WHERE status='Unread'");
      res.json({ success: true, count: result.rows[0]?.count || 0 });
    } catch (error) { res.status(500).json({ success: false, error: 'Failed to load unread count.' }); }
  });
}

const express = require('express');
const originalUse = express.application.use;
express.application.use = function (...args) {
  const result = originalUse.apply(this, args);
  if (!registered && args.length && typeof args[0] === 'function') {
    try { register(this); } catch (error) { console.error('[Ops API] registration failed:', error); }
  }
  return result;
};
