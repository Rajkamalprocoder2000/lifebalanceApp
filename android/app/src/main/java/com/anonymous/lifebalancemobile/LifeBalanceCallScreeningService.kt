package com.anonymous.lifebalancemobile

import android.content.Context
import android.content.Intent
import android.telecom.Call
import android.telecom.CallScreeningService
import android.telephony.SubscriptionManager
import androidx.core.content.ContextCompat

class LifeBalanceCallScreeningService : CallScreeningService() {
  override fun onScreenCall(callDetails: Call.Details) {
    val prefs = getSharedPreferences(LifeBalanceNativeModule.PREFS_NAME, Context.MODE_PRIVATE)
    val restActive = prefs.getBoolean(LifeBalanceNativeModule.KEY_REST_ACTIVE, false)
    val priorityEnabled = prefs.getBoolean(LifeBalanceNativeModule.KEY_REST_PRIORITY_ENABLED, true)
    val repeatThreshold = prefs.getInt(LifeBalanceNativeModule.KEY_REST_REPEAT_THRESHOLD, 3)
      .coerceAtLeast(1)
    val allowedNumbers = prefs.getStringSet(LifeBalanceNativeModule.KEY_REST_ALLOWED_NUMBERS, emptySet())
      ?: emptySet()
    val incomingNumber =
      LifeBalanceNativeModule.normalizePhone(callDetails.handle?.schemeSpecificPart)
    val isAllowedPriorityNumber = priorityEnabled &&
      allowedNumbers.any { saved -> LifeBalanceNativeModule.numbersMatch(saved, incomingNumber) }

    val voiceActive = prefs.getBoolean(LifeBalanceNativeModule.KEY_VOICE_ACTIVE, false)
    val voiceAutoStart = prefs.getBoolean(LifeBalanceNativeModule.KEY_VOICE_AUTO_START, true)
    val voiceScope = prefs.getString(LifeBalanceNativeModule.KEY_VOICE_SCOPE, "selected") ?: "selected"
    val voiceLine = prefs.getString(LifeBalanceNativeModule.KEY_VOICE_SELECTED_LINE, "office") ?: "office"
    val voiceSelectedSimId =
      prefs.getString(LifeBalanceNativeModule.KEY_VOICE_SELECTED_SIM_ID, "").orEmpty()
    val voiceLineNumber =
      prefs.getString(LifeBalanceNativeModule.KEY_VOICE_SELECTED_LINE_NUMBER, "").orEmpty()
    val voiceAllowedNumbers =
      prefs.getStringSet(LifeBalanceNativeModule.KEY_VOICE_ALLOWED_NUMBERS, emptySet()) ?: emptySet()
    val accountHandleId = callDetails.accountHandle?.id.orEmpty()
    val defaultVoiceSubId = SubscriptionManager.getDefaultVoiceSubscriptionId()
    val defaultVoiceMatchesSelected =
      voiceSelectedSimId.isNotBlank() &&
        defaultVoiceSubId != SubscriptionManager.INVALID_SUBSCRIPTION_ID &&
        voiceSelectedSimId == defaultVoiceSubId.toString()
    val isTargetSim =
      when {
        voiceSelectedSimId.isNotBlank() && accountHandleId.contains(voiceSelectedSimId) -> true
        voiceSelectedSimId.isNotBlank() && accountHandleId.isBlank() && defaultVoiceMatchesSelected -> true
        voiceLineNumber.isNotBlank() &&
          LifeBalanceNativeModule.numbersMatch(voiceLineNumber, accountHandleId) -> true
        else -> false
      }
    val voiceMatched =
      voiceActive &&
        isTargetSim &&
        voiceAutoStart &&
        when (voiceScope) {
          "all" -> incomingNumber.isNotBlank()
          else -> voiceAllowedNumbers.any { saved ->
            LifeBalanceNativeModule.numbersMatch(saved, incomingNumber)
          }
        }

    if (voiceActive) {
      val callerNumberForRecording =
        if (incomingNumber.isBlank()) "Unknown number" else incomingNumber
      val lastEventText =
        when {
          voiceMatched ->
            "Incoming call matched Voice Recorder rules on $voiceLine line."
          !voiceAutoStart ->
            "Voice Recorder skipped the call because auto-start is turned off."
          !isTargetSim ->
            "Voice Recorder skipped the call because it did not match the selected detected SIM."
          voiceScope != "all" ->
            "Voice Recorder skipped the call because the caller did not match the selected list."
          else ->
            "Incoming call did not match the current Voice Recorder rule set."
        }

      prefs.edit()
        .putString(LifeBalanceNativeModule.KEY_VOICE_LAST_EVENT_TEXT, lastEventText)
        .putString(
          LifeBalanceNativeModule.KEY_VOICE_LAST_EVENT_TYPE,
          if (voiceMatched) "match" else "skip",
        )
        .apply()

      if (voiceMatched) {
        startVoiceRecordingService(
          callerNumber = callerNumberForRecording,
          lineLabel = voiceLine,
          lineNumber = voiceLineNumber,
        )
      }
    }

    val shouldSilence = when {
      !restActive -> false
      isAllowedPriorityNumber -> false
      shouldAllowRepeatCaller(prefs, incomingNumber, repeatThreshold) -> false
      else -> true
    }

    val response = CallResponse.Builder()
      .setDisallowCall(false)
      .setRejectCall(false)
      .setSilenceCall(shouldSilence)
      .setSkipCallLog(false)
      .setSkipNotification(false)
      .build()

    respondToCall(callDetails, response)
  }

  private fun shouldAllowRepeatCaller(
    prefs: android.content.SharedPreferences,
    incoming: String,
    repeatThreshold: Int,
  ): Boolean {
    val repeatKey = buildRepeatCallerKey(incoming)
    val currentCount = prefs.getInt(repeatKey, 0)

    if (currentCount >= repeatThreshold) {
      prefs.edit().remove(repeatKey).apply()
      return true
    }

    prefs.edit().putInt(repeatKey, currentCount + 1).apply()
    return false
  }

  private fun buildRepeatCallerKey(incoming: String): String {
    val digits = incoming.filter(Char::isDigit)
    val normalized = if (digits.isNotBlank()) digits.takeLast(10) else "unknown"
    return LifeBalanceNativeModule.KEY_REST_REPEAT_PREFIX + normalized
  }

  private fun startVoiceRecordingService(
    callerNumber: String,
    lineLabel: String,
    lineNumber: String,
  ) {
    val intent =
      Intent(this, LifeBalanceVoiceRecordingService::class.java).apply {
        putExtra(LifeBalanceVoiceRecordingService.EXTRA_CALLER_NUMBER, callerNumber)
        putExtra(LifeBalanceVoiceRecordingService.EXTRA_LINE_LABEL, lineLabel)
        putExtra(LifeBalanceVoiceRecordingService.EXTRA_LINE_NUMBER, lineNumber)
      }
    ContextCompat.startForegroundService(this, intent)
  }
}
