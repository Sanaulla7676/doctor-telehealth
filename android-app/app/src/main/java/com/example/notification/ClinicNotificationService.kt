package com.example.notification

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.network.SocketIOManager

class ClinicNotificationService : Service() {

    private val FOREGROUND_NOTIF_ID = 9999
    private val FOREGROUND_CHANNEL_ID = "homeopathway_sync_channel"

    override fun onCreate() {
        super.onCreate()
        createForegroundChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createForegroundNotification()
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(FOREGROUND_NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(FOREGROUND_NOTIF_ID, notification)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback starting without type if permission not yet fully loaded
            try {
                startForeground(FOREGROUND_NOTIF_ID, notification)
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }

        // Activate real-time socket listeners
        SocketIOManager.getInstance(applicationContext).connect()

        return START_STICKY
    }

    private fun createForegroundChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                FOREGROUND_CHANNEL_ID,
                "Real-time Monitoring Gateway",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains connection for receiving instant scheduling updates."
            }
            manager.createNotificationChannel(channel)
        }
    }

    private fun createForegroundNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, FOREGROUND_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("Homeopathway Server Gateway")
            .setContentText("Connected in background for live booking notifications.")
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        SocketIOManager.getInstance(applicationContext).disconnect()
    }
}
