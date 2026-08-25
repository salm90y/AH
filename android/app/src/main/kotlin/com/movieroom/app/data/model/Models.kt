package com.movieroom.app.data.model

import com.google.gson.annotations.SerializedName

data class Movie(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("category") val category: String,
    @SerializedName("posterUrl") val posterUrl: String,
    @SerializedName("videoUrl") val videoUrl: String,
    @SerializedName("rating") val rating: Double = 4.8,
    @SerializedName("duration") val duration: String = "120 دقيقة",
    @SerializedName("description") val description: String = "",
    @SerializedName("isFeatured") val isFeatured: Boolean = false,
    @SerializedName("releaseYear") val releaseYear: Int = 2024,
    @SerializedName("director") val director: String = "مخرج سينمائي",
    @SerializedName("actors") val actors: List<String> = emptyList(),
    @SerializedName("isFavorite") var isFavorite: Boolean = false
)

data class WatchRoom(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("creatorName") val creatorName: String,
    @SerializedName("currentMovie") val currentMovie: Movie?,
    @SerializedName("viewerCount") val viewerCount: Int = 1,
    @SerializedName("isPrivate") val isPrivate: Boolean = false,
    @SerializedName("passcode") val passcode: String? = null,
    @SerializedName("isPlaying") val isPlaying: Boolean = true,
    @SerializedName("currentPositionMs") val currentPositionMs: Long = 0L
)

data class ChatMessage(
    @SerializedName("id") val id: String,
    @SerializedName("senderName") val senderName: String,
    @SerializedName("message") val message: String,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis(),
    @SerializedName("isSystem") val isSystem: Boolean = false
)

data class UserProfile(
    @SerializedName("id") val id: String,
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("avatarUrl") val avatarUrl: String = "",
    @SerializedName("joinedDate") val joinedDate: String = "2024",
    @SerializedName("favoriteCount") val favoriteCount: Int = 0
)

data class Category(
    val id: String,
    val name: String,
    val iconName: String = "movie"
)
