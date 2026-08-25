package com.movieroom.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movieroom.app.data.model.ChatMessage
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.components.SyncedVideoPlayer
import com.movieroom.app.ui.theme.*
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

    // Search / URL Input State (Image 1 Bar)
    var searchInputUrl by remember { mutableStateOf("") }

    // Active Bottom Drawer Tab (Image 3 Buttons)
    var activeTab by remember { mutableStateOf(RoomTab.CHAT) }

    // Walkie Talkie state
    var isPttPressed by remember { mutableStateOf(false) }

    // Mic & Camera state
    var isMicOn by remember { mutableStateOf(true) }
    var isCameraOn by remember { mutableStateOf(false) }

    // Voice call state
    var isInVoiceCall by remember { mutableStateOf(true) }

    // Chat Messages State
    val chatMessages = remember {
        mutableStateListOf(
            ChatMessage("sys-1", "نظام AH", "", "مرحباً بك في غرفة المشاهدة التفاعلية AH!", System.currentTimeMillis(), isSystem = true),
            ChatMessage("sys-2", "نظام AH", "", "انضم $username إلى الغرفة الآن 🍿", System.currentTimeMillis(), isSystem = true)
        )
    }

    var messageInput by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Helper for formatted time (e.g. 0:28 or 17:26)
    fun formatTimeMs(ms: Long): String {
        val totalSecs = (ms / 1000).toInt()
        val mins = totalSecs / 60
        val secs = totalSecs % 60
        return String.format(Locale.US, "%d:%02d", mins, secs)
    }

    // Share / Copy Room ID helper
    val copyRoomCode = {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("AH Room ID", room.id)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "تم نسخ رمز الغرفة: ${room.id}", Toast.LENGTH_SHORT).show()
    }

    val loadVideoFromSearch = {
        val trimmed = searchInputUrl.trim()
        if (trimmed.isNotBlank()) {
            currentVideoUrl = trimmed
            repository.updateRoomVideo(room.id, trimmed)
            chatMessages.add(
                ChatMessage(
                    id = UUID.randomUUID().toString(),
                    senderName = "نظام AH",
                    message = "قام $username بتغيير الفيديو الرابط/البحث 🎬",
                    isSystem = true
                )
            )
            Toast.makeText(context, "تم تحميل الفيديو وتزامنه للجميع", Toast.LENGTH_SHORT).show()
        }
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
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Top Badges Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Left: Exit Button
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF4A1222),
                        border = CardDefaults.outlinedCardBorder(),
                        modifier = Modifier.clickable { onLeaveRoom() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Text("مغادرة", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    // Center & Right Badges Row
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // Viewer Count Badge (1 👥)
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF111827),
                            border = CardDefaults.outlinedCardBorder()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text("${room.viewerCount}", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                Icon(Icons.Default.Group, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(16.dp))
                            }
                        }

                        // Protection / Shield Badge
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF202656),
                            border = CardDefaults.outlinedCardBorder()
                        ) {
                            Box(modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)) {
                                Icon(Icons.Default.Shield, contentDescription = null, tint = AHPrimaryIndigo, modifier = Modifier.size(16.dp))
                            }
                        }

                        // Host / Crown Badge
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF381E5B),
                            border = CardDefaults.outlinedCardBorder()
                        ) {
                            Box(modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)) {
                                Icon(Icons.Default.WorkspacePremium, contentDescription = null, tint = AHAccentAmber, modifier = Modifier.size(16.dp))
                            }
                        }

                        // Room ID Code Badge (e.g. FZV0GY#)
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF111628),
                            border = CardDefaults.outlinedCardBorder(),
                            modifier = Modifier.clickable { copyRoomCode() }
                        ) {
                            Text(
                                text = "${room.id}#",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }

                        // Username Badge
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF222A42),
                            border = CardDefaults.outlinedCardBorder()
                        ) {
                            Text(
                                text = username,
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }

                        // AH Brand Logo Pill
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF121829))
                                .border(1.5.dp, AHPrimaryPurple, RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("AH", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Black)
                        }
                    }
                }

                // Row 2: YouTube Search / Direct URL Input Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Red Search Button
                    IconButton(
                        onClick = { loadVideoFromSearch() },
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFE11D48))
                    ) {
                        Icon(Icons.Default.Search, contentDescription = "بحث", tint = Color.White, modifier = Modifier.size(20.dp))
                    }

                    // Text Input Field
                    OutlinedTextField(
                        value = searchInputUrl,
                        onValueChange = { searchInputUrl = it },
                        placeholder = { Text("ابحث في يوتيوب أو ضع رابط مباشر (TS...", fontSize = 12.sp, color = AHTextMuted) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFF11182A),
                            unfocusedContainerColor = Color(0xFF0E1322),
                            focusedBorderColor = AHPrimaryPurple,
                            unfocusedBorderColor = Color(0xFF1E293B),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    // Share / Upload Button
                    IconButton(
                        onClick = { copyRoomCode() },
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF1E293B))
                    ) {
                        Icon(Icons.Default.FileUpload, contentDescription = "مشاركة", tint = Color.White, modifier = Modifier.size(18.dp))
                    }

                    // Globe / Browser Button
                    IconButton(
                        onClick = { loadVideoFromSearch() },
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF3B125B))
                    ) {
                        Icon(Icons.Default.Language, contentDescription = "متصفح", tint = AHPrimaryPurple, modifier = Modifier.size(18.dp))
                    }

                    // Playlist / Queue Button
                    IconButton(
                        onClick = {
                            Toast.makeText(context, "قائمة التشغيل جاهزة", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0F2B5B))
                    ) {
                        Icon(Icons.Default.QueueMusic, contentDescription = "قائمة", tint = AHAccentCyan, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // ==========================================
        // VIDEO PLAYER SECTION
        // ==========================================
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color.Black)
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
                .padding(horizontal = 8.dp, vertical = 6.dp),
            shape = RoundedCornerShape(20.dp),
            border = CardDefaults.outlinedCardBorder()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                // Top Time & Progress Slider Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = formatTimeMs(currentPositionMs),
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Slider(
                        value = currentPositionMs.toFloat(),
                        onValueChange = { newPos ->
                            currentPositionMs = newPos.toLong()
                        },
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
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                // Bottom Controls Row: Rewind, Play/Pause, Forward, Volume, Fullscreen
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Rewind 10s & Play/Pause & Forward 10s
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Rewind 10s
                        IconButton(
                            onClick = {
                                currentPositionMs = (currentPositionMs - 10000L).coerceAtLeast(0L)
                                repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                            },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Replay10, contentDescription = "تراجع 10s", tint = Color.White, modifier = Modifier.size(24.dp))
                            }
                        }

                        // Big Red Circular Play/Pause Button
                        IconButton(
                            onClick = {
                                isPlaying = !isPlaying
                                repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                            },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEF4444))
                        ) {
                            Icon(
                                if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isPlaying) "إيقاف" else "تشغيل",
                                tint = Color.White,
                                modifier = Modifier.size(26.dp)
                            )
                        }

                        // Forward 10s
                        IconButton(
                            onClick = {
                                currentPositionMs = (currentPositionMs + 10000L).coerceAtMost(durationMs)
                                repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                            },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.Forward10, contentDescription = "تقديم 10s", tint = Color.White, modifier = Modifier.size(24.dp))
                        }
                    }

                    // Center/Right: Volume Icon & Slider
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.width(130.dp)
                    ) {
                        Icon(
                            if (volumeLevel == 0f) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                            contentDescription = "الصوت",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
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
                            Toast.makeText(context, "تم تفعيل الشاشة الكاملة", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF1E293B))
                    ) {
                        Icon(Icons.Default.Fullscreen, contentDescription = "شاشة كاملة", tint = Color.White, modifier = Modifier.size(22.dp))
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
                .padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Button 1: Participants (Gray Box with Green Badge "1")
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (activeTab == RoomTab.PARTICIPANTS) Color(0xFF2A3447) else Color(0xFF182030))
                    .border(1.dp, if (activeTab == RoomTab.PARTICIPANTS) AHPrimaryPurple else Color.Transparent, RoundedCornerShape(16.dp))
                    .clickable { activeTab = RoomTab.PARTICIPANTS },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.People, contentDescription = "المشاركون", tint = Color(0xFFA78BFA), modifier = Modifier.size(22.dp))
                // Green Notification Badge
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF10B981)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${room.viewerCount}", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Button 2: Camera (Bronze / Dark Brown Box with Yellow Camera Icon)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (activeTab == RoomTab.CAMERA) Color(0xFF4A3018) else Color(0xFF2E1C0C))
                    .border(1.dp, if (activeTab == RoomTab.CAMERA) AHAccentAmber else Color.Transparent, RoundedCornerShape(16.dp))
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
                    modifier = Modifier.size(22.dp)
                )
            }

            // Button 3: Mic / Walkie-Talkie (Dark Green Box with Emerald Mic Icon)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (activeTab == RoomTab.MIC) Color(0xFF0F472D) else Color(0xFF092E1D))
                    .border(1.dp, if (activeTab == RoomTab.MIC) AHAccentEmerald else Color.Transparent, RoundedCornerShape(16.dp))
                    .clickable { activeTab = RoomTab.MIC },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Mic, contentDescription = "الميكروفون", tint = Color(0xFF10B981), modifier = Modifier.size(22.dp))
            }

            // Button 4: Magic Stars / Effects (Dark Purple Box with Light Purple Stars + 'ع' Badge)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (activeTab == RoomTab.EFFECTS) Color(0xFF311B6B) else Color(0xFF1E1045))
                    .border(1.dp, if (activeTab == RoomTab.EFFECTS) AHPrimaryPurple else Color.Transparent, RoundedCornerShape(16.dp))
                    .clickable { activeTab = RoomTab.EFFECTS },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = "تأثيرات", tint = Color(0xFFC084FC), modifier = Modifier.size(22.dp))
                // Arabic Badge 'ع'
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(4.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(0xFF6366F1)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("ع", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 3.dp))
                }
            }

            // Button 5: Voice Call (Gradient Pink/Purple Box with White Phone Icon)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.linearGradient(
                            colors = if (isInVoiceCall) listOf(Color(0xFF8B5CF6), Color(0xFFEC4899)) else listOf(Color(0xFF4C1D95), Color(0xFF831843))
                        )
                    )
                    .clickable { activeTab = RoomTab.VOICE_CALL },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Call, contentDescription = "اتصال صوتی", tint = Color.White, modifier = Modifier.size(22.dp))
            }

            // Button 6: Chat (Blue Box with White Chat Bubble Icon)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .padding(horizontal = 2.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (activeTab == RoomTab.CHAT) Color(0xFF2563EB) else Color(0xFF1D4ED8))
                    .clickable { activeTab = RoomTab.CHAT },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Chat, contentDescription = "دردشة", tint = Color.White, modifier = Modifier.size(22.dp))
            }
        }

        // ==========================================
        // DYNAMIC BOTTOM DRAWER CONTENT ACCORDING TO ACTIVE TAB
        // ==========================================
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.9f)
                .padding(horizontal = 10.dp, vertical = 4.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0xFF0F172A))
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(18.dp))
        ) {
            when (activeTab) {
                // 1. CHAT DRAWER
                RoomTab.CHAT -> {
                    Column(modifier = Modifier.fillMaxSize().padding(10.dp)) {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
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
                                                Text(msg.message, color = Color.White, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            OutlinedTextField(
                                value = messageInput,
                                onValueChange = { messageInput = it },
                                placeholder = { Text("اكتب رسالة في المحادثة...", fontSize = 12.sp, color = AHTextMuted) },
                                singleLine = true,
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(14.dp),
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
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                            ) {
                                Icon(Icons.Default.Send, contentDescription = "إرسال", modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                // 2. PARTICIPANTS DRAWER
                RoomTab.PARTICIPANTS -> {
                    Column(modifier = Modifier.fillMaxSize().padding(14.dp)) {
                        Text("قائمة المتصلين في الغرفة (${room.viewerCount})", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(10.dp))
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(listOf(username, "أحمد (المؤسس)", "سارة", "محمد")) { name ->
                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF1E293B), modifier = Modifier.fillMaxWidth()) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Box(
                                                modifier = Modifier.size(28.dp).clip(CircleShape).background(AHPrimaryPurple),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(name.take(1), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                            }
                                            Text(name, color = Color.White, fontSize = 13.sp)
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Icon(Icons.Default.Mic, contentDescription = null, tint = AHAccentEmerald, modifier = Modifier.size(16.dp))
                                            Icon(Icons.Default.Videocam, contentDescription = null, tint = AHTextMuted, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 3. WALKIE-TALKIE / MIC DRAWER
                RoomTab.MIC -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text("الميكروفون والتحدث المباشر (Walkie-Talkie)", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { isPttPressed = !isPttPressed },
                            modifier = Modifier.size(90.dp),
                            shape = CircleShape,
                            colors = ButtonDefaults.buttonColors(containerColor = if (isPttPressed) Color(0xFF10B981) else Color(0xFF1E293B))
                        ) {
                            Icon(Icons.Default.Mic, contentDescription = null, tint = Color.White, modifier = Modifier.size(36.dp))
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            if (isPttPressed) "جاري البث الصوتي... الجميع يسمعك" else "اضغط للتحدث المباشر مع الحضور",
                            color = if (isPttPressed) AHAccentEmerald else AHTextMuted,
                            fontSize = 12.sp
                        )
                    }
                }

                // 4. CAMERA GRID DRAWER
                RoomTab.CAMERA -> {
                    Column(modifier = Modifier.fillMaxSize().padding(14.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("البث المباشر للكاميرات", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                            Text(if (isCameraOn) "كاميرتك مفعّلة 📷" else "الكاميرا متوقفة", color = if (isCameraOn) AHAccentEmerald else AHTextMuted, fontSize = 12.sp)
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(
                                modifier = Modifier.weight(1f).height(100.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFF1E293B)),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = AHPrimaryPurple, modifier = Modifier.size(32.dp))
                                    Text(username, color = Color.White, fontSize = 11.sp)
                                }
                            }
                            Box(
                                modifier = Modifier.weight(1f).height(100.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFF1E293B)),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.PersonOutline, contentDescription = null, tint = AHAccentCyan, modifier = Modifier.size(32.dp))
                                    Text("أحمد", color = Color.White, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }

                // 5. VOICE CALL DRAWER
                RoomTab.VOICE_CALL -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Default.Call, contentDescription = null, tint = AHPrimaryPurple, modifier = Modifier.size(40.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("الاتصال الصوتي الجماعي للغرفة", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("متصل الآن بدقة عالية وبدون تأخير", color = AHAccentEmerald, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(
                                onClick = { isMicOn = !isMicOn },
                                colors = ButtonDefaults.buttonColors(containerColor = if (isMicOn) Color(0xFF10B981) else Color(0xFFEF4444))
                            ) {
                                Icon(if (isMicOn) Icons.Default.Mic else Icons.Default.MicOff, contentDescription = null)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(if (isMicOn) "كتم الصوتي" else "تشغيل الصوت")
                            }
                            Button(
                                onClick = { isInVoiceCall = !isInVoiceCall },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                            ) {
                                Icon(Icons.Default.CallEnd, contentDescription = null)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("إنهاء المكالمة")
                            }
                        }
                    }
                }

                // 6. EFFECTS & AI DRAWER
                RoomTab.EFFECTS -> {
                    Column(modifier = Modifier.fillMaxSize().padding(14.dp)) {
                        Text("مساعد AH الذكي والتأثيرات الصوتية", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(10.dp))
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(listOf("الترجمة الفورية للترجمة للغة العربية", "مؤثرات التفاعل والتصفيق 👏", "توليد ملخص للفيديو عبر الذكاء الاصطناعي ✨")) { effect ->
                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF1E293B), modifier = Modifier.fillMaxWidth().clickable {
                                    Toast.makeText(context, "تم تفعيل $effect", Toast.LENGTH_SHORT).show()
                                }) {
                                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = AHPrimaryPurple)
                                        Text(effect, color = Color.White, fontSize = 12.sp)
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
