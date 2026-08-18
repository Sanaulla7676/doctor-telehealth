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

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
app.use(express.json({ limit: '50mb' }));

app.get('/patient-auth.html', (req,res)=>res.redirect(301,'/auth/'));
app.get('/patient-portal.html', (req,res)=>res.redirect(301,'/portal/'));
app.get('/patient.html', (req,res)=>res.redirect(301,'/portal/'));
app.use(express.static(path.join(__dirname,'public')));
app.use(express.static(path.join(__dirname,'www')));

async function initDb(){
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS patients (id VARCHAR(255) PRIMARY KEY,name VARCHAR(255) NOT NULL,phone VARCHAR(50) UNIQUE NOT NULL,age INT,gender VARCHAR(50),address TEXT,medical_history TEXT,notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS appointments (id VARCHAR(255) PRIMARY KEY,name VARCHAR(255) NOT NULL,email VARCHAR(255) NOT NULL,phone VARCHAR(50),date VARCHAR(255) NOT NULL,time VARCHAR(255) NOT NULL,reason TEXT NOT NULL,status VARCHAR(50) DEFAULT 'Pending',meeting_status VARCHAR(50) DEFAULT 'PENDING',video_room VARCHAR(255),patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL,patient_account_id VARCHAR(255));`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL;`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_status VARCHAR(50) DEFAULT 'PENDING';`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_room VARCHAR(255);`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_account_id VARCHAR(255);`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_fee INT;`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Unpaid';`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_status VARCHAR(100) DEFAULT 'Pending';`);
    await pool.query(`CREATE TABLE IF NOT EXISTS doctors (id VARCHAR(255) PRIMARY KEY,name VARCHAR(255) NOT NULL,email VARCHAR(255) UNIQUE NOT NULL,password VARCHAR(255) NOT NULL);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS patient_accounts (id VARCHAR(255) PRIMARY KEY,patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL,email VARCHAR(255) UNIQUE NOT NULL,phone VARCHAR(50),password_hash VARCHAR(255) NOT NULL,full_name VARCHAR(255) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,last_login TIMESTAMP,email_verified BOOLEAN DEFAULT false,status VARCHAR(50) DEFAULT 'active');`);
    await pool.query(`CREATE TABLE IF NOT EXISTS clinical_notes (id VARCHAR(255) PRIMARY KEY,appointment_id VARCHAR(255) UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,subjective TEXT,objective TEXT,assessment TEXT,plan TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS followups (followup_id VARCHAR(255) PRIMARY KEY,patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE CASCADE,consultation_id VARCHAR(255) REFERENCES appointments(id) ON DELETE CASCADE,last_visit_date VARCHAR(255) NOT NULL,followup_date VARCHAR(255) NOT NULL,current_stage VARCHAR(50),message TEXT,message_status VARCHAR(50) DEFAULT 'Pending',doctor_notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS followup_reminders (reminder_id VARCHAR(255) PRIMARY KEY,followup_id VARCHAR(255) REFERENCES followups(followup_id) ON DELETE CASCADE,reminder_date VARCHAR(255) NOT NULL,stage VARCHAR(50) NOT NULL,status VARCHAR(50) DEFAULT 'Pending');`);
    await pool.query(`CREATE TABLE IF NOT EXISTS documents (id VARCHAR(255) PRIMARY KEY,name VARCHAR(255) NOT NULL,category VARCHAR(100) NOT NULL,size VARCHAR(50) NOT NULL,uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,file_data TEXT);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (id VARCHAR(255) PRIMARY KEY,title VARCHAR(255) NOT NULL,message TEXT NOT NULL,status VARCHAR(50) DEFAULT 'Unread',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS patient_notifications (id VARCHAR(255) PRIMARY KEY,patient_account_id VARCHAR(255) NOT NULL REFERENCES patient_accounts(id) ON DELETE CASCADE,title VARCHAR(255) NOT NULL,message TEXT NOT NULL,type VARCHAR(50) DEFAULT 'info',status VARCHAR(50) DEFAULT 'Unread',appointment_id VARCHAR(255),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS prescription TEXT;`);
    await pool.query(`ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS medicines TEXT;`);
    await pool.query(`ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS advice TEXT;`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL;`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS patient_account_id VARCHAR(255) REFERENCES patient_accounts(id) ON DELETE SET NULL;`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS appointment_id VARCHAR(255) REFERENCES appointments(id) ON DELETE SET NULL;`);
    const doctorEmail='drvarshabandi@gmail.com';
    const checkDoctor=await pool.query('SELECT * FROM doctors WHERE email=$1;',[doctorEmail]);
    if(!checkDoctor.rows.length){const hashedPassword=await bcrypt.hash(process.env.DOCTOR_PASSWORD||'drvarsha@07',10);await pool.query(`INSERT INTO doctors (id,name,email,password) VALUES ($1,'Dr. Varsha Bandi',$2,$3);`,['doc_varsha',doctorEmail,hashedPassword]);}
    console.log('✅ Database and EMR schemas verified successfully.');
  } catch(err){console.error('❌ Error initializing database tables:',err)}
}
initDb();

function authenticateToken(req,res,next){const token=(req.headers.authorization||'').split(' ')[1];if(!token)return res.status(401).json({success:false,error:'Access denied.'});jwt.verify(token,process.env.JWT_SECRET,(err,user)=>{if(err)return res.status(403).json({success:false,error:'Session expired.'});req.user=user;next()})}
function authenticatePatientToken(req,res,next){const token=(req.headers.authorization||'').split(' ')[1];if(!token)return res.status(401).json({success:false,error:'Patient access denied.'});jwt.verify(token,process.env.JWT_SECRET,(err,patient)=>{if(err)return res.status(403).json({success:false,error:'Patient session expired.'});if(!patient.patientAccountId)return res.status(403).json({success:false,error:'Invalid patient token.'});req.patient=patient;next()})}

io.on('connection',(socket)=>{
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect',()=>console.log(`[Socket] Client disconnected: ${socket.id}`));
});

app.post('/api/auth/login',async(req,res)=>{const{email,password}=req.body;try{const r=await pool.query('SELECT * FROM doctors WHERE email=$1;',[email]);const doctor=r.rows[0];if(!doctor)return res.status(400).json({success:false,error:'Invalid credentials'});const ok=await bcrypt.compare(password,doctor.password);if(!ok)return res.status(400).json({success:false,error:'Invalid credentials'});const token=jwt.sign({id:doctor.id,email:doctor.email},process.env.JWT_SECRET,{expiresIn:'24h'});res.json({success:true,token,doctorName:doctor.name})}catch(err){res.status(500).json({success:false,error:'Server authentication error'})}});

app.post('/api/appointments',async(req,res)=>{
  let {name,email,phone,date,time,reason,patient_account_id,service_name,consultation_fee}=req.body;
  const appointmentId=Date.now().toString();
  if(!phone||phone.trim()==='')phone='no_phone_'+appointmentId;
  try{
    let patientResult=await pool.query('SELECT id FROM patients WHERE phone=$1;',[phone]);
    let patientId;
    if(!patientResult.rows.length){patientId='pat_'+Date.now();await pool.query('INSERT INTO patients (id,name,phone,created_at) VALUES ($1,$2,$3,NOW());',[patientId,name,phone])}else patientId=patientResult.rows[0].id;
    let verifiedAccountId=null;
    if(patient_account_id){const a=await pool.query('SELECT id FROM patient_accounts WHERE id=$1;',[patient_account_id]);if(a.rows.length)verifiedAccountId=patient_account_id}
    if(!verifiedAccountId){const emailClean=email?email.trim().toLowerCase():'';const phoneClean=phone&&!phone.startsWith('no_phone_')?phone.trim():'';if(emailClean||phoneClean){let q;if(emailClean&&phoneClean)q=await pool.query('SELECT id FROM patient_accounts WHERE LOWER(email)=$1 OR phone=$2 LIMIT 1;',[emailClean,phoneClean]);else if(emailClean)q=await pool.query('SELECT id FROM patient_accounts WHERE LOWER(email)=$1 LIMIT 1;',[emailClean]);else q=await pool.query('SELECT id FROM patient_accounts WHERE phone=$1 LIMIT 1;',[phoneClean]);if(q.rows.length)verifiedAccountId=q.rows[0].id}}
    const result=await pool.query(`INSERT INTO appointments (id,name,email,phone,date,time,reason,status,meeting_status,patient_id,patient_account_id,service_name,consultation_fee,payment_status,consultation_status) VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending','PENDING',$8,$9,$10,$11,'Unpaid','Pending') RETURNING *;`,[appointmentId,name,email,phone,date,time,reason,patientId,verifiedAccountId,service_name||'Homoeopathic Consultation',consultation_fee||800]);
    const notificationId='notif_'+Date.now();
    await pool.query(`INSERT INTO notifications (id,title,message,status,created_at) VALUES ($1,$2,$3,'Unread',NOW());`,[notificationId,'New Appointment Booking',`Patient ${name} booked an appointment for ${date} at ${time}.`]);
    io.emit('new_booking_notification',{appointment:result.rows[0],notificationId});
    res.status(201).json({success:true,appointment:result.rows[0]});
  }catch(err){console.error(err);res.status(500).json({success:false,error:'Database error'})}
});

app.get('/api/appointments',authenticateToken,async(req,res)=>{try{const r=await pool.query('SELECT * FROM appointments ORDER BY date ASC,time ASC;');res.json(r.rows.map(row=>({id:row.id,name:row.name,email:row.email,phone:row.phone,date:row.date,time:row.time,reason:row.reason,status:row.status,meeting_status:row.meeting_status||'PENDING',videoRoom:row.video_room,video_room:row.video_room,patientId:row.patient_id,patient_account_id:row.patient_account_id,service_name:row.service_name||'Homoeopathic Consultation',consultation_fee:row.consultation_fee||800,payment_status:row.payment_status||'Unpaid',consultation_status:row.consultation_status||'Pending'})))}catch(err){res.status(500).json({success:false,error:'Failed to load appointments.'})}});

app.put('/api/appointments/:id/status',authenticateToken,async(req,res)=>{
  const{status,meeting_status,date,time,consultation_status}=req.body;
  try{
    let query='UPDATE appointments SET status=$1'; const params=[status]; let i=1;
    if(meeting_status){query+=`, meeting_status=$${++i}`;params.push(meeting_status)}
    if(date){query+=`, date=$${++i}`;params.push(date)}
    if(time){query+=`, time=$${++i}`;params.push(time)}
    if(consultation_status){query+=`, consultation_status=$${++i}`;params.push(consultation_status)}
    query+=` WHERE id=$${++i} RETURNING *;`;params.push(req.params.id);
    const r=await pool.query(query,params);const appt=r.rows[0];if(!appt)return res.status(404).json({success:false,error:'Appointment not found.'});
    if(status==='Rejected')await pool.query(`UPDATE appointments SET meeting_status='PENDING' WHERE id=$1;`,[appt.id]);
    if(consultation_status==='Payment Request Sent'&&appt.patient_account_id){const n='pnotif_pay_'+Date.now();await pool.query(`INSERT INTO patient_notifications (id,patient_account_id,title,message,type,appointment_id) VALUES ($1,$2,$3,$4,'payment_request',$5);`,[n,appt.patient_account_id,'Payment Request',`Please complete the consultation payment of ₹${appt.consultation_fee||800} to confirm your appointment.` ,appt.id])}
    if(status==='Confirmed'&&appt.patient_account_id){const n='pnotif_confirm_'+Date.now();await pool.query(`INSERT INTO patient_notifications (id,patient_account_id,title,message,type,appointment_id) VALUES ($1,$2,$3,$4,'appointment_confirmed',$5);`,[n,appt.patient_account_id,'Appointment Confirmed','Your appointment has been confirmed by Dr. Varsha Bandi. The Join Consultation button will appear when the consultation room is ready.',appt.id])}
    io.emit('appointment_updated',{id:appt.id,status:appt.status,meeting_status:appt.meeting_status,videoRoom:appt.video_room,video_room:appt.video_room,patient_account_id:appt.patient_account_id,consultation_status:appt.consultation_status,payment_status:appt.payment_status});
    res.json({success:true,appointment:appt});
  }catch(err){console.error('Status update error:',err);res.status(500).json({success:false,error:'Failed to update status.'})}
});

app.post('/api/meeting/start',authenticateToken,async(req,res)=>{const{appointmentId,roomName}=req.body;try{const room=roomName||`Homeopathway-${appointmentId}`;const r=await pool.query(`UPDATE appointments SET status='Confirmed',meeting_status='READY',video_room=$1,consultation_status='Doctor Joined Video Consultation' WHERE id=$2 RETURNING *;`,[room,appointmentId]);const appt=r.rows[0];if(!appt)return res.status(404).json({success:false,error:'Appointment not found.'});if(appt.patient_account_id){const n='pnotif_join_'+Date.now();await pool.query(`INSERT INTO patient_notifications (id,patient_account_id,title,message,type,appointment_id) VALUES ($1,$2,$3,$4,'meeting_ready',$5);`,[n,appt.patient_account_id,'Doctor is Ready','Dr. Varsha Bandi has joined and is ready for your consultation.',appt.id])}io.emit('appointment_updated',{id:appt.id,status:'Confirmed',meeting_status:'READY',videoRoom:room,video_room:room,patient_account_id:appt.patient_account_id,consultation_status:'Doctor Joined Video Consultation'});res.json({success:true,roomName:room,appointment:appt})}catch(err){console.error(err);res.status(500).json({success:false,error:'Failed to start meeting.'})}});

app.get('/api/patients',authenticateToken,async(req,res)=>{try{const q=`SELECT p.id,p.name,p.phone,p.age,p.gender,p.address,p.medical_history,p.notes,p.created_at,MAX(a.date) as last_visit_date,COUNT(a.id) as total_visits FROM patients p LEFT JOIN appointments a ON p.id=a.patient_id GROUP BY p.id ORDER BY p.name ASC;`;const r=await pool.query(q);res.json({success:true,patients:r.rows})}catch(err){res.status(500).json({success:false,error:'Failed to load patients.'})}});

app.get('/api/patient/profile',authenticatePatientToken,async(req,res)=>{try{const r=await pool.query(`SELECT pa.id,pa.email,pa.phone,pa.full_name,pa.created_at,pa.last_login,p.age,p.gender,p.address,p.medical_history,p.notes FROM patient_accounts pa LEFT JOIN patients p ON pa.patient_id=p.id WHERE pa.id=$1;`,[req.patient.patientAccountId]);if(!r.rows.length)return res.status(404).json({success:false,error:'Profile not found.'});res.json({success:true,profile:r.rows[0]})}catch(err){res.status(500).json({success:false,error:'Failed to load profile.'})}});

app.get('/api/patient/appointments',authenticatePatientToken,async(req,res)=>{try{const r=await pool.query(`SELECT a.*,cn.subjective,cn.objective,cn.assessment,cn.plan,cn.prescription,cn.medicines,cn.advice,f.followup_date,f.doctor_notes as followup_notes FROM appointments a LEFT JOIN clinical_notes cn ON a.id=cn.appointment_id LEFT JOIN followups f ON a.id=f.consultation_id WHERE a.patient_account_id=$1 ORDER BY a.date DESC,a.time DESC;`,[req.patient.patientAccountId]);res.json({success:true,appointments:r.rows})}catch(err){res.status(500).json({success:false,error:'Failed to load appointments.'})}});

app.get('/api/patient/notifications',authenticatePatientToken,async(req,res)=>{try{const r=await pool.query(`SELECT * FROM patient_notifications WHERE patient_account_id=$1 ORDER BY created_at DESC LIMIT 50;`,[req.patient.patientAccountId]);const unread=r.rows.filter(n=>n.status==='Unread').length;res.json({success:true,notifications:r.rows,unreadCount:unread})}catch(err){res.status(500).json({success:false,error:'Failed to load notifications.'})}});
app.post('/api/patient/notifications/mark-read',authenticatePatientToken,async(req,res)=>{try{await pool.query(`UPDATE patient_notifications SET status='Read' WHERE patient_account_id=$1;`,[req.patient.patientAccountId]);res.json({success:true})}catch(err){res.status(500).json({success:false,error:'Failed to mark notifications.'})}});

const PORT=process.env.PORT||3001;
server.listen(PORT,()=>console.log(`🚀 Doctor Telehealth server running on port ${PORT}`));
