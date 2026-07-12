package com.example.network

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class OfflineSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val TAG = "OfflineSyncWorker"
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "Offline recovery synchronization worker started.")
        val auth = AuthPreferences(applicationContext)
        if (!auth.isLoggedIn) {
            Log.d(TAG, "User is not logged in. Skipping recovery sync.")
            return Result.success()
        }

        return try {
            ClinicSyncManager.syncAllData(applicationContext)
            Log.d(TAG, "Offline recovery sync completed successfully.")
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Offline recovery sync failed", e)
            if (runAttemptCount < 3) {
                Log.d(TAG, "Retrying offline recovery sync (Attempt ${runAttemptCount + 1}).")
                Result.retry()
            } else {
                Log.e(TAG, "Max attempts reached. Stopping offline recovery sync.")
                Result.failure()
            }
        }
    }
}
