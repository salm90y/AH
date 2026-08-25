package com.movieroom.app.data.repository

import com.movieroom.app.data.api.NetworkClient
import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.model.WatchRoom
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class MovieRepository {

    private val initialMovies = listOf(
        Movie(
            id = "m1",
            title = "رحلة الفضاء المجهول",
            category = "خيال علمي",
            posterUrl = "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            rating = 4.9,
            duration = "142 دقيقة",
            description = "مغامرة فضائية ملحمية لاكتشاف عوالم غامضة في أطراف المجرة لإنقاذ مستقبل الإنسانية.",
            isFeatured = true,
            releaseYear = 2024,
            director = "كريستوفر نولان",
            actors = listOf("ماثيو ماكونهي", "آن هاثاواي", "جيسيكا شاستاين"),
            isFavorite = true
        ),
        Movie(
            id = "m2",
            title = "سر المدينة القديمة",
            category = "غموض وإثارة",
            posterUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            rating = 4.7,
            duration = "115 دقيقة",
            description = "تحقيق سينمائي في أروقة مدينة تاريخية مليئة بالألغاز والكنوز المفقودة والمفاجآت غير المتوقعة.",
            isFeatured = true,
            releaseYear = 2023,
            director = "ديفيد فينشر",
            actors = listOf("روبرت داوني", "مارك روفالو")
        ),
        Movie(
            id = "m3",
            title = "سحر الطبيعة البرية",
            category = "وثائقي",
            posterUrl = "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            rating = 4.8,
            duration = "90 دقيقة",
            description = "جولة بصرية مذهلة بين أجمل المحميات الطبيعية في العالم وأعماق المحيطات بتقنية 4K الفائقة.",
            isFeatured = false,
            releaseYear = 2024,
            director = "ديفيد أتينبورو",
            actors = listOf("ديفيد أتينبورو")
        ),
        Movie(
            id = "m4",
            title = "مطاردة السرعة القصوى",
            category = "أكشن",
            posterUrl = "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            rating = 4.6,
            duration = "105 دقيقة",
            description = "مطاردات سرعة مذهلة وسباقات دولية مشوقة في شوارع طوكيو وباريس المضاءة بالنيون.",
            isFeatured = false,
            releaseYear = 2024,
            director = "جيمس مانجولد",
            actors = listOf("كريستيان بيل", "مات ديمون")
        ),
        Movie(
            id = "m5",
            title = "أصوات الصمت",
            category = "دراما",
            posterUrl = "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop",
            videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            rating = 4.8,
            duration = "128 دقيقة",
            description = "قصة درامية إنسانية ملهمة عن الشغف والتحدي في عالم الموسيقى الكلاسيكية.",
            isFeatured = false,
            releaseYear = 2023,
            director = "داميان شازيل",
            actors = listOf("ريان جوسلينج", "إيما ستون")
        )
    )

    private val _moviesState = MutableStateFlow(initialMovies)
    val moviesFlow: Flow<List<Movie>> = _moviesState.asStateFlow()

    fun getMovies(): List<Movie> {
        return _moviesState.value
    }

    private val initialRooms = mutableListOf(
        WatchRoom(
            id = "room-vip-1",
            name = "سهرة نهاية الأسبوع 🍿",
            creatorName = "أحمد القحطاني",
            currentMovie = initialMovies[0],
            viewerCount = 14,
            isPrivate = false
        ),
        WatchRoom(
            id = "room-cinema-2",
            name = "عشاق الخيال العلمي 🚀",
            creatorName = "سارة المنصوري",
            currentMovie = initialMovies[1],
            viewerCount = 8,
            isPrivate = false
        ),
        WatchRoom(
            id = "room-nature-3",
            name = "استكشاف الطبيعة والهدوء 🌿",
            creatorName = "فيصل الحربي",
            currentMovie = initialMovies[2],
            viewerCount = 5,
            isPrivate = false
        )
    )

    private val _roomsState = MutableStateFlow(initialRooms.toList())
    val roomsFlow: Flow<List<WatchRoom>> = _roomsState.asStateFlow()

    suspend fun fetchMovies(): List<Movie> {
        return try {
            val response = NetworkClient.apiService.getMovies()
            if (response.isSuccessful && !response.body().isNullOrEmpty()) {
                val remoteMovies = response.body()!!
                _moviesState.value = remoteMovies
                remoteMovies
            } else {
                _moviesState.value
            }
        } catch (e: Exception) {
            // Fallback to offline native cache
            _moviesState.value
        }
    }

    fun getMovieById(id: String): Movie? {
        return _moviesState.value.find { it.id == id }
    }

    fun toggleFavorite(movieId: String) {
        val updated = _moviesState.value.map { movie ->
            if (movie.id == movieId) movie.copy(isFavorite = !movie.isFavorite) else movie
        }
        _moviesState.value = updated
    }

    fun getFavorites(): List<Movie> {
        return _moviesState.value.filter { it.isFavorite }
    }

    fun createRoom(name: String, movie: Movie, creatorName: String, isPrivate: Boolean = false): WatchRoom {
        val newRoom = WatchRoom(
            id = "room-${System.currentTimeMillis() % 100000}",
            name = name.ifBlank { "سهرة ${movie.title}" },
            creatorName = creatorName.ifBlank { "عضو سهرة" },
            currentMovie = movie,
            viewerCount = 1,
            isPrivate = isPrivate
        )
        initialRooms.add(0, newRoom)
        _roomsState.value = initialRooms.toList()
        return newRoom
    }

    fun getRoomById(id: String): WatchRoom? {
        return _roomsState.value.find { it.id == id }
    }
}
