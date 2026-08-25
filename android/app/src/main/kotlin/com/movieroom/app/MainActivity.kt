package com.movieroom.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.components.MovieRoomBottomBar
import com.movieroom.app.ui.screens.*
import com.movieroom.app.ui.theme.DarkBackground
import com.movieroom.app.ui.theme.MovieRoomDarkColorScheme

enum class AppDestination {
    LOGIN,
    HOME,
    FAVORITES,
    SEARCH,
    SETTINGS,
    MOVIE_DETAIL,
    WATCH_ROOM
}

class MainActivity : ComponentActivity() {

    private val repository = MovieRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            androidx.compose.material3.MaterialTheme(
                colorScheme = MovieRoomDarkColorScheme
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DarkBackground
                ) {
                    var currentDestination by remember { mutableStateOf(AppDestination.LOGIN) }
                    var activeUser by remember { mutableStateOf("أحمد") }
                    var selectedMovie by remember { mutableStateOf<Movie?>(null) }
                    var selectedRoom by remember { mutableStateOf<WatchRoom?>(null) }

                    val isBottomBarVisible = currentDestination in listOf(
                        AppDestination.HOME,
                        AppDestination.FAVORITES,
                        AppDestination.SEARCH,
                        AppDestination.SETTINGS
                    )

                    Scaffold(
                        containerColor = DarkBackground,
                        bottomBar = {
                            if (isBottomBarVisible) {
                                val currentRoute = when (currentDestination) {
                                    AppDestination.HOME -> "home"
                                    AppDestination.FAVORITES -> "favorites"
                                    AppDestination.SEARCH -> "search"
                                    AppDestination.SETTINGS -> "settings"
                                    else -> "home"
                                }
                                MovieRoomBottomBar(
                                    currentRoute = currentRoute,
                                    onNavigate = { route ->
                                        when (route) {
                                            "home" -> currentDestination = AppDestination.HOME
                                            "favorites" -> currentDestination = AppDestination.FAVORITES
                                            "search" -> currentDestination = AppDestination.SEARCH
                                            "settings" -> currentDestination = AppDestination.SETTINGS
                                        }
                                    }
                                )
                            }
                        }
                    ) { innerPadding ->
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding)
                        ) {
                            when (currentDestination) {
                                AppDestination.LOGIN -> {
                                    LoginScreen(
                                        onLoginSuccess = { user ->
                                            activeUser = user
                                            currentDestination = AppDestination.HOME
                                        }
                                    )
                                }

                                AppDestination.HOME -> {
                                    HomeScreen(
                                        repository = repository,
                                        onSelectMovie = { movie ->
                                            selectedMovie = movie
                                            currentDestination = AppDestination.MOVIE_DETAIL
                                        },
                                        onJoinRoom = { room ->
                                            selectedRoom = room
                                            selectedMovie = room.currentMovie ?: repository.getMovies().first()
                                            currentDestination = AppDestination.WATCH_ROOM
                                        },
                                        onCreateRoom = {
                                            val movie = repository.getMovies().first()
                                            val newRoom = repository.createRoom(
                                                name = "غرفة $activeUser المميزة 🍿",
                                                movie = movie,
                                                creatorName = activeUser
                                            )
                                            selectedRoom = newRoom
                                            selectedMovie = movie
                                            currentDestination = AppDestination.WATCH_ROOM
                                        }
                                    )
                                }

                                AppDestination.FAVORITES -> {
                                    FavoritesScreen(
                                        repository = repository,
                                        onSelectMovie = { movie ->
                                            selectedMovie = movie
                                            currentDestination = AppDestination.MOVIE_DETAIL
                                        }
                                    )
                                }

                                AppDestination.SEARCH -> {
                                    SearchScreen(
                                        repository = repository,
                                        onSelectMovie = { movie ->
                                            selectedMovie = movie
                                            currentDestination = AppDestination.MOVIE_DETAIL
                                        }
                                    )
                                }

                                AppDestination.SETTINGS -> {
                                    SettingsScreen(
                                        username = activeUser,
                                        onLogout = {
                                            currentDestination = AppDestination.LOGIN
                                        }
                                    )
                                }

                                AppDestination.MOVIE_DETAIL -> {
                                    selectedMovie?.let { movie ->
                                        MovieDetailScreen(
                                            movie = movie,
                                            onBack = { currentDestination = AppDestination.HOME },
                                            onPlayMovie = { m ->
                                                selectedMovie = m
                                                selectedRoom = null
                                                currentDestination = AppDestination.WATCH_ROOM
                                            },
                                            onCreateRoomWithMovie = { m ->
                                                val room = repository.createRoom(
                                                    name = "سهرة ${m.title}",
                                                    movie = m,
                                                    creatorName = activeUser
                                                )
                                                selectedRoom = room
                                                selectedMovie = m
                                                currentDestination = AppDestination.WATCH_ROOM
                                            },
                                            onToggleFavorite = { id ->
                                                repository.toggleFavorite(id)
                                                selectedMovie = repository.getMovieById(id)
                                            }
                                        )
                                    }
                                }

                                AppDestination.WATCH_ROOM -> {
                                    selectedMovie?.let { movie ->
                                        WatchRoomScreen(
                                            movie = movie,
                                            room = selectedRoom,
                                            onBack = {
                                                currentDestination = AppDestination.HOME
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
