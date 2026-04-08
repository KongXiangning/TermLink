package com.termlink.app.codex.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val CodexDarkColorScheme = darkColorScheme(
    primary = Color(0xFF4D74FF),
    onPrimary = Color.White,
    secondary = Color(0xFF5B8CFF),
    background = Color(0xFF0E1117),
    surface = Color(0xFF171B22),
    onBackground = Color(0xFFF2F5FB),
    onSurface = Color(0xFFF2F5FB),
    error = Color(0xFFFF7B7B),
    onError = Color.White,
    outline = Color(0xFF2A3140)
)

@Composable
fun CodexTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CodexDarkColorScheme,
        content = content
    )
}
