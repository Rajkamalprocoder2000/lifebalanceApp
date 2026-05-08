package com.anonymous.lifebalancemobile

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

class LifeBalanceReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != LifeBalanceNativeModule.ACTION_REMINDER_FIRE) {
      return
    }

    val reminderId =
      intent.getStringExtra(LifeBalanceNativeModule.EXTRA_REMINDER_ID) ?: return
    val title =
      intent.getStringExtra(LifeBalanceNativeModule.EXTRA_REMINDER_TITLE)
        ?: context.getString(R.string.app_name)
    val body =
      intent.getStringExtra(LifeBalanceNativeModule.EXTRA_REMINDER_BODY).orEmpty()

    ensureReminderChannel(context)

    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS,
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }

    val openAppIntent = Intent(context, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    val contentIntent = PendingIntent.getActivity(
      context,
      reminderId.hashCode(),
      openAppIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val notification = NotificationCompat.Builder(
      context,
      LifeBalanceNativeModule.REMINDER_CHANNEL_ID,
    )
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setDefaults(Notification.DEFAULT_ALL)
      .setVibrate(longArrayOf(0, 300, 250, 300))
      .setAutoCancel(true)
      .setContentIntent(contentIntent)
      .build()

    NotificationManagerCompat.from(context).notify(reminderId.hashCode(), notification)
  }

  private fun ensureReminderChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val channel = NotificationChannel(
      LifeBalanceNativeModule.REMINDER_CHANNEL_ID,
      "LifeBalance Reminders",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Scheduled reminder alerts from LifeBalance"
      enableLights(true)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 300, 250, 300)
      setSound(defaultSound, audioAttributes)
      setShowBadge(true)
      lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
    }

    manager.createNotificationChannel(channel)
  }
}
