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

    var isPlaying by remember { mutableStateOf(room.isPlaying) }
    var currentPositionMs by remember { mutableStateOf(room.currentPositionMs) }
    var durationMs by remember { mutableStateOf(1046000L) } // Default ~17:26 min
    var currentVideoUrl by remember { mutableStateOf(room.videoUrl.ifBlank { room.currentMovie?.videoUrl ?: "https://www.youtube.com/watch?v=LXb3EKWsInQ" }) }
    var volumeLevel by remember { mutableStateOf(0.8f) }

    // Search / URL Input State
    var searchInputUrl by remember { mutableStateOf("") }

    // YouTube Search Sheet / Modal State
    var showYouTubeSearchModal by remember { mutableStateOf(false) }
    var ytSearchQuery by remember { mutableStateOf("") }
    var ytCurrentPage by remember { mutableStateOf(1) }
    val ytSearchResults = remember { mutableStateListOf<YouTubeSearchResult>() }
    var isSearchingYt by remember { mutableStateOf(false) }

    // Active Bottom Drawer Tab (Image 3 Buttons)
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
    var isFrontCamera by remember { mutableStateOf(true) }

    // Voice call state
    var isInVoiceCall by remember { mutableStateOf(true) }
    var callTimerSecs by remember { mutableStateOf(128) }

    // Chat Messages State
    val chatMessages = remember {
        mutableStateListOf(
            ChatMessage("sys-1", "نظام AH", "", "مرحباً بك في غرفة المشاهدة التفاعلية AH!", System.currentTimeMillis(), isSystem = true),
            ChatMessage("sys-2", "نظام AH", "", "انضم $username إلى الغرفة الآن 🍿", System.currentTimeMillis(), isSystem = true)
        )
    }

    var messageInput by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Timer effect for voice call duration
    LaunchedEffect(isInVoiceCall) {
        while (isInVoiceCall) {
            delay(1000L)
            callTimerSecs++
        }
    }

    // Formatted time (0:28 or 17:26)
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

    // Share / Copy Room ID helper
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
            delay(400) // Smooth simulated load
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
        // IMAGE 1: TOP BAR ABOVE VIDEO
        // ==========================================
        Surface(
            color = Color(0xFF0A0F1D),
            modifier = Modifier.fillMaxWidth(),
            tonalElevation = 4.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Top Row: Badges & Controls
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Exit Button
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF3B0A18),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.6f)),
                        modifier = Modifier.clickable { onLeaveRoom() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text("مغادرة", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        }
                    }

                    // Right Side Badges Row
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        // Viewer Count Badge (1 👥)
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF111827),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text("${room.viewerCount}", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Icon(Icons.Default.Group, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(14.dp))
                            }
                        }

                        // Shield Badge
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF1E244D),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF313B72))
                        ) {
                            Box(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) {
                                Icon(Icons.Default.Shield, contentDescription = null, tint = AHPrimaryIndigo, modifier = Modifier.size(14.dp))
                            }
                        }

                        // Crown Badge
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF381E5B),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF5B21B6))
                        ) {
                            Box(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) {
                                Icon(Icons.Default.WorkspacePremium, contentDescription = null, tint = AHAccentAmber, modifier = Modifier.size(14.dp))
                            }
                        }

                        // Room Code Badge (e.g. FZV0GY#)
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF111628),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AHPrimaryPurple.copy(alpha = 0.5f)),
                            modifier = Modifier.clickable { copyRoomCode() }
                        ) {
                            Text(
                                text = "${room.id}#",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        // Username Badge
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF1E293B),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                        ) {
                            Text(
                                text = username,
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        // AH Brand Pill Logo
                        Box(
                            modifier = Modifier
                                .size(30.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF121829))
                                .border(1.5.dp, AHPrimaryPurple, RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("AH", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Black)
                        }
                    }
                }

                // Row 2: Search Input Bar & Quick Action Icons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    // Red YouTube Search Trigger Button
                    IconButton(
                        onClick = { openSearchModal(searchInputUrl) },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFE11D48))
                    ) {
                        Icon(Icons.Default.Search, contentDescription = "بحث", tint = Color.White, modifier = Modifier.size(18.dp))
                    }

                    // Search / URL Input Box
                    OutlinedTextField(
                        value = searchInputUrl,
                        onValueChange = { searchInputUrl = it },
                        placeholder = { Text("ابحث في يوتيوب أو ضع رابط مباشر (TS...", fontSize = 11.sp, color = AHTextMuted) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFF0F172A),
                            unfocusedContainerColor = Color(0xFF0B1220),
                            focusedBorderColor = AHPrimaryPurple,
                            unfocusedBorderColor = Color(0xFF1E293B),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    // Share Button
                    IconButton(
                        onClick = { copyRoomCode() },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF1E293B))
                    ) {
                        Icon(Icons.Default.FileUpload, contentDescription = "مشاركة", tint = Color.White, modifier = Modifier.size(16.dp))
                    }

                    // Globe Button
                    IconButton(
                        onClick = { openSearchModal("فيديوهات فائقة الجودة 4K") },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF3B125B))
                    ) {
                        Icon(Icons.Default.Language, contentDescription = "متصفح", tint = AHPrimaryPurple, modifier = Modifier.size(16.dp))
                    }

                    // Queue / Playlist Button
                    IconButton(
                        onClick = {
                            openSearchModal("سهرة سينمائية متكاملة")
                        },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0F2B5B))
                    ) {
                        Icon(Icons.Default.QueueMusic, contentDescription = "قائمة", tint = AHAccentCyan, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }

        // ==========================================
        // PROFESSIONAL VIDEO FRAME
        // ==========================================
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1.1f)
                .padding(horizontal = 4.dp, vertical = 2.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color.Black)
                .border(1.dp, AHCardBorder.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
        ) {
            SyncedVideoPlayer(
                videoUrl = currentVideoUrl,
                isPlaying = isPlaying,
                currentPositionMs = currentPositionMs,
                onPlaybackChange = { playing, posMs ->
                    isPlaying = playing
                    currentPositionMs = posMs
                    repository.updatePlaybackState(room.id, playing, posMs)
                }
            )
        }

        // ==========================================
        // IMAGE 2: VIDEO CONTROLS BAR (SLIDER & VOLUME)
        // ==========================================
        Surface(
            color = Color(0xFF0B101D),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 6.dp, vertical = 4.dp),
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                // Top Row: Time Display & Slider
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = formatTimeMs(currentPositionMs),
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )

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

                    Text(
                        text = formatTimeMs(durationMs),
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Bottom Row: 10s Rewind, Play/Pause, 10s Forward, Volume, Fullscreen
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Playback Controls Group
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Rewind 10s
                        IconButton(
                            onClick = {
                                currentPositionMs = (currentPositionMs - 10000L).coerceAtLeast(0L)
                                repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                            },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Replay10, contentDescription = "تراجع 10s", tint = Color.White, modifier = Modifier.size(20.dp))
                        }

                        // Play/Pause Big Red Button
                        IconButton(
                            onClick = {
                                isPlaying = !isPlaying
                                repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                            },
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEF4444))
                        ) {
                            Icon(
                                if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isPlaying) "إيقاف" else "تشغيل",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }

                        // Forward 10s
                        IconButton(
                            onClick = {
                                currentPositionMs = (currentPositionMs + 10000L).coerceAtMost(durationMs)
                                repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                            },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Forward10, contentDescription = "تقديم 10s", tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                    }

                    // Volume Controls Group
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.width(120.dp)
                    ) {
                        Icon(
                            if (volumeLevel == 0f) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                            contentDescription = "الصوت",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Slider(
                            value = volumeLevel,
                            onValueChange = { volumeLevel = it },
                            modifier = Modifier.weight(1f),
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
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF1E293B))
                    ) {
                        Icon(Icons.Default.Fullscreen, contentDescription = "شاشة كاملة", tint = Color.White, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // ==========================================
        // IMAGE 3: 6 COLORED ROOM WIDGET ACTION BUTTONS
        // ==========================================
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Button 1: Participants (Gray Box with Green Badge "1")
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (activeTab == RoomTab.PARTICIPANTS) Color(0xFF2A3447) else Color(0xFF161E2E))
                    .border(1.dp, if (activeTab == RoomTab.PARTICIPANTS) AHPrimaryPurple else Color.Transparent, RoundedCornerShape(14.dp))
                    .clickable { activeTab = RoomTab.PARTICIPANTS },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.People, contentDescription = "المشاركون", tint = Color(0xFFA78BFA), modifier = Modifier.size(20.dp))
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(3.dp)
                        .size(14.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF10B981)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${room.viewerCount}", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Button 2: Camera (Bronze / Dark Brown Box with Yellow Camera Icon)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (activeTab == RoomTab.CAMERA) Color(0xFF4A3018) else Color(0xFF2A190B))
                    .border(1.dp, if (activeTab == RoomTab.CAMERA) AHAccentAmber else Color.Transparent, RoundedCornerShape(14.dp))
                    .clickable {
                        isCameraOn = !isCameraOn
                        activeTab = RoomTab.CAMERA
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isCameraOn) Icons.Default.Videocam else Icons.Default.CameraAlt,
                    contentDescription = "الكاميرا",
                    tint = Color(0xFFF59E0B),
                    modifier = Modifier.size(20.dp)
                )
            }

            // Button 3: Mic / Walkie-Talkie (Dark Green Box with Emerald Mic Icon)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (activeTab == RoomTab.MIC) Color(0xFF0F472D) else Color(0xFF08281A))
                    .border(1.dp, if (activeTab == RoomTab.MIC) AHAccentEmerald else Color.Transparent, RoundedCornerShape(14.dp))
                    .clickable { activeTab = RoomTab.MIC },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Mic, contentDescription = "الميكروفون", tint = Color(0xFF10B981), modifier = Modifier.size(20.dp))
            }

            // Button 4: Magic Stars / Effects (Dark Purple Box with Light Purple Stars + 'ع' Badge)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (activeTab == RoomTab.EFFECTS) Color(0xFF311B6B) else Color(0xFF1A0E3D))
                    .border(1.dp, if (activeTab == RoomTab.EFFECTS) AHPrimaryPurple else Color.Transparent, RoundedCornerShape(14.dp))
                    .clickable { activeTab = RoomTab.EFFECTS },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = "تأثيرات", tint = Color(0xFFC084FC), modifier = Modifier.size(20.dp))
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(3.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(Color(0xFF6366F1)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("ع", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 2.dp))
                }
            }

            // Button 5: Voice Call (Gradient Pink/Purple Box with White Phone Icon)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(
                        Brush.linearGradient(
                            colors = if (isInVoiceCall) listOf(Color(0xFF8B5CF6), Color(0xFFEC4899)) else listOf(Color(0xFF4C1D95), Color(0xFF831843))
                        )
                    )
                    .clickable { activeTab = RoomTab.VOICE_CALL },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Call, contentDescription = "اتصال صوتی", tint = Color.White, modifier = Modifier.size(20.dp))
            }

            // Button 6: Chat (Blue Box with White Chat Icon)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (activeTab == RoomTab.CHAT) Color(0xFF2563EB) else Color(0xFF1D4ED8))
                    .clickable { activeTab = RoomTab.CHAT },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Chat, contentDescription = "دردشة", tint = Color.White, modifier = Modifier.size(20.dp))
            }
        }

        // ==========================================
        // DYNAMIC BOTTOM DRAWER CONTENT
        // ==========================================
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(horizontal = 8.dp, vertical = 2.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFF0F172A))
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(16.dp))
        ) {
            when (activeTab) {
                // 1. LIVE CHAT DRAWER WITH QUICK EMOJIS
                RoomTab.CHAT -> {
                    Column(modifier = Modifier.fillMaxSize().padding(8.dp)) {
                        // Quick Reaction Emoji Bar
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 6.dp),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            listOf("🍿", "❤️", "😂", "👏", "🔥", "🎉", "👍", "😮").forEach { emoji ->
                                Surface(
                                    shape = CircleShape,
                                    color = Color(0xFF1E293B),
                                    modifier = Modifier
                                        .size(28.dp)
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
                                        Text(emoji, fontSize = 13.sp)
                                    }
                                }
                            }
                        }

                        // Messages Feed
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            items(chatMessages) { msg ->
                                if (msg.isSystem) {
                                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                        Surface(shape = RoundedCornerShape(8.dp), color = Color.White.copy(alpha = 0.05f)) {
                                            Text(msg.message, color = AHTextMuted, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                        }
                                    }
                                } else {
                                    val isMe = msg.senderName == username
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = if (isMe) Arrangement.Start else Arrangement.End
                                    ) {
                                        Column(
                                            horizontalAlignment = if (isMe) Alignment.Start else Alignment.End,
                                            modifier = Modifier.widthIn(max = 260.dp)
                                        ) {
                                            Text(msg.senderName, color = if (isMe) AHPrimaryPurple else AHAccentCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = if (isMe) AHPrimaryPurple.copy(alpha = 0.3f) else Color(0xFF1E293B)
                                            ) {
                                                Text(msg.message, color = Color.White, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Input Bar
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            OutlinedTextField(
                                value = messageInput,
                                onValueChange = { messageInput = it },
                                placeholder = { Text("اكتب رسالة في المحادثة...", fontSize = 11.sp, color = AHTextMuted) },
                                singleLine = true,
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
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
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                            ) {
                                Icon(Icons.Default.Send, contentDescription = "إرسال", modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                // 2. REAL VOICE CALL DRAWER (اتصال صوتی)
                RoomTab.VOICE_CALL -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(AHAccentEmerald))
                                Text("المكالمة الصوتية الجماعية (نشط)", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                            Text("المدة: ${formatCallDuration(callTimerSecs)}", color = AHAccentCyan, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Participants Voice Grid
                        Row(
                            modifier = Modifier.fillMaxWidth().weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // User Box
                            Surface(
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFF1E293B),
                                border = androidx.compose.foundation.BorderStroke(1.5.dp, if (isMicOn) AHAccentEmerald else Color.Transparent)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(46.dp)
                                            .clip(CircleShape)
                                            .background(AHPrimaryPurple),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(username.take(1), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(username, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    Text(if (isMicOn) "يتحدث الآن 🎙️" else "مكتوم 🔇", color = if (isMicOn) AHAccentEmerald else AHAccentRose, fontSize = 10.sp)
                                }
                            }

                            // Member Box 2
                            Surface(
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFF1E293B)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(46.dp)
                                            .clip(CircleShape)
                                            .background(AHAccentCyan),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("أ", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text("أحمد (المؤسس)", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    Text("يستمع 🎧", color = AHTextMuted, fontSize = 10.sp)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Controls
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = { isMicOn = !isMicOn },
                                colors = ButtonDefaults.buttonColors(containerColor = if (isMicOn) Color(0xFF10B981) else Color(0xFFEF4444)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(if (isMicOn) Icons.Default.Mic else Icons.Default.MicOff, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(if (isMicOn) "كتم الصوت" else "تشغيل الصوت", fontSize = 11.sp)
                            }

                            Button(
                                onClick = { isInVoiceCall = !isInVoiceCall },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.CallEnd, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(if (isInVoiceCall) "إنهاء المكالمة" else "الانضمام للمكالمة", fontSize = 11.sp)
                            }
                        }
                    }
                }

                // 3. WALKIE-TALKIE / MIC DRAWER (هوكي توكي)
                RoomTab.MIC -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text("الجهاز اللاسلكي المباشر (Walkie-Talkie)", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                        Text("اضغط باستمرار للتحدث فورياً مع جميع من بالحجرة", color = AHTextMuted, fontSize = 10.sp)
                        
                        Spacer(modifier = Modifier.height(14.dp))

                        Box(contentAlignment = Alignment.Center) {
                            if (isPttPressed) {
                                Box(
                                    modifier = Modifier
                                        .size(100.dp)
                                        .scale(pttPulseScale)
                                        .clip(CircleShape)
                                        .background(Color(0xFF10B981).copy(alpha = 0.3f))
                                )
                            }

                            Button(
                                onClick = { isPttPressed = !isPttPressed },
                                modifier = Modifier.size(80.dp),
                                shape = CircleShape,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isPttPressed) Color(0xFF10B981) else Color(0xFF1E293B)
                                )
                            ) {
                                Icon(
                                    Icons.Default.Mic,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(34.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (isPttPressed) Color(0xFF064E3B) else Color(0xFF1E293B)
                        ) {
                            Text(
                                text = if (isPttPressed) "🔴 جاري البث الصوتي المباشر..." else "اضغط للبدء في التحدث المباشر",
                                color = if (isPttPressed) Color.White else AHTextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                }

                // 4. CAMERA GRID DRAWER (كاميرات)
                RoomTab.CAMERA -> {
                    Column(modifier = Modifier.fillMaxSize().padding(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("البث المباشر للكاميرات (HD)", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 12.sp)
                            
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Button(
                                    onClick = { isFrontCamera = !isFrontCamera },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Default.Cameraswitch, contentDescription = null, tint = AHAccentCyan, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(if (isFrontCamera) "أمامية" else "خلفية", fontSize = 10.sp)
                                }

                                Button(
                                    onClick = { isCameraOn = !isCameraOn },
                                    colors = ButtonDefaults.buttonColors(containerColor = if (isCameraOn) Color(0xFF10B981) else Color(0xFFEF4444)),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(if (isCameraOn) Icons.Default.Videocam else Icons.Default.VideocamOff, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(if (isCameraOn) "مفعلة" else "معطلة", fontSize = 10.sp)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth().weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // My Camera Window
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (isCameraOn) Color(0xFF1E293B) else Color(0xFF0F172A))
                                    .border(1.dp, if (isCameraOn) AHAccentEmerald else Color(0xFF1E293B), RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isCameraOn) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.Videocam, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(32.dp))
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text("$username (أنت)", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text("بث فيديو حي HD", color = AHAccentEmerald, fontSize = 9.sp)
                                    }
                                } else {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.VideocamOff, contentDescription = null, tint = AHTextMuted, modifier = Modifier.size(28.dp))
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text("الكاميرا معطلة", color = AHTextMuted, fontSize = 10.sp)
                                    }
                                }
                            }

                            // Member Camera Window
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFF1E293B))
                                    .border(1.dp, Color(0xFF334155), RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.AccountBox, contentDescription = null, tint = AHAccentCyan, modifier = Modifier.size(32.dp))
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("أحمد (المؤسس)", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    Text("بث متصل 🟢", color = AHAccentEmerald, fontSize = 9.sp)
                                }
                            }
                        }
                    }
                }

                // 5. PARTICIPANTS DRAWER
                RoomTab.PARTICIPANTS -> {
                    Column(modifier = Modifier.fillMaxSize().padding(10.dp)) {
                        Text("قائمة المتصلين في الغرفة (${room.viewerCount})", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(6.dp))
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(listOf(username to true, "أحمد (المؤسس)" to true, "سارة" to false, "محمد" to false)) { (name, isHost) ->
                                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFF1E293B), modifier = Modifier.fillMaxWidth()) {
                                    Row(
                                        modifier = Modifier.padding(8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Box(
                                                modifier = Modifier.size(26.dp).clip(CircleShape).background(if (isHost) AHPrimaryPurple else AHAccentCyan),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(name.take(1), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                            }
                                            Column {
                                                Text(name, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                if (isHost) Text("منظم الغرفة", color = AHAccentAmber, fontSize = 9.sp)
                                            }
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Icon(Icons.Default.Mic, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(14.dp))
                                            Icon(Icons.Default.Videocam, contentDescription = null, tint = AHTextMuted, modifier = Modifier.size(14.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 6. EFFECTS & AI DRAWER
                RoomTab.EFFECTS -> {
                    Column(modifier = Modifier.fillMaxSize().padding(10.dp)) {
                        Text("مساعد AH الذكي المؤثرات الصوتية", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(listOf(
                                "الترجمة المباشرة التلقائية للغة العربية 🌐",
                                "توليد ملخص ملائم للفيلم عبر الذكاء الاصطناعي ✨",
                                "إرسال تصفيق حماسي في القاعة 👏",
                                "تفعيل الصوت المحيطي Cinema 3D 🎧"
                            )) { effect ->
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFF1E293B),
                                    modifier = Modifier.fillMaxWidth().clickable {
                                        Toast.makeText(context, "تم تفعيل $effect", Toast.LENGTH_SHORT).show()
                                    }
                                ) {
                                    Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = AHPrimaryPurple, modifier = Modifier.size(16.dp))
                                        Text(effect, color = Color.White, fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ==========================================
    // YOUTUBE SEARCH RESULTS SHEET / MODAL (20 RESULTS + PAGINATION)
    // ==========================================
    if (showYouTubeSearchModal) {
        ModalBottomSheet(
            onDismissRequest = { showYouTubeSearchModal = false },
            containerColor = Color(0xFF0F172A),
            scrimColor = Color.Black.copy(alpha = 0.7f),
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.88f)
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                // Modal Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "نتائج بحث يوتيوب المباشرة 🎬",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color.White
                    )

                    IconButton(onClick = { showYouTubeSearchModal = false }) {
                        Icon(Icons.Default.Close, contentDescription = "إغلاق", tint = Color.White)
                    }
                }

                // Search Bar in Sheet
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    OutlinedTextField(
                        value = ytSearchQuery,
                        onValueChange = { ytSearchQuery = it },
                        placeholder = { Text("ابحث في فيديوهات وأفلام يوتيوب...", fontSize = 12.sp, color = AHTextMuted) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFF1E293B),
                            unfocusedContainerColor = Color(0xFF1E293B),
                            focusedBorderColor = AHPrimaryPurple,
                            unfocusedBorderColor = Color(0xFF334155),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Button(
                        onClick = {
                            ytCurrentPage = 1
                            triggerYtSearch(ytSearchQuery, 1)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                        shape = RoundedCornerShape(14.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                    ) {
                        Text("بحث", fontWeight = FontWeight.Bold)
                    }
                }

                // Results count indicator
                Text(
                    text = "عرض ${ytSearchResults.size} نتيجة - اختر فيديو لتشغيله ومزامنته للجميع:",
                    fontSize = 11.sp,
                    color = AHTextSecondary,
                    modifier = Modifier.padding(vertical = 4.dp)
                )

                if (isSearchingYt && ytSearchResults.isEmpty()) {
                    Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = AHPrimaryPurple)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(ytSearchResults) { result ->
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFF1E293B),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        currentVideoUrl = result.videoUrl
                                        repository.updateRoomVideo(room.id, result.videoUrl)
                                        chatMessages.add(
                                            ChatMessage(
                                                id = UUID.randomUUID().toString(),
                                                senderName = "نظام AH",
                                                message = "قام $username باختيار: ${result.title} 🎬",
                                                isSystem = true
                                            )
                                        )
                                        showYouTubeSearchModal = false
                                        Toast.makeText(context, "جاري تشغيل الفيديو ومزامنته لحضور الغرفة", Toast.LENGTH_SHORT).show()
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Thumbnail with duration overlay
                                    Box(
                                        modifier = Modifier
                                            .width(110.dp)
                                            .height(68.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Color.Black)
                                    ) {
                                        AsyncImage(
                                            model = result.thumbnailUrl,
                                            contentDescription = null,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )

                                        Box(
                                            modifier = Modifier
                                                .align(Alignment.BottomEnd)
                                                .padding(4.dp)
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(Color.Black.copy(alpha = 0.8f))
                                        ) {
                                            Text(
                                                text = result.duration,
                                                color = Color.White,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                            )
                                        }
                                    }

                                    // Details
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = result.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = Color.White,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )

                                        Spacer(modifier = Modifier.height(2.dp))

                                        Text(
                                            text = "${result.channelTitle} • ${result.views}",
                                            fontSize = 10.sp,
                                            color = AHTextSecondary
                                        )

                                        Spacer(modifier = Modifier.height(4.dp))

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(Icons.Default.PlayCircle, contentDescription = null, tint = AHPrimaryPurple, modifier = Modifier.size(12.dp))
                                            Text("تشغيل ومزامنة", color = AHPrimaryPurple, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        // PAGINATION BUTTON AT THE BOTTOM: "ابحث أكثر"
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Button(
                                    onClick = {
                                        ytCurrentPage++
                                        triggerYtSearch(ytSearchQuery, ytCurrentPage)
                                    },
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple),
                                    modifier = Modifier.fillMaxWidth(0.85f)
                                ) {
                                    if (isSearchingYt) {
                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("جاري التحميل...")
                                    } else {
                                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("ابحث أكثر (تحميل 20 نتيجة إضافية) 🔄", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
