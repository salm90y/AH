package com.movieroom.app.data.repository

import com.movieroom.app.data.model.ChatMessage
import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.model.RoomParticipant
import com.movieroom.app.data.model.UserProfile
import com.movieroom.app.data.model.VisitedRoomHistory
import com.movieroom.app.data.model.WatchRoom
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

class MovieRepository {

    // Helper to extract YouTube Video ID from any URL
    fun extractYouTubeId(url: String): String? {
        val trimmed = url.trim()
        if (trimmed.length == 11 && !trimmed.contains(" ") && !trimmed.contains("/")) {
            return trimmed
        }
        val patterns = listOf(
            "(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^\"&?\\/\\s]{11})".toRegex(RegexOption.IGNORE_CASE),
            "youtu\\.be\\/([^\"&?\\/\\s]{11})".toRegex(RegexOption.IGNORE_CASE),
            "youtube\\.com\\/shorts\\/([^\"&?\\/\\s]{11})".toRegex(RegexOption.IGNORE_CASE),
            "youtube\\.com\\/live\\/([^\"&?\\/\\s]{11})".toRegex(RegexOption.IGNORE_CASE)
        )
        for (pattern in patterns) {
            val match = pattern.find(trimmed)
            if (match != null && match.groupValues.size > 1) {
                return match.groupValues[1]
            }
        }
        return null
    }

    private val initialMovies = listOf(
        Movie(
            id = "yt-1",
            title = "أفضل مقاطع الطبيعة الخلابة بدقة 4K",
            category = "يوتيوب وثائقي",
            posterUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
            videoUrl = "https://www.youtube.com/watch?v=LXb3EKWsInQ",
            rating = 4.9,
            duration = "60 دقيقة",
            description = "مشاهدة متزامنة عبر يوتيوب لأجمل شواطئ وجزر العالم بجودة عالية.",
            isFeatured = true,
            releaseYear = 2024,
            isYouTube = true,
            isFavorite = true
        ),
        Movie(
            id = "yt-2",
            title = "رحلة إلى أعماق الفضاء الخارجي",
            category = "يوتيوب خيال علمي",
            posterUrl = "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop",
            videoUrl = "https://www.youtube.com/watch?v=libKVRa01L8",
            rating = 4.9,
            duration = "45 دقيقة",
            description = "جولة فضائية خيالية بين الكواكب والنجوم مع مزامنة كاملة للصوت والصورة.",
            isFeatured = true,
            releaseYear = 2024,
            isYouTube = true,
            isFavorite = true
        ),
        Movie(
            id = "m1",
            title = "رحلة الفضاء المجهول (فيلم مباشر)",
            category = "خيال علمي",
            posterUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            rating = 4.8,
            duration = "142 دقيقة",
            description = "مغامرة سينمائية في أطراف المجرة لإنقاذ مستقبل الإنسانية.",
            isFeatured = false,
            releaseYear = 2024,
            isYouTube = false
        ),
        Movie(
            id = "m2",
            title = "سحر الطبيعة البرية (سلسلة 4K)",
            category = "وثائقي",
            posterUrl = "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            rating = 4.7,
            duration = "90 دقيقة",
            description = "جولة بصرية مذهلة بين أجمل المحميات الطبيعية في العالم.",
            isFeatured = false,
            releaseYear = 2024,
            isYouTube = false
        )
    )

    private val _moviesState = MutableStateFlow(initialMovies)
    val moviesFlow: Flow<List<Movie>> = _moviesState.asStateFlow()

    fun getMovies(): List<Movie> = _moviesState.value

    private val allRooms = mutableListOf(
        WatchRoom(
            id = "ah-room-101",
            name = "سهرة سينما يوتيوب 🍿",
            creatorName = "أحمد (المؤسس)",
            creatorId = "admin-1",
            currentMovie = initialMovies[0],
            videoUrl = initialMovies[0].videoUrl,
            viewerCount = 12,
            isPrivate = false,
            isPlaying = true,
            currentPositionMs = 45000L,
            participants = listOf(
                RoomParticipant("p1", "أحمد (المؤسس)", "", isHost = true, isAdmin = true),
                RoomParticipant("p2", "سارة", "", isHost = false),
                RoomParticipant("p3", "محمد", "", isHost = false),
                RoomParticipant("p4", "خالد", "", isHost = false)
            )
        ),
        WatchRoom(
            id = "ah-room-202",
            name = "استكشاف الفضاء مع الأصدقاء 🚀",
            creatorName = "نور الدين",
            creatorId = "user-2",
            currentMovie = initialMovies[1],
            videoUrl = initialMovies[1].videoUrl,
            viewerCount = 7,
            isPrivate = false,
            isPlaying = true,
            currentPositionMs = 120000L,
            participants = listOf(
                RoomParticipant("p5", "نور الدين", "", isHost = true),
                RoomParticipant("p6", "عمر", "", isHost = false),
                RoomParticipant("p7", "ياسمين", "", isHost = false)
            )
        ),
        WatchRoom(
            id = "ah-room-303",
            name = "غرفة المشاهدة الخاصة 🔒",
            creatorName = "فيصل الحربي",
            creatorId = "user-3",
            currentMovie = initialMovies[2],
            videoUrl = initialMovies[2].videoUrl,
            viewerCount = 3,
            isPrivate = true,
            passcode = "1234",
            isPlaying = false,
            currentPositionMs = 0L,
            participants = listOf(
                RoomParticipant("p8", "فيصل الحربي", "", isHost = true)
            )
        )
    )

    private val _roomsState = MutableStateFlow(allRooms.toList())
    val roomsFlow: Flow<List<WatchRoom>> = _roomsState.asStateFlow()

    private val _historyState = MutableStateFlow<List<VisitedRoomHistory>>(
        listOf(
            VisitedRoomHistory("ah-room-101", "سهرة سينما يوتيوب 🍿", isCreator = false),
            VisitedRoomHistory("ah-room-202", "استكشاف الفضاء مع الأصدقاء 🚀", isCreator = false)
        )
    )
    val historyFlow: Flow<List<VisitedRoomHistory>> = _historyState.asStateFlow()

    fun getPublicRooms(): List<WatchRoom> = _roomsState.value.filter { !it.isPrivate }

    fun getRoomById(id: String): WatchRoom? = _roomsState.value.find { it.id == id }

    fun createRoom(
        name: String,
        videoUrl: String,
        isPrivate: Boolean,
        passcode: String?,
        creatorName: String,
        creatorId: String = "user-me"
    ): WatchRoom {
        val cleanUrl = videoUrl.trim().ifBlank { "https://www.youtube.com/watch?v=LXb3EKWsInQ" }
        val isYt = extractYouTubeId(cleanUrl) != null

        val movie = Movie(
            id = "custom-${UUID.randomUUID().toString().take(6)}",
            title = name.ifBlank { "غرفة المشاهدة التفاعلية" },
            category = if (isYt) "يوتيوب مباشر" else "فيديو مباشر",
            posterUrl = if (isYt) "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop" else "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop",
            videoUrl = cleanUrl,
            rating = 5.0,
            duration = "بث مباشر",
            isFeatured = false,
            isYouTube = isYt
        )

        val roomId = "ah-${System.currentTimeMillis() % 100000}"
        val newRoom = WatchRoom(
            id = roomId,
            name = name.ifBlank { "غرفة AH الجديدة" },
            creatorName = creatorName.ifBlank { "عضو AH" },
            creatorId = creatorId,
            currentMovie = movie,
            videoUrl = cleanUrl,
            viewerCount = 1,
            isPrivate = isPrivate,
            passcode = if (isPrivate) passcode?.trim() else null,
            isPlaying = true,
            currentPositionMs = 0L,
            participants = listOf(
                RoomParticipant(creatorId, creatorName, "", isHost = true, isAdmin = (creatorName == "أحمد" || creatorName == "admin"))
            )
        )

        allRooms.add(0, newRoom)
        _roomsState.value = allRooms.toList()
        recordVisitedRoom(roomId, newRoom.name, isCreator = true)
        return newRoom
    }

    fun recordVisitedRoom(id: String, name: String, isCreator: Boolean) {
        val current = _historyState.value.toMutableList()
        current.removeAll { it.id == id }
        current.add(0, VisitedRoomHistory(id, name, isCreator, System.currentTimeMillis()))
        _historyState.value = current.take(20)
    }

    fun updateRoomVideo(roomId: String, newUrl: String): Boolean {
        val room = getRoomById(roomId) ?: return false
        val cleanUrl = newUrl.trim()
        val isYt = extractYouTubeId(cleanUrl) != null
        val updatedMovie = (room.currentMovie ?: initialMovies[0]).copy(
            videoUrl = cleanUrl,
            isYouTube = isYt
        )
        room.currentMovie = updatedMovie
        room.videoUrl = cleanUrl
        room.currentPositionMs = 0L
        room.isPlaying = true
        _roomsState.value = allRooms.toList()
        return true
    }

    fun updatePlaybackState(roomId: String, isPlaying: Boolean, positionMs: Long) {
        val room = getRoomById(roomId) ?: return
        room.isPlaying = isPlaying
        room.currentPositionMs = positionMs
        _roomsState.value = allRooms.toList()
    }

    fun toggleFavorite(movieId: String) {
        val updated = _moviesState.value.map { movie ->
            if (movie.id == movieId) movie.copy(isFavorite = !movie.isFavorite) else movie
        }
        _moviesState.value = updated
    }

    fun getFavorites(): List<Movie> = _moviesState.value.filter { it.isFavorite }
}
