package com.anonymous.lifebalancemobile

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.role.RoleManager
import android.content.ClipData
import android.content.ComponentName
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.service.notification.NotificationListenerService
import android.telephony.SubscriptionManager
import android.telephony.SmsManager
import android.util.Base64
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import org.json.JSONArray
import org.json.JSONObject

class LifeBalanceNativeModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private var pendingPickerPromise: Promise? = null

  private val activityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (requestCode != REQUEST_PICK_IMAGE && requestCode != REQUEST_PICK_AUDIO) {
          return
        }

        val promise = pendingPickerPromise
        pendingPickerPromise = null

        if (promise == null) {
          return
        }

        if (resultCode != Activity.RESULT_OK) {
          promise.reject("ERR_PICKER_CANCELLED", "Picker cancelled.")
          return
        }

        val uri = data?.data
        if (uri == null) {
          promise.reject("ERR_PICKER_NO_FILE", "No file was selected.")
          return
        }

        try {
          val takeFlags =
            data.flags and
              (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
          reactContext.contentResolver.takePersistableUriPermission(
            uri,
            takeFlags or Intent.FLAG_GRANT_READ_URI_PERMISSION,
          )
        } catch (_: Exception) {
          // Some providers do not expose persistable grants. The Uri can still be used immediately.
        }

        val payload = buildPickedFilePayload(uri)
        cachePendingPickedFile(
          if (requestCode == REQUEST_PICK_AUDIO) "audio" else "image",
          payload,
        )
        promise.resolve(payload)
      }
    }

  private val prefs by lazy {
    reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "LifeBalanceNative"

  @ReactMethod
  fun openNotificationPolicySettings() {
    val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun openNotificationListenerSettings() {
    val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun openDefaultAppsSettings() {
    val intent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun openAppNotificationSettings() {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
      putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun openReminderChannelSettings() {
    val intent =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply {
          putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
          putExtra(Settings.EXTRA_CHANNEL_ID, REMINDER_CHANNEL_ID)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      } else {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
          putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      }

    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun openExactAlarmSettings() {
    val intent =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${reactContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${reactContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      }

    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun requestCallScreeningRole(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      promise.resolve(false)
      return
    }

    val roleManager = reactContext.getSystemService(RoleManager::class.java)
    if (roleManager == null || !roleManager.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
      promise.resolve(false)
      return
    }

    val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
    val activity = reactContext.currentActivity
    if (activity != null) {
      activity.startActivity(intent)
    } else {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun hasNotificationPolicyAccess(promise: Promise) {
    val manager = reactContext.getSystemService(NotificationManager::class.java)
    promise.resolve(manager?.isNotificationPolicyAccessGranted ?: false)
  }

  @ReactMethod
  fun isNotificationListenerEnabled(promise: Promise) {
    val enabled = Settings.Secure.getString(
      reactContext.contentResolver,
      "enabled_notification_listeners",
    ) ?: ""
    promise.resolve(enabled.contains(reactContext.packageName))
  }

  @ReactMethod
  fun isCallScreeningRoleHeld(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      promise.resolve(false)
      return
    }

    val roleManager = reactContext.getSystemService(RoleManager::class.java)
    promise.resolve(roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) ?: false)
  }

  @ReactMethod
  fun getVoiceRecorderStatus(promise: Promise) {
    val microphoneGranted =
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.RECORD_AUDIO,
      ) == PackageManager.PERMISSION_GRANTED
    val phoneGranted =
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.READ_PHONE_STATE,
      ) == PackageManager.PERMISSION_GRANTED
    val callScreeningReady =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = reactContext.getSystemService(RoleManager::class.java)
        roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) ?: false
      } else {
        false
      }

    val result = Arguments.createMap().apply {
      putBoolean("microphoneGranted", microphoneGranted)
      putBoolean("phoneGranted", phoneGranted)
      putBoolean("callScreeningReady", callScreeningReady)
      putString("configuredLine", prefs.getString(KEY_VOICE_SELECTED_LINE, ""))
      putString("configuredLineNumber", prefs.getString(KEY_VOICE_SELECTED_LINE_NUMBER, ""))
      putInt("allowedCount", prefs.getStringSet(KEY_VOICE_ALLOWED_NUMBERS, emptySet()).orEmpty().size)
      putBoolean("speakerAssistEnabled", prefs.getBoolean(KEY_VOICE_SPEAKER_ASSIST, true))
      putString("lastEventText", prefs.getString(KEY_VOICE_LAST_EVENT_TEXT, ""))
      putString("lastEventType", prefs.getString(KEY_VOICE_LAST_EVENT_TYPE, ""))
    }

    promise.resolve(result)
  }

  @ReactMethod
  fun getActiveSimCards(promise: Promise) {
    try {
      val manager = reactContext.getSystemService(SubscriptionManager::class.java)
      if (manager == null) {
        promise.resolve(Arguments.createArray())
        return
      }

      val subscriptions =
        try {
          manager.activeSubscriptionInfoList ?: emptyList()
        } catch (_: SecurityException) {
          emptyList()
        }

      val result = Arguments.createArray()
      subscriptions.forEach { info ->
        val map = Arguments.createMap()
        map.putString("id", info.subscriptionId.toString())
        map.putInt("slotIndex", info.simSlotIndex)
        map.putString("carrierName", info.carrierName?.toString().orEmpty())
        map.putString("displayName", info.displayName?.toString().orEmpty())
        val number = normalizePhone(info.number)
        if (number.isNotEmpty()) {
          map.putString("number", number)
        } else {
          map.putNull("number")
        }
        result.pushMap(map)
      }

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("ERR_ACTIVE_SIMS", "Unable to fetch active SIM cards.", error)
    }
  }

  @ReactMethod
  fun getVoiceRecorderHistory(promise: Promise) {
    try {
      val raw = prefs.getString(KEY_VOICE_HISTORY, "[]").orEmpty()
      val parsed = JSONArray(raw)
      val result = Arguments.createArray()

      for (index in 0 until parsed.length()) {
        val item = parsed.optJSONObject(index) ?: continue
        val map = Arguments.createMap()
        map.putString("id", item.optString("id"))
        map.putString("callerNumber", item.optString("callerNumber"))
        map.putString("lineLabel", item.optString("lineLabel"))
        map.putString("lineNumber", item.optString("lineNumber"))
        map.putString("uri", item.optString("uri"))
        map.putString("mimeType", item.optString("mimeType", "audio/mp4"))
        map.putDouble("durationMs", item.optLong("durationMs").toDouble())
        map.putDouble("size", item.optLong("size").toDouble())
        map.putString("sourceLabel", item.optString("sourceLabel"))
        map.putDouble("timestamp", item.optLong("timestamp").toDouble())
        map.putString("status", item.optString("status", "recorded"))
        result.pushMap(map)
      }

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("ERR_VOICE_HISTORY", "Unable to fetch voice recorder history.", error)
    }
  }

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(true)
      return
    }

    val alarmManager = reactContext.getSystemService(AlarmManager::class.java)
    promise.resolve(alarmManager?.canScheduleExactAlarms() ?: false)
  }

  @ReactMethod
  fun getReminderNotificationStatus(promise: Promise) {
    val manager = reactContext.getSystemService(NotificationManager::class.java)
    if (manager == null) {
      promise.reject("ERR_REMINDER_NOTIFICATION_STATUS", "NotificationManager is unavailable.")
      return
    }

    val appNotificationsEnabled = manager.areNotificationsEnabled()
    val channel =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        manager.getNotificationChannel(REMINDER_CHANNEL_ID)
      } else {
        null
      }
    val channelImportance =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        channel?.importance ?: NotificationManager.IMPORTANCE_UNSPECIFIED
      } else if (appNotificationsEnabled) {
        NotificationManager.IMPORTANCE_HIGH
      } else {
        NotificationManager.IMPORTANCE_NONE
      }
    val canShowPopUp =
      appNotificationsEnabled &&
        (
          Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
            channel == null ||
            channel.importance >= NotificationManager.IMPORTANCE_HIGH
          )

    val result = Arguments.createMap().apply {
      putBoolean("appNotificationsEnabled", appNotificationsEnabled)
      putBoolean("channelExists", Build.VERSION.SDK_INT < Build.VERSION_CODES.O || channel != null)
      putInt("channelImportance", channelImportance)
      putBoolean("canShowPopUp", canShowPopUp)
    }

    promise.resolve(result)
  }

  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val packageManager = reactContext.packageManager
      val installedApplications =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          packageManager.getInstalledApplications(
            PackageManager.ApplicationInfoFlags.of(0),
          )
        } else {
          @Suppress("DEPRECATION")
          packageManager.getInstalledApplications(0)
        }

      val packageNames = HashSet<String>()
      val sortedApps = installedApplications
        .mapNotNull { applicationInfo ->
          val packageName = applicationInfo.packageName ?: return@mapNotNull null
          if (!shouldIncludeInstalledApp(packageManager, applicationInfo) || !packageNames.add(packageName)) {
            return@mapNotNull null
          }

          val label = packageManager.getApplicationLabel(applicationInfo)?.toString()?.trim().orEmpty()
          if (label.isBlank()) {
            return@mapNotNull null
          }

          val iconUri = drawableToDataUri(packageManager.getApplicationIcon(applicationInfo))

          InstalledAppPayload(
            packageName = packageName,
            label = label,
            type = mapInstalledAppType(applicationInfo, label, packageName),
            iconUri = iconUri,
          )
        }
        .sortedBy { app -> app.label.lowercase() }

      val result = Arguments.createArray()
      sortedApps.forEach { app ->
        val map = Arguments.createMap()
        map.putString("packageName", app.packageName)
        map.putString("name", app.label)
        map.putString("type", app.type)
        map.putString("iconUri", app.iconUri)
        result.pushMap(map)
      }

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("ERR_INSTALLED_APPS", "Unable to fetch installed apps.", error)
    }
  }

  @ReactMethod
  fun getMutedNotificationPackages(promise: Promise) {
    val packages = prefs.getStringSet(KEY_MUTED_NOTIFICATION_PACKAGES, emptySet()).orEmpty()
    val result = Arguments.createArray()
    packages.sorted().forEach { result.pushString(it) }
    promise.resolve(result)
  }

  @ReactMethod
  fun setMutedNotificationPackages(packageNames: ReadableArray, promise: Promise) {
    val sanitizedPackages = buildSet {
      for (index in 0 until packageNames.size()) {
        val packageName = packageNames.getString(index)?.trim().orEmpty()
        if (packageName.isNotBlank() && packageName != reactContext.packageName) {
          add(packageName)
        }
      }
    }

    prefs.edit()
      .putStringSet(KEY_MUTED_NOTIFICATION_PACKAGES, sanitizedPackages)
      .apply()

    requestNotificationListenerRebind()

    promise.resolve(true)
  }

  @ReactMethod
  fun refreshNotificationListenerBinding(promise: Promise) {
    requestNotificationListenerRebind()
    promise.resolve(true)
  }

  @ReactMethod
  fun pickImageFile(promise: Promise) {
    launchDocumentPicker(arrayOf("image/*"), REQUEST_PICK_IMAGE, promise)
  }

  @ReactMethod
  fun pickAudioFile(promise: Promise) {
    launchDocumentPicker(arrayOf("audio/*"), REQUEST_PICK_AUDIO, promise)
  }

  @ReactMethod
  fun consumePendingPickedFile(promise: Promise) {
    val type = prefs.getString(KEY_PENDING_PICKER_TYPE, null)
    val payloadRaw = prefs.getString(KEY_PENDING_PICKER_PAYLOAD, null)

    prefs
      .edit()
      .remove(KEY_PENDING_PICKER_TYPE)
      .remove(KEY_PENDING_PICKER_PAYLOAD)
      .apply()

    if (type.isNullOrBlank() || payloadRaw.isNullOrBlank()) {
      promise.resolve(null)
      return
    }

    try {
      val json = JSONObject(payloadRaw)
      val file = Arguments.createMap().apply {
        putString("uri", json.optString("uri"))
        putString("name", json.optString("name"))
        if (json.has("mimeType")) {
          putString("mimeType", json.optString("mimeType"))
        }
        if (json.has("size")) {
          putDouble("size", json.optDouble("size"))
        }
        if (json.has("durationMs")) {
          putDouble("durationMs", json.optDouble("durationMs"))
        }
      }

      promise.resolve(
        Arguments.createMap().apply {
          putString("requestType", type)
          putMap("file", file)
        },
      )
    } catch (error: Exception) {
      promise.reject("ERR_PENDING_PICKER_RESULT", "Unable to restore the last picked file.", error)
    }
  }

  @ReactMethod
  fun openExternalFile(uriString: String, mimeType: String?, promise: Promise) {
    val uri = toSharableUri(Uri.parse(uriString))
    val intent = Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(uri, mimeType ?: reactContext.contentResolver.getType(uri) ?: "*/*")
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    try {
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("ERR_OPEN_FILE", "Unable to open the selected file.", error)
    }
  }

  @ReactMethod
  fun deleteVoiceRecording(recordingId: String, uriString: String, promise: Promise) {
    try {
      val raw = prefs.getString(KEY_VOICE_HISTORY, "[]").orEmpty()
      val parsed = JSONArray(raw)
      val next = JSONArray()

      for (index in 0 until parsed.length()) {
        val item = parsed.optJSONObject(index) ?: continue
        val itemId = item.optString("id")
        val itemUri = item.optString("uri")
        val matchesId = recordingId.isNotBlank() && recordingId == itemId
        val matchesUri = uriString.isNotBlank() && uriString == itemUri
        if (!matchesId && !matchesUri) {
          next.put(item)
        }
      }

      prefs.edit().putString(KEY_VOICE_HISTORY, next.toString()).apply()

      var deleted = true
      if (uriString.isNotBlank()) {
        val parsedUri = Uri.parse(uriString)
        if (parsedUri.scheme == "file") {
          val path = parsedUri.path.orEmpty()
          if (path.isNotBlank()) {
            val file = File(path)
            if (file.exists()) {
              deleted = file.delete()
            }
          }
        }
      }

      promise.resolve(deleted)
    } catch (error: Exception) {
      promise.reject("ERR_DELETE_VOICE_RECORDING", "Unable to delete the selected recording.", error)
    }
  }

  @ReactMethod
  fun exportKeepNoteImage(
    title: String,
    body: String,
    checklist: ReadableArray,
    colorHex: String,
    imageUri: String?,
    audioLabel: String?,
    promise: Promise,
  ) {
    try {
      val width = 1080
      val padding = 64f
      val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#262331")
        textSize = 64f
        isFakeBoldText = true
      }
      val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#49455a")
        textSize = 38f
      }
      val metaPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#6e6980")
        textSize = 30f
      }
      val checklistPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#3a3648")
        textSize = 34f
      }

      val contentWidth = width - padding * 2
      val titleLines = wrapTextLines(title.ifBlank { "Untitled note" }, titlePaint, contentWidth)
      val bodyLines = body
        .split("\n")
        .flatMap { paragraph ->
          val trimmed = paragraph.trim()
          if (trimmed.isEmpty()) listOf("") else wrapTextLines(trimmed, bodyPaint, contentWidth)
        }
      val checklistLines = buildList {
        for (index in 0 until checklist.size()) {
          val line = checklist.getString(index)?.trim().orEmpty()
          if (line.isNotEmpty()) add(line)
        }
      }
      val audioLine = audioLabel?.trim().orEmpty()

      var imageBitmap: Bitmap? = null
      if (!imageUri.isNullOrBlank()) {
        reactContext.contentResolver.openInputStream(Uri.parse(imageUri))?.use { input ->
          imageBitmap = BitmapFactory.decodeStream(input)
        }
      }

      val scaledImageHeight =
        imageBitmap?.let { bitmap ->
          val ratio = contentWidth / bitmap.width.toFloat()
          (bitmap.height * ratio).toInt().coerceAtMost(420)
        } ?: 0

      val totalHeight =
        (padding +
          titleLines.size * 78f +
          if (bodyLines.isNotEmpty()) 26f + bodyLines.size * 50f else 0f +
          if (checklistLines.isNotEmpty()) 26f + checklistLines.size * 48f else 0f +
          if (scaledImageHeight > 0) 34f + scaledImageHeight else 0f +
          if (audioLine.isNotEmpty()) 42f + 78f else 0f +
          padding)
          .toInt()
          .coerceAtLeast(720)

      val bitmap = Bitmap.createBitmap(width, totalHeight, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      val backgroundColor =
        try {
          Color.parseColor(colorHex)
        } catch (_: Exception) {
          Color.parseColor("#f6f4fb")
        }
      canvas.drawColor(Color.parseColor("#f6f4fb"))

      val cardPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = backgroundColor
      }
      canvas.drawRoundRect(
        RectF(24f, 24f, width - 24f, totalHeight - 24f),
        36f,
        36f,
        cardPaint,
      )

      var cursorY = padding + 30f
      titleLines.forEach { line ->
        canvas.drawText(line, padding, cursorY, titlePaint)
        cursorY += 78f
      }

      if (bodyLines.isNotEmpty()) {
        cursorY += 10f
        bodyLines.forEach { line ->
          canvas.drawText(line, padding, cursorY, bodyPaint)
          cursorY += 50f
        }
      }

      if (checklistLines.isNotEmpty()) {
        cursorY += 12f
        checklistLines.forEach { line ->
          canvas.drawText(line, padding, cursorY, checklistPaint)
          cursorY += 48f
        }
      }

      imageBitmap?.let { bitmapSource ->
        if (scaledImageHeight > 0) {
          cursorY += 14f
          val scaledBitmap = Bitmap.createScaledBitmap(bitmapSource, contentWidth.toInt(), scaledImageHeight, true)
          canvas.drawBitmap(scaledBitmap, padding, cursorY, null)
          cursorY += scaledImageHeight + 22f
          if (scaledBitmap != bitmapSource) {
            scaledBitmap.recycle()
          }
        }
      }

      if (audioLine.isNotEmpty()) {
        val audioPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
          color = Color.parseColor("#e5e1ef")
        }
        canvas.drawRoundRect(
          RectF(padding, cursorY, width - padding, cursorY + 78f),
          20f,
          20f,
          audioPaint,
        )
        canvas.drawText("Audio: $audioLine", padding + 24f, cursorY + 48f, metaPaint)
      }

      val file = File(reactContext.cacheDir, "keep-note-${System.currentTimeMillis()}.png")
      FileOutputStream(file).use { output ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
      }
      bitmap.recycle()
      imageBitmap?.recycle()

      promise.resolve(buildPickedFilePayload(Uri.fromFile(file)))
    } catch (error: Exception) {
      promise.reject("ERR_EXPORT_KEEP_IMAGE", "Unable to export keep note image.", error)
    }
  }

  @ReactMethod
  fun saveFileToDownloads(uriString: String, fileName: String, mimeType: String?, promise: Promise) {
    try {
      val sourceUri = Uri.parse(uriString)
      val resolver = reactContext.contentResolver
      val safeFileName = sanitizeFileName(fileName)
      val targetMime = mimeType ?: resolver.getType(sourceUri) ?: "*/*"
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, safeFileName)
        put(MediaStore.MediaColumns.MIME_TYPE, targetMime)
        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
      }

      val destinationUri =
        resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
          ?: throw IllegalStateException("Unable to create Downloads entry.")

      resolver.openInputStream(sourceUri).use { input ->
        requireNotNull(input) { "Unable to read source file." }
        resolver.openOutputStream(destinationUri).use { output ->
          requireNotNull(output) { "Unable to open Downloads output stream." }
          input.copyTo(output)
        }
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val completed = ContentValues().apply {
          put(MediaStore.MediaColumns.IS_PENDING, 0)
        }
        resolver.update(destinationUri, completed, null, null)
      }

      promise.resolve(destinationUri.toString())
    } catch (error: Exception) {
      promise.reject("ERR_SAVE_DOWNLOADS", "Unable to save file to Downloads.", error)
    }
  }

  @ReactMethod
  fun shareFiles(
    title: String,
    text: String,
    uriStrings: ReadableArray,
    mimeTypes: ReadableArray,
    promise: Promise,
  ) {
    try {
      val uris = ArrayList<Uri>()
      val safeMimeTypes = ArrayList<String>()

      for (index in 0 until uriStrings.size()) {
        val rawUri = uriStrings.getString(index)?.trim().orEmpty()
        if (rawUri.isBlank()) continue
        uris.add(toSharableUri(Uri.parse(rawUri)))
        safeMimeTypes.add(mimeTypes.getString(index)?.trim().orEmpty())
      }

      if (uris.isEmpty()) {
        promise.reject("ERR_SHARE_FILES", "At least one file is required to share.")
        return
      }

      val shareIntent =
        if (uris.size == 1) {
          Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_STREAM, uris.first())
          }
        } else {
          Intent(Intent.ACTION_SEND_MULTIPLE).apply {
            putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
          }
        }.apply {
          type = resolveShareMimeType(safeMimeTypes)
          putExtra(Intent.EXTRA_SUBJECT, title)
          putExtra(Intent.EXTRA_TEXT, text)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          clipData = ClipData.newUri(reactContext.contentResolver, "LifeBalance Note", uris.first())
        }

      reactContext.startActivity(Intent.createChooser(shareIntent, title).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      })
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("ERR_SHARE_FILES", "Unable to share note files.", error)
    }
  }

  @ReactMethod
  fun scheduleReminderNotification(
    identifier: String,
    title: String,
    body: String,
    triggerAtMillis: Double,
    promise: Promise,
  ) {
    val alarmManager = reactContext.getSystemService(AlarmManager::class.java)
    if (alarmManager == null) {
      promise.reject("ERR_REMINDER_ALARM_MANAGER", "AlarmManager is unavailable.")
      return
    }

    val pendingIntent = buildReminderPendingIntent(
      identifier = identifier,
      title = title,
      body = body,
    )

    val triggerAt = triggerAtMillis.toLong()

    try {
      when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms() ->
          alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerAt,
            pendingIntent,
          )
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ->
          alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerAt,
            pendingIntent,
          )
        else ->
          alarmManager.set(
            AlarmManager.RTC_WAKEUP,
            triggerAt,
            pendingIntent,
          )
      }

      promise.resolve(identifier)
    } catch (error: Exception) {
      promise.reject(
        "ERR_REMINDER_SCHEDULE",
        "Unable to schedule reminder notification.",
        error,
      )
    }
  }

  @ReactMethod
  fun cancelReminderNotification(identifier: String, promise: Promise) {
    val alarmManager = reactContext.getSystemService(AlarmManager::class.java)
    if (alarmManager == null) {
      promise.reject("ERR_REMINDER_ALARM_MANAGER", "AlarmManager is unavailable.")
      return
    }

    try {
      val pendingIntent = buildReminderPendingIntent(
        identifier = identifier,
        title = "",
        body = "",
      )
      alarmManager.cancel(pendingIntent)
      pendingIntent.cancel()
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject(
        "ERR_REMINDER_CANCEL",
        "Unable to cancel reminder notification.",
        error,
      )
    }
  }

  @ReactMethod
  fun sendSmsDirect(numbers: ReadableArray, message: String, promise: Promise) {
    val body = message.trim()
    if (body.isBlank()) {
      promise.reject("ERR_SMS_EMPTY_MESSAGE", "SMS message cannot be empty.")
      return
    }

    val permissionGranted =
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.SEND_SMS,
      ) == PackageManager.PERMISSION_GRANTED

    if (!permissionGranted) {
      promise.reject("ERR_SMS_PERMISSION", "SEND_SMS permission has not been granted.")
      return
    }

    val recipients = buildSet {
      for (index in 0 until numbers.size()) {
        val normalized = normalizePhone(numbers.getString(index))
        if (normalized.isNotEmpty()) add(normalized)
      }
    }

    if (recipients.isEmpty()) {
      promise.reject("ERR_SMS_RECIPIENTS", "At least one SMS recipient is required.")
      return
    }

    try {
      val smsManager =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          reactContext.getSystemService(SmsManager::class.java) ?: SmsManager.getDefault()
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }

      recipients.forEach { number ->
        val parts = smsManager.divideMessage(body)
        if (parts.size > 1) {
          smsManager.sendMultipartTextMessage(number, null, ArrayList(parts), null, null)
        } else {
          smsManager.sendTextMessage(number, null, body, null, null)
        }
      }

      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("ERR_SMS_SEND", "Unable to send SMS directly.", error)
    }
  }

  @ReactMethod
  fun updateVoiceRecorderConfig(
    active: Boolean,
    autoStart: Boolean,
    speakerAssistEnabled: Boolean,
    scope: String,
    selectedLine: String,
    selectedSimId: String?,
    selectedLineNumber: String,
    allowedNumbers: ReadableArray,
    promise: Promise,
  ) {
    val normalizedNumbers = buildSet {
      for (index in 0 until allowedNumbers.size()) {
        val normalized = normalizePhone(allowedNumbers.getString(index))
        if (normalized.isNotEmpty()) add(normalized)
      }
    }

    prefs.edit()
      .putBoolean(KEY_VOICE_ACTIVE, active)
      .putBoolean(KEY_VOICE_AUTO_START, autoStart)
      .putBoolean(KEY_VOICE_SPEAKER_ASSIST, speakerAssistEnabled)
      .putString(KEY_VOICE_SCOPE, if (scope == "all") "all" else "selected")
      .putString(KEY_VOICE_SELECTED_LINE, selectedLine.trim())
      .putString(KEY_VOICE_SELECTED_SIM_ID, selectedSimId?.trim().orEmpty())
      .putString(KEY_VOICE_SELECTED_LINE_NUMBER, normalizePhone(selectedLineNumber))
      .putStringSet(KEY_VOICE_ALLOWED_NUMBERS, normalizedNumbers)
      .apply()

    promise.resolve(true)
  }

  @ReactMethod
  fun updateRestModeConfig(
    active: Boolean,
    priorityEnabled: Boolean,
    repeatThreshold: Int,
    allowedNumbers: ReadableArray,
    promise: Promise,
  ) {
    val wasActive = prefs.getBoolean(KEY_REST_ACTIVE, false)
    val normalizedNumbers = buildSet {
      for (index in 0 until allowedNumbers.size()) {
        val normalized = normalizePhone(allowedNumbers.getString(index))
        if (normalized.isNotEmpty()) add(normalized)
      }
    }

    if (!active || (!wasActive && active)) {
      clearRepeatCallerState()
    }

    prefs.edit()
      .putBoolean(KEY_REST_ACTIVE, active)
      .putBoolean(KEY_REST_PRIORITY_ENABLED, priorityEnabled)
      .putInt(KEY_REST_REPEAT_THRESHOLD, repeatThreshold.coerceAtLeast(1))
      .putStringSet(KEY_REST_ALLOWED_NUMBERS, normalizedNumbers)
      .apply()

    promise.resolve(true)
  }

  private fun clearRepeatCallerState() {
    val editor = prefs.edit()
    prefs.all.keys
      .filter { key -> key.startsWith(KEY_REST_REPEAT_PREFIX) }
      .forEach { key -> editor.remove(key) }
    editor.apply()
  }

  private fun buildReminderPendingIntent(
    identifier: String,
    title: String,
    body: String,
  ): PendingIntent {
    val intent = Intent(
      reactContext,
      com.anonymous.lifebalancemobile.LifeBalanceReminderReceiver::class.java,
    ).apply {
      action = ACTION_REMINDER_FIRE
      putExtra(EXTRA_REMINDER_ID, identifier)
      putExtra(EXTRA_REMINDER_TITLE, title)
      putExtra(EXTRA_REMINDER_BODY, body)
    }

    return PendingIntent.getBroadcast(
      reactContext,
      identifier.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun launchDocumentPicker(
    mimeTypes: Array<String>,
    requestCode: Int,
    promise: Promise,
  ) {
    if (pendingPickerPromise != null) {
      promise.reject("ERR_PICKER_BUSY", "Another picker request is already active.")
      return
    }

    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("ERR_PICKER_ACTIVITY", "No active Android activity is available.")
      return
    }

    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = if (mimeTypes.size == 1) mimeTypes.first() else "*/*"
      putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }

    pendingPickerPromise = promise

    try {
      activity.startActivityForResult(intent, requestCode)
    } catch (error: Exception) {
      pendingPickerPromise = null
      promise.reject("ERR_PICKER_LAUNCH", "Unable to launch the file picker.", error)
    }
  }

  private fun buildPickedFilePayload(uri: Uri) =
    Arguments.createMap().apply {
      putString("uri", uri.toString())
      putString("name", resolveDisplayName(uri))
      putString("mimeType", reactContext.contentResolver.getType(uri) ?: guessMimeType(uri))
      putDouble("size", resolveFileSize(uri).toDouble())
      if ((reactContext.contentResolver.getType(uri) ?: guessMimeType(uri)).startsWith("audio/")) {
        readAudioDuration(uri)?.let { putDouble("durationMs", it.toDouble()) }
      }
    }

  private fun cachePendingPickedFile(requestType: String, payload: com.facebook.react.bridge.WritableMap) {
    val json =
      JSONObject().apply {
        put("uri", payload.getString("uri"))
        put("name", payload.getString("name"))
        payload.getString("mimeType")?.let { put("mimeType", it) }
        if (!payload.isNull("size")) {
          put("size", payload.getDouble("size"))
        }
        if (!payload.isNull("durationMs")) {
          put("durationMs", payload.getDouble("durationMs"))
        }
      }

    prefs
      .edit()
      .putString(KEY_PENDING_PICKER_TYPE, requestType)
      .putString(KEY_PENDING_PICKER_PAYLOAD, json.toString())
      .apply()
  }

  private fun resolveDisplayName(uri: Uri): String {
    if (uri.scheme == "file") {
      return File(uri.path.orEmpty()).name.ifBlank { "Attachment" }
    }

    reactContext.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
      ?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (nameIndex >= 0 && cursor.moveToFirst()) {
          return cursor.getString(nameIndex) ?: "Attachment"
        }
      }

    return uri.lastPathSegment ?: "Attachment"
  }

  private fun resolveFileSize(uri: Uri): Long {
    if (uri.scheme == "file") {
      return File(uri.path.orEmpty()).length()
    }

    reactContext.contentResolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)
      ?.use { cursor ->
        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (sizeIndex >= 0 && cursor.moveToFirst()) {
          return cursor.getLong(sizeIndex)
        }
      }

    return 0L
  }

  private fun wrapTextLines(text: String, paint: Paint, maxWidth: Float): List<String> {
    if (text.isBlank()) return emptyList()

    val result = mutableListOf<String>()
    val paragraphs = text.split("\n")

    paragraphs.forEach { paragraph ->
      val words = paragraph.split(" ").filter { it.isNotBlank() }
      if (words.isEmpty()) {
        result.add("")
        return@forEach
      }

      var currentLine = ""
      words.forEach { word ->
        val candidate = if (currentLine.isBlank()) word else "$currentLine $word"
        if (paint.measureText(candidate) <= maxWidth || currentLine.isBlank()) {
          currentLine = candidate
        } else {
          result.add(currentLine)
          currentLine = word
        }
      }

      if (currentLine.isNotBlank()) {
        result.add(currentLine)
      }
    }

    return result
  }

  private fun sanitizeFileName(value: String): String =
    value.replace(Regex("[^A-Za-z0-9._-]"), "-").take(72).ifBlank { "lifebalance-file" }

  private fun guessMimeType(uri: Uri): String {
    val path = uri.lastPathSegment.orEmpty().lowercase()
    return when {
      path.endsWith(".png") -> "image/png"
      path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
      path.endsWith(".webp") -> "image/webp"
      path.endsWith(".pdf") -> "application/pdf"
      path.endsWith(".mp3") -> "audio/mpeg"
      path.endsWith(".wav") -> "audio/wav"
      path.endsWith(".m4a") -> "audio/mp4"
      else -> "*/*"
    }
  }

  private fun toSharableUri(uri: Uri): Uri {
    if (uri.scheme == "content") {
      return uri
    }

    val file = File(uri.path.orEmpty())
    return FileProvider.getUriForFile(
      reactContext,
      "${reactContext.packageName}.FileSystemFileProvider",
      file,
    )
  }

  private fun resolveShareMimeType(mimeTypes: List<String>): String {
    val sanitized = mimeTypes.filter { it.isNotBlank() }
    if (sanitized.isEmpty()) return "*/*"
    val distinct = sanitized.distinct()
    return if (distinct.size == 1) distinct.first() else "*/*"
  }

  private fun readAudioDuration(uri: Uri): Long? {
    val metadataRetriever = MediaMetadataRetriever()

    return try {
      metadataRetriever.setDataSource(reactContext, uri)
      metadataRetriever
        .extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
        ?.toLongOrNull()
    } catch (_: Exception) {
      null
    } finally {
      try {
        metadataRetriever.release()
      } catch (_: Exception) {
        // Ignore release issues.
      }
    }
  }

  private fun requestNotificationListenerRebind() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      return
    }

    NotificationListenerService.requestRebind(
      ComponentName(
        reactContext,
        com.anonymous.lifebalancemobile.LifeBalanceNotificationListenerService::class.java,
      ),
    )
  }

  private fun shouldIncludeInstalledApp(
    packageManager: PackageManager,
    applicationInfo: ApplicationInfo,
  ): Boolean {
    if (applicationInfo.packageName == reactContext.packageName) {
      return false
    }

    val hasLauncherEntry =
      packageManager.getLaunchIntentForPackage(applicationInfo.packageName) != null
    val isSystemApp =
      applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM != 0 &&
        applicationInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP == 0

    return hasLauncherEntry || !isSystemApp
  }

  private fun mapInstalledAppType(
    applicationInfo: ApplicationInfo,
    label: String,
    packageName: String,
  ): String {
    val normalizedLabel = label.lowercase()
    val normalizedPackage = packageName.lowercase()

    if (
      normalizedLabel.contains("whatsapp") ||
      normalizedLabel.contains("telegram") ||
      normalizedLabel.contains("message") ||
      normalizedPackage.contains("sms") ||
      normalizedPackage.contains("messag")
    ) {
      return "COMMUNICATION"
    }

    if (
      normalizedLabel.contains("instagram") ||
      normalizedLabel.contains("facebook") ||
      normalizedLabel.contains("snapchat") ||
      normalizedLabel.contains("x") ||
      normalizedLabel.contains("twitter")
    ) {
      return "SOCIAL"
    }

    if (
      normalizedLabel.contains("youtube") ||
      normalizedLabel.contains("music") ||
      normalizedLabel.contains("video") ||
      normalizedLabel.contains("netflix")
    ) {
      return "MEDIA"
    }

    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      when (applicationInfo.category) {
        ApplicationInfo.CATEGORY_AUDIO,
        ApplicationInfo.CATEGORY_VIDEO,
        ApplicationInfo.CATEGORY_IMAGE,
        -> "MEDIA"
        ApplicationInfo.CATEGORY_SOCIAL -> "SOCIAL"
        ApplicationInfo.CATEGORY_NEWS -> "NEWS"
        ApplicationInfo.CATEGORY_PRODUCTIVITY -> "PRODUCTIVITY"
        ApplicationInfo.CATEGORY_MAPS -> "MAPS"
        ApplicationInfo.CATEGORY_GAME -> "GAME"
        else -> "APP"
      }
    } else {
      "APP"
    }
  }

  private fun drawableToDataUri(drawable: Drawable?): String? {
    if (drawable == null) return null

    return try {
      val targetSize = (reactContext.resources.displayMetrics.density * 48).toInt().coerceAtLeast(48)
      val sourceBitmap =
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
          drawable.bitmap
        } else {
          val width = drawable.intrinsicWidth.takeIf { it > 0 } ?: targetSize
          val height = drawable.intrinsicHeight.takeIf { it > 0 } ?: targetSize
          Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { canvasBitmap ->
            val canvas = Canvas(canvasBitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
          }
        }

      val bitmap =
        if (sourceBitmap.width == targetSize && sourceBitmap.height == targetSize) {
          sourceBitmap.copy(Bitmap.Config.ARGB_8888, false)
        } else {
          Bitmap.createScaledBitmap(sourceBitmap, targetSize, targetSize, true)
        }

      val outputStream = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
      bitmap.recycle()
      "data:image/png;base64," +
        Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
    } catch (_: Exception) {
      null
    }
  }

  data class InstalledAppPayload(
    val packageName: String,
    val label: String,
    val type: String,
    val iconUri: String?,
  )

  companion object {
    const val PREFS_NAME = "lifebalance_native"
    const val KEY_REST_ACTIVE = "rest_active"
    const val KEY_REST_PRIORITY_ENABLED = "rest_priority_enabled"
    const val KEY_REST_REPEAT_THRESHOLD = "rest_repeat_threshold"
    const val KEY_REST_ALLOWED_NUMBERS = "rest_allowed_numbers"
    const val KEY_REST_REPEAT_PREFIX = "rest_repeat_"
    const val KEY_MUTED_NOTIFICATION_PACKAGES = "muted_notification_packages"
    const val KEY_VOICE_ACTIVE = "voice_active"
    const val KEY_VOICE_AUTO_START = "voice_auto_start"
    const val KEY_VOICE_SPEAKER_ASSIST = "voice_speaker_assist"
    const val KEY_VOICE_SCOPE = "voice_scope"
    const val KEY_VOICE_SELECTED_LINE = "voice_selected_line"
    const val KEY_VOICE_SELECTED_SIM_ID = "voice_selected_sim_id"
    const val KEY_VOICE_SELECTED_LINE_NUMBER = "voice_selected_line_number"
    const val KEY_VOICE_ALLOWED_NUMBERS = "voice_allowed_numbers"
    const val KEY_VOICE_LAST_EVENT_TEXT = "voice_last_event_text"
    const val KEY_VOICE_LAST_EVENT_TYPE = "voice_last_event_type"
    const val KEY_VOICE_HISTORY = "voice_history"
    const val KEY_PENDING_PICKER_TYPE = "pending_picker_type"
    const val KEY_PENDING_PICKER_PAYLOAD = "pending_picker_payload"
    const val ACTION_REMINDER_FIRE = "com.anonymous.lifebalancemobile.REMINDER_FIRE"
    const val EXTRA_REMINDER_ID = "extra_reminder_id"
    const val EXTRA_REMINDER_TITLE = "extra_reminder_title"
    const val EXTRA_REMINDER_BODY = "extra_reminder_body"
    const val REMINDER_CHANNEL_ID = "lifebalance-reminders"
    const val REQUEST_PICK_IMAGE = 4101
    const val REQUEST_PICK_AUDIO = 4102

    fun normalizePhone(value: String?): String {
      if (value.isNullOrBlank()) return ""
      val trimmed = value.trim()
      val builder = StringBuilder()

      trimmed.forEachIndexed { index, char ->
        if (char.isDigit()) {
          builder.append(char)
        } else if (char == '+' && index == 0) {
          builder.append(char)
        }
      }

      return builder.toString()
    }

    fun numbersMatch(saved: String, incoming: String): Boolean {
      if (saved.isBlank() || incoming.isBlank()) return false
      if (saved == incoming) return true

      val savedDigits = saved.filter(Char::isDigit)
      val incomingDigits = incoming.filter(Char::isDigit)
      if (savedDigits.isBlank() || incomingDigits.isBlank()) return false

      return savedDigits.takeLast(10) == incomingDigits.takeLast(10)
    }
  }
}
