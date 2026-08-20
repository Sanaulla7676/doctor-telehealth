const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let registered = false;

function verifyDoctor(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Doctor access denied.' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err || !user?.id || user.patientAccountId) return res.status(403).json({ success: false, error: 'Doctor session expired.' });
    req.doctor = user;
    next();
  });
}

function verifyPatient(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Patient access denied.' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err || !user?.patientAccountId) return res.status(403).json({ success: false, error: 'Patient session expired.' });
    req.patient = user;
    next();
  });
}

async function audit(actorType, actorId, action, resourceType, resourceId, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, actor_type, actor_id, action, resource_type, resource_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [`audit_${crypto.randomUUID()}`, actorType, actorId || null, action, resourceType, resourceId || null, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('[Audit] write failed:', error.message);
  }
}

function register(app) {
  if (registered) return;
  registered = true;

  app.get('/api/doctor/patients/:patientId', verifyDoctor, async (req, res) => {
    try {
      const patient = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.patientId]);
      if (!patient.rows[0]) return res.status(404).json({ success: false, error: 'Patient not found.' });
      const [appointments, notes, prescriptions, followups, documents] = await Promise.all([
        pool.query('SELECT * FROM appointments WHERE patient_id = $1 ORDER BY date DESC, time DESC', [req.params.patientId]),
        pool.query(`SELECT cn.*, a.date, a.time FROM clinical_notes cn JOIN appointments a ON a.id = cn.appointment_id WHERE a.patient_id = $1 ORDER BY cn.updated_at DESC NULLS LAST`, [req.params.patientId]),
        pool.query('SELECT * FROM prescription_versions WHERE patient_id = $1 ORDER BY created_at DESC', [req.params.patientId]),
        pool.query('SELECT * FROM followups WHERE patient_id = $1 ORDER BY followup_date ASC', [req.params.patientId]),
        pool.query('SELECT id,name,category,size,mime_type,uploaded_at,appointment_id FROM documents WHERE patient_id = $1 ORDER BY uploaded_at DESC', [req.params.patientId]),
      ]);
      await audit('doctor', req.doctor.id, 'patient_viewed', 'patient', req.params.patientId);
      res.json({ success: true, patient: patient.rows[0], appointments: appointments.rows, clinicalNotes: notes.rows, prescriptions: prescriptions.rows, followups: followups.rows, documents: documents.rows });
    } catch (error) {
      console.error('[EMR] patient detail:', error);
      res.status(500).json({ success: false, error: 'Failed to load patient record.' });
    }
  });

  app.get('/api/doctor/appointments/:appointmentId/clinical-note', verifyDoctor, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM clinical_notes WHERE appointment_id = $1', [req.params.appointmentId]);
      res.json({ success: true, note: result.rows[0] || null });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to load clinical note.' });
    }
  });

  app.put('/api/doctor/appointments/:appointmentId/clinical-note', verifyDoctor, async (req, res) => {
    const { subjective = '', objective = '', assessment = '', plan = '', advice = '' } = req.body || {};
    try {
      const appointment = await pool.query('SELECT id, patient_id, status FROM appointments WHERE id = $1', [req.params.appointmentId]);
      if (!appointment.rows[0]) return res.status(404).json({ success: false, error: 'Appointment not found.' });
      if (!['Confirmed', 'In Progress', 'Completed'].includes(appointment.rows[0].status)) return res.status(409).json({ success: false, error: 'Clinical notes are only available after confirmation.' });
      const result = await pool.query(
        `INSERT INTO clinical_notes (id, appointment_id, subjective, objective, assessment, plan, advice, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (appointment_id) DO UPDATE SET subjective=$3, objective=$4, assessment=$5, plan=$6, advice=$7, updated_at=NOW()
         RETURNING *`,
        [`note_${crypto.randomUUID()}`, req.params.appointmentId, subjective, objective, assessment, plan, advice]
      );
      await audit('doctor', req.doctor.id, 'clinical_note_saved', 'appointment', req.params.appointmentId);
      res.json({ success: true, note: result.rows[0] });
    } catch (error) {
      console.error('[EMR] clinical note:', error);
      res.status(500).json({ success: false, error: 'Failed to save clinical note.' });
    }
  });

  app.get('/api/patient/clinical-records', verifyPatient, async (req, res) => {
    try {
      const notes = await pool.query(
        `SELECT cn.*, a.id AS appointment_id, a.date, a.time
         FROM clinical_notes cn JOIN appointments a ON a.id = cn.appointment_id
         WHERE a.patient_account_id = $1 OR a.patient_id = (SELECT patient_id FROM patient_accounts WHERE id = $1)
         ORDER BY cn.updated_at DESC`, [req.patient.patientAccountId]
      );
      const prescriptions = await pool.query(
        `SELECT pv.* FROM prescription_versions pv
         WHERE pv.patient_id = (SELECT patient_id FROM patient_accounts WHERE id = $1)
         ORDER BY pv.created_at DESC`, [req.patient.patientAccountId]
      );
      res.json({ success: true, notes: notes.rows, prescriptions: prescriptions.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to load clinical records.' });
    }
  });

  app.post('/api/doctor/appointments/:appointmentId/prescription', verifyDoctor, async (req, res) => {
    const { diagnosis = '', medicines = '', advice = '' } = req.body || {};
    if (!medicines.trim() && !advice.trim()) return res.status(400).json({ success: false, error: 'Prescription content is required.' });
    try {
      const appointment = await pool.query('SELECT id, patient_id, patient_account_id, status FROM appointments WHERE id = $1', [req.params.appointmentId]);
      if (!appointment.rows[0]) return res.status(404).json({ success: false, error: 'Appointment not found.' });
      if (!['In Progress', 'Completed'].includes(appointment.rows[0].status)) return res.status(409).json({ success: false, error: 'Prescription can only be issued during or after consultation.' });
      const next = await pool.query('SELECT COALESCE(MAX(version_no),0)+1 AS version FROM prescription_versions WHERE appointment_id=$1', [req.params.appointmentId]);
      const result = await pool.query(
        `INSERT INTO prescription_versions (id, appointment_id, patient_id, version_no, diagnosis, medicines, advice, issued_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [`rx_${crypto.randomUUID()}`, req.params.appointmentId, appointment.rows[0].patient_id, Number(next.rows[0].version), diagnosis, medicines, advice, req.doctor.id]
      );
      if (appointment.rows[0].patient_account_id) {
        await pool.query(
          `INSERT INTO patient_notifications (id, patient_account_id, title, message, type, appointment_id)
           VALUES ($1,$2,'Prescription available','A new prescription has been issued for your consultation.','prescription',$3)`,
          [`pnotif_${crypto.randomUUID()}`, appointment.rows[0].patient_account_id, req.params.appointmentId]
        );
      }
      await audit('doctor', req.doctor.id, 'prescription_issued', 'appointment', req.params.appointmentId, { version: result.rows[0].version_no });
      res.status(201).json({ success: true, prescription: result.rows[0] });
    } catch (error) {
      console.error('[EMR] prescription:', error);
      res.status(500).json({ success: false, error: 'Failed to issue prescription.' });
    }
  });

  app.get('/api/doctor/followups', verifyDoctor, async (req, res) => {
    try {
      const result = await pool.query(`SELECT f.*, p.name AS patient_name, p.phone AS patient_phone FROM followups f LEFT JOIN patients p ON p.id=f.patient_id ORDER BY f.followup_date ASC`);
      res.json({ success: true, followups: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to load follow-ups.' });
    }
  });

  app.post('/api/doctor/followups', verifyDoctor, async (req, res) => {
    const { patient_id, consultation_id, followup_date, current_stage = 'Scheduled', message = '', doctor_notes = '' } = req.body || {};
    if (!patient_id || !followup_date) return res.status(400).json({ success: false, error: 'Patient and follow-up date are required.' });
    try {
      const patient = await pool.query('SELECT id, name FROM patients WHERE id=$1', [patient_id]);
      if (!patient.rows[0]) return res.status(404).json({ success: false, error: 'Patient not found.' });
      const id = `follow_${crypto.randomUUID()}`;
      const result = await pool.query(
        `INSERT INTO followups (followup_id, patient_id, consultation_id, last_visit_date, followup_date, current_stage, message, doctor_notes)
         VALUES ($1,$2,$3,COALESCE((SELECT date FROM appointments WHERE id=$3),CURRENT_DATE::text),$4,$5,$6,$7) RETURNING *`,
        [id, patient_id, consultation_id || null, followup_date, current_stage, message, doctor_notes]
      );
      const reminderRows = [-3,-2,-1,0].map(days => [
        `rem_${crypto.randomUUID()}`, id,
        new Date(`${followup_date}T00:00:00Z`).setUTCDate(new Date(`${followup_date}T00:00:00Z`).getUTCDate()+days),
        days === -3 ? 'DAY_MINUS_3' : days === -2 ? 'DAY_MINUS_2' : days === -1 ? 'DAY_MINUS_1' : 'DAY_0'
      ]);
      for (const [, reminderId, timestamp, stage] of reminderRows) {
        const reminderDate = new Date(timestamp).toISOString().slice(0,10);
        await pool.query('INSERT INTO followup_reminders (reminder_id, followup_id, reminder_date, stage) VALUES ($1,$2,$3,$4)', [reminderId, id, reminderDate, stage]);
      }
      await audit('doctor', req.doctor.id, 'followup_created', 'followup', id, { patient_id });
      res.status(201).json({ success: true, followup: result.rows[0] });
    } catch (error) {
      console.error('[EMR] follow-up create:', error);
      res.status(500).json({ success: false, error: 'Failed to create follow-up.' });
    }
  });

  app.put('/api/doctor/followups/:followupId', verifyDoctor, async (req, res) => {
    const { followup_date, current_stage, message, doctor_notes, message_status } = req.body || {};
    try {
      const result = await pool.query(
        `UPDATE followups SET followup_date=COALESCE($1,followup_date), current_stage=COALESCE($2,current_stage), message=COALESCE($3,message), doctor_notes=COALESCE($4,doctor_notes), message_status=COALESCE($5,message_status), updated_at=NOW() WHERE followup_id=$6 RETURNING *`,
        [followup_date || null, current_stage || null, message || null, doctor_notes || null, message_status || null, req.params.followupId]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Follow-up not found.' });
      await audit('doctor', req.doctor.id, 'followup_updated', 'followup', req.params.followupId);
      res.json({ success: true, followup: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update follow-up.' });
    }
  });

  app.post('/api/doctor/followups/:followupId/complete', verifyDoctor, async (req, res) => {
    try {
      const result = await pool.query(`UPDATE followups SET current_stage='Completed', message_status='Completed', updated_at=NOW() WHERE followup_id=$1 RETURNING *`, [req.params.followupId]);
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Follow-up not found.' });
      await audit('doctor', req.doctor.id, 'followup_completed', 'followup', req.params.followupId);
      res.json({ success: true, followup: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to complete follow-up.' });
    }
  });

  app.get('/api/patient/followups', verifyPatient, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT f.* FROM followups f WHERE f.patient_id=(SELECT patient_id FROM patient_accounts WHERE id=$1) ORDER BY f.followup_date ASC`,
        [req.patient.patientAccountId]
      );
      res.json({ success: true, followups: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to load follow-ups.' });
    }
  });

  app.get('/api/doctor/notifications', verifyDoctor, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100');
      res.json({ success: true, notifications: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to load notifications.' });
    }
  });

  app.post('/api/doctor/notifications/mark-read', verifyDoctor, async (req, res) => {
    try {
      await pool.query("UPDATE notifications SET status='Read' WHERE status='Unread'");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to mark notifications read.' });
    }
  });

  app.get('/api/doctor/audit-logs', verifyDoctor, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
      res.json({ success: true, logs: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to load audit logs.' });
    }
  });

  app.get('/api/doctor/analytics', verifyDoctor, async (req, res) => {
    try {
      const [statuses, patients, followups] = await Promise.all([
        pool.query('SELECT status, COUNT(*)::int AS count FROM appointments GROUP BY status ORDER BY count DESC'),
        pool.query('SELECT COUNT(*)::int AS total FROM patients'),
        pool.query("SELECT COUNT(*)::int AS upcoming FROM followups WHERE followup_date >= CURRENT_DATE::text AND current_stage <> 'Completed'"),
      ]);
      res.json({ success: true, appointmentsByStatus: statuses.rows, totalPatients: patients.rows[0]?.total || 0, upcomingFollowups: followups.rows[0]?.upcoming || 0 });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to load analytics.' });
    }
  });
}

const express = require('express');
const originalUse = express.application.use;
express.application.use = function (...args) {
  const result = originalUse.apply(this, args);
  if (!registered && args.length && typeof args[0] === 'function') {
    try { register(this); } catch (error) { console.error('[EMR API] registration failed:', error); }
  }
  return result;
};
