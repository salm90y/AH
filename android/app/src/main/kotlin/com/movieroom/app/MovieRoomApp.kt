package com.movieroom.app

import android.app.Application
import android.util.Log

class MovieRoomApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("MovieRoomCrash", "Fatal Crash on thread ${thread.name}", throwable)
        }
    }
}
