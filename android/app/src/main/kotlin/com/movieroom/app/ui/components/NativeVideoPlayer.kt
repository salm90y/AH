package com.movieroom.app.ui.components

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.movieroom.app.ui.theme.AHPrimaryPurple
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.YouTubePlayer
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.AbstractYouTubePlayerListener
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.options.IFramePlayerOptions
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.views.YouTubePlayerView
import java.util.regex.Pattern

@Composable
fun SyncedVideoPlayer(
    videoUrl: String,
    isPlaying: Boolean,
    currentPositionMs: Long,
    onPlaybackChange: ((isPlaying: Boolean, positionMs: Long) -> Unit)? = null,
    onDurationChange: ((durationMs: Long) -> Unit)? = null
) {
    val ytId = extractYouTubeId(videoUrl)
    if (ytId != null) {
        YoutubeSyncedPlayer(
            videoId = ytId,
            isPlaying = isPlaying,
            currentPositionMs = currentPositionMs,
            onPlaybackChange = onPlaybackChange,
            onDurationChange = onDurationChange
        )
    } else {
        ExoSyncedPlayer(
            videoUrl = videoUrl,
            isPlaying = isPlaying,
            currentPositionMs = currentPositionMs,
            onPlaybackChange = onPlaybackChange,
            onDurationChange = onDurationChange
        )
    }
}

fun extractYouTubeId(url: String): String? {
    val pattern = "(?<=watch\\?v=|/videos/|embed/|youtu.be/|/v/|/e/|watch\\?v%3D|watch\\?feature=player_embedded&v=|%2Fvideos%2F|embed%\u200C\u200B2F|youtu.be%2F|%2Fv%2F)[^#&?\\n]*"
    val compiledPattern = Pattern.compile(pattern)
    val matcher = compiledPattern.matcher(url)
    return if (matcher.find()) matcher.group() else null
}

@Composable
fun YoutubeSyncedPlayer(
    videoId: String,
    isPlaying: Boolean,
    currentPositionMs: Long,
    onPlaybackChange: ((isPlaying: Boolean, positionMs: Long) -> Unit)? = null,
    onDurationChange: ((durationMs: Long) -> Unit)? = null
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    var ytPlayer by remember { mutableStateOf<YouTubePlayer?>(null) }
    var isReady by remember { mutableStateOf(false) }

    LaunchedEffect(isPlaying, currentPositionMs, isReady) {
        if (isReady && ytPlayer != null) {
            val positionSecs = currentPositionMs / 1000f
            if (isPlaying) {
                ytPlayer?.seekTo(positionSecs)
                ytPlayer?.play()
            } else {
                ytPlayer?.pause()
                ytPlayer?.seekTo(positionSecs)
            }
        }
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                YouTubePlayerView(ctx).apply {
                    lifecycleOwner.lifecycle.addObserver(this)
                    
                    val listener = object : AbstractYouTubePlayerListener() {
                        override fun onReady(youTubePlayer: YouTubePlayer) {
                            ytPlayer = youTubePlayer
                            isReady = true
                            youTubePlayer.loadVideo(videoId, currentPositionMs / 1000f)
                            if (!isPlaying) youTubePlayer.pause()
                        }

                        override fun onStateChange(youTubePlayer: YouTubePlayer, state: com.pierfrancescosoffritti.androidyoutubeplayer.core.player.PlayerConstants.PlayerState) {
                            when (state) {
                                com.pierfrancescosoffritti.androidyoutubeplayer.core.player.PlayerConstants.PlayerState.PLAYING -> onPlaybackChange?.invoke(true, currentPositionMs)
                                com.pierfrancescosoffritti.androidyoutubeplayer.core.player.PlayerConstants.PlayerState.PAUSED -> onPlaybackChange?.invoke(false, currentPositionMs)
                                else -> Unit
                            }
                        }
                        
                        override fun onVideoDuration(youTubePlayer: YouTubePlayer, duration: Float) {
                            onDurationChange?.invoke((duration * 1000).toLong())
                        }
                    }

                    enableAutomaticInitialization = false
                    val options = IFramePlayerOptions.Builder()
                        .controls(1)
                        .rel(0)
                        .build()

                    initialize(listener, options)
                }
            },
            onRelease = { view ->
                view.release()
            }
        )
    }
}

@OptIn(UnstableApi::class)
@Composable
fun ExoSyncedPlayer(
    videoUrl: String,
    isPlaying: Boolean,
    currentPositionMs: Long,
    onPlaybackChange: ((isPlaying: Boolean, positionMs: Long) -> Unit)?,
    onDurationChange: ((durationMs: Long) -> Unit)? = null
) {
    val context = LocalContext.current
    var isBuffering by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val exoPlayer = remember(videoUrl) {
        ExoPlayer.Builder(context).build().apply {
            val mediaItem = MediaItem.fromUri(videoUrl)
            setMediaItem(mediaItem)
            prepare()
            this.playWhenReady = isPlaying
            seekTo(currentPositionMs)
            
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    when (state) {
                        Player.STATE_BUFFERING -> {
                            isBuffering = true
                            errorMessage = null
                        }
                        Player.STATE_READY -> {
                            isBuffering = false
                            errorMessage = null
                            if (duration > 0) {
                                onDurationChange?.invoke(duration)
                            }
                        }
                        Player.STATE_ENDED -> isBuffering = false
                        Player.STATE_IDLE -> Unit
                    }
                }
                override fun onIsPlayingChanged(playing: Boolean) {
                    onPlaybackChange?.invoke(playing, currentPosition)
                }
                override fun onPlayerError(error: PlaybackException) {
                    isBuffering = false
                    errorMessage = "تعذر تشغيل الفيديو: يرجى التحقق من الرابط أو الاتصال"
                }
            })
        }
    }

    LaunchedEffect(isPlaying) {
        if (exoPlayer.playWhenReady != isPlaying) {
            exoPlayer.playWhenReady = isPlaying
        }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            exoPlayer.release()
        }
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = true
                    setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                }
            }
        )

        if (isBuffering && errorMessage == null) {
            CircularProgressIndicator(
                color = AHPrimaryPurple,
                modifier = Modifier.size(40.dp)
            )
        }

        errorMessage?.let { error ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xDD0F172A)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.padding(20.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.ErrorOutline,
                        contentDescription = null,
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = error,
                        color = Color.White,
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = {
                            errorMessage = null
                            exoPlayer.prepare()
                            exoPlayer.play()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("إعادة المحاولة")
                    }
                }
            }
        }
    }
}
