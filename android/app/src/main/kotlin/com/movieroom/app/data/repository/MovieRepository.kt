package com.movieroom.app.data.repository

import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.model.WatchRoom
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class MovieRepository {
    private val sampleMovies = listOf(
        Movie(
            id = "m1",
            title = "رحلة الفضاء المجهول",
            category = "خيال علمي",
            posterUrl = "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            rating = 4.9,
            duration = "142 دقيقة",
            description = "مغامرة فضائية ملحمية لاكتشاف عوالم غامضة في أطراف المجرة وإنقاذ البشرية.",
            isFeatured = true
        ),
        Movie(
            id = "m2",
            title = "سر المدينة القديمة",
            category = "غموض وإثارة",
            posterUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            rating = 4.7,
            duration = "115 دقيقة",
            description = "تحقيق بوليسي في أروقة مدينة تاريخية مليئة بالألغاز والكنوز المفقودة.",
            isFeatured = true
        ),
        Movie(
            id = "m3",
            title = "سحر الطبيعة البرية",
            category = "وثائقي",
            posterUrl = "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            rating = 4.8,
            duration = "90 دقيقة",
            description = "جولة بصرية مذهلة بين أجمل المحميات الطبيعية في العالم بجودة فائقة.",
            isFeatured = false
        ),
        Movie(
            id = "m4",
            title = "مغامرة الدراجات النارية",
            category = "أكشن",
            posterUrl = "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            rating = 4.6,
            duration = "105 دقيقة",
            description = "مطاردات سرعة مذهلة ومنافسات عالمية في عالم رياضة المحركات.",
            isFeatured = false
        )
    )

    private val sampleRooms = mutableListOf(
        WatchRoom(
            id = "room-vip-1",
            name = "سهرة نهاية الأسبوع 🍿",
            creatorName = "أحمد",
            currentMovie = sampleMovies[0],
            viewerCount = 14,
            isPrivate = false
        ),
        WatchRoom(
            id = "room-cinema-2",
            name = "عشاق الخيال العلمي 🚀",
            creatorName = "سارة",
            currentMovie = sampleMovies[1],
            viewerCount = 8,
            isPrivate = false
        )
    )

    private val _roomsFlow = MutableStateFlow<List<WatchRoom>>(sampleRooms)
    val roomsFlow: Flow<List<WatchRoom>> = _roomsFlow.asStateFlow()

    fun getMovies(): List<Movie> = sampleMovies

    fun getMovieById(id: String): Movie? = sampleMovies.find { it.id == id }

    fun createRoom(name: String, movie: Movie, creatorName: String): WatchRoom {
        val newRoom = WatchRoom(
            id = "room-${System.currentTimeMillis() % 10000}",
            name = name.ifBlank { "غرفة ${movie.title}" },
            creatorName = creatorName,
            currentMovie = movie,
            viewerCount = 1
        )
        sampleRooms.add(0, newRoom)
        _roomsFlow.value = sampleRooms.toList()
        return newRoom
    }

    fun getRoomById(id: String): WatchRoom? = sampleRooms.find { it.id == id }
}
