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
    @SerializedName("director") val director: String = "AH Studio",
    @SerializedName("actors") val actors: List<String> = emptyList(),
    @SerializedName("isFavorite") var isFavorite: Boolean = false,
    @SerializedName("isYouTube") val isYouTube: Boolean = false
)

data class WatchRoom(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("creatorName") val creatorName: String,
    @SerializedName("creatorId") val creatorId: String = "",
    @SerializedName("currentMovie") var currentMovie: Movie?,
    @SerializedName("viewerCount") var viewerCount: Int = 1,
    @SerializedName("isPrivate") val isPrivate: Boolean = false,
    @SerializedName("passcode") val passcode: String? = null,
    @SerializedName("isPlaying") var isPlaying: Boolean = true,
    @SerializedName("currentPositionMs") var currentPositionMs: Long = 0L,
    @SerializedName("videoUrl") var videoUrl: String = "",
    @SerializedName("participants") val participants: List<RoomParticipant> = emptyList()
)

data class RoomParticipant(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("avatar") val avatar: String = "",
    @SerializedName("isHost") val isHost: Boolean = false,
    @SerializedName("isAdmin") val isAdmin: Boolean = false
)

data class ChatMessage(
    @SerializedName("id") val id: String,
    @SerializedName("senderName") val senderName: String,
    @SerializedName("senderAvatar") val senderAvatar: String = "",
    @SerializedName("message") val message: String,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis(),
    @SerializedName("isSystem") val isSystem: Boolean = false
)

data class UserProfile(
    @SerializedName("id") val id: String,
    @SerializedName("username") val username: String,
    @SerializedName("role") val role: String = "user", // "admin" or "user"
    @SerializedName("avatarUrl") val avatarUrl: String = "",
    @SerializedName("joinedDate") val joinedDate: String = "2024",
    @SerializedName("favoriteCount") val favoriteCount: Int = 0
)

data class VisitedRoomHistory(
    val id: String,
    val name: String,
    val isCreator: Boolean,
    val lastVisited: Long = System.currentTimeMillis()
)

data class YouTubeSearchResult(
    val id: String,
    val videoId: String,
    val title: String,
    val channelTitle: String,
    val thumbnailUrl: String,
    val duration: String,
    val views: String,
    val publishedAt: String,
    val videoUrl: String
)
