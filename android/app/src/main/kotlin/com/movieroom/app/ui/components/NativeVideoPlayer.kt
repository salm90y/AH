package com.movieroom.app.ui.components

import android.annotation.SuppressLint
import android.content.Context
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.foundation.background
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.movieroom.app.ui.theme.AHAccentEmerald
import com.movieroom.app.ui.theme.AHPrimaryPurple

@Composable
fun SyncedVideoPlayer(
    videoUrl: String,
    modifier: Modifier = Modifier,
    isPlaying: Boolean = true,
    currentPositionMs: Long = 0L,
    onPlaybackChange: ((isPlaying: Boolean, positionMs: Long) -> Unit)? = null,
    onDurationChange: ((durationMs: Long) -> Unit)? = null
) {
    val youTubeId = remember(videoUrl) { extractYouTubeId(videoUrl) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF030712)),
        contentAlignment = Alignment.Center
    ) {
        // Video Stream Layer
        if (youTubeId != null) {
            YouTubeSyncedPlayer(
                youTubeVideoId = youTubeId,
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

        // Overlay: Top-Left Sync Live Badge
        Row(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp),
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color.Black.copy(alpha = 0.65f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(Color(0xFFEF4444), androidx.compose.foundation.shape.CircleShape)
                    )
                    Text(
                        text = if (isPlaying) "بث متزامن 🔴" else "متوقف مؤقتاً ⏸️",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color.Black.copy(alpha = 0.65f),
                border = androidx.compose.foundation.BorderStroke(1.dp, AHPrimaryPurple.copy(alpha = 0.5f))
            ) {
                Text(
                    text = "AH Cinema 4K",
                    color = AHAccentEmerald,
                    fontSize = 10.sp,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

// Extract YouTube ID helper
fun extractYouTubeId(url: String): String? {
    val trimmed = url.trim()
    if (trimmed.length == 11 && !trimmed.contains("/") && !trimmed.contains(" ")) {
        return trimmed
    }
    val patterns = listOf(
        "(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^\"&?\\/\\s]{11})".toRegex(RegexOption.IGNORE_CASE),
        "youtu\\.be\\/([^\"&?\\/\\s]{11})".toRegex(RegexOption.IGNORE_CASE),
        "youtube\\.com\\/shorts\\/([^\"&?\\/\\s]{11})".toRegex(RegexOption.IGNORE_CASE),
        "youtube\\.com\\/live\\/([^\"&?\\/\\s]{11})".toRegex(RegexOption.IGNORE_CASE)
    )
    for (p in patterns) {
        val match = p.find(trimmed)
        if (match != null && match.groupValues.size > 1) {
            return match.groupValues[1]
        }
    }
    return null
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun YouTubeSyncedPlayer(
    youTubeVideoId: String,
    isPlaying: Boolean,
    currentPositionMs: Long,
    onPlaybackChange: ((isPlaying: Boolean, positionMs: Long) -> Unit)?,
    onDurationChange: ((durationMs: Long) -> Unit)? = null
) {
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var isReady by remember { mutableStateOf(false) }
    var hasError by remember { mutableStateOf(false) }

    val embedUrl = remember(youTubeVideoId) {
        "https://www.youtube-nocookie.com/embed/$youTubeVideoId?autoplay=1&enablejsapi=1&playsinline=1&controls=1&modestbranding=1&rel=0&origin=https://www.youtube.com&widget_referrer=https://www.youtube.com"
    }

    val htmlContent = remember(youTubeVideoId) {
        """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; background: #000000; overflow: hidden; }
                html, body, #player { width: 100%; height: 100%; }
                iframe { width: 100%; height: 100%; border: none; }
            </style>
        </head>
        <body>
            <div id="player"></div>
            <script>
                var tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                var firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                var player;
                function onYouTubeIframeAPIReady() {
                    player = new YT.Player('player', {
                        height: '100%',
                        width: '100%',
                        videoId: '$youTubeVideoId',
                        host: 'https://www.youtube-nocookie.com',
                        playerVars: {
                            'autoplay': 1,
                            'controls': 1,
                            'playsinline': 1,
                            'rel': 0,
                            'modestbranding': 1,
                            'enablejsapi': 1,
                            'origin': 'https://www.youtube.com'
                        },
                        events: {
                            'onReady': onPlayerReady,
                            'onStateChange': onPlayerStateChange,
                            'onError': onPlayerError
                        }
                    });
                }
                function onPlayerReady(event) {
                    if (window.AndroidBridge) {
                        window.AndroidBridge.onPlayerReady();
                        if (player && player.getDuration) {
                            var dur = player.getDuration();
                            if (dur > 0) window.AndroidBridge.onDuration(Math.floor(dur * 1000));
                        }
                    }
                    if (${if (isPlaying) "true" else "false"}) {
                        try { event.target.playVideo(); } catch(e){}
                    }
                }
                function onPlayerStateChange(event) {
                    if (window.AndroidBridge && player && player.getCurrentTime) {
                        var isPlaying = (event.data === 1);
                        var timeMs = Math.floor(player.getCurrentTime() * 1000);
                        window.AndroidBridge.onStateChange(isPlaying, timeMs);
                        if (player.getDuration) {
                            var dur = player.getDuration();
                            if (dur > 0) window.AndroidBridge.onDuration(Math.floor(dur * 1000));
                        }
                    }
                }
                function onPlayerError(event) {
                    if (window.AndroidBridge) {
                        window.AndroidBridge.onPlayerError(event.data);
                    }
                }
                function playVideo() { if (player && player.playVideo) player.playVideo(); }
                function pauseVideo() { if (player && player.pauseVideo) player.pauseVideo(); }
                function seekTo(seconds) { if (player && player.seekTo) player.seekTo(seconds, true); }
            </script>
        </body>
        </html>
        """.trimIndent()
    }

    LaunchedEffect(isPlaying, isReady) {
        if (isReady && webViewRef != null) {
            val js = if (isPlaying) "playVideo();" else "pauseVideo();"
            webViewRef?.evaluateJavascript(js, null)
        }
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        allowFileAccess = true
                        allowContentAccess = true
                        userAgentString = "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
                        cacheMode = WebSettings.LOAD_DEFAULT
                    }
                    webChromeClient = WebChromeClient()
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isReady = true
                        }
                    }
                    
                    addJavascriptInterface(object {
                        @JavascriptInterface
                        fun onPlayerReady() {
                            isReady = true
                            hasError = false
                        }

                        @JavascriptInterface
                        fun onStateChange(playing: Boolean, timeMs: Long) {
                            onPlaybackChange?.invoke(playing, timeMs)
                        }

                        @JavascriptInterface
                        fun onDuration(durMs: Long) {
                            onDurationChange?.invoke(durMs)
                        }

                        @JavascriptInterface
                        fun onPlayerError(code: Int) {
                            hasError = true
                        }
                    }, "AndroidBridge")

                    val headers = HashMap<String, String>()
                    headers["Referer"] = "https://www.youtube.com/"
                    headers["Origin"] = "https://www.youtube.com"

                    if (hasError) {
                        loadUrl(embedUrl, headers)
                    } else {
                        loadDataWithBaseURL("https://www.youtube.com", htmlContent, "text/html", "UTF-8", null)
                    }
                    webViewRef = this
                }
            },
            update = { view ->
                webViewRef = view
            }
        )

        if (!isReady && !hasError) {
            CircularProgressIndicator(
                color = AHPrimaryPurple,
                modifier = Modifier.size(36.dp)
            )
        }

        if (hasError) {
            Surface(
                modifier = Modifier.padding(16.dp),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xEE0F172A)
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("تم التبديل لمشغل يوتيوب المباشر لتجاوز التقييد", color = Color.White, fontSize = 11.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Button(
                        onClick = {
                            hasError = false
                            webViewRef?.loadUrl(embedUrl)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AHPrimaryPurple)
                    ) {
                        Text("إعادة تشغيل الفيديو", fontSize = 11.sp)
                    }
                }
            }
        }
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
