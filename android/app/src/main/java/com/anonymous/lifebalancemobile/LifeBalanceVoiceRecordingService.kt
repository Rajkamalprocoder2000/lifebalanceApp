package com.anonymous.lifebalancemobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.media.AudioManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.telephony.TelephonyManager
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.Locale

class LifeBalanceVoiceRecordingService : Service() {
  private var audioManager: AudioManager? = null
  private var mediaRecorder: MediaRecorder? = null
  private var currentFile: File? = null
  private var recordingStartedAt: Long? = null
  private var recordingSourceLabel = "mic"
  private var speakerAssistEnabled = true
  private var speakerAssistApplied = false
  private var previousSpeakerphoneOn: Boolean? = null
  private var previousMicrophoneMute: Boolean? = null
  private var previousAudioMode: Int? = null
  private var previousVoiceCallVolume: Int? = null
  private var previousMusicVolume: Int? = null
  private var phoneStateReceiver: BroadcastReceiver? = null
  private var receiverRegistered = false

  private var callerNumber = "Unknown number"
  private var lineLabel = "Detected SIM"
  private var lineNumber = ""

  override fun onCreate() {
    super.onCreate()
    audioManager = getSystemService(AudioManager::class.java)
    ensureNotificationChannel()
    registerPhoneStateReceiver()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val prefs = getSharedPreferences(LifeBalanceNativeModule.PREFS_NAME, Context.MODE_PRIVATE)
    callerNumber = intent?.getStringExtra(EXTRA_CALLER_NUMBER).orEmpty().ifBlank { "Unknown number" }
    lineLabel = intent?.getStringExtra(EXTRA_LINE_LABEL).orEmpty().ifBlank { "Detected SIM" }
    lineNumber = intent?.getStringExtra(EXTRA_LINE_NUMBER).orEmpty()
    speakerAssistEnabled = prefs.getBoolean(LifeBalanceNativeModule.KEY_VOICE_SPEAKER_ASSIST, true)

    startForegroundCompat(buildNotification("Waiting for call answer to start recording"))
    updateVoiceStatus("Voice recorder armed and waiting for answered call.", "info")

    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    unregisterPhoneStateReceiver()
    stopRecorder(saveResult = false, completed = false)
    restoreSpeakerAssist()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun registerPhoneStateReceiver() {
    if (receiverRegistered) return

    phoneStateReceiver =
      object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          if (intent?.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
          val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE).orEmpty()

          when (state) {
            TelephonyManager.EXTRA_STATE_OFFHOOK -> startRecorder()
            TelephonyManager.EXTRA_STATE_IDLE -> {
              stopRecorder(saveResult = true, completed = recordingStartedAt != null)
              stopForeground(STOP_FOREGROUND_REMOVE)
              stopSelf()
            }
          }
        }
      }

    val filter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(phoneStateReceiver, filter, RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      registerReceiver(phoneStateReceiver, filter)
    }
    receiverRegistered = true
  }

  private fun unregisterPhoneStateReceiver() {
    if (!receiverRegistered || phoneStateReceiver == null) return
    runCatching { unregisterReceiver(phoneStateReceiver) }
    receiverRegistered = false
    phoneStateReceiver = null
  }

  private fun startRecorder() {
    if (mediaRecorder != null) return

    try {
      val outputDir = File(getExternalFilesDir(null), "voice_recordings").apply { mkdirs() }
      val fileName =
        "call_" + System.currentTimeMillis().toString() + "_" + callerNumber.filter(Char::isDigit)
          .takeLast(6)
          .ifBlank { "unknown" } + ".m4a"
      currentFile = File(outputDir, fileName)

      enableSpeakerAssistIfNeeded()
      val started = tryStartRecorder(currentFile!!)
      mediaRecorder = started.recorder
      recordingSourceLabel = started.label
      recordingStartedAt = System.currentTimeMillis()
      startForegroundCompat(
        buildNotification(
          if (speakerAssistApplied) {
            "Recording call audio. Speaker assist is active, increase call volume if needed."
          } else {
            "Recording call audio. If the other side sounds weak, enable speaker assist."
          },
        ),
      )
      updateVoiceStatus(
        "Recording started for $callerNumber using $recordingSourceLabel audio source" +
          if (speakerAssistApplied) " with speaker assist. Increase call volume if the other side sounds low." else ".",
        "match",
      )
    } catch (error: Exception) {
      currentFile?.delete()
      currentFile = null
      mediaRecorder = null
      recordingStartedAt = null
      recordingSourceLabel = "mic"
      restoreSpeakerAssist()
      updateVoiceStatus("Voice recording could not start on this device.", "skip")
    }
  }

  private fun stopRecorder(saveResult: Boolean, completed: Boolean) {
    val recorder = mediaRecorder
    val outputFile = currentFile
    val startedAt = recordingStartedAt

    mediaRecorder = null
    currentFile = null
    recordingStartedAt = null
    recordingSourceLabel = "mic"

    if (recorder != null) {
      runCatching {
        recorder.stop()
      }
      runCatching {
        recorder.reset()
      }
      recorder.release()
    }

    restoreSpeakerAssist()

    if (!saveResult || !completed || outputFile == null || startedAt == null || !outputFile.exists()) {
      outputFile?.delete()
      return
    }

    val durationMs = (System.currentTimeMillis() - startedAt).coerceAtLeast(0L)
    appendVoiceHistory(outputFile, durationMs)
    updateVoiceStatus("Recording saved for $callerNumber.", "match")
  }

  private fun enableSpeakerAssistIfNeeded() {
    if (!speakerAssistEnabled || speakerAssistApplied) return
    val manager = audioManager ?: return

    previousSpeakerphoneOn = manager.isSpeakerphoneOn
    previousMicrophoneMute = manager.isMicrophoneMute
    previousAudioMode = manager.mode
    previousVoiceCallVolume = manager.getStreamVolume(AudioManager.STREAM_VOICE_CALL)
    previousMusicVolume = manager.getStreamVolume(AudioManager.STREAM_MUSIC)

    manager.mode = AudioManager.MODE_IN_COMMUNICATION
    manager.isMicrophoneMute = false
    manager.isSpeakerphoneOn = true
    val maxVoiceVolume = manager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
    val targetVoiceVolume = maxOf(previousVoiceCallVolume ?: 0, ((maxVoiceVolume * 0.85f).toInt()))
    manager.setStreamVolume(
      AudioManager.STREAM_VOICE_CALL,
      targetVoiceVolume.coerceAtMost(maxVoiceVolume),
      0,
    )
    val maxMusicVolume = manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    val targetMusicVolume = maxOf(previousMusicVolume ?: 0, ((maxMusicVolume * 0.65f).toInt()))
    manager.setStreamVolume(
      AudioManager.STREAM_MUSIC,
      targetMusicVolume.coerceAtMost(maxMusicVolume),
      0,
    )
    speakerAssistApplied = true
  }

  private fun restoreSpeakerAssist() {
    if (!speakerAssistApplied) return
    val manager = audioManager ?: return

    previousSpeakerphoneOn?.let { manager.isSpeakerphoneOn = it }
    previousMicrophoneMute?.let { manager.isMicrophoneMute = it }
    previousAudioMode?.let { manager.mode = it }
    previousVoiceCallVolume?.let { volume ->
      manager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, volume, 0)
    }
    previousMusicVolume?.let { volume ->
      manager.setStreamVolume(AudioManager.STREAM_MUSIC, volume, 0)
    }

    previousSpeakerphoneOn = null
    previousMicrophoneMute = null
    previousAudioMode = null
    previousVoiceCallVolume = null
    previousMusicVolume = null
    speakerAssistApplied = false
  }

  private fun tryStartRecorder(outputFile: File): RecorderStartResult {
    val candidates =
      listOf(
        RecorderSourceCandidate(MediaRecorder.AudioSource.VOICE_COMMUNICATION, "voice communication"),
        RecorderSourceCandidate(MediaRecorder.AudioSource.VOICE_RECOGNITION, "voice recognition"),
        RecorderSourceCandidate(MediaRecorder.AudioSource.MIC, "mic"),
        RecorderSourceCandidate(MediaRecorder.AudioSource.CAMCORDER, "camcorder"),
      )

    var lastError: Exception? = null
    for (candidate in candidates) {
      runCatching {
        outputFile.delete()
        createRecorder(candidate.audioSource, outputFile).also { recorder ->
          return RecorderStartResult(recorder, candidate.label)
        }
      }.onFailure { error ->
        lastError = if (error is Exception) error else Exception(error)
      }
    }

    throw lastError ?: IllegalStateException("Unable to start any supported recording source.")
  }

  private fun createRecorder(audioSource: Int, outputFile: File): MediaRecorder {
    val recorder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        MediaRecorder(this)
      } else {
        @Suppress("DEPRECATION")
        MediaRecorder()
      }

    try {
      recorder.apply {
        setAudioSource(audioSource)
        setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        setAudioChannels(1)
        setAudioEncodingBitRate(128000)
        setAudioSamplingRate(44100)
        setOutputFile(outputFile.absolutePath)
        prepare()
        start()
      }
      return recorder
    } catch (error: Exception) {
      runCatching { recorder.reset() }
      recorder.release()
      throw error
    }
  }

  private fun appendVoiceHistory(file: File, durationMs: Long) {
    val prefs = getSharedPreferences(LifeBalanceNativeModule.PREFS_NAME, Context.MODE_PRIVATE)
    val raw = prefs.getString(LifeBalanceNativeModule.KEY_VOICE_HISTORY, "[]").orEmpty()
    val current = try {
      JSONArray(raw)
    } catch (_: Exception) {
      JSONArray()
    }

    val next = JSONArray()
    val entry = JSONObject().apply {
      put("id", "voice-call-" + System.currentTimeMillis())
      put("callerNumber", callerNumber)
      put("lineLabel", lineLabel)
      put("lineNumber", lineNumber)
      put("timestamp", System.currentTimeMillis())
      put("status", "recorded")
      put("uri", "file://" + file.absolutePath.replace("\\", "/"))
      put("mimeType", "audio/mp4")
      put("durationMs", durationMs)
      put("size", file.length())
      put("sourceLabel", recordingSourceLabel)
    }
    next.put(entry)

    for (index in 0 until minOf(current.length(), 19)) {
      next.put(current.getJSONObject(index))
    }

    prefs.edit().putString(LifeBalanceNativeModule.KEY_VOICE_HISTORY, next.toString()).apply()
  }

  private fun ensureNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = getSystemService(NotificationManager::class.java) ?: return
    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "LifeBalance Voice Recorder",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Foreground status while a matched voice call is being recorded"
      }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(contentText: String): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("LifeBalance Voice Recorder")
      .setContentText(contentText)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .build()
  }

  private fun startForegroundCompat(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfoCompat.FOREGROUND_SERVICE_TYPE_MICROPHONE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun updateVoiceStatus(text: String, type: String) {
    val prefs = getSharedPreferences(LifeBalanceNativeModule.PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit()
      .putString(LifeBalanceNativeModule.KEY_VOICE_LAST_EVENT_TEXT, text)
      .putString(LifeBalanceNativeModule.KEY_VOICE_LAST_EVENT_TYPE, type.lowercase(Locale.US))
      .apply()
  }

  private object ServiceInfoCompat {
    const val FOREGROUND_SERVICE_TYPE_MICROPHONE = 0x00000080
  }

  private data class RecorderSourceCandidate(val audioSource: Int, val label: String)

  private data class RecorderStartResult(val recorder: MediaRecorder, val label: String)

  companion object {
    const val CHANNEL_ID = "lifebalance-voice-recordings"
    const val NOTIFICATION_ID = 9017
    const val EXTRA_CALLER_NUMBER = "extra_caller_number"
    const val EXTRA_LINE_LABEL = "extra_line_label"
    const val EXTRA_LINE_NUMBER = "extra_line_number"
  }
}
