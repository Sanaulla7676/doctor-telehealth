package com.example.network

import android.content.Context
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit


// ─── Auth DTOs ───────────────────────────────────────────────
data class LoginRequest(val email: String, val password: String)
data class LoginResponse(val success: Boolean, val token: String?, val doctorName: String?, val error: String?)

// ─── Patient DTOs ─────────────────────────────────────────────
data class PatientDto(
    val id: String,
    val name: String,
    val phone: String,
    val age: Int?,
    val gender: String?,
    val address: String?,
    val medical_history: String?,
    val notes: String?,
    val created_at: String?,
    val total_visits: Int?
)
data class PatientsContainerDto(val success: Boolean, val patients: List<PatientDto>)

// ─── Appointment DTOs ─────────────────────────────────────────
data class AppointmentDto(
    val id: String,
    val name: String,
    val email: String,
    val phone: String?,
    val date: String,
    val time: String,
    val reason: String,
    val status: String,
    val videoRoom: String?,
    val video_room: String?,
    val patientId: String?,
    val patient_account_id: String?,
    // NEW fields — Feature 4/5/6
    val service_name: String?,
    val consultation_fee: Int?,
    val payment_status: String?,
    val consultation_status: String?,
    val meeting_status: String?,
    // Clinical note fields (returned via GET /api/patient/appointments join)
    val prescription: String?,
    val medicines: String?,
    val advice: String?,
    val assessment: String?,
    val subjective: String?,
    val objective: String?,
    val plan: String?,
    val followup_date: String?,
    val followup_notes: String?
)
data class AppointmentContainerDto(val success: Boolean, val appointment: AppointmentDto?)
data class AppointmentsListContainerDto(val success: Boolean, val appointments: List<AppointmentDto>)

// Generic action response
data class ActionResponse(val success: Boolean, val error: String?)

// Meeting lifecycle DTOs
data class StartMeetingRequest(val appointmentId: String, val roomName: String)
data class StartMeetingResponse(val success: Boolean, val roomName: String?)

// ─── Clinical Notes DTOs ──────────────────────────────────────
data class NoteRequest(
    val appointmentId: String,
    val subjective: String,
    val objective: String,
    val assessment: String,
    val plan: String,
    val prescription: String? = null,
    val medicines: String? = null,
    val advice: String? = null
)
data class NoteResponse(val success: Boolean)

data class NoteDto(
    val id: String,
    val appointment_id: String,
    val subjective: String?,
    val objective: String?,
    val assessment: String?,
    val plan: String?,
    val prescription: String?,
    val medicines: String?,
    val advice: String?
)
data class NoteGetContainerDto(val success: Boolean, val note: NoteDto?)

// ─── Follow-Up DTOs ───────────────────────────────────────────
data class FollowUpRequest(
    val consultationId: String,
    val patientId: String,
    val lastVisitDate: String,
    val followupDate: String,
    val doctorNotes: String,
    val disabled: Boolean = false
)
data class FollowUpResponseDto(
    val followup_id: String,
    val patient_id: String,
    val consultation_id: String,
    val last_visit_date: String,
    val followup_date: String,
    val doctor_notes: String?,
    val current_stage: String?,
    val message: String?,
    val message_status: String?
)
data class FollowUpContainerDto(val success: Boolean, val followup: FollowUpResponseDto?)

// All followups (bulk GET) DTOs
data class AllFollowUpDto(
    val followup_id: String,
    val patient_id: String?,
    val consultation_id: String?,
    val last_visit_date: String?,
    val followup_date: String?,
    val doctor_notes: String?,
    val current_stage: String?,
    val message: String?,
    val message_status: String?,
    val patient_name: String?,
    val patient_phone: String?
)
data class AllFollowUpsContainerDto(val success: Boolean, val followups: List<AllFollowUpDto>)

// ─── Reminder DTOs ────────────────────────────────────────────
data class ReminderDto(
    val patient_name: String,
    val contact_number: String,
    val last_visit_date: String,
    val followup_date: String,
    val summary: String?,
    val followup_id: String,
    val stage: String,
    val reminder_id: String,
    val reminder_status: String,
    val prepared_message: String
)
data class RemindersContainerDto(val success: Boolean, val followupsToday: List<ReminderDto>)
data class MarkPreparedRequest(val reminderId: String)
data class MarkPreparedResponse(val success: Boolean)

// ─── Document DTOs ────────────────────────────────────────────
data class DocumentDto(
    val id: String,
    val name: String,
    val category: String,
    val size: String,
    val uploaded_at: String?,
    val file_data: String?,
    val appointment_id: String?
)
data class DocumentsContainerDto(val success: Boolean, val documents: List<DocumentDto>)
data class DocumentUploadRequest(
    val name: String,
    val category: String,
    val size: String,
    val file_data: String,
    val appointment_id: String? = null
)
data class DocumentUploadContainerDto(val success: Boolean, val document: DocumentDto?)

// ─── Patient Notification DTOs ───────────────────────────────
data class PatientNotificationDto(
    val id: String,
    val title: String,
    val message: String,
    val type: String,
    val status: String,
    val appointment_id: String?,
    val created_at: String
)
data class PatientNotificationsContainerDto(val success: Boolean, val notifications: List<PatientNotificationDto>)

// ─── Patient Account DTOs ─────────────────────────────────────
data class PatientRegisterRequest(val full_name: String, val phone: String, val email: String, val password: String)
data class PatientLoginRequest(val email: String, val password: String)
data class PatientAuthResponse(val success: Boolean, val token: String?, val error: String?)
data class PatientProfileDto(val id: String, val full_name: String, val phone: String?, val email: String?)
data class PatientProfileContainerDto(val success: Boolean, val profile: PatientProfileDto?)

// ─── Retrofit API Interface ────────────────────────────────────
interface ClinicApiService {

    // Doctor Auth
    @POST("/api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // Patient Account Auth
    @POST("/api/patient/register")
    suspend fun patientRegister(@Body request: PatientRegisterRequest): Response<PatientAuthResponse>

    @POST("/api/patient/login")
    suspend fun patientLogin(@Body request: PatientLoginRequest): Response<PatientAuthResponse>

    @GET("/api/patient/profile")
    suspend fun getPatientProfile(
        @Header("Authorization") tokenHeader: String
    ): Response<PatientProfileContainerDto>

    // Doctor — Appointments
    @GET("/api/appointments")
    suspend fun getAppointments(@Header("Authorization") tokenHeader: String): List<AppointmentDto>

    @POST("/api/appointments")
    suspend fun createAppointment(@Body request: AppointmentDto): Response<AppointmentContainerDto>

    @POST("/api/meeting/start")
    suspend fun startMeeting(
        @Header("Authorization") tokenHeader: String,
        @Body request: StartMeetingRequest
    ): Response<StartMeetingResponse>

    // Update status (cancel, reschedule, reject, whatsapp, accept)
    @PUT("/api/appointments/{id}/status")
    suspend fun updateAppointmentStatus(
        @Header("Authorization") tokenHeader: String,
        @Path("id") id: String,
        @Body body: Map<String, String>
    ): Response<AppointmentContainerDto>

    // Patient — Appointments (includes prescription/medicines/advice/followup)
    @GET("/api/patient/appointments")
    suspend fun getPatientAppointments(
        @Header("Authorization") tokenHeader: String
    ): Response<AppointmentsListContainerDto>

    // Doctor — Notifications (server.js: /api/notifications)
    @GET("/api/notifications")
    suspend fun getPatientNotifications(
        @Header("Authorization") tokenHeader: String
    ): Response<PatientNotificationsContainerDto>

    @POST("/api/notifications/mark-read")
    suspend fun markPatientNotificationsRead(
        @Header("Authorization") tokenHeader: String
    ): Response<ActionResponse>

    // Patients Management
    @GET("/api/patients")
    suspend fun getPatients(@Header("Authorization") tokenHeader: String): Response<PatientsContainerDto>

    @POST("/api/patients")
    suspend fun createPatient(
        @Header("Authorization") tokenHeader: String,
        @Body request: PatientDto
    ): Response<PatientDto>

    // Clinical Notes (with prescription, medicines, advice)
    @POST("/api/notes")
    suspend fun saveClinicalNotes(
        @Header("Authorization") tokenHeader: String,
        @Body request: NoteRequest
    ): Response<NoteResponse>

    @GET("/api/notes/{appointmentId}")
    suspend fun getClinicalNote(
        @Header("Authorization") tokenHeader: String,
        @Path("appointmentId") appointmentId: String
    ): Response<NoteGetContainerDto>

    // Follow-ups
    @POST("/api/followups")
    suspend fun saveFollowUp(
        @Header("Authorization") tokenHeader: String,
        @Body request: FollowUpRequest
    ): Response<FollowUpContainerDto>

    @GET("/api/followups")
    suspend fun getAllFollowUps(
        @Header("Authorization") tokenHeader: String
    ): Response<AllFollowUpsContainerDto>

    @GET("/api/followups/{appointmentId}")
    suspend fun getFollowUp(
        @Header("Authorization") tokenHeader: String,
        @Path("appointmentId") appointmentId: String
    ): Response<FollowUpContainerDto>

    // Reminders
    @GET("/api/dashboard/all-reminders")
    suspend fun getReminders(@Header("Authorization") tokenHeader: String): Response<RemindersContainerDto>

    @POST("/api/reminders/mark-prepared")
    suspend fun markReminderPrepared(
        @Header("Authorization") tokenHeader: String,
        @Body request: MarkPreparedRequest
    ): Response<MarkPreparedResponse>

    // Doctor — Documents
    @GET("/api/documents")
    suspend fun getDocuments(@Header("Authorization") tokenHeader: String): Response<DocumentsContainerDto>

    @POST("/api/documents")
    suspend fun uploadDocument(
        @Header("Authorization") tokenHeader: String,
        @Body request: DocumentUploadRequest
    ): Response<DocumentUploadContainerDto>

    @DELETE("/api/documents/{id}")
    suspend fun deleteDocument(
        @Header("Authorization") tokenHeader: String,
        @Path("id") id: String
    ): Response<Unit>

    // Feature 8 — Patient Document Upload
    @POST("/api/patient/documents")
    suspend fun uploadPatientDocument(
        @Header("Authorization") tokenHeader: String,
        @Body request: DocumentUploadRequest
    ): Response<DocumentUploadContainerDto>

    @GET("/api/patient/documents")
    suspend fun getPatientDocuments(
        @Header("Authorization") tokenHeader: String
    ): Response<DocumentsContainerDto>
}

// ─── Retrofit Client Provider ─────────────────────────────────
object RetrofitClient {
    private const val DEFAULT_URL = "https://doctor-telehealth.onrender.com/"

    @Volatile
    private var instance: ClinicApiService? = null
    private var currentUrl: String? = null

    fun getApiService(context: Context): ClinicApiService {
        val prefs = AuthPreferences(context)
        val url = prefs.serverUrl ?: DEFAULT_URL
        val baseUrl = if (url.endsWith("/")) url else "$url/"

        return instance?.let {
            if (currentUrl == baseUrl) {
                it
            } else {
                buildService(baseUrl)
            }
        } ?: synchronized(this) {
            instance?.let {
                if (currentUrl == baseUrl) it else buildService(baseUrl)
            } ?: buildService(baseUrl)
        }
    }

    private fun buildService(baseUrl: String): ClinicApiService {
        currentUrl = baseUrl
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(90, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
            .build()

        val moshi = Moshi.Builder()
            .addLast(KotlinJsonAdapterFactory())
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

        val service = retrofit.create(ClinicApiService::class.java)
        instance = service
        return service
    }

    val apiService: ClinicApiService
        get() = instance ?: buildService(DEFAULT_URL)

    fun resetInstance() {
        synchronized(this) {
            instance = null
            currentUrl = null
        }
    }
}
