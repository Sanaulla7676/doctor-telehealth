const crypto = require('crypto');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const CASHFREE_API_BASE = process.env.CASHFREE_API_BASE || 'https://sandbox.cashfree.com/pg';
const CASHFREE_API_VERSION = '2025-01-01';

async function cashfreeRequest(path, options = {}) {
  const response = await fetch(`${CASHFREE_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': CASHFREE_API_VERSION,
      'x-client-id': process.env.CASHFREE_CLIENT_ID,
      'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Cashfree request failed');
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

function registerCashfree(app, authenticatePatientToken, authenticateToken, io) {
  app.get('/api/payments/config', (req, res) => {
    res.json({ success: true, environment: process.env.CASHFREE_ENVIRONMENT || 'sandbox' });
  });

  app.post('/api/payments/create-order', authenticatePatientToken, async (req, res) => {
    const { appointmentId } = req.body;
    if (!appointmentId) return res.status(400).json({ success: false, error: 'Appointment ID is required.' });
    try {
      const result = await pool.query('SELECT * FROM appointments WHERE id = $1 AND patient_account_id = $2;', [appointmentId, req.patient.patientAccountId]);
      const appointment = result.rows[0];
      if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found.' });
      if (String(appointment.payment_status || '').toLowerCase() === 'paid') return res.status(400).json({ success: false, error: 'Appointment is already paid.' });

      const orderId = `apt_${appointment.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const customerPhone = String(appointment.phone || '').replace(/\D/g, '').slice(-10);
      const customerDetails = {
        customer_id: String(req.patient.patientAccountId),
        customer_name: appointment.name,
        customer_email: appointment.email,
        customer_phone: customerPhone || '9999999999'
      };
      const order = await cashfreeRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          order_amount: Number(appointment.consultation_fee || 800),
          order_currency: 'INR',
          customer_details: customerDetails,
          order_meta: {
            return_url: `${process.env.PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/return?appointment_id=${encodeURIComponent(appointment.id)}&order_id=${encodeURIComponent(orderId)}`,
            notify_url: `${process.env.BACKEND_PUBLIC_URL || 'https://doctor-telehealth.onrender.com'}/api/payments/webhook`
          },
          order_note: `${appointment.service_name || 'Consultation'} for ${appointment.name}`
        })
      });

      await pool.query(`UPDATE appointments SET payment_status='Payment Initiated' WHERE id=$1;`, [appointment.id]);
      res.status(201).json({ success: true, orderId: order.order_id, paymentSessionId: order.payment_session_id, amount: order.order_amount, currency: order.order_currency });
    } catch (err) {
      console.error('[Cashfree] create-order error:', err);
      res.status(err.status || 500).json({ success: false, error: err.message || 'Unable to create payment order.' });
    }
  });

  app.post('/api/payments/verify', authenticatePatientToken, async (req, res) => {
    const { appointmentId, orderId } = req.body;
    if (!appointmentId || !orderId) return res.status(400).json({ success: false, error: 'Appointment ID and order ID are required.' });
    try {
      const result = await pool.query('SELECT * FROM appointments WHERE id = $1 AND patient_account_id = $2;', [appointmentId, req.patient.patientAccountId]);
      const appointment = result.rows[0];
      if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found.' });
      const payments = await cashfreeRequest(`/orders/${encodeURIComponent(orderId)}/payments`, { method: 'GET' });
      const successful = Array.isArray(payments) && payments.find(p => String(p.payment_status || '').toUpperCase() === 'SUCCESS');
      if (successful) {
        const amountOk = Number(successful.payment_amount) === Number(appointment.consultation_fee || 800);
        if (!amountOk) return res.status(400).json({ success: false, error: 'Payment amount does not match appointment fee.' });
        await pool.query(`UPDATE appointments SET payment_status='Paid' WHERE id=$1;`, [appointment.id]);
        io.emit('appointment_updated', { id: appointment.id, payment_status: 'Paid' });
        return res.json({ success: true, paid: true, paymentId: successful.cf_payment_id });
      }
      res.json({ success: true, paid: false });
    } catch (err) {
      console.error('[Cashfree] verify error:', err);
      res.status(err.status || 500).json({ success: false, error: err.message || 'Unable to verify payment.' });
    }
  });

  // Cashfree webhook: raw body signature validation is handled at server.js mounting layer.
  app.post('/api/payments/webhook', async (req, res) => {
    try {
      const event = req.body || {};
      const orderId = event?.data?.order?.order_id || event?.data?.order_id;
      const payment = event?.data?.payment || {};
      const paymentStatus = String(payment.payment_status || event?.data?.payment_status || '').toUpperCase();
      if (orderId && paymentStatus === 'SUCCESS') {
        const appointmentId = orderId.startsWith('apt_') ? orderId.slice(4) : orderId;
        const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1;', [appointmentId]);
        const appointment = appointmentResult.rows[0];
        if (appointment) {
          const expected = Number(appointment.consultation_fee || 800);
          const paid = Number(payment.payment_amount || event?.data?.order?.order_amount || 0);
          if (paid === expected) {
            await pool.query(`UPDATE appointments SET payment_status='Paid' WHERE id=$1;`, [appointment.id]);
            io.emit('appointment_updated', { id: appointment.id, payment_status: 'Paid' });
          }
        }
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[Cashfree] webhook error:', err);
      return res.status(200).json({ success: true });
    }
  });
}

module.exports = { registerCashfree };
