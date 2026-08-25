package com.movieroom.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.components.EmptyView
import com.movieroom.app.ui.theme.DarkBackground

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FavoritesScreen(
    repository: MovieRepository,
    onSelectMovie: (Movie) -> Unit
) {
    val movies by repository.moviesFlow.collectAsState(initial = emptyList())
    val favoriteMovies = movies.filter { it.isFavorite }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("قائمة المفضلة ❤️", color = Color.White, fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        }
    ) { padding ->
        if (favoriteMovies.isEmpty()) {
            EmptyView(
                title = "لا توجد أفلام في المفضلة بعد",
                subtitle = "قم بإضافة أفلامك وعروضك المفضلة لتصل إليها بسهولة وسرعة في أي وقت",
                icon = Icons.Default.Favorite
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(favoriteMovies) { movie ->
                    MovieCard(movie = movie, onClick = { onSelectMovie(movie) })
                }
            }
        }
    }
}
