package com.example.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.example.db.AppointmentEntity
import com.example.db.ClinicDatabase
import com.example.notification.ClinicNotificationHelper
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URISyntaxException

class SocketIOManager private constructor(private val context: Context) {

    private var socket: Socket? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val notificationHelper = ClinicNotificationHelper(context)
    private var isConnected = false
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val authPrefs = AuthPreferences(context)

    companion object {
        private const val TAG = "SocketIOManager"
        private const val DEFAULT_SOCKET_URL = "https://doctor-telehealth.onrender.com"

        @Volatile
        private var INSTANCE: SocketIOManager? = null

        fun getInstance(context: Context): SocketIOManager {
            return INSTANCE ?: synchronized(this) {
                val instance = SocketIOManager(context.applicationContext)
                INSTANCE = instance
                instance
            }
        }
    }

    init {
        registerNetworkCallback()
    }

    @Synchronized
    fun connect() {
        if (!authPrefs.isLoggedIn) {
            Log.d(TAG, "Cannot connect to socket. User is not logged in.")
            return
        }

        if (socket != null && socket!!.connected()) {
            Log.d(TAG, "Socket is already connected.")
            return
        }

        try {
            val opts = IO.Options().apply {
                reconnection = true
                reconnectionDelay = 1000 // Start reconnection after 1s
                reconnectionDelayMax = 15000 // Exponential backoff capped at 15s
                reconnectionAttempts = Int.MAX_VALUE // Infinite retry
                timeout = 20000 // 20s connection timeout
            }

            // Derive socket URL from saved server URL preference
            val savedUrl = authPrefs.serverUrl ?: DEFAULT_SOCKET_URL
            val socketUrl = if (savedUrl.endsWith("/")) savedUrl.dropLast(1) else savedUrl

            socket = IO.socket(socketUrl, opts)

            // Setup Event Handlers
            socket?.on(Socket.EVENT_CONNECT, Emitter.Listener {
                Log.d(TAG, "Socket connected successfully!")
                isConnected = true
                
                // Real-time catchup: Full database synchronization to capture any missed events during offline state
                scope.launch {
                    try {
                        ClinicSyncManager.syncAllData(context)
                    } catch (e: Exception) {
                        Log.e(TAG, "Catchup sync failed after connect", e)
                    }
                }
            })

            socket?.on(Socket.EVENT_DISCONNECT, Emitter.Listener { args ->
                Log.d(TAG, "Socket disconnected: ${args?.getOrNull(0)}")
                isConnected = false
            })

            socket?.on(Socket.EVENT_CONNECT_ERROR, Emitter.Listener { args ->
                Log.e(TAG, "Socket connection error: ${args?.getOrNull(0)}")
                isConnected = false
            })

            // 1. New Booking Notification Event
            socket?.on("new_booking_notification", Emitter.Listener { args ->
                try {
                    val data = args.getOrNull(0) as? JSONObject ?: return@Listener
                    val appointmentJson = data.getJSONObject("appointment")
                    val patientName = appointmentJson.optString("name", "Unknown Patient")
                    val appointmentTime = appointmentJson.optString("time", "No Time")
                    val appointmentDate = appointmentJson.optString("date", "")
                    val reason = appointmentJson.optString("reason", "Consultation")
                    val appointmentId = appointmentJson.optString("id", "socket_${System.currentTimeMillis()}")

                    Log.d(TAG, "Received new booking: $patientName for $appointmentTime")

                    // Show real system notification
                    notificationHelper.showBookingNotification(patientName, appointmentTime, reason)

                    // Persist notification to local DB immediately for NotificationCenter
                    scope.launch {
                        try {
                            val dao = ClinicDatabase.getDatabase(context).clinicDao()
                            val notifId = "notif_booking_$appointmentId"
                            val existing = dao.getAllPatientNotifications()
                            if (existing.none { it.id == notifId }) {
                                dao.insertPatientNotification(
                                    com.example.db.PatientNotificationEntity(
                                        id = notifId,
                                        title = "New Appointment Booking",
                                        message = "$patientName booked a consultation at $appointmentTime${if (appointmentDate.isNotBlank()) " on $appointmentDate" else ""}. Reason: $reason",
                                        type = "appointment",
                                        status = "Unread",
                                        appointmentId = appointmentId,
                                        createdAt = System.currentTimeMillis()
                                    )
                                )
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to persist socket notification to DB", e)
                        }
                    }

                    // Refresh repository cache reactively from server source of truth
                    scope.launch {
                        ClinicSyncManager.syncAllData(context)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error handling new_booking_notification event", e)
                }
            })


            // 2. Appointment Updated Event
            socket?.on("appointment_updated", Emitter.Listener { args ->
                try {
                    val data = args.getOrNull(0) as? JSONObject ?: return@Listener
                    val id = data.optString("id", "")
                    val name = data.optString("name", "")
                    val phone = data.optString("phone", "")
                    val date = data.optString("date", "")
                    val time = data.optString("time", "")
                    val reason = data.optString("reason", "")
                    val status = data.optString("status", "Pending")

                    Log.d(TAG, "Received appointment update event: $id to $status")

                    // Instantly sync database cache
                    scope.launch {
                        ClinicSyncManager.syncAllData(context)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error handling appointment_updated event", e)
                }
            })

            socket?.connect()
        } catch (e: URISyntaxException) {
            Log.e(TAG, "URISyntaxException creating socket connection", e)
        }
    }

    @Synchronized
    fun disconnect() {
        socket?.disconnect()
        socket = null
        isConnected = false
        Log.d(TAG, "Socket disconnected and closed.")
    }

    private fun registerNetworkCallback() {
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.d(TAG, "Internet connection available. Triggering socket reconnection.")
                if (authPrefs.isLoggedIn) {
                    Handler(Looper.getMainLooper()).postDelayed({
                        connect()
                    }, 1000)
                }
            }

            override fun onLost(network: Network) {
                Log.d(TAG, "Internet connection lost.")
                isConnected = false
            }
        })
    }
}
