package com.movieroom.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.screens.HomeScreen
import com.movieroom.app.ui.screens.LoginScreen
import com.movieroom.app.ui.screens.WatchRoomScreen
import com.movieroom.app.ui.theme.DarkBackground
import com.movieroom.app.ui.theme.MovieRoomDarkColorScheme

enum class AppScreen {
    LOGIN,
    HOME,
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
                    var currentScreen by remember { mutableStateOf(AppScreen.LOGIN) }
                    var activeUser by remember { mutableStateOf<String?>(null) }
                    var selectedMovie by remember { mutableStateOf<Movie?>(null) }
                    var selectedRoom by remember { mutableStateOf<WatchRoom?>(null) }

                    when (currentScreen) {
                        AppScreen.LOGIN -> {
                            LoginScreen(
                                onLoginSuccess = { user ->
                                    activeUser = user
                                    currentScreen = AppScreen.HOME
                                }
                            )
                        }

                        AppScreen.HOME -> {
                            HomeScreen(
                                repository = repository,
                                onSelectMovie = { movie ->
                                    selectedMovie = movie
                                    selectedRoom = null
                                    currentScreen = AppScreen.WATCH_ROOM
                                },
                                onJoinRoom = { room ->
                                    selectedRoom = room
                                    selectedMovie = room.currentMovie ?: repository.getMovies().first()
                                    currentScreen = AppScreen.WATCH_ROOM
                                },
                                onCreateRoom = {
                                    val movie = repository.getMovies().first()
                                    val newRoom = repository.createRoom(
                                        name = "غرفة ${activeUser ?: "سهرة"}",
                                        movie = movie,
                                        creatorName = activeUser ?: "سهرة"
                                    )
                                    selectedRoom = newRoom
                                    selectedMovie = movie
                                    currentScreen = AppScreen.WATCH_ROOM
                                }
                            )
                        }

                        AppScreen.WATCH_ROOM -> {
                            selectedMovie?.let { movie ->
                                WatchRoomScreen(
                                    movie = movie,
                                    room = selectedRoom,
                                    onBack = {
                                        currentScreen = AppScreen.HOME
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
