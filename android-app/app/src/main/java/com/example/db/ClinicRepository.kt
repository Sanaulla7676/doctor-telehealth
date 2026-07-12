package com.example.db

import android.content.Context
import com.example.network.*
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.*

class ClinicRepository(private val context: Context) {

    private val db = ClinicDatabase.getDatabase(context)
    private val dao = db.clinicDao()
    private val api = RetrofitClient.apiService
    private val auth = AuthPreferences(context)

    private fun getHeader(): String? {
        val t = auth.token ?: return null
        return "Bearer $t"
    }

    fun getAllPatientsFlow(): Flow<List<PatientEntity>> = dao.getAllPatientsFlow()
    fun getAllAppointmentsFlow(): Flow<List<AppointmentEntity>> = dao.getAllAppointmentsFlow()
    fun getAllFollowUpsFlow(): Flow<List<FollowUpEntity>> = dao.getAllFollowUpsFlow()
    fun getAllDocumentsFlow(): Flow<List<DocumentEntity>> = dao.getAllDocumentsFlow()

    suspend fun getPatientById(id: String): PatientEntity? = dao.getPatientById(id)
    suspend fun getAppointmentById(id: String): AppointmentEntity? = dao.getAppointmentById(id)
    suspend fun getAppointmentsForPatient(patientId: String): List<AppointmentEntity> = dao.getAppointmentsForPatient(patientId)

    suspend fun syncAll(): Boolean {
        if (!auth.isLoggedIn) return false
        return try {
            ClinicSyncManager.syncAllData(context)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun createPatient(
        name: String,
        phone: String,
        age: Int,
        gender: String,
        address: String,
        medicalHistory: String,
        notes: String
    ): Boolean {
        val header = getHeader() ?: return false
        return try {
            val dto = PatientDto(
                id = "",
                name = name,
                phone = phone,
                age = age,
                gender = gender,
                address = address,
                medical_history = medicalHistory,
                notes = notes,
                created_at = null,
                total_visits = 1
            )
            val response = api.createPatient(header, dto)
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun confirmAppointment(appointmentId: String): Boolean {
        val header = getHeader() ?: return false
        return try {
            val response = api.confirmAppointment(header, appointmentId)
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun sendWhatsAppPayment(appointmentId: String): Boolean {
        val header = getHeader() ?: return false
        return try {
            val response = api.sendWhatsAppPayment(header, appointmentId)
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun acceptAppointment(appointmentId: String): Boolean {
        val header = getHeader() ?: return false
        return try {
            val response = api.acceptAppointment(header, appointmentId)
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun rejectAppointment(appointmentId: String): Boolean {
        val header = getHeader() ?: return false
        return try {
            val response = api.rejectAppointment(header, appointmentId)
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun joinVideo(appointmentId: String): String? {
        val header = getHeader() ?: return null
        return try {
            val response = api.joinVideo(header, appointmentId)
            if (response.isSuccessful && response.body()?.success == true) {
                syncAll()
                val room = response.body()?.appointment?.videoRoom ?: response.body()?.appointment?.video_room
                room ?: "HomeopathwayRoom-$appointmentId"
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun saveClinicalNotes(
        appointmentId: String,
        subjective: String,
        objective: String,
        assessment: String,
        plan: String,
        prescription: String,
        medicines: String,
        advice: String,
        followupDate: String,
        followupNotes: String
    ): Boolean {
        val header = getHeader() ?: return false
        return try {
            val notesResponse = api.saveClinicalNotes(header, NoteRequest(
                appointmentId = appointmentId,
                subjective = subjective,
                objective = objective,
                assessment = assessment,
                plan = plan,
                prescription = prescription,
                medicines = medicines,
                advice = advice
            ))

            if (notesResponse.isSuccessful) {
                if (followupDate.isNotBlank()) {
                    val app = dao.getAppointmentById(appointmentId)
                    if (app != null) {
                        api.saveFollowUp(header, FollowUpRequest(
                            consultationId = appointmentId,
                            patientId = app.patientId,
                            lastVisitDate = app.date,
                            followupDate = followupDate,
                            doctorNotes = followupNotes
                        ))
                    }
                }
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun addFollowUp(
        appointmentId: String,
        followupDate: String,
        notes: String
    ): Boolean {
        val header = getHeader() ?: return false
        return try {
            val app = dao.getAppointmentById(appointmentId) ?: return false
            val response = api.saveFollowUp(header, FollowUpRequest(
                consultationId = appointmentId,
                patientId = app.patientId,
                lastVisitDate = app.date,
                followupDate = followupDate,
                doctorNotes = notes
            ))
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun disableFollowUp(appointmentId: String): Boolean {
        val header = getHeader() ?: return false
        return try {
            val response = api.saveFollowUp(header, FollowUpRequest(
                consultationId = appointmentId,
                patientId = "",
                lastVisitDate = "",
                followupDate = "",
                doctorNotes = "",
                disabled = true
            ))
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun markFollowUpMessagePrepared(id: String): Boolean {
        val header = getHeader() ?: return false
        return try {
            val response = api.markReminderPrepared(header, MarkPreparedRequest(id))
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun uploadDocument(name: String, category: String, size: String, base64Data: String): Boolean {
        val header = getHeader() ?: return false
        return try {
            val requestData = base64Data.ifBlank { "dGVzdF9maWxlX2NvbnRlbnRzX2Jhc2U2NA==" }
            val response = api.uploadDocument(header, DocumentUploadRequest(name, category, size, requestData))
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun deleteDocument(id: String): Boolean {
        val header = getHeader() ?: return false
        return try {
            val response = api.deleteDocument(header, id)
            if (response.isSuccessful) {
                syncAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
