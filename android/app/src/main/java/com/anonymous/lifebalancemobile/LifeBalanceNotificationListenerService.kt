package com.anonymous.lifebalancemobile

import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class LifeBalanceNotificationListenerService : NotificationListenerService() {
  private val handler = Handler(Looper.getMainLooper())

  override fun onListenerConnected() {
    super.onListenerConnected()
    Log.d(TAG, "Notification listener connected")
    scheduleMutedNotificationSweep("listener_connected")
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    super.onNotificationPosted(sbn)

    if (sbn == null) {
      Log.d(TAG, "Notification posted callback received with null payload")
      return
    }

    if (sbn.packageName == applicationContext.packageName) {
      return
    }

    val mutedPackages = loadMutedPackages()
    if (!mutedPackages.contains(sbn.packageName)) {
      return
    }

    Log.d(
      TAG,
      "Muted package notification posted: package=${sbn.packageName} key=${sbn.key}",
    )
    cancelNotificationSafely(sbn.key, "posted_callback")
    scheduleMutedNotificationSweep("posted_callback_delayed")
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    super.onNotificationRemoved(sbn)

    if (sbn != null) {
      Log.d(TAG, "Notification removed: package=${sbn.packageName} key=${sbn.key}")
    }
  }

  private fun scheduleMutedNotificationSweep(reason: String) {
    handler.postDelayed(
      {
        cancelMutedNotifications(reason)
      },
      SWEEP_DELAY_MS,
    )
  }

  private fun cancelMutedNotifications(reason: String) {
    val mutedPackages = loadMutedPackages()
    if (mutedPackages.isEmpty()) {
      return
    }

    val notifications = try {
      activeNotifications.orEmpty()
    } catch (error: Exception) {
      Log.w(TAG, "Unable to query active notifications for $reason", error)
      return
    }

    val keysToCancel = notifications
      .filter { notification ->
        notification.packageName != applicationContext.packageName &&
          mutedPackages.contains(notification.packageName)
      }
      .map { it.key }

    if (keysToCancel.isEmpty()) {
      return
    }

    try {
      cancelNotifications(keysToCancel.toTypedArray())
      Log.d(TAG, "Muted notification sweep canceled ${keysToCancel.size} notification(s) for $reason")
    } catch (error: Exception) {
      Log.w(TAG, "Bulk cancel failed for $reason", error)
      keysToCancel.forEach { key ->
        cancelNotificationSafely(key, reason)
      }
    }
  }

  private fun cancelNotificationSafely(key: String, reason: String) {
    try {
      cancelNotification(key)
      Log.d(TAG, "Canceled notification key=$key reason=$reason")
    } catch (error: Exception) {
      Log.w(TAG, "Cancel failed for key=$key reason=$reason", error)
    }
  }

  private fun loadMutedPackages(): Set<String> =
    applicationContext.getSharedPreferences(
      LifeBalanceNativeModule.PREFS_NAME,
      MODE_PRIVATE,
    ).getStringSet(
      LifeBalanceNativeModule.KEY_MUTED_NOTIFICATION_PACKAGES,
      emptySet(),
    )?.toSet() ?: emptySet()

  companion object {
    private const val TAG = "LBNotificationMute"
    private const val SWEEP_DELAY_MS = 250L
  }
}
