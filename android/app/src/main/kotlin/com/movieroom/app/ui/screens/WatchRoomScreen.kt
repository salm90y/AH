package com.movieroom.app.ui.screens

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movieroom.app.data.api.LiveKitSyncService
import com.movieroom.app.data.model.ChatMessage
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.components.SyncedVideoPlayer
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

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
    var currentVideoUrl by remember { mutableStateOf(room.videoUrl.ifBlank { room.currentMovie?.videoUrl ?: "https://www.youtube.com/watch?v=LXb3EKWsInQ" }) }
    
    // UI States
    var activeTab by remember { mutableStateOf(0) }
    var messageInput by remember { mutableStateOf("") }
    val chatMessages = remember {
        mutableStateListOf(
            ChatMessage("1", "النظام", "", "مرحباً بك في الغرفة! استمتع بالمشاهدة.", System.currentTimeMillis())
        )
    }
    val listState = rememberLazyListState()

    // Permissions & Media State
    var hasMicPermission by remember { mutableStateOf(false) }
    var hasCameraPermission by remember { mutableStateOf(false) }
    var isMicOn by remember { mutableStateOf(false) }
    var isCameraOn by remember { mutableStateOf(false) }
    var isInCall by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasMicPermission = permissions[Manifest.permission.RECORD_AUDIO] == true
        hasCameraPermission = permissions[Manifest.permission.CAMERA] == true
    }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(
            arrayOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA)
        )
        liveKitService.connectToRoom(room.id, username)
    }

    val copyRoomCode = {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("AH Room ID", room.id)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "تم نسخ رمز الغرفة", Toast.LENGTH_SHORT).show()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text(room.name, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("الرمز: ${room.id}", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.clickable { copyRoomCode() })
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onLeaveRoom) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "مغادرة", tint = Color.White)
                    }
                },
                actions = {
                    Surface(
                        color = Color(0xFF1E293B),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.padding(end = 12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Group, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("${room.viewerCount} متصل", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        },
        containerColor = Color(0xFF070B15)
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Video Player Area (Fixed aspect ratio 16:9 so it doesn't shrink when keyboard opens)
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
                    onPlaybackChange = { playing, posMs ->
                        isPlaying = playing
                        currentPositionMs = posMs
                        repository.updatePlaybackState(room.id, playing, posMs)
                    },
                    onDurationChange = { }
                )
            }

            // Custom Sync Controls (Only for host or admins to force sync)
            if (role == "admin" || role == "host") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F172A))
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("تحكم المشرف:", color = Color.LightGray, fontSize = 12.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        IconButton(
                            onClick = {
                                isPlaying = !isPlaying
                                repository.updatePlaybackState(room.id, isPlaying, currentPositionMs)
                            },
                            modifier = Modifier.background(Color(0xFF3B82F6), CircleShape).size(36.dp)
                        ) {
                            Icon(if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow, contentDescription = null, tint = Color.White)
                        }
                    }
                }
            }

            // Tab Row
            TabRow(
                selectedTabIndex = activeTab,
                containerColor = Color(0xFF0F172A),
                contentColor = Color.White,
                indicator = { tabPositions ->
                    TabRowDefaults.Indicator(
                        Modifier.tabIndicatorOffset(tabPositions[activeTab]),
                        color = Color(0xFF3B82F6)
                    )
                }
            ) {
                Tab(
                    selected = activeTab == 0,
                    onClick = { activeTab = 0 },
                    text = { Text("الدردشة") },
                    icon = { Icon(Icons.Default.Chat, contentDescription = null) }
                )
                Tab(
                    selected = activeTab == 1,
                    onClick = { activeTab = 1 },
                    text = { Text("الاتصال") },
                    icon = { Icon(Icons.Default.Call, contentDescription = null) }
                )
            }

            // Tab Content with imePadding to handle keyboard gracefully
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .imePadding()
            ) {
                when (activeTab) {
                    0 -> ChatSection(chatMessages, messageInput, listState, onMessageChange = { messageInput = it }, onSendMessage = {
                        if (messageInput.isNotBlank()) {
                            chatMessages.add(ChatMessage(UUID.randomUUID().toString(), username, "", messageInput, System.currentTimeMillis()))
                            messageInput = ""
                            coroutineScope.launch {
                                delay(100)
                                listState.animateScrollToItem(chatMessages.size - 1)
                            }
                        }
                    })
                    1 -> CallSection(
                        isInCall = isInCall,
                        isMicOn = isMicOn,
                        isCameraOn = isCameraOn,
                        onJoinCall = { isInCall = true },
                        onLeaveCall = { isInCall = false; isMicOn = false; isCameraOn = false },
                        onToggleMic = { 
                            if (hasMicPermission) isMicOn = !isMicOn 
                            else Toast.makeText(context, "الرجاء منح صلاحية الميكروفون", Toast.LENGTH_SHORT).show() 
                        },
                        onToggleCamera = { 
                            if (hasCameraPermission) isCameraOn = !isCameraOn 
                            else Toast.makeText(context, "الرجاء منح صلاحية الكاميرا", Toast.LENGTH_SHORT).show() 
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun ChatSection(
    messages: List<ChatMessage>,
    messageInput: String,
    listState: androidx.compose.foundation.lazy.LazyListState,
    onMessageChange: (String) -> Unit,
    onSendMessage: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().background(Color(0xFF070B15))) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages) { msg ->
                val isMe = msg.senderName != "النظام" && msg.senderName != "أحمد" // Simple mock logic
                val time = SimpleDateFormat("HH:mm", Locale.US).format(Date(msg.timestamp))
                
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = if (msg.senderName == "النظام") Alignment.CenterHorizontally else if (isMe) Alignment.End else Alignment.Start
                ) {
                    if (msg.senderName != "النظام") {
                        Text(msg.senderName, color = Color.Gray, fontSize = 11.sp, modifier = Modifier.padding(bottom = 2.dp))
                    }
                    Surface(
                        color = if (msg.senderName == "النظام") Color(0xFF1E293B) else if (isMe) Color(0xFF3B82F6) else Color(0xFF1F2937),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = msg.message,
                            color = Color.White,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                    if (msg.senderName != "النظام") {
                        Text(time, color = Color.DarkGray, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
                    }
                }
            }
        }
        
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0F172A))
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = messageInput,
                onValueChange = onMessageChange,
                placeholder = { Text("اكتب رسالة...", color = Color.Gray) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF3B82F6),
                    unfocusedBorderColor = Color.Transparent,
                    focusedContainerColor = Color(0xFF1E293B),
                    unfocusedContainerColor = Color(0xFF1E293B),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = onSendMessage,
                modifier = Modifier
                    .background(Color(0xFF3B82F6), CircleShape)
                    .size(48.dp)
            ) {
                Icon(Icons.Default.Send, contentDescription = "إرسال", tint = Color.White)
            }
        }
    }
}

@Composable
fun CallSection(
    isInCall: Boolean,
    isMicOn: Boolean,
    isCameraOn: Boolean,
    onJoinCall: () -> Unit,
    onLeaveCall: () -> Unit,
    onToggleMic: () -> Unit,
    onToggleCamera: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070B15))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (!isInCall) {
            Icon(Icons.Default.Call, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(64.dp))
            Spacer(modifier = Modifier.height(16.dp))
            Text("المكالمة الصوتية والمرئية", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text("انضم للتحدث مع أصدقائك في الغرفة", color = Color.Gray, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(32.dp))
            Button(
                onClick = onJoinCall,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                Text("انضمام للمكالمة", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        } else {
            // In Call UI
            Surface(
                color = Color(0xFF1E293B),
                shape = CircleShape,
                modifier = Modifier.size(120.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(if (isCameraOn) Icons.Default.Videocam else Icons.Default.Person, contentDescription = null, tint = Color.White, modifier = Modifier.size(60.dp))
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text("أنت متصل الآن", color = Color(0xFF10B981), fontSize = 16.sp, fontWeight = FontWeight.Medium)
            
            Spacer(modifier = Modifier.height(40.dp))
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Mic Toggle
                IconButton(
                    onClick = onToggleMic,
                    modifier = Modifier.background(if (isMicOn) Color(0xFF3B82F6) else Color(0xFF4B5563), CircleShape).size(60.dp)
                ) {
                    Icon(if (isMicOn) Icons.Default.Mic else Icons.Default.MicOff, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
                }
                
                // Camera Toggle
                IconButton(
                    onClick = onToggleCamera,
                    modifier = Modifier.background(if (isCameraOn) Color(0xFF3B82F6) else Color(0xFF4B5563), CircleShape).size(60.dp)
                ) {
                    Icon(if (isCameraOn) Icons.Default.Videocam else Icons.Default.VideocamOff, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
                }
                
                // End Call
                IconButton(
                    onClick = onLeaveCall,
                    modifier = Modifier.background(Color(0xFFEF4444), CircleShape).size(60.dp)
                ) {
                    Icon(Icons.Default.CallEnd, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }
        }
    }
}
