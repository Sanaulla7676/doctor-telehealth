package com.example.network

import android.content.Context
import android.content.SharedPreferences

class AuthPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("homeopathway_auth", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_DOCTOR_NAME = "doctor_name"
        private const val KEY_DOCTOR_EMAIL = "doctor_email"
    }

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) {
            prefs.edit().putString(KEY_TOKEN, value).apply()
        }

    var doctorName: String?
        get() = prefs.getString(KEY_DOCTOR_NAME, null)
        set(value) {
            prefs.edit().putString(KEY_DOCTOR_NAME, value).apply()
        }

    var doctorEmail: String?
        get() = prefs.getString(KEY_DOCTOR_EMAIL, null)
        set(value) {
            prefs.edit().putString(KEY_DOCTOR_EMAIL, value).apply()
        }

    val isLoggedIn: Boolean
        get() = token != null

    fun clear() {
        prefs.edit().clear().apply()
    }
}
