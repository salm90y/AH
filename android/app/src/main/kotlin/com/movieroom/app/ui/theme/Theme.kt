package com.movieroom.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Official AH Luxury Obsidian Palette
val AHBackground = Color(0xFF070A13)
val AHDarkBackground = Color(0xFF090D16)
val AHSurface = Color(0xFF0F172A)
val AHSurfaceVariant = Color(0xFF1E293B)
val AHCardBorder = Color(0xFF334155)

val AHPrimaryPurple = Color(0xFF8B5CF6)
val AHPrimaryIndigo = Color(0xFF6366F1)
val AHAccentCyan = Color(0xFF38BDF8)
val AHAccentEmerald = Color(0xFF10B981)
val AHAccentAmber = Color(0xFFF59E0B)
val AHAccentRose = Color(0xFFF43F5E)

val AHTextPrimary = Color(0xFFF8FAFC)
val AHTextSecondary = Color(0xFF94A3B8)
val AHTextMuted = Color(0xFF64748B)

val AHDarkColorScheme = darkColorScheme(
    primary = AHPrimaryPurple,
    secondary = AHPrimaryIndigo,
    tertiary = AHAccentCyan,
    background = AHBackground,
    surface = AHSurface,
    surfaceVariant = AHSurfaceVariant,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = AHTextPrimary,
    onSurface = AHTextPrimary
)

val AHTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Black,
        fontSize = 28.sp,
        color = AHTextPrimary
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        color = AHTextPrimary
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        color = AHTextPrimary
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        color = AHTextSecondary
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        color = AHTextMuted
    )
)
