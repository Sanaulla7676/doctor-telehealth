package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.db.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ClinicViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = ClinicRepository(application)

    val patients: StateFlow<List<PatientEntity>> = repository.getAllPatientsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val appointments: StateFlow<List<AppointmentEntity>> = repository.getAllAppointmentsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val followUps: StateFlow<List<FollowUpEntity>> = repository.getAllFollowUpsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val documents: StateFlow<List<DocumentEntity>> = repository.getAllDocumentsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        // Run full cache refresh on load to ensure absolute state conformity
        refreshAll()
    }

    fun refreshAll() {
        viewModelScope.launch(Dispatchers.IO) {
            repository.syncAll()
        }
    }

    fun addPatient(
        name: String,
        phone: String,
        age: Int,
        gender: String,
        address: String,
        medicalHistory: String,
        notes: String
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.createPatient(name, phone, age, gender, address, medicalHistory, notes)
        }
    }

    fun confirmAppointment(appointmentId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.confirmAppointment(appointmentId)
        }
    }

    fun sendWhatsAppPayment(appointmentId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.sendWhatsAppPayment(appointmentId)
        }
    }

    fun acceptAppointment(appointmentId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.acceptAppointment(appointmentId)
        }
    }

    fun rejectAppointment(appointmentId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.rejectAppointment(appointmentId)
        }
    }

    fun joinVideo(appointmentId: String, onResult: (String?) -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            val roomName = repository.joinVideo(appointmentId)
            launch(Dispatchers.Main) {
                onResult(roomName)
            }
        }
    }

    fun saveClinicalNotes(
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
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.saveClinicalNotes(
                appointmentId, subjective, objective, assessment, plan,
                prescription, medicines, advice, followupDate, followupNotes
            )
        }
    }

    fun addFollowUp(
        appointmentId: String,
        followupDate: String,
        notes: String
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.addFollowUp(appointmentId, followupDate, notes)
        }
    }

    fun disableFollowUp(appointmentId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.disableFollowUp(appointmentId)
        }
    }

    fun markFollowUpMessagePrepared(id: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.markFollowUpMessagePrepared(id)
        }
    }

    fun getPatientHistory(patientId: String, callback: (PatientEntity, List<AppointmentEntity>) -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            val patient = repository.getPatientById(patientId) ?: return@launch
            val visits = repository.getAppointmentsForPatient(patientId)
            launch(Dispatchers.Main) {
                callback(patient, visits)
            }
        }
    }

    fun uploadDocument(name: String, category: String, size: String, data: String = "") {
        viewModelScope.launch(Dispatchers.IO) {
            repository.uploadDocument(name, category, size, data)
        }
    }

    fun deleteDocument(id: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.deleteDocument(id)
        }
    }
}
