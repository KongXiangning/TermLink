package com.termlink.app.codex.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val CodexDarkColorScheme = darkColorScheme(
    primary = Color(0xFF7FA8FF),
    onPrimary = Color.White,
    secondary = Color(0xFF7FC7FF),
    tertiary = Color(0xFF4EDEA3),
    background = Color(0xFF131A24),
    onBackground = Color(0xFFE7EDF6),
    surface = Color(0xFF1B2532),
    onSurface = Color(0xFFE7EDF6),
    surfaceVariant = Color(0xFF253244),
    onSurfaceVariant = Color(0xFFB9C5D4),
    error = Color(0xFFFF7B72),
    onError = Color.White,
    outline = Color(0xFF425266),
    outlineVariant = Color(0xFF334154)
)

@Composable
fun CodexTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CodexDarkColorScheme,
        content = content
    )
}
