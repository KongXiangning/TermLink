package com.termlink.app

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
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Foreground service that keeps the Android process alive while a Codex task
 * is actively running (status = running / reconnecting / waiting_approval).
 *
 * Lifecycle is driven by [MainShellActivity] via [start] / [updateStatus] /
 * [stop] companion helpers — the service does NOT manage its own start
 * conditions.
 */
class CodexTaskForegroundService : Service() {

    companion object {
        private const val TAG = "CodexFgService"
        private const val CHANNEL_ID = "codex_task_active"
        private const val NOTIFICATION_ID = 9201
        private const val EXTRA_STATUS = "codex_task_status"

        private val ACTIVE_STATUSES = setOf("running", "reconnecting", "waiting_approval")

        fun isActiveStatus(status: String?): Boolean {
            return ACTIVE_STATUSES.contains(status?.lowercase()?.trim())
        }

        fun start(context: Context, status: String) {
            val intent = Intent(context, CodexTaskForegroundService::class.java).apply {
                putExtra(EXTRA_STATUS, status)
            }
            // Use regular startService() to avoid EMUI's strict 5-second
            // startForegroundService() enforcement.  The calling Activity is
            // always in the foreground, so background execution limits don't
            // apply.  The service still calls startForeground() in onCreate().
            context.startService(intent)
        }

        fun updateStatus(context: Context, status: String) {
            start(context, status)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, CodexTaskForegroundService::class.java))
        }
    }

    override fun onCreate() {
        super.onCreate()
        ensureNotificationChannel()
        // Immediately satisfy the foreground-service contract in onCreate()
        // to prevent RemoteServiceException on EMUI/slow devices where
        // onStartCommand() may be delayed beyond the 5-second deadline.
        try {
            val notification = buildNotification("running")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceCompat.startForeground(
                    this,
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForeground in onCreate failed", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val status = intent?.getStringExtra(EXTRA_STATUS) ?: "running"
        // Update the notification with the actual status
        val notification = buildNotification(status)
        try {
            val nm = getSystemService(NotificationManager::class.java)
            nm?.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "notification update failed", e)
        }
        if (!isActiveStatus(status)) {
            Log.i(TAG, "Non-active status received ($status), stopping self")
            stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "Service destroyed")
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.codex_task_notification_channel),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = getString(R.string.codex_task_notification_channel_desc)
            setShowBadge(false)
        }
        val nm = getSystemService(NotificationManager::class.java)
        nm?.createNotificationChannel(channel)
    }

    private fun buildNotification(status: String): Notification {
        val contentText = when (status.lowercase().trim()) {
            "running" -> getString(R.string.codex_task_notif_running)
            "reconnecting" -> getString(R.string.codex_task_notif_reconnecting)
            "waiting_approval" -> getString(R.string.codex_task_notif_waiting)
            else -> getString(R.string.codex_task_notif_running)
        }

        val tapIntent = Intent(this, MainShellActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.codex_task_notif_title))
            .setContentText(contentText)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }
}
