package com.example.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import com.example.MainActivity

class ClinicNotificationHelper(private val context: Context) {

    private val sharedPrefs: SharedPreferences =
        context.getSharedPreferences("homeopathway_notifications", Context.MODE_PRIVATE)

    companion object {
        const val CHANNEL_ID = "homeopathway_booking_alerts"
        const val CHANNEL_NAME = "Website Booking Alerts"
        const val CHANNEL_DESC = "Notifies when patients book appointments on the clinical website."
        
        const val PREF_RING = "pref_notification_ring"
        const val PREF_VIBRATE = "pref_notification_vibrate"
    }

    // Settings Getters & Setters
    var isRingEnabled: Boolean
        get() = sharedPrefs.getBoolean(PREF_RING, true)
        set(value) {
            sharedPrefs.edit().putBoolean(PREF_RING, value).apply()
            updateNotificationChannel()
        }

    var isVibrateEnabled: Boolean
        get() = sharedPrefs.getBoolean(PREF_VIBRATE, true)
        set(value) {
            sharedPrefs.edit().putBoolean(PREF_VIBRATE, value).apply()
            updateNotificationChannel()
        }

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESC
                enableLights(true)
                lightColor = android.graphics.Color.RED
            }

            // Apply customizable sound/vibration logic directly to the OS-level channel for modern Android
            if (isVibrateEnabled) {
                channel.enableVibration(true)
                channel.vibrationPattern = longArrayOf(0, 400, 200, 400)
            } else {
                channel.enableVibration(false)
                channel.vibrationPattern = null
            }

            if (isRingEnabled) {
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()
                channel.setSound(soundUri, audioAttributes)
            } else {
                channel.setSound(null, null)
            }

            manager.createNotificationChannel(channel)
        }
    }

    fun updateNotificationChannel() {
        createNotificationChannel()
    }

    /**
     * Triggers a real Android system notification.
     * Integrates custom ringtone/vibration settings in code to guarantee behavior.
     */
    fun showBookingNotification(patientName: String, appointmentTime: String, reason: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = if (isRingEnabled) {
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        } else {
            null
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle("New Website Booking Detected")
            .setContentText("$patientName booked for today at $appointmentTime")
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("Patient: $patientName\nTime: $appointmentTime\nReason: $reason\n\nTap to open clinical dashboard.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        if (soundUri != null) {
            builder.setSound(soundUri)
        } else {
            builder.setSilent(true)
        }

        if (isVibrateEnabled) {
            builder.setVibrate(longArrayOf(0, 400, 200, 400))
            triggerHardwareVibration()
        } else {
            builder.setVibrate(longArrayOf(0))
        }

        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
    }

    private fun triggerHardwareVibration() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                manager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(300)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
