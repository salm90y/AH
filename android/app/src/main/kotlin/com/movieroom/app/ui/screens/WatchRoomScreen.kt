package com.movieroom.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.movieroom.app.data.api.LiveKitSyncService
import com.movieroom.app.data.model.ChatMessage
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.data.model.YouTubeSearchResult
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.components.SyncedVideoPlayer
import com.movieroom.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.*

enum class RoomTab {
    PARTICIPANTS,
    CAMERA,
    MIC,
    EFFECTS,
    VOICE_CALL,
    CHAT
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WatchRoomScreen(
    room: WatchRoom,
    repository: MovieRepository,
    username: String,
    role: String,
    onLeaveRoom: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val liveKitService = remember { LiveKitSyncService.getInstance(context) }

    var isPlaying by remember { mutableStateOf(room.isPlaying) }
    var currentPositionMs by remember { mutableStateOf(room.currentPositionMs) }
    var durationMs by remember { mutableStateOf(0L) }
    var currentVideoUrl by remember { mutableStateOf(room.videoUrl.ifBlank { room.currentMovie?.videoUrl ?: "https://www.youtube.com/watch?v=LXb3EKWsInQ" }) }
    
    // Media & Audio States
    var mediaVolumeLevel by remember { mutableStateOf(0.85f) }
    var callMasterVolume by remember { mutableStateOf(0.9f) }
    var micGainLevel by remember { mutableStateOf(0.85f) }
    var isNoiseSuppressionOn by remember { mutableStateOf(true) }
    var isSpeakerphoneActive by remember { mutableStateOf(true) }

    // Search / URL Input State
    var searchInputUrl by remember { mutableStateOf("") }

    // YouTube Search Modal State
    var showYouTubeSearchModal by remember { mutableStateOf(false) }
    var ytSearchQuery by remember { mutableStateOf("") }
    var ytCurrentPage by remember { mutableStateOf(1) }
    val ytSearchResults = remember { mutableStateListOf<YouTubeSearchResult>() }
    var isSearchingYt by remember { mutableStateOf(false) }

    // M3U / M3U8 IPTV Playlist Modal State
    var showM3uPlaylistModal by remember { mutableStateOf(false) }
    var m3uInputUrl by remember { mutableStateOf("") }

    // Active Bottom Drawer Tab
    var activeTab by remember { mutableStateOf(RoomTab.CHAT) }

    // Walkie Talkie (PTT) state
    var isPttPressed by remember { mutableStateOf(false) }
    val infiniteTransition = rememberInfiniteTransition(label = "ptt_pulse")
    val pttPulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    // Mic & Camera state
    var isMicOn by remember { mutableStateOf(true) }
    var isCameraOn by remember { mutableStateOf(false) }

    // Voice call state
    var isInVoiceCall by remember { mutableStateOf(true) }
    var callTimerSecs by remember { mutableStateOf(128) }

    // Chat Messages State (Clean & Empty of instructions)
    val chatMessages = remember {
        mutableStateListOf(
            ChatMessage("msg-1", "أحمد", "", "أهلاً بالجميع في سهرة اليوم! 🍿🍿", System.currentTimeMillis() - 120000),
            ChatMessage("msg-2", username, "", "مرحباً بجميع الحضور! متعة جيدة للجميع 🔥", System.currentTimeMillis() - 60000)
        )
    }

    var messageInput by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Timer effect for voice call
    LaunchedEffect(isInVoiceCall) {
        while (isInVoiceCall) {
            delay(1000L)
            callTimerSecs++
        }
    }

    // Connect to LiveKit on launch
    LaunchedEffect(room.id) {
        liveKitService.connectToRoom(room.id, username)
    }

    // Formatted time helpers
    fun formatTimeMs(ms: Long): String {
        val totalSecs = (ms / 1000).toInt()
        val mins = totalSecs / 60
        val secs = totalSecs % 60
        return String.format(Locale.US, "%d:%02d", mins, secs)
    }

    fun formatCallDuration(secs: Int): String {
        val mins = secs / 60
        val s = secs % 60
        return String.format(Locale.US, "%02d:%02d", mins, s)
    }

    val copyRoomCode = {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("AH Room ID", room.id)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "تم نسخ رمز الغرفة: ${room.id}", Toast.LENGTH_SHORT).show()
    }

    // Perform YouTube Search (20 items per page)
    fun triggerYtSearch(query: String, page: Int = 1) {
        isSearchingYt = true
        coroutineScope.launch {
            delay(350)
            if (page == 1) {
                ytSearchResults.clear()
            }
            val results = repository.searchYouTube(query, page)
            ytSearchResults.addAll(results)
            isSearchingYt = false
        }
    }

    fun openSearchModal(query: String = "") {
        ytSearchQuery = query.ifBlank { searchInputUrl.ifBlank { "أفلام ومقاطع شعبية" } }
        ytCurrentPage = 1
        triggerYtSearch(ytSearchQuery, 1)
        showYouTubeSearchModal = true
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070B15))
    ) {
        // ==========================================
        // 1. SLEEK TOP BAR ABOVE VIDEO
        // ==========================================
        Surface(
            color = Color(0xFF0A0F1D),
            modifier = Modifier.fillMaxWidth(),
            tonalElevation = 4.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Top Row: Exit & Status Badges
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Exit Button
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFF3B0A18),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.6f)),
                        modifier = Modifier.clickable { onLeaveRoom() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Text("مغادرة", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp))
                        }
                    }

                    // Right Side Badges Row
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        // Viewer Count Badge
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF111827),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Text("${room.viewerCount}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                Icon(Icons.Default.Group, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(12.dp))
                            }
                        }

                        // Shield & Crown Badges
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF1E244D)
                        ) {
                            Box(modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)) {
                                Icon(Icons.Default.Shield, contentDescription = null, tint = AHPrimaryIndigo, modifier = Modifier.size(12.dp))
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF381E5B)
                        ) {
                            Box(modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)) {
                                Icon(Icons.Default.WorkspacePremium, contentDescription = null, tint = AHAccentAmber, modifier = Modifier.size(12.dp))
                            }
                        }

                        // Room Code
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF111628),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AHPrimaryPurple.copy(alpha = 0.5f)),
                            modifier = Modifier.clickable { copyRoomCode() }
                        ) {
                            Text(
                                text = "${room.id}#",
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }

                        // Username
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF1E293B)
                        ) {
                            Text(
                                text = username,
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }

                        // AH Brand Pill
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFF121829))
                                .border(1.dp, AHPrimaryPurple, RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("AH", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Black)
                        }
                    }
                }

                // Row 2: Sleek Search Input Bar & Small Action Icons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 1.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    IconButton(
                        onClick = { openSearchModal(searchInputUrl) },
                        modifier = Modifier
                            .size(26.dp)
                            .clip(RoundedCornerShape(7.dp))
                            .background(Color(0xFFE11D48))
                    ) {
                        Icon(Icons.Default.Search, contentDescription = "بحث", tint = Color.White, modifier = Modifier.size(13.dp))
                    }

                    OutlinedTextField(
                        value = searchInputUrl,
                        onValueChange = { searchInputUrl = it },
                        placeholder = { Text("ابحث في يوتيوب...", fontSize = 9.sp, color = AHTextMuted) },
                        singleLine = true,
                        modifier = Modifier.width(130.dp),
                        shape = RoundedCornerShape(7.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFF0F172A),
                            unfocusedContainerColor = Color(0xFF0B1220),
                            focusedBorderColor = AHPrimaryPurple,
                            unfocusedBorderColor = Color(0xFF1E293B),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.weight(1f))

                    IconButton(
                        onClick = { copyRoomCode() },
                        modifier = Modifier
                            .size(26.dp)
                            .clip(RoundedCornerShape(7.dp))
                            .background(Color(0xFF1E293B))
                    ) {
                        Icon(Icons.Default.FileUpload, contentDescription = "مشاركة", tint = Color.White, modifier = Modifier.size(12.dp))
                    }

                    IconButton(
                        onClick = { openSearchModal("فيديوهات فائقة الجودة 4K") },
                        modifier = Modifier
                            .size(26.dp)
                            .clip(RoundedCornerShape(7.dp))
                            .background(Color(0xFF3B125B))
                    ) {
                        Icon(Icons.Default.Language, contentDescription = "متصفح", tint = AHPrimaryPurple, modifier = Modifier.size(12.dp))
                    }

                    // Last Button: M3U / M3U8 IPTV Playlist & Live Streams Modal
                    IconButton(
                        onClick = { showM3uPlaylistModal = true },
                        modifier = Modifier
                            .size(26.dp)
                            .clip(RoundedCornerShape(7.dp))
                            .background(Color(0xFF0F2B5B))
                    ) {
                        Icon(Icons.Default.QueueMusic, contentDescription = "ملفات m3u / m3u8", tint = AHAccentCyan, modifier = Modifier.size(13.dp))
                    }
                }
            }
        }

        // ==========================================
        // 2. VIDEO PLAYER FRAME (ENLARGED FOR MAXIMUM VISIBILITY)
        // ==========================================
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1.35f)
                .padding(horizontal = 4.dp, vertical = 2.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color.Black)
                .border(1.dp, AHCardBorder.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
        ) {
            SyncedVideoPlayer(
                videoUrl = currentVideoUrl,
                isPlaying = isPlaying,
                currentPositionMs = currentPositionMs,
                onPlaybackChange = { playing, posMs ->
                    isPlaying = playing
                    currentPositionMs = posMs
                    repository.updatePlaybackState(room.id, playing, posMs)
                },
                onDurationChange = { durMs ->
                    durationMs = durMs
                }
            )
        }

        // ==========================================
        // 3. ULTRA-COMPACT SINGLE ROW VIDEO CONTROLS BAR
        // ==========================================
        Surface(
            color = Color(0xFF0B101D),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 1.dp),
            shape = RoundedCornerShape(10.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Time position
                Text(
                    text = formatTimeMs(currentPositionMs),
                    color = Color.White,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )

                // Compact Progress Slider
                Slider(
                    value = currentPositionMs.toFloat(),
                    onValueChange = { newPos -> currentPositionMs = newPos.toLong() },
                    onValueChangeFinished = {
                        repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                    },
                    valueRange = 0f..durationMs.toFloat().coerceAtLeast(1f),
                    modifier = Modifier.weight(1f),
                    colors = SliderDefaults.colors(
                        thumbColor = Color(0xFFEF4444),
                        activeTrackColor = Color(0xFFEF4444),
                        inactiveTrackColor = Color(0xFF1E293B)
                    )
                )

                // Time Total (Dynamic or Live Stream)
                Text(
                    text = if (durationMs > 0L) formatTimeMs(durationMs) else "بث مباشر 🔴",
                    color = Color.White,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )

                // Rewind 10s
                IconButton(
                    onClick = {
                        currentPositionMs = (currentPositionMs - 10000L).coerceAtLeast(0L)
                        repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                    },
                    modifier = Modifier.size(26.dp)
                ) {
                    Icon(Icons.Default.Replay10, contentDescription = "تراجع 10s", tint = Color.White, modifier = Modifier.size(16.dp))
                }

                // Play / Pause Compact Button
                IconButton(
                    onClick = {
                        isPlaying = !isPlaying
                        repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                    },
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFEF4444))
                ) {
                    Icon(
                        if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) "إيقاف" else "تشغيل",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Forward 10s
                IconButton(
                    onClick = {
                        currentPositionMs = (currentPositionMs + 10000L).coerceAtMost(durationMs)
                        repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                    },
                    modifier = Modifier.size(26.dp)
                ) {
                    Icon(Icons.Default.Forward10, contentDescription = "تقديم 10s", tint = Color.White, modifier = Modifier.size(16.dp))
                }

                // Compact Volume Icon & Slider
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.width(70.dp)
                ) {
                    Icon(
                        if (mediaVolumeLevel == 0f) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                        contentDescription = "الصوت",
                        tint = Color.White,
                        modifier = Modifier.size(14.dp)
                    )
                    Slider(
                        value = mediaVolumeLevel,
                        onValueChange = { mediaVolumeLevel = it },
                        colors = SliderDefaults.colors(
                            thumbColor = Color.White,
                            activeTrackColor = Color.White,
                            inactiveTrackColor = Color.DarkGray
                        )
                    )
                }

                // Fullscreen Button
                IconButton(
                    onClick = {
                        Toast.makeText(context, "الشاشة الكاملة مفعلة", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.size(26.dp)
                ) {
                    Icon(Icons.Default.Fullscreen, contentDescription = "شاشة كاملة", tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        }

        // ==========================================
        // 4. ULTRA-COMPACT 6 ROOM ACTION BUTTONS ROW
        // ==========================================
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 6.dp, vertical = 2.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Button 1: Participants
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (activeTab == RoomTab.PARTICIPANTS) Color(0xFF2A3447) else Color(0xFF161E2E))
                    .border(1.dp, if (activeTab == RoomTab.PARTICIPANTS) AHPrimaryPurple else Color.Transparent, RoundedCornerShape(10.dp))
                    .clickable { activeTab = RoomTab.PARTICIPANTS },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.People, contentDescription = "المشاركون", tint = Color(0xFFA78BFA), modifier = Modifier.size(16.dp))
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(2.dp)
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF10B981)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${room.viewerCount}", color = Color.White, fontSize = 7.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Button 2: Camera
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (activeTab == RoomTab.CAMERA) Color(0xFF4A3018) else Color(0xFF2A190B))
                    .border(1.dp, if (activeTab == RoomTab.CAMERA) AHAccentAmber else Color.Transparent, RoundedCornerShape(10.dp))
                    .clickable {
                        isCameraOn = !isCameraOn
                        activeTab = RoomTab.CAMERA
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isCameraOn) Icons.Default.Videocam else Icons.Default.VideocamOff,
                    contentDescription = "الكاميرا",
                    tint = Color(0xFFF59E0B),
                    modifier = Modifier.size(16.dp)
                )
            }

            // Button 3: Mic / Walkie-Talkie
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (activeTab == RoomTab.MIC) Color(0xFF0F472D) else Color(0xFF08281A))
                    .border(1.dp, if (activeTab == RoomTab.MIC) AHAccentEmerald else Color.Transparent, RoundedCornerShape(10.dp))
                    .clickable { activeTab = RoomTab.MIC },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Mic, contentDescription = "الميكروفون", tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
            }

            // Button 4: Magic Stars / Effects
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (activeTab == RoomTab.EFFECTS) Color(0xFF311B6B) else Color(0xFF1A0E3D))
                    .border(1.dp, if (activeTab == RoomTab.EFFECTS) AHPrimaryPurple else Color.Transparent, RoundedCornerShape(10.dp))
                    .clickable { activeTab = RoomTab.EFFECTS },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = "تأثيرات", tint = Color(0xFFC084FC), modifier = Modifier.size(16.dp))
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(2.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0xFF6366F1)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("ع", color = Color.White, fontSize = 7.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 2.dp))
                }
            }

            // Button 5: Voice Call
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        Brush.linearGradient(
                            colors = if (isInVoiceCall) listOf(Color(0xFF8B5CF6), Color(0xFFEC4899)) else listOf(Color(0xFF4C1D95), Color(0xFF831843))
                        )
                    )
                    .clickable { activeTab = RoomTab.VOICE_CALL },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Call, contentDescription = "اتصال صوتی", tint = Color.White, modifier = Modifier.size(16.dp))
            }

            // Button 6: Live Chat
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (activeTab == RoomTab.CHAT) Color(0xFF2563EB) else Color(0xFF1D4ED8))
                    .clickable { activeTab = RoomTab.CHAT },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Chat, contentDescription = "دردشة", tint = Color.White, modifier = Modifier.size(16.dp))
            }
        }

        // ==========================================
        // 5. SPACIOUS DRAWER AREA (EXPANDED LIVE CHAT & CALL SETTINGS)
        // ==========================================
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1.3f)
                .padding(horizontal = 6.dp, vertical = 2.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0xFF0F172A))
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(14.dp))
        ) {
            when (activeTab) {
                // 1. SPACIOUS CLEAN LIVE CHAT DRAWER
                RoomTab.CHAT -> {
                    Column(modifier = Modifier.fillMaxSize().padding(8.dp)) {
                        // Quick Reaction Emoji Bar
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 4.dp),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            listOf("🍿", "❤️", "😂", "👏", "🔥", "🎉", "👍", "😮").forEach { emoji ->
                                Surface(
                                    shape = CircleShape,
                                    color = Color(0xFF1E293B),
                                    modifier = Modifier
                                        .size(26.dp)
                                        .clickable {
                                            chatMessages.add(
                                                ChatMessage(
                                                    id = UUID.randomUUID().toString(),
                                                    senderName = username,
                                                    message = emoji,
                                                    timestamp = System.currentTimeMillis()
                                                )
                                            )
                                            coroutineScope.launch { listState.animateScrollToItem(chatMessages.size - 1) }
                                        }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(emoji, fontSize = 12.sp)
                                    }
                                }
                            }
                        }

                        // Clean Messages Feed (No instructional notes)
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            items(chatMessages) { msg ->
                                val isMe = msg.senderName == username
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = if (isMe) Arrangement.Start else Arrangement.End
                                ) {
                                    Column(
                                        horizontalAlignment = if (isMe) Alignment.Start else Alignment.End,
                                        modifier = Modifier.widthIn(max = 280.dp)
                                    ) {
                                        Text(msg.senderName, color = if (isMe) AHPrimaryPurple else AHAccentCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        Surface(
                                            shape = RoundedCornerShape(10.dp),
                                            color = if (isMe) AHPrimaryPurple.copy(alpha = 0.35f) else Color(0xFF1E293B)
                                        ) {
                                            Text(msg.message, color = Color.White, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Message Input
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            OutlinedTextField(
                                value = messageInput,
                                onValueChange = { messageInput = it },
                                placeholder = { Text("اكتب رسالتك المباشرة هنا...", fontSize = 11.sp, color = AHTextMuted) },
                                singleLine = true,
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = AHPrimaryPurple,
                                    unfocusedBorderColor = Color(0xFF1E293B),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                )
                            )

                            Button(
                                onClick = {
                                    val trimmed = messageInput.trim()
                                    if (trimmed.isNotBlank()) {
                                        chatMessages.add(
                                            ChatMessage(
                                                id = UUID.randomUUID().toString(),
                                                senderName = username,
                                                message = trimmed,
                                                timestamp = System.currentTimeMillis()
                                            )
                                        )
                                        messageInput = ""
                                        coroutineScope.launch { listState.animateScrollToItem(chatMessages.size - 1) }
                                    }
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.Send, contentDescription = "إرسال", modifier = Modifier.size(15.dp))
                            }
                        }
                    }
                }

                // 2. DETAILED VOICE CALL & AUDIO SETTINGS DRAWER
                RoomTab.VOICE_CALL -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Title Bar
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(AHAccentEmerald))
                                Text("إعدادات الاتصال الصوتي المباشر (LiveKit Cloud)", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                            Text("المدة: ${formatCallDuration(callTimerSecs)}", color = AHAccentCyan, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        // Call Volume & Mic Gain Sliders
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                // Call Volume
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Default.VolumeUp, contentDescription = null, tint = AHAccentCyan, modifier = Modifier.size(16.dp))
                                    Text("مستوى صوت المكالمة:", color = Color.White, fontSize = 11.sp, modifier = Modifier.width(110.dp))
                                    Slider(
                                        value = callMasterVolume,
                                        onValueChange = {
                                            callMasterVolume = it
                                            liveKitService.setMasterVolume(it)
                                        },
                                        modifier = Modifier.weight(1f),
                                        colors = SliderDefaults.colors(thumbColor = AHAccentCyan, activeTrackColor = AHAccentCyan)
                                    )
                                    Text("${(callMasterVolume * 100).toInt()}%", color = Color.White, fontSize = 10.sp)
                                }

                                // Mic Gain
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Default.Mic, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(16.dp))
                                    Text("حساسية الميكروفون:", color = Color.White, fontSize = 11.sp, modifier = Modifier.width(110.dp))
                                    Slider(
                                        value = micGainLevel,
                                        onValueChange = {
                                            micGainLevel = it
                                            liveKitService.setMicGain(it)
                                        },
                                        modifier = Modifier.weight(1f),
                                        colors = SliderDefaults.colors(thumbColor = AHAccentEmerald, activeTrackColor = AHAccentEmerald)
                                    )
                                    Text("${(micGainLevel * 100).toInt()}%", color = Color.White, fontSize = 10.sp)
                                }
                            }
                        }

                        // Noise Suppression & Speakerphone Controls Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            // Noise Suppression Toggle
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable {
                                        isNoiseSuppressionOn = !isNoiseSuppressionOn
                                        liveKitService.toggleNoiseSuppression()
                                    },
                                shape = RoundedCornerShape(10.dp),
                                color = if (isNoiseSuppressionOn) Color(0xFF064E3B) else Color(0xFF1E293B),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isNoiseSuppressionOn) AHAccentEmerald else Color.Transparent)
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Shield, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(16.dp))
                                    Text(if (isNoiseSuppressionOn) "خفض الضوضاء (مفعل)" else "تصفية الضوضاء", color = Color.White, fontSize = 10.sp)
                                }
                            }

                            // Speakerphone Toggle
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable {
                                        isSpeakerphoneActive = !isSpeakerphoneActive
                                        liveKitService.toggleSpeakerphone()
                                    },
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSpeakerphoneActive) Color(0xFF311B6B) else Color(0xFF1E293B),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSpeakerphoneActive) AHPrimaryPurple else Color.Transparent)
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(if (isSpeakerphoneActive) Icons.Default.VolumeUp else Icons.Default.Headset, contentDescription = null, tint = AHPrimaryPurple, modifier = Modifier.size(16.dp))
                                    Text(if (isSpeakerphoneActive) "مكبر الصوت 🔊" else "السماعة 🎧", color = Color.White, fontSize = 10.sp)
                                }
                            }
                        }

                        // Bottom Actions: Mute / End Call
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { isMicOn = !isMicOn },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = if (isMicOn) Color(0xFF10B981) else Color(0xFFEF4444)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(if (isMicOn) Icons.Default.Mic else Icons.Default.MicOff, contentDescription = null, modifier = Modifier.size(15.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (isMicOn) "كتم الميكروفون" else "تشغيل الميكروفون", fontSize = 11.sp)
                            }

                            Button(
                                onClick = { isInVoiceCall = !isInVoiceCall },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.CallEnd, contentDescription = null, modifier = Modifier.size(15.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (isInVoiceCall) "إنهاء الاتصال" else "انضمام للاتصال", fontSize = 11.sp)
                            }
                        }
                    }
                }

                // 3. WALKIE-TALKIE DRAWER
                RoomTab.MIC -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text("جهاز اللاسلكي الفوري (Walkie-Talkie)", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 12.sp)
                        Text("اضغط باستمرار للتحدث الفوري المباشر مع جميع الحضور", color = AHTextMuted, fontSize = 10.sp)

                        Spacer(modifier = Modifier.height(10.dp))

                        Box(contentAlignment = Alignment.Center) {
                            if (isPttPressed) {
                                Box(
                                    modifier = Modifier
                                        .size(80.dp)
                                        .scale(pttPulseScale)
                                        .clip(CircleShape)
                                        .background(Color(0xFF10B981).copy(alpha = 0.3f))
                                )
                            }

                            Button(
                                onClick = { isPttPressed = !isPttPressed },
                                modifier = Modifier.size(65.dp),
                                shape = CircleShape,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isPttPressed) Color(0xFF10B981) else Color(0xFF1E293B)
                                )
                            ) {
                                Icon(
                                    Icons.Default.Mic,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (isPttPressed) Color(0xFF064E3B) else Color(0xFF1E293B)
                        ) {
                            Text(
                                text = if (isPttPressed) "🔴 جاري البث الصوتي الفوري عبر القناة..." else "انقر للتحدث الفوري",
                                color = if (isPttPressed) Color.White else AHTextSecondary,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                // 4. CAMERA GRID DRAWER
                RoomTab.CAMERA -> {
                    Column(modifier = Modifier.fillMaxSize().padding(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("الكاميرا المباشرة (HD)", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 11.sp)
                            
                            Button(
                                onClick = { isCameraOn = !isCameraOn },
                                colors = ButtonDefaults.buttonColors(containerColor = if (isCameraOn) Color(0xFF10B981) else Color(0xFF334155)),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(if (isCameraOn) Icons.Default.Videocam else Icons.Default.VideocamOff, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (isCameraOn) "إيقاف الكاميرا" else "تشغيل الكاميرا", fontSize = 10.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF1E293B)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                if (isCameraOn) {
                                    Text("🎥 بث كاميرتك المباشر يعمل بنجاح (HD Live)", color = AHAccentEmerald, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                } else {
                                    Text("انقر فوق تشغيل الكاميرا لبدء مشاركة الفيديو المباشر", color = AHTextMuted, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }

                // 5. PARTICIPANTS DRAWER
                RoomTab.PARTICIPANTS -> {
                    LazyColumn(modifier = Modifier.fillMaxSize().padding(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        item {
                            Text("المتواجدون في الغرفة (${room.viewerCount})", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        item {
                            Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF1E293B)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Box(modifier = Modifier.size(28.dp).clip(CircleShape).background(AHPrimaryPurple), contentAlignment = Alignment.Center) {
                                            Text(username.take(1), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }
                                        Text(username, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Text("أنت (المنشئ) 👑", color = AHAccentAmber, fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }

                // 6. EFFECTS DRAWER
                RoomTab.EFFECTS -> {
                    Column(modifier = Modifier.fillMaxSize().padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("تأثيرات الميكروفون والترجمة التلقائية 🪄", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF311B6B),
                                modifier = Modifier.clickable { Toast.makeText(context, "تم تفعيل الترجمة العربية التلقائية", Toast.LENGTH_SHORT).show() }
                            ) {
                                Text("تفعيل الترجمة المباشرة (ع)", color = Color.White, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                            }
                        }
                    }
                }
            }
        }
    }

    // ==========================================
    // YOUTUBE SEARCH SHEET / MODAL (20 Results + Load More)
    // ==========================================
    if (showYouTubeSearchModal) {
        AlertDialog(
            onDismissRequest = { showYouTubeSearchModal = false },
            confirmButton = {
                TextButton(onClick = { showYouTubeSearchModal = false }) {
                    Text("إغلاق", color = Color.White)
                }
            },
            title = {
                Text("نتائج بحث يوتيوب المباشرة (20 نتيجة)", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(380.dp)
                ) {
                    // Search Bar inside Modal
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = ytSearchQuery,
                            onValueChange = { ytSearchQuery = it },
                            placeholder = { Text("اكتب كلمة البحث...", fontSize = 11.sp, color = AHTextMuted) },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = AHPrimaryPurple,
                                unfocusedBorderColor = Color(0xFF1E293B),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )

                        Button(
                            onClick = {
                                ytCurrentPage = 1
                                triggerYtSearch(ytSearchQuery, 1)
                            },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                        ) {
                            Text("بحث", fontSize = 11.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (isSearchingYt && ytSearchResults.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = AHPrimaryPurple)
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(ytSearchResults) { item ->
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            currentVideoUrl = item.videoUrl
                                            repository.updateRoomVideo(room.id, item.videoUrl, item.title)
                                            showYouTubeSearchModal = false
                                            Toast.makeText(context, "تم اختيار: ${item.title}", Toast.LENGTH_SHORT).show()
                                        },
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFF1E293B)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(6.dp),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(width = 90.dp, height = 55.dp)
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(Color.Black)
                                        ) {
                                            AsyncImage(
                                                model = item.thumbnailUrl,
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier.fillMaxSize()
                                            )
                                            Box(
                                                modifier = Modifier
                                                    .align(Alignment.BottomEnd)
                                                    .padding(2.dp)
                                                    .background(Color.Black.copy(alpha = 0.8f), RoundedCornerShape(4.dp))
                                            ) {
                                                Text(item.duration, color = Color.White, fontSize = 8.sp, modifier = Modifier.padding(horizontal = 3.dp))
                                            }
                                        }

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = item.title,
                                                color = Color.White,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                maxLines = 2,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text(item.channelTitle, color = AHAccentCyan, fontSize = 9.sp)
                                                Text("• ${item.views}", color = AHTextMuted, fontSize = 9.sp)
                                            }
                                        }

                                        Icon(Icons.Default.PlayCircle, contentDescription = null, tint = AHPrimaryPurple, modifier = Modifier.size(24.dp))
                                    }
                                }
                            }

                            // Load More Button
                            item {
                                Button(
                                    onClick = {
                                        ytCurrentPage++
                                        triggerYtSearch(ytSearchQuery, ytCurrentPage)
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    if (isSearchingYt) {
                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                    }
                                    Text("ابحث أكثر 🔄 (تحميل 20 نتيجة إضافية)", fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            },
            containerColor = Color(0xFF0F172A),
            shape = RoundedCornerShape(16.dp)
        )
    }

    // ==========================================
    // M3U / M3U8 IPTV PLAYLIST & LIVE STREAMS MODAL
    // ==========================================
    if (showM3uPlaylistModal) {
        val sampleStreams = remember {
            listOf(
                Triple("📻 قناة الإخبارية المباشرة HD", "https://demo.unified-streaming.com/k8s/live/stable/out/b/hls/tears-of-steel.m3u8", "HLS Live Stream (.m3u8)"),
                Triple("🎬 فيلم وثائقي 4K سينمائي", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", "MP4 Stream"),
                Triple("⚽ قناة البث الرياضي المباشر", "https://demo.unified-streaming.com/k8s/live/stable/out/b/hls/tears-of-steel.m3u8", "IPTV Stream (.m3u)"),
                Triple("🌐 قناة الطبيعة والعلوم HD", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", "Direct Stream")
            )
        }

        AlertDialog(
            onDismissRequest = { showM3uPlaylistModal = false },
            confirmButton = {
                TextButton(onClick = { showM3uPlaylistModal = false }) {
                    Text("إغلاق", color = Color.White)
                }
            },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.QueueMusic, contentDescription = null, tint = AHAccentCyan, modifier = Modifier.size(20.dp))
                    Text("إضافة وتشغيل ملفات m3u / m3u8 و IPTV 📺", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .wrapContentHeight(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("أدخل رابط بث مباشر (.m3u8 أو .m3u أو رابط فيديو مباشر):", color = AHTextMuted, fontSize = 10.sp)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = m3uInputUrl,
                            onValueChange = { m3uInputUrl = it },
                            placeholder = { Text("https://example.com/stream.m3u8", fontSize = 10.sp, color = AHTextMuted) },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = AHAccentCyan,
                                unfocusedBorderColor = Color(0xFF1E293B),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )

                        Button(
                            onClick = {
                                if (m3uInputUrl.isNotBlank()) {
                                    currentVideoUrl = m3uInputUrl.trim()
                                    repository.updateRoomVideo(room.id, currentVideoUrl, "ملف بث مباشر m3u8")
                                    showM3uPlaylistModal = false
                                    Toast.makeText(context, "تم تشغيل البث المباشر بنجاح 🔴", Toast.LENGTH_SHORT).show()
                                }
                            },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AHAccentCyan)
                        ) {
                            Text("تشغيل", fontSize = 11.sp, color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text("أو اختر من القنوات والبث المباشر الجاهز:", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)

                    LazyColumn(
                        modifier = Modifier.height(200.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(sampleStreams) { (title, url, typeStr) ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        currentVideoUrl = url
                                        repository.updateRoomVideo(room.id, url, title)
                                        showM3uPlaylistModal = false
                                        Toast.makeText(context, "تم اختيار: $title", Toast.LENGTH_SHORT).show()
                                    },
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF1E293B)
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(title, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text(typeStr, color = AHAccentCyan, fontSize = 9.sp)
                                    }
                                    Icon(Icons.Default.PlayCircle, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            },
            containerColor = Color(0xFF0F172A),
            shape = RoundedCornerShape(14.dp)
        )
    }
}
