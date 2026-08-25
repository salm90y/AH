package com.movieroom.app.data.api

import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.model.WatchRoom
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @GET("api/movies")
    suspend fun getMovies(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null
    ): Response<List<Movie>>

    @GET("api/movies/{id}")
    suspend fun getMovieDetail(
        @Path("id") id: String
    ): Response<Movie>

    @GET("api/rooms")
    suspend fun getLiveRooms(): Response<List<WatchRoom>>

    @GET("api/rooms/{id}")
    suspend fun getRoomDetail(
        @Path("id") id: String
    ): Response<WatchRoom>
}
