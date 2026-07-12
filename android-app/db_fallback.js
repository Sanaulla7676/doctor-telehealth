const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

class JSONPool {
    constructor() {
        this.filePath = path.join(__dirname, 'db_fallback.json');
        this.data = {
            patients: [],
            appointments: [],
            doctors: [],
            clinical_notes: [],
            followups: [],
            followup_reminders: [],
            documents: [],
            notifications: []
        };
        this.load();
        this.initDefaultDoctor();
    }

    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            } catch (e) {
                console.error("Error loading JSON db:", e);
            }
        } else {
            this.save();
        }
    }

    save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (e) {
            console.error("Error saving JSON db:", e);
        }
    }

    async initDefaultDoctor() {
        const doctorEmail = 'drvarshabandi@gmail.com';
        const doc = this.data.doctors.find(d => d.email === doctorEmail);
        if (!doc) {
            const hashedPassword = await bcrypt.hash('drvarsha@07', 10);
            this.data.doctors.push({
                id: 'doc_varsha',
                name: 'Dr. Varsha Bandi',
                email: doctorEmail,
                password: hashedPassword
            });
            this.save();
        }
    }

    async query(sql, params = []) {
        this.load(); // Reload latest data
        const sqlClean = sql.trim().replace(/\s+/g, ' ');

        // 1. Create tables / Alter tables
        if (sqlClean.startsWith('CREATE TABLE') || sqlClean.startsWith('ALTER TABLE')) {
            return { rows: [], rowCount: 0 };
        }

        // 2. Select Doctors by email
        if (sqlClean.includes('SELECT * FROM doctors WHERE email =')) {
            const email = params[0];
            const doctor = this.data.doctors.find(d => d.email === email);
            return { rows: doctor ? [doctor] : [], rowCount: doctor ? 1 : 0 };
        }

        // 3. Insert into doctors
        if (sqlClean.startsWith('INSERT INTO doctors')) {
            const [id, name, email, password] = params;
            const doctor = { id, name, email, password };
            this.data.doctors.push(doctor);
            this.save();
            return { rows: [doctor], rowCount: 1 };
        }

        // 4. Select all appointments with sort
        if (sqlClean.includes('SELECT * FROM appointments ORDER BY date ASC, time ASC;')) {
            const sorted = [...this.data.appointments].sort((a, b) => {
                const dateComp = (a.date || '').localeCompare(b.date || '');
                if (dateComp !== 0) return dateComp;
                return (a.time || '').localeCompare(b.time || '');
            });
            return { rows: sorted, rowCount: sorted.length };
        }

        // 5. Select all appointments without sort
        if (sqlClean.includes('SELECT * FROM appointments;')) {
            return { rows: this.data.appointments, rowCount: this.data.appointments.length };
        }

        // 6. Select patient by phone or name
        if (sqlClean.includes('SELECT * FROM patients WHERE phone =') && sqlClean.includes('OR name =')) {
            const [phone, name] = params;
            const patient = this.data.patients.find(p => p.phone === phone || p.name === name);
            return { rows: patient ? [patient] : [], rowCount: patient ? 1 : 0 };
        }

        // 7. Select patient by phone
        if (sqlClean.includes('SELECT id FROM patients WHERE phone =')) {
            const phone = params[0];
            const patient = this.data.patients.find(p => p.phone === phone);
            return { rows: patient ? [{ id: patient.id }] : [], rowCount: patient ? 1 : 0 };
        }

        // 8. Select patient by id
        if (sqlClean.includes('SELECT * FROM patients WHERE id =')) {
            const id = params[0];
            const patient = this.data.patients.find(p => p.id === id);
            return { rows: patient ? [patient] : [], rowCount: patient ? 1 : 0 };
        }

        // 9. Select clinical notes by appointment id
        if (sqlClean.includes('SELECT * FROM clinical_notes WHERE appointment_id =')) {
            const apptId = params[0];
            const note = this.data.clinical_notes.find(n => n.appointment_id === apptId);
            return { rows: note ? [note] : [], rowCount: note ? 1 : 0 };
        }

        // 10. Select followups by consultation_id
        if (sqlClean.includes('SELECT * FROM followups WHERE consultation_id =')) {
            const consultId = params[0];
            const fup = this.data.followups.find(f => f.consultation_id === consultId);
            return { rows: fup ? [fup] : [], rowCount: fup ? 1 : 0 };
        }

        // 11. Insert or update patient
        if (sqlClean.startsWith('INSERT INTO patients') && sqlClean.includes('ON CONFLICT')) {
            const [id, name, phone, age, gender, address, medical_history, notes] = params;
            let patient = this.data.patients.find(p => p.id === id);
            if (patient) {
                patient.name = name;
                patient.phone = phone;
                patient.age = age;
                patient.gender = gender;
                patient.address = address;
                patient.medical_history = medical_history;
                patient.notes = notes;
            } else {
                patient = { id, name, phone, age, gender, address, medical_history, notes, created_at: new Date().toISOString() };
                this.data.patients.push(patient);
            }
            this.save();
            return { rows: [patient], rowCount: 1 };
        }

        // 12. Insert patient simple
        if (sqlClean.startsWith('INSERT INTO patients')) {
            const [id, name, phone] = params;
            let patient = this.data.patients.find(p => p.phone === phone);
            if (!patient) {
                patient = { id, name, phone, age: null, gender: null, address: null, medical_history: null, notes: null, created_at: new Date().toISOString() };
                this.data.patients.push(patient);
                this.save();
            }
            return { rows: [patient], rowCount: 1 };
        }

        // 13. Insert appointment
        if (sqlClean.startsWith('INSERT INTO appointments')) {
            const [id, name, email, phone, date, time, reason, patient_id] = params;
            const appt = { id, name, email, phone, date, time, reason, status: 'Pending', video_room: null, patient_id };
            this.data.appointments.push(appt);
            this.save();
            return { rows: [appt], rowCount: 1 };
        }

        // 14. Insert notification
        if (sqlClean.startsWith('INSERT INTO notifications')) {
            const [id, title, message] = params;
            const notif = { id, title, message, status: 'Unread', created_at: new Date().toISOString() };
            this.data.notifications.push(notif);
            this.save();
            return { rows: [notif], rowCount: 1 };
        }

        // 15. Update appointment patient_id
        if (sqlClean.startsWith('UPDATE appointments SET patient_id =')) {
            const [patientId, id] = params;
            const appt = this.data.appointments.find(a => a.id === id);
            if (appt) {
                appt.patient_id = patientId;
                this.save();
            }
            return { rows: appt ? [appt] : [], rowCount: appt ? 1 : 0 };
        }

        // 16. Update appointment status (confirm)
        if (sqlClean.includes("UPDATE appointments SET status = 'Confirmed'")) {
            const [videoRoom, id] = params;
            const appt = this.data.appointments.find(a => a.id === id);
            if (appt) {
                appt.status = 'Confirmed';
                appt.video_room = videoRoom;
                this.save();
            }
            return { rows: appt ? [appt] : [], rowCount: appt ? 1 : 0 };
        }

        // 17. Select appointment by id
        if (sqlClean.includes('SELECT * FROM appointments WHERE id =')) {
            const id = params[0];
            const appt = this.data.appointments.find(a => a.id === id);
            return { rows: appt ? [appt] : [], rowCount: appt ? 1 : 0 };
        }

        // 18. Delete followups
        if (sqlClean.startsWith('DELETE FROM followups WHERE consultation_id =')) {
            const consultId = params[0];
            this.data.followups = this.data.followups.filter(f => f.consultation_id !== consultId);
            this.save();
            return { rows: [], rowCount: 1 };
        }

        // 19. Insert followup
        if (sqlClean.startsWith('INSERT INTO followups')) {
            const [followup_id, patient_id, consultation_id, last_visit_date, followup_date, doctor_notes] = params;
            const fup = {
                followup_id,
                patient_id,
                consultation_id,
                last_visit_date,
                followup_date,
                current_stage: 'DAY_MINUS_3',
                message: '',
                message_status: 'Pending',
                doctor_notes,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.data.followups.push(fup);

            // Generate reminders
            const parsedFollowupDate = new Date(followup_date);
            const addDays = (d, days) => {
                const res = new Date(d);
                res.setDate(res.getDate() + days);
                return res.toISOString().split('T')[0];
            };

            const stages = [
                { s: 'DAY_MINUS_3', d: -3 },
                { s: 'DAY_MINUS_2', d: -2 },
                { s: 'DAY_MINUS_1', d: -1 },
                { s: 'DAY_0', d: 0 }
            ];

            stages.forEach(stage => {
                const rDate = addDays(parsedFollowupDate, stage.d);
                this.data.followup_reminders.push({
                    reminder_id: 'rem_' + Math.random().toString(36).substr(2, 9),
                    followup_id,
                    reminder_date: rDate,
                    stage: stage.s,
                    status: 'Pending'
                });
            });

            this.save();
            return { rows: [fup], rowCount: 1 };
        }

        // 20. Update reminders message prepared
        if (sqlClean.startsWith("UPDATE followup_reminders SET status = 'Message Prepared'")) {
            const reminderId = params[0];
            const reminder = this.data.followup_reminders.find(r => r.reminder_id === reminderId);
            if (reminder) {
                reminder.status = 'Message Prepared';
                this.save();
            }
            return { rows: [], rowCount: reminder ? 1 : 0 };
        }

        // 21. Select all documents
        if (sqlClean.includes('SELECT id, name, category, size, uploaded_at, file_data FROM documents')) {
            const docs = this.data.documents.map(({ id, name, category, size, uploaded_at, file_data }) => ({ id, name, category, size, uploaded_at, file_data }));
            return { rows: docs, rowCount: docs.length };
        }

        // 22. Select document file_data
        if (sqlClean.includes('SELECT name, category, file_data FROM documents WHERE id =')) {
            const id = params[0];
            const doc = this.data.documents.find(d => d.id === id);
            return { rows: doc ? [{ name: doc.name, category: doc.category, file_data: doc.file_data }] : [], rowCount: doc ? 1 : 0 };
        }

        // 23. Insert document
        if (sqlClean.startsWith('INSERT INTO documents')) {
            const [id, name, category, size, file_data] = params;
            const doc = { id, name, category, size, uploaded_at: new Date().toISOString(), file_data };
            this.data.documents.push(doc);
            this.save();
            return { rows: [doc], rowCount: 1 };
        }

        // 24. Update document
        if (sqlClean.startsWith('UPDATE documents SET name =')) {
            const [name, id] = params;
            const doc = this.data.documents.find(d => d.id === id);
            if (doc) {
                doc.name = name;
                this.save();
            }
            return { rows: [], rowCount: doc ? 1 : 0 };
        }

        // 25. Delete document
        if (sqlClean.startsWith('DELETE FROM documents WHERE id =')) {
            const id = params[0];
            this.data.documents = this.data.documents.filter(d => d.id !== id);
            this.save();
            return { rows: [], rowCount: 1 };
        }

        // 26. Select all notifications
        if (sqlClean.includes('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50;')) {
            const sorted = [...this.data.notifications].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            return { rows: sorted.slice(0, 50), rowCount: Math.min(sorted.length, 50) };
        }

        // 27. Select unread notification count
        if (sqlClean.includes("SELECT COUNT(id) FROM notifications WHERE status = 'Unread'")) {
            const count = this.data.notifications.filter(n => n.status === 'Unread').length;
            return { rows: [{ count: String(count) }], rowCount: 1 };
        }

        // 28. Update notifications to read
        if (sqlClean.includes("UPDATE notifications SET status = 'Read'")) {
            this.data.notifications.forEach(n => {
                if (n.status === 'Unread') n.status = 'Read';
            });
            this.save();
            return { rows: [], rowCount: 1 };
        }

        // 29. Insert or update clinical notes
        if (sqlClean.startsWith('INSERT INTO clinical_notes') && sqlClean.includes('ON CONFLICT')) {
            const [id, appointment_id, subjective, objective, assessment, plan] = params;
            let note = this.data.clinical_notes.find(n => n.appointment_id === appointment_id);
            if (note) {
                note.subjective = subjective;
                note.objective = objective;
                note.assessment = assessment;
                note.plan = plan;
            } else {
                note = { id, appointment_id, subjective, objective, assessment, plan, created_at: new Date().toISOString() };
                this.data.clinical_notes.push(note);
            }
            this.save();
            return { rows: [note], rowCount: 1 };
        }

        // 30. Patients list with last visit date and total visits
        if (sqlClean.includes('SELECT p.id, p.name, p.phone, p.age, p.gender')) {
            const resultRows = this.data.patients.map(p => {
                const appts = this.data.appointments.filter(a => a.patient_id === p.id);
                const visitDates = appts.map(a => a.date).filter(Boolean);
                const lastVisitDate = visitDates.length > 0 ? visitDates.sort().reverse()[0] : null;
                return {
                    id: p.id,
                    name: p.name,
                    phone: p.phone,
                    age: p.age,
                    gender: p.gender,
                    address: p.address,
                    medical_history: p.medical_history,
                    notes: p.notes,
                    created_at: p.created_at,
                    last_visit_date: lastVisitDate,
                    total_visits: String(appts.length)
                };
            }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            return { rows: resultRows, rowCount: resultRows.length };
        }

        // 31. Patient timeline query
        if (sqlClean.includes('SELECT a.id as appointment_id, a.date, a.time, a.reason')) {
            const patientId = params[0];
            const appts = this.data.appointments.filter(a => a.patient_id === patientId);
            const timeline = appts.map(a => {
                const note = this.data.clinical_notes.find(n => n.appointment_id === a.id) || {};
                const fup = this.data.followups.find(f => f.consultation_id === a.id) || {};
                return {
                    appointment_id: a.id,
                    date: a.date,
                    time: a.time,
                    reason: a.reason,
                    status: a.status,
                    subjective: note.subjective || null,
                    objective: note.objective || null,
                    assessment: note.assessment || null,
                    plan: note.plan || null,
                    followup_date: fup.followup_date || null,
                    current_stage: fup.current_stage || null
                };
            }).sort((a, b) => {
                const dComp = (b.date || '').localeCompare(a.date || '');
                if (dComp !== 0) return dComp;
                return (b.time || '').localeCompare(a.time || '');
            });
            return { rows: timeline, rowCount: timeline.length };
        }

        // 32. Reminders query (join)
        if (sqlClean.includes('SELECT p.name as patient_name, p.phone as contact_number')) {
            const todayStr = params[0];
            const activeReminders = this.data.followup_reminders.filter(r => r.reminder_date === todayStr);
            const joined = activeReminders.map(r => {
                const fup = this.data.followups.find(f => f.followup_id === r.followup_id) || {};
                const p = this.data.patients.find(pat => pat.id === fup.patient_id) || {};
                return {
                    patient_name: p.name || 'Unknown Patient',
                    contact_number: p.phone || '',
                    last_visit_date: fup.last_visit_date || '',
                    followup_date: fup.followup_date || '',
                    summary: fup.doctor_notes || '',
                    followup_id: fup.followup_id || '',
                    stage: r.stage,
                    reminder_id: r.reminder_id,
                    reminder_status: r.status
                };
            });
            return { rows: joined, rowCount: joined.length };
        }

        return { rows: [], rowCount: 0 };
    }
}

module.exports = { JSONPool };
