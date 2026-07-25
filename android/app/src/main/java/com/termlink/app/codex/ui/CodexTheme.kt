package com.termlink.app.codex.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp

internal data class CodexPalette(
    val background: Color,
    val surface: Color,
    val surfaceRaised: Color,
    val border: Color,
    val accent: Color,
    val context: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val success: Color,
    val running: Color,
    val warning: Color,
    val error: Color,
    val userBackground: Color,
    val assistantBackground: Color,
    val toolBackground: Color,
    val systemBackground: Color,
    val errorBackground: Color
)

internal val CodexDarkPalette = CodexPalette(
    background = Color(0xFF0C151F),
    surface = Color(0xFF172230),
    surfaceRaised = Color(0xFF182633),
    border = Color(0xFF344354),
    accent = Color(0xFF4EDEA3),
    context = Color(0xFF7FC7FF),
    textPrimary = Color(0xFFE7EDF6),
    textSecondary = Color(0xFFB9C5D4),
    textMuted = Color(0xFF7D8A9B),
    success = Color(0xFF4EDEA3),
    running = Color(0xFF3FB950),
    warning = Color(0xFFE4B66A),
    error = Color(0xFFFF7B72),
    userBackground = Color(0xFF172332),
    assistantBackground = Color(0xFF16212E),
    toolBackground = Color(0xFF141F2A),
    systemBackground = Color(0x1A5E4A20),
    errorBackground = Color(0x1A6E1F1A)
)

internal val CodexLightPalette = CodexPalette(
    background = Color(0xFFF5F7FA),
    surface = Color(0xFFFFFFFF),
    surfaceRaised = Color(0xFFEEF2F7),
    border = Color(0xFFD3DDE8),
    accent = Color(0xFF168A67),
    context = Color(0xFF2A73A8),
    textPrimary = Color(0xFF17212B),
    textSecondary = Color(0xFF526273),
    textMuted = Color(0xFF6B7785),
    success = Color(0xFF168A67),
    running = Color(0xFF238636),
    warning = Color(0xFFA66A00),
    error = Color(0xFFC73535),
    userBackground = Color(0xFFE9F1FF),
    assistantBackground = Color(0xFFFFFFFF),
    toolBackground = Color(0xFFF0F3F7),
    systemBackground = Color(0x1A9A6B00),
    errorBackground = Color(0x1AC73535)
)

internal object CodexPaletteHolder {
    var current: CodexPalette = CodexDarkPalette
}

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

private val CodexLightColorScheme = lightColorScheme(
    primary = Color(0xFF2F6FEB),
    onPrimary = Color.White,
    secondary = Color(0xFF2A73A8),
    tertiary = Color(0xFF168A67),
    background = Color(0xFFF5F7FA),
    onBackground = Color(0xFF17212B),
    surface = Color.White,
    onSurface = Color(0xFF17212B),
    surfaceVariant = Color(0xFFEEF2F7),
    onSurfaceVariant = Color(0xFF526273),
    error = Color(0xFFC73535),
    onError = Color.White,
    outline = Color(0xFFD3DDE8),
    outlineVariant = Color(0xFFE1E7EF)
)

private val CodexShapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(24.dp)
)

@Composable
fun CodexTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    CodexPaletteHolder.current = if (dark) CodexDarkPalette else CodexLightPalette
    MaterialTheme(
        colorScheme = if (dark) CodexDarkColorScheme else CodexLightColorScheme,
        shapes = CodexShapes,
        content = content
    )
}
