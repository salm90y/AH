package com.movieroom.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.ui.theme.*

@Composable
fun AHLogoBadge(
    modifier: Modifier = Modifier,
    size: Int = 48
) {
    Box(
        modifier = modifier
            .size(size.dp)
            .clip(RoundedCornerShape((size / 3).dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(Color(0xFF181E36), Color(0xFF0F1424))
                )
            )
            .border(
                width = 1.dp,
                brush = Brush.linearGradient(
                    colors = listOf(AHPrimaryPurple.copy(alpha = 0.6f), AHPrimaryIndigo.copy(alpha = 0.4f))
                ),
                shape = RoundedCornerShape((size / 3).dp)
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "AH",
            fontSize = (size * 0.42).sp,
            fontWeight = FontWeight.Black,
            color = Color.White,
            letterSpacing = 1.sp
        )
        // Live Emerald Dot
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(4.dp)
                .size((size * 0.16).dp)
                .clip(CircleShape)
                .background(AHAccentEmerald)
        )
    }
}

@Composable
fun AHHeader(
    username: String,
    role: String = "user",
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        color = AHSurface.copy(alpha = 0.95f),
        modifier = modifier
            .fillMaxWidth()
            .border(width = 1.dp, color = AHCardBorder.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: Logo & Brand
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                AHLogoBadge(size = 38)
                Column {
                    Text(
                        text = "منصة AH",
                        fontWeight = FontWeight.Black,
                        fontSize = 17.sp,
                        color = Color.White
                    )
                    Text(
                        text = "مشاهدة جماعية متزامنة",
                        fontSize = 11.sp,
                        color = AHTextMuted
                    )
                }
            }

            // Right: User profile badge & logout
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // User Chip
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = AHSurfaceVariant.copy(alpha = 0.8f),
                    border = CardDefaults.outlinedCardBorder()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(22.dp)
                                .clip(CircleShape)
                                .background(Brush.linearGradient(listOf(AHPrimaryPurple, AHPrimaryIndigo))),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = username.take(1),
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = username,
                            color = AHTextPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        if (role == "admin") {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = AHAccentAmber.copy(alpha = 0.2f)
                            ) {
                                Text(
                                    text = "أدمن",
                                    color = AHAccentAmber,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }

                // Logout icon button
                IconButton(
                    onClick = onLogout,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        Icons.Default.ExitToApp,
                        contentDescription = "تسجيل الخروج",
                        tint = AHAccentRose,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun AHRoomCard(
    room: WatchRoom,
    onJoinClick: (WatchRoom) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onJoinClick(room) },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = AHSurface.copy(alpha = 0.85f)),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header Row: Title and Lock/Live status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Brush.linearGradient(listOf(AHPrimaryPurple.copy(alpha = 0.2f), AHPrimaryIndigo.copy(alpha = 0.2f)))),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (room.isPrivate) Icons.Default.Lock else Icons.Default.Tv,
                            contentDescription = null,
                            tint = if (room.isPrivate) AHAccentAmber else AHAccentCyan,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Column {
                        Text(
                            text = room.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "بواسطة ${room.creatorName}",
                            fontSize = 11.sp,
                            color = AHTextMuted
                        )
                    }
                }

                // Viewers badge
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.Black.copy(alpha = 0.4f),
                    border = CardDefaults.outlinedCardBorder()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(AHAccentEmerald)
                        )
                        Text(
                            text = "${room.viewerCount} مشاهد",
                            fontSize = 11.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Movie or Stream Topic
            room.currentMovie?.let { movie ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = AHSurfaceVariant.copy(alpha = 0.6f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            if (movie.isYouTube) Icons.Default.PlayCircle else Icons.Default.Movie,
                            contentDescription = null,
                            tint = if (movie.isYouTube) Color(0xFFFF0000) else AHAccentCyan,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = movie.title,
                            fontSize = 12.sp,
                            color = AHTextSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Join Button
            Button(
                onClick = { onJoinClick(room) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
            ) {
                Icon(
                    if (room.isPrivate) Icons.Default.Key else Icons.Default.PlayArrow,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (room.isPrivate) "إدخال الرمز والانضمام" else "انضمام للغرفة الآن",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }
        }
    }
}

@Composable
fun AHBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    NavigationBar(
        containerColor = AHSurface,
        tonalElevation = 8.dp
    ) {
        NavigationBarItem(
            selected = currentRoute == "rooms",
            onClick = { onNavigate("rooms") },
            icon = { Icon(Icons.Default.Groups, contentDescription = "الغرف") },
            label = { Text("الغرف", fontSize = 11.sp) },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AHPrimaryPurple,
                selectedTextColor = AHPrimaryPurple,
                unselectedIconColor = AHTextMuted,
                unselectedTextColor = AHTextMuted,
                indicatorColor = AHPrimaryPurple.copy(alpha = 0.15f)
            )
        )
        NavigationBarItem(
            selected = currentRoute == "create",
            onClick = { onNavigate("create") },
            icon = { Icon(Icons.Default.AddCircle, contentDescription = "إنشاء") },
            label = { Text("إنشاء غرفة", fontSize = 11.sp) },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AHPrimaryPurple,
                selectedTextColor = AHPrimaryPurple,
                unselectedIconColor = AHTextMuted,
                unselectedTextColor = AHTextMuted,
                indicatorColor = AHPrimaryPurple.copy(alpha = 0.15f)
            )
        )
        NavigationBarItem(
            selected = currentRoute == "featured",
            onClick = { onNavigate("featured") },
            icon = { Icon(Icons.Default.LiveTv, contentDescription = "المحتوى") },
            label = { Text("محتوى يوتيوب", fontSize = 11.sp) },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AHPrimaryPurple,
                selectedTextColor = AHPrimaryPurple,
                unselectedIconColor = AHTextMuted,
                unselectedTextColor = AHTextMuted,
                indicatorColor = AHPrimaryPurple.copy(alpha = 0.15f)
            )
        )
        NavigationBarItem(
            selected = currentRoute == "settings",
            onClick = { onNavigate("settings") },
            icon = { Icon(Icons.Default.Settings, contentDescription = "الإعدادات") },
            label = { Text("الإعدادات", fontSize = 11.sp) },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AHPrimaryPurple,
                selectedTextColor = AHPrimaryPurple,
                unselectedIconColor = AHTextMuted,
                unselectedTextColor = AHTextMuted,
                indicatorColor = AHPrimaryPurple.copy(alpha = 0.15f)
            )
        )
    }
}
