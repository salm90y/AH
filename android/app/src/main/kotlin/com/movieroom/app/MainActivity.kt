package com.movieroom.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.movieroom.app.data.model.WatchRoom
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.screens.HomeScreen
import com.movieroom.app.ui.screens.LandingScreen
import com.movieroom.app.ui.screens.LoginScreen
import com.movieroom.app.ui.screens.WatchRoomScreen
import com.movieroom.app.ui.theme.AHBackground
import com.movieroom.app.ui.theme.AHDarkColorScheme
import com.movieroom.app.ui.theme.AHTypography

enum class AHView {
    LANDING,
    LOGIN,
    HOME,
    WATCH_ROOM
}

class MainActivity : ComponentActivity() {

    private val repository = MovieRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MaterialTheme(
                colorScheme = AHDarkColorScheme,
                typography = AHTypography
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = AHBackground
                ) {
                    var currentView by remember { mutableStateOf(AHView.LANDING) }
                    var currentUser by remember { mutableStateOf("أحمد") }
                    var currentRole by remember { mutableStateOf("admin") }
                    var activeRoom by remember { mutableStateOf<WatchRoom?>(null) }

                    Box(modifier = Modifier.fillMaxSize()) {
                        when (currentView) {
                            AHView.LANDING -> {
                                LandingScreen(
                                    onEnterClick = {
                                        currentView = AHView.LOGIN
                                    }
                                )
                            }

                            AHView.LOGIN -> {
                                LoginScreen(
                                    onLoginSuccess = { user, role ->
                                        currentUser = user
                                        currentRole = role
                                        currentView = AHView.HOME
                                    },
                                    onBackToLanding = {
                                        currentView = AHView.LANDING
                                    }
                                )
                            }

                            AHView.HOME -> {
                                HomeScreen(
                                    repository = repository,
                                    username = currentUser,
                                    role = currentRole,
                                    onJoinRoom = { room ->
                                        activeRoom = room
                                        currentView = AHView.WATCH_ROOM
                                    },
                                    onLogout = {
                                        currentUser = ""
                                        currentRole = "user"
                                        currentView = AHView.LANDING
                                    }
                                )
                            }

                            AHView.WATCH_ROOM -> {
                                activeRoom?.let { room ->
                                    WatchRoomScreen(
                                        room = room,
                                        repository = repository,
                                        username = currentUser,
                                        role = currentRole,
                                        onLeaveRoom = {
                                            activeRoom = null
                                            currentView = AHView.HOME
                                        }
                                    )
                                } ?: run {
                                    currentView = AHView.HOME
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
