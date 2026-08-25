package com.movieroom.app.data.api

import android.content.Context
import com.movieroom.app.data.model.WatchRoom
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class LiveKitMember(
    val id: String,
    val name: String,
    val isSpeaking: Boolean = false,
    val isMuted: Boolean = false,
    val isCameraOn: Boolean = false,
    val isPttActive: Boolean = false
)

class LiveKitSyncService private constructor(private val context: Context) {

    private val liveKitUrl = "wss://ahmed-8rv42z70.livekit.cloud"
    private val apiKey = "APItVUCjzCaYjAU"
    private val apiSecret = "2nT2WmtherSFFeOKHbDomGiR1bjWJnnZgEGU2enQij3B"

    private val _isConnected = MutableStateFlow(true)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _members = MutableStateFlow<List<LiveKitMember>>(emptyList())
    val members: StateFlow<List<LiveKitMember>> = _members.asStateFlow()

    private val _masterVolume = MutableStateFlow(0.85f)
    val masterVolume: StateFlow<Float> = _masterVolume.asStateFlow()

    private val _micGain = MutableStateFlow(0.9f)
    val micGain: StateFlow<Float> = _micGain.asStateFlow()

    private val _isNoiseSuppressionEnabled = MutableStateFlow(true)
    val isNoiseSuppressionEnabled: StateFlow<Boolean> = _isNoiseSuppressionEnabled.asStateFlow()

    private val _isSpeakerphoneOn = MutableStateFlow(true)
    val isSpeakerphoneOn: StateFlow<Boolean> = _isSpeakerphoneOn.asStateFlow()

    fun connectToRoom(roomId: String, username: String) {
        _isConnected.value = true
        _members.value = listOf(
            LiveKitMember("user-me", username, isSpeaking = false, isMuted = false, isCameraOn = false),
            LiveKitMember("user-1", "أحمد (المؤسس)", isSpeaking = true, isMuted = false, isCameraOn = true)
        )
    }

    fun setMasterVolume(volume: Float) {
        _masterVolume.value = volume.coerceIn(0f, 1f)
    }

    fun setMicGain(gain: Float) {
        _micGain.value = gain.coerceIn(0f, 1f)
    }

    fun toggleNoiseSuppression() {
        _isNoiseSuppressionEnabled.value = !_isNoiseSuppressionEnabled.value
    }

    fun toggleSpeakerphone() {
        _isSpeakerphoneOn.value = !_isSpeakerphoneOn.value
    }

    fun disconnect() {
        _isConnected.value = false
    }

    companion object {
        @Volatile
        private var INSTANCE: LiveKitSyncService? = null

        fun getInstance(context: Context): LiveKitSyncService {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: LiveKitSyncService(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
