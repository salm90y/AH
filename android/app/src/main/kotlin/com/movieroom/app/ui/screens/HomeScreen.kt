package com.movieroom.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.model.VisitedRoomHistory
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.components.AHHeader
import com.movieroom.app.ui.components.AHRoomCard
import com.movieroom.app.ui.theme.*

@Composable
fun HomeScreen(
    repository: MovieRepository,
    username: String,
    role: String,
    onJoinRoom: (WatchRoom) -> Unit,
    onLogout: () -> Unit
) {
    val rooms by repository.roomsFlow.collectAsState(initial = emptyList())
    val history by repository.historyFlow.collectAsState(initial = emptyList())
    val movies by repository.moviesFlow.collectAsState(initial = emptyList())

    var activeTab by remember { mutableStateOf(0) } // 0: Public Rooms, 1: Create Room, 2: Direct Join, 3: History, 4: Featured

    // Create Room State
    var createName by remember { mutableStateOf("") }
    var createUrl by remember { mutableStateOf("https://www.youtube.com/watch?v=LXb3EKWsInQ") }
    var createIsPrivate by remember { mutableStateOf(false) }
    var createPasscode by remember { mutableStateOf("") }

    // Direct Join State
    var directRoomId by remember { mutableStateOf("") }
    var directPasscode by remember { mutableStateOf("") }
    var directError by remember { mutableStateOf<String?>(null) }

    // Password Prompt Dialog State
    var selectedPrivateRoom by remember { mutableStateOf<WatchRoom?>(null) }
    var inputPasscode by remember { mutableStateOf("") }
    var passcodeError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AHBackground)
    ) {
        // Top AH Header
        AHHeader(
            username = username,
            role = role,
            onLogout = onLogout
        )

        // Navigation Tabs Row
        ScrollableTabRow(
            selectedTabIndex = activeTab,
            containerColor = AHSurface,
            contentColor = Color.White,
            edgePadding = 12.dp,
            divider = { HorizontalDivider(color = AHCardBorder.copy(alpha = 0.4f)) }
        ) {
            Tab(
                selected = activeTab == 0,
                onClick = { activeTab = 0 },
                text = { Text("الغرف العامة (${rooms.filter { !it.isPrivate }.size})", fontSize = 13.sp, fontWeight = if (activeTab == 0) FontWeight.Bold else FontWeight.Normal) },
                icon = { Icon(Icons.Default.Groups, contentDescription = null, modifier = Modifier.size(18.dp)) }
            )
            Tab(
                selected = activeTab == 1,
                onClick = { activeTab = 1 },
                text = { Text("إنشاء غرفة", fontSize = 13.sp, fontWeight = if (activeTab == 1) FontWeight.Bold else FontWeight.Normal) },
                icon = { Icon(Icons.Default.AddCircle, contentDescription = null, modifier = Modifier.size(18.dp)) }
            )
            Tab(
                selected = activeTab == 2,
                onClick = { activeTab = 2 },
                text = { Text("انضمام برمز", fontSize = 13.sp, fontWeight = if (activeTab == 2) FontWeight.Bold else FontWeight.Normal) },
                icon = { Icon(Icons.Default.Key, contentDescription = null, modifier = Modifier.size(18.dp)) }
            )
            Tab(
                selected = activeTab == 3,
                onClick = { activeTab = 3 },
                text = { Text("سجل الغرف (${history.size})", fontSize = 13.sp, fontWeight = if (activeTab == 3) FontWeight.Bold else FontWeight.Normal) },
                icon = { Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(18.dp)) }
            )
            Tab(
                selected = activeTab == 4,
                onClick = { activeTab = 4 },
                text = { Text("محتوى مميز", fontSize = 13.sp, fontWeight = if (activeTab == 4) FontWeight.Bold else FontWeight.Normal) },
                icon = { Icon(Icons.Default.LiveTv, contentDescription = null, modifier = Modifier.size(18.dp)) }
            )
        }

        // Tab Content
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            when (activeTab) {
                // Tab 0: Public Rooms
                0 -> {
                    val publicList = rooms.filter { !it.isPrivate }
                    if (publicList.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.MeetingRoom, contentDescription = null, tint = AHTextMuted, modifier = Modifier.size(54.dp))
                                Spacer(modifier = Modifier.height(12.dp))
                                Text("لا توجد غرف عامة نشطة حالياً", color = AHTextSecondary, fontSize = 15.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = { activeTab = 1 },
                                    colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                                ) {
                                    Text("كن أول من ينشئ غرفة")
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(publicList) { room ->
                                AHRoomCard(
                                    room = room,
                                    onJoinClick = {
                                        if (room.isPrivate) {
                                            selectedPrivateRoom = room
                                        } else {
                                            repository.recordVisitedRoom(room.id, room.name, isCreator = false)
                                            onJoinRoom(room)
                                        }
                                    }
                                )
                            }
                        }
                    }
                }

                // Tab 1: Create Room
                1 -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        item {
                            Card(
                                shape = RoundedCornerShape(24.dp),
                                colors = CardDefaults.cardColors(containerColor = AHSurface.copy(alpha = 0.9f)),
                                border = CardDefaults.outlinedCardBorder(),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(20.dp)) {
                                    Text(
                                        text = "إنشاء غرفة مشاهدة جديدة",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                        color = Color.White
                                    )
                                    Text(
                                        text = "قم بإدخال اسم الغرفة ورابط فيديو يوتيوب لمزامنته مع الجميع",
                                        fontSize = 12.sp,
                                        color = AHTextMuted
                                    )

                                    Spacer(modifier = Modifier.height(20.dp))

                                    // Room Name
                                    OutlinedTextField(
                                        value = createName,
                                        onValueChange = { createName = it },
                                        label = { Text("اسم الغرفة (مثال: سهرة الخميس 🍿)") },
                                        leadingIcon = { Icon(Icons.Default.DriveFileRenameOutline, contentDescription = null, tint = AHPrimaryPurple) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = AHPrimaryPurple,
                                            unfocusedBorderColor = AHCardBorder,
                                            focusedTextColor = Color.White,
                                            unfocusedTextColor = Color.White
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(14.dp))

                                    // Video / YouTube URL
                                    OutlinedTextField(
                                        value = createUrl,
                                        onValueChange = { createUrl = it },
                                        label = { Text("رابط فيديو يوتيوب أو MP4 مباشر") },
                                        leadingIcon = { Icon(Icons.Default.Link, contentDescription = null, tint = AHAccentCyan) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = AHPrimaryPurple,
                                            unfocusedBorderColor = AHCardBorder,
                                            focusedTextColor = Color.White,
                                            unfocusedTextColor = Color.White
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(14.dp))

                                    // Private Switch
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(AHSurfaceVariant.copy(alpha = 0.5f))
                                            .padding(horizontal = 14.dp, vertical = 10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Icon(
                                                if (createIsPrivate) Icons.Default.Lock else Icons.Default.LockOpen,
                                                contentDescription = null,
                                                tint = if (createIsPrivate) AHAccentAmber else AHAccentCyan,
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Column {
                                                Text(
                                                    text = if (createIsPrivate) "غرفة خاصة محمية برمز" else "غرفة عامة للجميع",
                                                    color = Color.White,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                                Text(
                                                    text = if (createIsPrivate) "فقط من يملك الرمز يستطيع الدخول" else "تظهر في قائمة الغرف العامة",
                                                    color = AHTextMuted,
                                                    fontSize = 11.sp
                                                )
                                            }
                                        }
                                        Switch(
                                            checked = createIsPrivate,
                                            onCheckedChange = { createIsPrivate = it },
                                            colors = SwitchDefaults.colors(checkedThumbColor = AHPrimaryPurple)
                                        )
                                    }

                                    if (createIsPrivate) {
                                        Spacer(modifier = Modifier.height(14.dp))
                                        OutlinedTextField(
                                            value = createPasscode,
                                            onValueChange = { createPasscode = it },
                                            label = { Text("رمز الدخول السري (PIN)") },
                                            leadingIcon = { Icon(Icons.Default.Pin, contentDescription = null, tint = AHAccentAmber) },
                                            singleLine = true,
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(14.dp),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = AHAccentAmber,
                                                unfocusedBorderColor = AHCardBorder,
                                                focusedTextColor = Color.White,
                                                unfocusedTextColor = Color.White
                                            )
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(24.dp))

                                    Button(
                                        onClick = {
                                            val room = repository.createRoom(
                                                name = createName.ifBlank { "غرفة ${username}" },
                                                videoUrl = createUrl,
                                                isPrivate = createIsPrivate,
                                                passcode = createPasscode,
                                                creatorName = username,
                                                creatorId = "user-${System.currentTimeMillis() % 1000}"
                                            )
                                            onJoinRoom(room)
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(52.dp),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                                    ) {
                                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("إنشاء الغرفة وبدء المشاهدة", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    }
                                }
                            }
                        }
                    }
                }

                // Tab 2: Direct Join by ID
                2 -> {
                    Card(
                        shape = RoundedCornerShape(24.dp),
                        colors = CardDefaults.cardColors(containerColor = AHSurface.copy(alpha = 0.9f)),
                        border = CardDefaults.outlinedCardBorder(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text("الانضمام المباشر لغرفة", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                            Text("إذا أرسل لك صديقك معرف الغرفة أو الرمز أدخله هنا", fontSize = 12.sp, color = AHTextMuted)

                            Spacer(modifier = Modifier.height(20.dp))

                            OutlinedTextField(
                                value = directRoomId,
                                onValueChange = {
                                    directRoomId = it
                                    directError = null
                                },
                                label = { Text("معرف الغرفة (Room ID)") },
                                leadingIcon = { Icon(Icons.Default.Tag, contentDescription = null, tint = AHPrimaryPurple) },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = AHPrimaryPurple,
                                    unfocusedBorderColor = AHCardBorder,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                )
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedTextField(
                                value = directPasscode,
                                onValueChange = {
                                    directPasscode = it
                                    directError = null
                                },
                                label = { Text("رمز المرور (إذا كانت الغرفة خاصة)") },
                                leadingIcon = { Icon(Icons.Default.Key, contentDescription = null, tint = AHAccentAmber) },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = AHPrimaryPurple,
                                    unfocusedBorderColor = AHCardBorder,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                )
                            )

                            directError?.let { err ->
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(err, color = AHAccentRose, fontSize = 12.sp)
                            }

                            Spacer(modifier = Modifier.height(22.dp))

                            Button(
                                onClick = {
                                    val trimmedId = directRoomId.trim()
                                    if (trimmedId.isBlank()) {
                                        directError = "يرجى إدخال معرف الغرفة"
                                        return@Button
                                    }
                                    val found = repository.getRoomById(trimmedId)
                                    if (found != null) {
                                        if (found.isPrivate && found.passcode != null && found.passcode != directPasscode.trim()) {
                                            directError = "رمز المرور غير صحيح لهذه الغرفة الخاصة"
                                        } else {
                                            repository.recordVisitedRoom(found.id, found.name, isCreator = false)
                                            onJoinRoom(found)
                                        }
                                    } else {
                                        // Auto-create/join room dynamically
                                        val dynamicRoom = repository.createRoom(
                                            name = "غرفة $trimmedId",
                                            videoUrl = "https://www.youtube.com/watch?v=LXb3EKWsInQ",
                                            isPrivate = directPasscode.isNotBlank(),
                                            passcode = directPasscode.ifBlank { null },
                                            creatorName = username
                                        )
                                        onJoinRoom(dynamicRoom)
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                            ) {
                                Text("الانضمام للغرفة الآن", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            }
                        }
                    }
                }

                // Tab 3: Visited History
                3 -> {
                    if (history.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("لا توجد غرف سابقة في سجلك", color = AHTextSecondary)
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(history) { item ->
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = AHSurface.copy(alpha = 0.85f),
                                    border = CardDefaults.outlinedCardBorder(),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .padding(14.dp)
                                            .fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(item.name, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                                            Text("معرف: ${item.id}", fontSize = 11.sp, color = AHTextMuted)
                                        }
                                        Button(
                                            onClick = {
                                                val existing = repository.getRoomById(item.id)
                                                if (existing != null) {
                                                    onJoinRoom(existing)
                                                } else {
                                                    val fresh = repository.createRoom(
                                                        name = item.name,
                                                        videoUrl = "https://www.youtube.com/watch?v=LXb3EKWsInQ",
                                                        isPrivate = false,
                                                        passcode = null,
                                                        creatorName = username
                                                    )
                                                    onJoinRoom(fresh)
                                                }
                                            },
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryIndigo)
                                        ) {
                                            Text("دخول مجددًا", fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Tab 4: Featured Content
                4 -> {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(movies) { movie ->
                            Surface(
                                shape = RoundedCornerShape(18.dp),
                                color = AHSurface.copy(alpha = 0.9f),
                                border = CardDefaults.outlinedCardBorder(),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(if (movie.isYouTube) Color(0xFFFF0000).copy(alpha = 0.2f) else AHAccentCyan.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            if (movie.isYouTube) Icons.Default.PlayCircleFilled else Icons.Default.Movie,
                                            contentDescription = null,
                                            tint = if (movie.isYouTube) Color(0xFFFF4444) else AHAccentCyan,
                                            modifier = Modifier.size(28.dp)
                                        )
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(movie.title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                                        Text(movie.category, fontSize = 11.sp, color = AHTextMuted)
                                        Text(movie.duration, fontSize = 11.sp, color = AHAccentEmerald)
                                    }

                                    Button(
                                        onClick = {
                                            val room = repository.createRoom(
                                                name = "سهرة ${movie.title}",
                                                videoUrl = movie.videoUrl,
                                                isPrivate = false,
                                                passcode = null,
                                                creatorName = username
                                            )
                                            onJoinRoom(room)
                                        },
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                                    ) {
                                        Text("بدء سهرة", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Private Room PIN Prompt Dialog
    selectedPrivateRoom?.let { room ->
        AlertDialog(
            onDismissRequest = {
                selectedPrivateRoom = null
                inputPasscode = ""
                passcodeError = null
            },
            title = {
                Text("غرفة خاصة محمية برمز", fontWeight = FontWeight.Bold)
            },
            text = {
                Column {
                    Text("يرجى إدخال رمز المرور السري للانضمام إلى \"${room.name}\":", fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = inputPasscode,
                        onValueChange = {
                            inputPasscode = it
                            passcodeError = null
                        },
                        label = { Text("رمز المرور PIN") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    passcodeError?.let { err ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(err, color = AHAccentRose, fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (room.passcode == null || room.passcode == inputPasscode.trim()) {
                            repository.recordVisitedRoom(room.id, room.name, isCreator = false)
                            val target = selectedPrivateRoom!!
                            selectedPrivateRoom = null
                            onJoinRoom(target)
                        } else {
                            passcodeError = "رمز المرور غير صحيح، يرجى المحاولة ثانية"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                ) {
                    Text("انضمام")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedPrivateRoom = null }) {
                    Text("إلغاء")
                }
            }
        )
    }
}
