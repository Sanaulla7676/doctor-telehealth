package com.example.network

import android.content.Context
import com.example.db.*
import java.text.SimpleDateFormat
import java.util.*

object ClinicSyncManager {

    private fun parseDate(dateStr: String): Long {
        return try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")
            format.parse(dateStr)?.time ?: System.currentTimeMillis()
        } catch (e: Exception) {
            try {
                val altFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                altFormat.parse(dateStr)?.time ?: System.currentTimeMillis()
            } catch (ex: Exception) {
                System.currentTimeMillis()
            }
        }
    }

    suspend fun syncAllData(context: Context, onNewBookingDetected: (String, String, String) -> Unit = { _, _, _ -> }) {
        val auth = AuthPreferences(context)
        val token = auth.token ?: return
        val api = RetrofitClient.apiService
        val db = ClinicDatabase.getDatabase(context)
        val dao = db.clinicDao()

        val tokenHeader = "Bearer $token"

        try {
            // 1. Fetch Remote Patients
            val patientsResponse = api.getPatients(tokenHeader)
            if (patientsResponse.isSuccessful && patientsResponse.body()?.success == true) {
                val remotePatients = patientsResponse.body()?.patients ?: emptyList()
                remotePatients.forEach { dto ->
                    val entity = PatientEntity(
                        id = dto.id,
                        name = dto.name,
                        phone = dto.phone,
                        age = dto.age ?: 30,
                        gender = dto.gender ?: "Male",
                        address = dto.address ?: "",
                        medicalHistory = dto.medical_history ?: "",
                        notes = dto.notes ?: "",
                        createdAt = dto.created_at?.let { parseDate(it) } ?: System.currentTimeMillis(),
                        totalVisits = dto.total_visits ?: 1
                    )
                    dao.insertPatient(entity)
                }
            }

            // Keep track of appointments before sync to identify new bookings
            val appointmentsBefore = dao.getAllAppointments().map { it.id }.toSet()

            // 2. Fetch Remote Appointments
            val remoteAppts = api.getAppointments(tokenHeader)
            remoteAppts.forEach { dto ->
                var sub = ""
                var obj = ""
                var ass = ""
                var plan = ""
                var rx = ""
                var meds = ""
                var adv = ""
                var fupDate = ""
                var fupNotes = ""

                // Pull EMR notes for each appointment
                try {
                    val noteResponse = api.getClinicalNote(tokenHeader, dto.id)
                    if (noteResponse.isSuccessful && noteResponse.body()?.success == true) {
                        val note = noteResponse.body()?.note
                        if (note != null) {
                            sub = note.subjective ?: ""
                            obj = note.objective ?: ""
                            ass = note.assessment ?: ""
                            plan = note.plan ?: ""
                            rx = note.prescription ?: ""
                            meds = note.medicines ?: ""
                            adv = note.advice ?: ""
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                // Pull follow-up if scheduled
                try {
                    val fupResponse = api.getFollowUp(tokenHeader, dto.id)
                    if (fupResponse.isSuccessful && fupResponse.body()?.success == true) {
                        val fup = fupResponse.body()?.followup
                        if (fup != null) {
                            fupDate = fup.followup_date
                            fupNotes = fup.doctor_notes ?: ""
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                val entity = AppointmentEntity(
                    id = dto.id,
                    patientId = dto.patientId ?: "",
                    patientName = dto.name,
                    phone = dto.phone ?: "",
                    date = dto.date,
                    time = dto.time,
                    reason = dto.reason,
                    status = dto.status,
                    subjective = sub,
                    objective = obj,
                    assessment = ass,
                    plan = plan,
                    prescription = rx,
                    medicines = meds,
                    advice = adv,
                    serviceName = dto.service_name ?: "",
                    consultationFee = dto.consultation_fee ?: 0,
                    paymentStatus = dto.payment_status ?: "Unpaid",
                    consultationStatus = dto.consultation_status ?: "Pending",
                    followupDate = fupDate,
                    followupNotes = fupNotes,
                    videoRoom = dto.videoRoom ?: dto.video_room ?: ""
                )
                dao.insertAppointment(entity)

                // Trigger real alert for newly fetched website bookings!
                if (appointmentsBefore.isNotEmpty() && !appointmentsBefore.contains(dto.id)) {
                    onNewBookingDetected(dto.name, dto.time, dto.reason)
                }
            }

            // 3. Fetch Remote Documents
            val docsResponse = api.getDocuments(tokenHeader)
            if (docsResponse.isSuccessful && docsResponse.body()?.success == true) {
                val remoteDocs = docsResponse.body()?.documents ?: emptyList()
                
                // Clear obsolete documents from local db to sync deletion
                val localDocs = dao.getAllDocuments()
                val remoteIds = remoteDocs.map { it.id }.toSet()
                localDocs.forEach { doc ->
                    if (!remoteIds.contains(doc.id)) {
                        dao.deleteDocumentById(doc.id)
                    }
                }

                remoteDocs.forEach { dto ->
                    val entity = DocumentEntity(
                        id = dto.id,
                        name = dto.name,
                        category = dto.category,
                        uploadedAt = dto.uploaded_at?.let { parseDate(it) } ?: System.currentTimeMillis(),
                        size = dto.size,
                        fileData = dto.file_data ?: "",
                        appointmentId = dto.appointment_id ?: ""
                    )
                    dao.insertDocument(entity)
                }
            }

            // 4. Fetch Remote Reminders (Follow-ups)
            val remindersResponse = api.getReminders(tokenHeader)
            if (remindersResponse.isSuccessful && remindersResponse.body()?.success == true) {
                val remoteReminders = remindersResponse.body()?.followupsToday ?: emptyList()
                
                remoteReminders.forEach { dto ->
                    val entity = FollowUpEntity(
                        id = dto.reminder_id,
                        appointmentId = dto.followup_id,
                        patientId = dto.followup_id,
                        patientName = dto.patient_name,
                        contactNumber = dto.contact_number,
                        lastVisitDate = dto.last_visit_date,
                        followupDate = dto.followup_date,
                        doctorNotes = dto.summary ?: "",
                        stage = dto.stage,
                        preparedMessage = dto.prepared_message,
                        reminderStatus = dto.reminder_status
                    )
                    dao.insertFollowUp(entity)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
