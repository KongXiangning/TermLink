package com.termlink.app.codex.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp

private val CodexDarkColorScheme = darkColorScheme(
    primary = Color(0xFF4E8EFF),
    onPrimary = Color.White,
    secondary = Color(0xFF7FC7FF),
    tertiary = Color(0xFF4EDEA3),
    background = Color(0xFF0C151F),
    onBackground = Color(0xFFE7EDF6),
    surface = Color(0xFF172230),
    onSurface = Color(0xFFE7EDF6),
    surfaceVariant = Color(0xFF1C2938),
    onSurfaceVariant = Color(0xFFB9C5D4),
    error = Color(0xFFFF7B72),
    onError = Color.White,
    outline = Color(0xFF344354),
    outlineVariant = Color(0xFF293747)
)

private val CodexShapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(24.dp)
)

@Composable
fun CodexTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CodexDarkColorScheme,
        shapes = CodexShapes,
        content = content
    )
}
