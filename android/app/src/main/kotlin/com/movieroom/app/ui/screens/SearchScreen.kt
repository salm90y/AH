package com.movieroom.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movieroom.app.data.model.Movie
import com.movieroom.app.data.repository.MovieRepository
import com.movieroom.app.ui.components.EmptyView
import com.movieroom.app.ui.theme.DarkBackground
import com.movieroom.app.ui.theme.DarkSurface
import com.movieroom.app.ui.theme.DarkSurfaceVariant
import com.movieroom.app.ui.theme.PrimaryIndigo
import com.movieroom.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    repository: MovieRepository,
    onSelectMovie: (Movie) -> Unit
) {
    var query by remember { mutableStateOf("") }
    val movies by repository.moviesFlow.collectAsState(initial = emptyList())

    val searchResults = if (query.isBlank()) {
        emptyList()
    } else {
        movies.filter {
            it.title.contains(query, ignoreCase = true) ||
            it.category.contains(query, ignoreCase = true) ||
            it.director.contains(query, ignoreCase = true)
        }
    }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("بحث متقدم 🔍", color = Color.White, fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("ابحث بالاسم، التصنيف، المخرج...", color = TextSecondary) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextSecondary) },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "مسح", tint = TextSecondary)
                        }
                    }
                },
                shape = RoundedCornerShape(16.dp),
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    containerColor = DarkSurface,
                    focusedBorderColor = PrimaryIndigo,
                    unfocusedBorderColor = DarkSurfaceVariant
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (query.isBlank()) {
                EmptyView(
                    title = "ابدأ البحث عن فيلمك المفضل",
                    subtitle = "اكتب كلمة البحث في الأعلى لاستكشاف مكتبة الأفلام والعروض",
                    icon = Icons.Default.Search
                )
            } else if (searchResults.isEmpty()) {
                EmptyView(
                    title = "لم يتم العثور على نتائج",
                    subtitle = "جرب البحث بكلمات أخرى أو تصنيف مختلف"
                )
            } else {
                Text(
                    text = "نتائج البحث (${searchResults.size})",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(searchResults) { movie ->
                        MovieCard(movie = movie, onClick = { onSelectMovie(movie) })
                    }
                }
            }
        }
    }
}
