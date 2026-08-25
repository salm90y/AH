package com.movieroom.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movieroom.app.data.model.ChatMessage
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.components.SyncedVideoPlayer
import com.movieroom.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

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
    var currentVideoUrl by remember { mutableStateOf(room.videoUrl.ifBlank { room.currentMovie?.videoUrl ?: "https://www.youtube.com/watch?v=LXb3EKWsInQ" }) }

    // Chat Messages State
    val chatMessages = remember {
        mutableStateListOf(
            ChatMessage("sys-1", "نظام AH", "", "مرحباً بك في غرفة المشاهدة التفاعلية!", System.currentTimeMillis(), isSystem = true),
            ChatMessage("sys-2", "نظام AH", "", "انضم $username إلى الغرفة الآن 🍿", System.currentTimeMillis(), isSystem = true)
        )
    }

    var messageInput by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Change Video URL Modal State
    var showChangeUrlDialog by remember { mutableStateOf(false) }
    var newVideoInput by remember { mutableStateOf("") }

    // Share / Copy Room ID
    val copyRoomId = {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("AH Room ID", room.id)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "تم نسخ معرف الغرفة: ${room.id}", Toast.LENGTH_SHORT).show()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AHBackground)
    ) {
        // Room Top Bar
        Surface(
            color = AHSurface,
            modifier = Modifier
                .fillMaxWidth()
                .border(width = 1.dp, color = AHCardBorder.copy(alpha = 0.5f))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Room Info
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    IconButton(
                        onClick = onLeaveRoom,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "مغادرة", tint = AHTextSecondary)
                    }

                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = room.name,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (room.isPrivate) {
                                Icon(Icons.Default.Lock, contentDescription = null, tint = AHAccentAmber, modifier = Modifier.size(14.dp))
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "ID: ${room.id}",
                                fontSize = 11.sp,
                                color = AHTextMuted
                            )
                            IconButton(
                                onClick = copyRoomId,
                                modifier = Modifier.size(20.dp)
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = null, tint = AHPrimaryPurple, modifier = Modifier.size(12.dp))
                            }
                        }
                    }
                }

                // Right: Controls & Change Video button
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            newVideoInput = currentVideoUrl
                            showChangeUrlDialog = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple.copy(alpha = 0.2f)),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, tint = AHPrimaryPurple, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("تغيير الفيديو", color = AHPrimaryPurple, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = onLeaveRoom,
                        colors = ButtonDefaults.buttonColors(containerColor = AHAccentRose.copy(alpha = 0.15f)),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text("مغادرة", color = AHAccentRose, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Synced Player (Aspect Ratio 16:9)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .background(Color.Black)
        ) {
            SyncedVideoPlayer(
                videoUrl = currentVideoUrl,
                isPlaying = isPlaying,
                currentPositionMs = currentPositionMs,
                onPlaybackChange = { playing, positionMs ->
                    isPlaying = playing
                    currentPositionMs = positionMs
                    repository.updatePlaybackState(room.id, playing, positionMs)
                }
            )
        }

        // Bottom Section: Synced Chat & Participants
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            // Section Title
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.Chat, contentDescription = null, tint = AHAccentCyan, modifier = Modifier.size(16.dp))
                    Text("المحادثة الجماعية المباشرة", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = AHSurfaceVariant
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(AHAccentEmerald))
                        Text("${room.viewerCount} متصلين", fontSize = 11.sp, color = AHTextSecondary)
                    }
                }
            }

            // Messages List
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(AHSurface.copy(alpha = 0.7f))
                    .border(1.dp, AHCardBorder.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(chatMessages) { msg ->
                    if (msg.isSystem) {
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color.White.copy(alpha = 0.05f)
                            ) {
                                Text(
                                    text = msg.message,
                                    color = AHTextMuted,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
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
                                Text(
                                    text = msg.senderName,
                                    color = if (isMe) AHPrimaryPurple else AHAccentCyan,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 4.dp)
                                )
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (isMe) AHPrimaryPurple.copy(alpha = 0.3f) else AHSurfaceVariant,
                                    border = CardDefaults.outlinedCardBorder()
                                ) {
                                    Text(
                                        text = msg.message,
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Chat Input Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = messageInput,
                    onValueChange = { messageInput = it },
                    placeholder = { Text("اكتب رسالة في الغرفة...", fontSize = 12.sp, color = AHTextMuted) },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AHPrimaryPurple,
                        unfocusedBorderColor = AHCardBorder,
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
                            coroutineScope.launch {
                                listState.animateScrollToItem(chatMessages.size - 1)
                            }
                        }
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Icon(Icons.Default.Send, contentDescription = "إرسال", modifier = Modifier.size(18.dp))
                }
            }
        }
    }

    // Change Video URL Modal Dialog
    if (showChangeUrlDialog) {
        AlertDialog(
            onDismissRequest = { showChangeUrlDialog = false },
            title = { Text("تغيير فيديو الغرفة المباشر", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("الصق رابط يوتيوب أو MP4 لتشغيله ومزامنته للجميع:", fontSize = 12.sp, color = AHTextSecondary)
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = newVideoInput,
                        onValueChange = { newVideoInput = it },
                        label = { Text("رابط الفيديو الجديد") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val clean = newVideoInput.trim()
                        if (clean.isNotBlank()) {
                            currentVideoUrl = clean
                            repository.updateRoomVideo(room.id, clean)
                            chatMessages.add(
                                ChatMessage(
                                    id = UUID.randomUUID().toString(),
                                    senderName = "نظام AH",
                                    message = "قام $username بتغيير فيديو الغرفة 🎬",
                                    isSystem = true
                                )
                            )
                            showChangeUrlDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                ) {
                    Text("تطبيق وتزامن")
                }
            },
            dismissButton = {
                TextButton(onClick = { showChangeUrlDialog = false }) {
                    Text("إلغاء")
                }
            }
        )
    }
}
