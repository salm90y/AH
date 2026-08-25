package com.movieroom.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movieroom.app.data.model.ChatMessage
import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.ui.components.NativeVideoPlayer
import com.movieroom.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WatchRoomScreen(
    movie: Movie,
    room: WatchRoom?,
    onBack: () -> Unit
) {
    var messageText by remember { mutableStateOf("") }
    val messages = remember {
        mutableStateListOf(
            ChatMessage("1", "النظام", "مرحباً بكم في غرفة سهرة ${movie.title} 🍿", isSystem = true),
            ChatMessage("2", "أحمد", "أهلاً بالجميع، سهرة ممتعة إن شاء الله!"),
            ChatMessage("3", "سارة", "جودة الفيديو ممتازة جداً 🚀")
        )
    }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = room?.name ?: movie.title,
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${movie.category} • جودة فائقة FHD",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "رجوع", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { /* Share Room Code */ }) {
                        Icon(Icons.Default.Share, contentDescription = "مشاركة", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSurface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // AndroidX Media3 Native ExoPlayer Screen Component
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(230.dp)
            ) {
                NativeVideoPlayer(
                    videoUrl = movie.videoUrl,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Room Meta / Tabs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF22C55E))
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "بث مباشر تفاعلي",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = "المشاهدين: ${room?.viewerCount ?: 1} 👥",
                    color = AccentCyan,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            // Chat Messages List
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(messages) { msg ->
                    ChatBubble(message = msg)
                }
            }

            // Chat Input Box
            Surface(
                color = DarkSurface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        placeholder = { Text("اكتب رسالة للغرفة...", color = TextSecondary, fontSize = 13.sp) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            containerColor = DarkSurfaceVariant,
                            focusedBorderColor = PrimaryIndigo,
                            unfocusedBorderColor = Color.Transparent
                        ),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    IconButton(
                        onClick = {
                            if (messageText.isNotBlank()) {
                                messages.add(
                                    ChatMessage(
                                        id = System.currentTimeMillis().toString(),
                                        senderName = "أنا",
                                        message = messageText
                                    )
                                )
                                messageText = ""
                            }
                        },
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(PrimaryIndigo)
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "إرسال", tint = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
fun ChatBubble(message: ChatMessage) {
    if (message.isSystem) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = message.message,
                color = TextSecondary,
                fontSize = 11.sp,
                modifier = Modifier
                    .background(DarkSurfaceVariant, RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 4.dp)
            )
        }
    } else {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 2.dp)
        ) {
            Text(
                text = message.senderName,
                color = PrimaryIndigo,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(2.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(topStart = 0.dp, topEnd = 12.dp, bottomStart = 12.dp, bottomEnd = 12.dp))
                    .background(DarkSurfaceVariant)
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Text(
                    text = message.message,
                    color = Color.White,
                    fontSize = 13.sp
                )
            }
        }
    }
}
