package com.example.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "patients")
data class PatientEntity(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String,
    val age: Int,
    val gender: String,
    val address: String,
    val medicalHistory: String,
    val notes: String,
    val createdAt: Long,
    val totalVisits: Int
)

@Entity(tableName = "appointments")
data class AppointmentEntity(
    @PrimaryKey val id: String,
    val patientId: String,
    val patientName: String,
    val phone: String,
    val date: String,           // YYYY-MM-DD
    val time: String,           // HH:MM AM/PM
    val reason: String,
    val status: String,         // "Pending", "WhatsApp Sent", "Confirmed", "Rejected", "Cancelled"
    // SOAP notes
    val subjective: String = "",
    val objective: String = "",
    val assessment: String = "",
    val plan: String = "",
    // NEW — Prescription & clinical outputs (Feature 1 / Feature 8)
    val prescription: String = "",
    val medicines: String = "",
    val advice: String = "",
    // NEW — Billing & payment workflow (Feature 4/5)
    val serviceName: String = "",
    val consultationFee: Int = 0,
    val paymentStatus: String = "Unpaid",   // "Unpaid", "Payment Request Sent", "Paid"
    val consultationStatus: String = "Pending", // "Pending", "Accepted", "Rejected", "Completed"
    // Follow-up
    val followupDate: String = "",
    val followupNotes: String = "",
    // Video room
    val videoRoom: String = ""
)

@Entity(tableName = "followups")
data class FollowUpEntity(
    @PrimaryKey val id: String,
    val appointmentId: String,
    val patientId: String,
    val patientName: String,
    val contactNumber: String,
    val lastVisitDate: String,
    val followupDate: String,
    val doctorNotes: String,
    val stage: String,           // "DAY_MINUS_3", "DAY_MINUS_2", "DAY_MINUS_1", "DAY_0"
    val preparedMessage: String,
    val reminderStatus: String,  // "Message Prepared", "Pending"
    val disabled: Boolean = false
)

@Entity(tableName = "documents")
data class DocumentEntity(
    @PrimaryKey val id: String,
    val name: String,
    val category: String,       // "Guidelines", "Reports", "Reference Books", "Patient Documents"
    val uploadedAt: Long,
    val size: String,
    val fileData: String,       // base64 or URI
    val appointmentId: String = ""
)

// NEW — Patient notification entity for local caching
@Entity(tableName = "patient_notifications")
data class PatientNotificationEntity(
    @PrimaryKey val id: String,
    val title: String,
    val message: String,
    val type: String,           // "payment", "appointment", "video", "notes", "info"
    val status: String,         // "Unread", "Read"
    val appointmentId: String?,
    val createdAt: Long
)

@Dao
interface ClinicDao {
    // ─── Patients ──────────────────────────────────────────────
    @Query("SELECT * FROM patients ORDER BY createdAt DESC")
    suspend fun getAllPatients(): List<PatientEntity>

    @Query("SELECT * FROM patients ORDER BY createdAt DESC")
    fun getAllPatientsFlow(): Flow<List<PatientEntity>>

    @Query("SELECT * FROM patients WHERE id = :id")
    suspend fun getPatientById(id: String): PatientEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPatient(patient: PatientEntity)

    @Update
    suspend fun updatePatient(patient: PatientEntity)

    // ─── Appointments ──────────────────────────────────────────
    @Query("SELECT * FROM appointments ORDER BY date ASC, time ASC")
    suspend fun getAllAppointments(): List<AppointmentEntity>

    @Query("SELECT * FROM appointments ORDER BY date ASC, time ASC")
    fun getAllAppointmentsFlow(): Flow<List<AppointmentEntity>>

    @Query("SELECT * FROM appointments WHERE id = :id")
    suspend fun getAppointmentById(id: String): AppointmentEntity?

    @Query("SELECT * FROM appointments WHERE patientId = :patientId ORDER BY date DESC")
    suspend fun getAppointmentsForPatient(patientId: String): List<AppointmentEntity>

    @Query("SELECT * FROM appointments WHERE status = 'Pending' ORDER BY date ASC")
    suspend fun getPendingAppointments(): List<AppointmentEntity>

    @Query("SELECT * FROM appointments WHERE status = 'Confirmed' ORDER BY date ASC")
    suspend fun getConfirmedAppointments(): List<AppointmentEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAppointment(appointment: AppointmentEntity)

    @Update
    suspend fun updateAppointment(appointment: AppointmentEntity)

    // ─── Follow-ups ────────────────────────────────────────────
    @Query("SELECT * FROM followups WHERE disabled = 0 ORDER BY followupDate ASC")
    suspend fun getAllFollowUps(): List<FollowUpEntity>

    @Query("SELECT * FROM followups WHERE disabled = 0 ORDER BY followupDate ASC")
    fun getAllFollowUpsFlow(): Flow<List<FollowUpEntity>>

    @Query("SELECT * FROM followups WHERE appointmentId = :appointmentId LIMIT 1")
    suspend fun getFollowUpForAppointment(appointmentId: String): FollowUpEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFollowUp(followUp: FollowUpEntity)

    @Update
    suspend fun updateFollowUp(followUp: FollowUpEntity)

    // ─── Documents ─────────────────────────────────────────────
    @Query("SELECT * FROM documents ORDER BY uploadedAt DESC")
    suspend fun getAllDocuments(): List<DocumentEntity>

    @Query("SELECT * FROM documents ORDER BY uploadedAt DESC")
    fun getAllDocumentsFlow(): Flow<List<DocumentEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDocument(document: DocumentEntity)

    @Query("DELETE FROM documents WHERE id = :id")
    suspend fun deleteDocumentById(id: String)

    // ─── Patient Notifications ─────────────────────────────────
    @Query("SELECT * FROM patient_notifications ORDER BY createdAt DESC LIMIT 50")
    suspend fun getAllPatientNotifications(): List<PatientNotificationEntity>

    @Query("SELECT COUNT(*) FROM patient_notifications WHERE status = 'Unread'")
    suspend fun getUnreadNotificationCount(): Int

    @Query("SELECT COUNT(*) FROM patient_notifications WHERE status = 'Unread'")
    fun getUnreadNotificationCountFlow(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPatientNotification(notification: PatientNotificationEntity)

    @Query("UPDATE patient_notifications SET status = 'Read' WHERE status = 'Unread'")
    suspend fun markAllPatientNotificationsRead()

    @Query("DELETE FROM patient_notifications WHERE id NOT IN (SELECT id FROM patient_notifications ORDER BY createdAt DESC LIMIT 100)")
    suspend fun pruneOldNotifications()
}

@Database(
    entities = [
        PatientEntity::class,
        AppointmentEntity::class,
        FollowUpEntity::class,
        DocumentEntity::class,
        PatientNotificationEntity::class
    ],
    version = 2,        // Bumped from 1 → 2 for new columns
    exportSchema = false
)
abstract class ClinicDatabase : RoomDatabase() {
    abstract fun clinicDao(): ClinicDao

    companion object {
        @Volatile
        private var INSTANCE: ClinicDatabase? = null

        fun getDatabase(context: android.content.Context): ClinicDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ClinicDatabase::class.java,
                    "homeopathway-clinic-db"
                )
                .fallbackToDestructiveMigration()  // safe for dev; use migrations in prod
                .enableMultiInstanceInvalidation()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
