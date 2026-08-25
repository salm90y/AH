package com.movieroom.app.data.model

import com.google.gson.annotations.SerializedName

data class Movie(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("category") val category: String,
    @SerializedName("posterUrl") val posterUrl: String,
    @SerializedName("videoUrl") val videoUrl: String,
    @SerializedName("rating") val rating: Double = 4.8,
    @SerializedName("duration") val duration: String = "120 min",
    @SerializedName("description") val description: String = "",
    @SerializedName("isFeatured") val isFeatured: Boolean = false
)

data class WatchRoom(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("creatorName") val creatorName: String,
    @SerializedName("currentMovie") val currentMovie: Movie?,
    @SerializedName("viewerCount") val viewerCount: Int = 1,
    @SerializedName("isPrivate") val isPrivate: Boolean = false,
    @SerializedName("passcode") val passcode: String? = null
)

data class ChatMessage(
    @SerializedName("id") val id: String,
    @SerializedName("senderName") val senderName: String,
    @SerializedName("message") val message: String,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis(),
    @SerializedName("isSystem") val isSystem: Boolean = false
)

data class User(
    @SerializedName("id") val id: String,
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("isAdmin") val isAdmin: Boolean = false
)
