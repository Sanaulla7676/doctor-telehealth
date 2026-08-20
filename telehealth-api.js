const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
let registered = false;

function doctorAuth(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Doctor access denied.' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err || !user?.id || user.patientAccountId) return res.status(403).json({ success: false, error: 'Doctor session expired.' });
    req.doctor = user; next();
  });
}

function patientAuth(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Patient access denied.' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err || !user?.patientAccountId) return res.status(403).json({ success: false, error: 'Patient session expired.' });
    req.patient = user; next();
  });
}

async function audit(actorType, actorId, action, resourceId) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, actor_type, actor_id, action, resource_type, resource_id)
       VALUES ($1,$2,$3,$4,'appointment',$5)`,
      [`audit_${crypto.randomUUID()}`, actorType, actorId, action, resourceId]
    );
  } catch (error) { console.error('[Audit]', error.message); }
}

function register(app) {
  if (registered) return;
  registered = true;

  app.post('/api/doctor/appointments/:appointmentId/join', doctorAuth, async (req, res) => {
    try {
      const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id=$1', [req.params.appointmentId]);
      const appointment = appointmentResult.rows[0];
      if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found.' });
      if (appointment.status !== 'Confirmed' && appointment.status !== 'In Progress') return res.status(409).json({ success: false, error: 'Appointment is not ready for consultation.' });
      const roomName = appointment.video_room || `drvarsha-${appointment.id}`;
      const session = await pool.query(
        `INSERT INTO consultation_sessions (id, appointment_id, room_name, doctor_joined_at, started_at, status, updated_at)
         VALUES ($1,$2,$3,NOW(),NOW(),'IN_PROGRESS',NOW())
         ON CONFLICT (appointment_id) DO UPDATE SET doctor_joined_at=COALESCE(consultation_sessions.doctor_joined_at,NOW()), started_at=COALESCE(consultation_sessions.started_at,NOW()), status='IN_PROGRESS', updated_at=NOW()
         RETURNING *`,
        [`session_${crypto.randomUUID()}`, appointment.id, roomName]
      );
      await pool.query(`UPDATE appointments SET status='In Progress', meeting_status='READY', video_room=$1, consultation_status='In Progress' WHERE id=$2`, [roomName, appointment.id]);
      await audit('doctor', req.doctor.id, 'doctor_joined_consultation', appointment.id);
      res.json({ success: true, roomName, session: session.rows[0] });
    } catch (error) {
      console.error('[Telehealth] doctor join:', error);
      res.status(500).json({ success: false, error: 'Unable to join consultation.' });
    }
  });

  app.post('/api/patient/appointments/:appointmentId/join', patientAuth, async (req, res) => {
    try {
      const appointmentResult = await pool.query(
        `SELECT * FROM appointments WHERE id=$1 AND (patient_account_id=$2 OR patient_id=(SELECT patient_id FROM patient_accounts WHERE id=$2))`,
        [req.params.appointmentId, req.patient.patientAccountId]
      );
      const appointment = appointmentResult.rows[0];
      if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found.' });
      if (appointment.meeting_status !== 'READY' && appointment.status !== 'In Progress') return res.status(409).json({ success: false, error: 'Doctor has not opened the consultation room yet.' });
      const roomName = appointment.video_room || `drvarsha-${appointment.id}`;
      const session = await pool.query(
        `INSERT INTO consultation_sessions (id, appointment_id, room_name, patient_joined_at, started_at, status, updated_at)
         VALUES ($1,$2,$3,NOW(),NOW(),'IN_PROGRESS',NOW())
         ON CONFLICT (appointment_id) DO UPDATE SET patient_joined_at=COALESCE(consultation_sessions.patient_joined_at,NOW()), started_at=COALESCE(consultation_sessions.started_at,NOW()), status='IN_PROGRESS', updated_at=NOW()
         RETURNING *`,
        [`session_${crypto.randomUUID()}`, appointment.id, roomName]
      );
      await pool.query(`UPDATE appointments SET status='In Progress', meeting_status='READY', video_room=$1, consultation_status='In Progress' WHERE id=$2`, [roomName, appointment.id]);
      await audit('patient', req.patient.patientAccountId, 'patient_joined_consultation', appointment.id);
      res.json({ success: true, roomName, session: session.rows[0] });
    } catch (error) {
      console.error('[Telehealth] patient join:', error);
      res.status(500).json({ success: false, error: 'Unable to join consultation.' });
    }
  });

  app.post('/api/doctor/appointments/:appointmentId/complete-consultation', doctorAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `UPDATE consultation_sessions SET completed_at=NOW(), status='COMPLETED', updated_at=NOW() WHERE appointment_id=$1 RETURNING *`,
        [req.params.appointmentId]
      );
      await pool.query(`UPDATE appointments SET status='Completed', meeting_status='COMPLETED', consultation_status='Completed' WHERE id=$1`, [req.params.appointmentId]);
      await audit('doctor', req.doctor.id, 'consultation_completed', req.params.appointmentId);
      res.json({ success: true, session: result.rows[0] || null });
    } catch (error) { res.status(500).json({ success: false, error: 'Unable to complete consultation.' }); }
  });

  app.get('/api/appointments/:appointmentId/consultation-session', doctorAuth, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM consultation_sessions WHERE appointment_id=$1', [req.params.appointmentId]);
      res.json({ success: true, session: result.rows[0] || null });
    } catch (error) { res.status(500).json({ success: false, error: 'Failed to load consultation session.' }); }
  });

  app.post('/api/patient/appointments/:appointmentId/cancel', patientAuth, async (req, res) => {
    try {
      const appointment = await pool.query(
        `SELECT * FROM appointments WHERE id=$1 AND (patient_account_id=$2 OR patient_id=(SELECT patient_id FROM patient_accounts WHERE id=$2))`,
        [req.params.appointmentId, req.patient.patientAccountId]
      );
      if (!appointment.rows[0]) return res.status(404).json({ success: false, error: 'Appointment not found.' });
      if (['Completed','In Progress','Cancelled','Rejected'].includes(appointment.rows[0].status)) return res.status(409).json({ success: false, error: 'This appointment can no longer be cancelled.' });
      const result = await pool.query(`UPDATE appointments SET status='Cancelled', consultation_status='Cancelled' WHERE id=$1 RETURNING *`, [req.params.appointmentId]);
      await audit('patient', req.patient.patientAccountId, 'appointment_cancelled', req.params.appointmentId);
      res.json({ success: true, appointment: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, error: 'Unable to cancel appointment.' }); }
  });
}

const express = require('express');
const originalUse = express.application.use;
express.application.use = function (...args) {
  const result = originalUse.apply(this, args);
  if (!registered && args.length && typeof args[0] === 'function') {
    try { register(this); } catch (error) { console.error('[Telehealth API] registration failed:', error); }
  }
  return result;
};
