package com.termlink.app.codex.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val CodexDarkColorScheme = darkColorScheme(
    primary = Color(0xFF4D74FF),
    onPrimary = Color.White,
    secondary = Color(0xFF4DAAFC),
    background = Color(0xFF0D1117),
    surface = Color(0xFF161B22),
    onBackground = Color(0xFFC9D1D9),
    onSurface = Color(0xFFC9D1D9),
    error = Color(0xFFF85149),
    onError = Color.White,
    outline = Color(0xFF30363D)
)

@Composable
fun CodexTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CodexDarkColorScheme,
        content = content
    )
}
