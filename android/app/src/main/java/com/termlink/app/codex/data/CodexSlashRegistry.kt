package com.termlink.app.codex.data

/**
 * Kotlin port of public/lib/codex_slash_commands.js.
 * Provides a slash command registry, input parser, command resolver,
 * and capability-filtered discoverable command list.
 */
object CodexSlashRegistry {

    data class SlashCommand(
        val command: String,
        val titleKey: String,
        val argumentShape: ArgumentShape,
        val dispatchKind: DispatchKind,
        val capabilityKey: String,
        val discoverable: Boolean = true
    )

    enum class ArgumentShape { NONE, FREE_TEXT, SINGLE_TOKEN }
    enum class DispatchKind { NEXT_TURN_OVERRIDE, INTERACTION_STATE, OPEN_PANEL }

    private val REGISTRY: List<SlashCommand> = listOf(
        SlashCommand("/model", "codex_native_slash_model", ArgumentShape.NONE, DispatchKind.NEXT_TURN_OVERRIDE, "slashModel"),
        SlashCommand("/plan", "codex_native_slash_plan", ArgumentShape.FREE_TEXT, DispatchKind.INTERACTION_STATE, "slashPlan"),
        SlashCommand("/skill", "codex_native_slash_skill", ArgumentShape.SINGLE_TOKEN, DispatchKind.INTERACTION_STATE, "skillsList"),
        SlashCommand("/compact", "codex_native_slash_compact", ArgumentShape.NONE, DispatchKind.OPEN_PANEL, "compact"),
        SlashCommand("/skills", "codex_native_slash_skills", ArgumentShape.NONE, DispatchKind.OPEN_PANEL, "skillsList", discoverable = false),
        SlashCommand("/mention", "codex_native_slash_mention", ArgumentShape.NONE, DispatchKind.INTERACTION_STATE, "fileMentions"),
        SlashCommand("/fast", "codex_native_slash_fast", ArgumentShape.NONE, DispatchKind.NEXT_TURN_OVERRIDE, "")
    )

    fun registry(): List<SlashCommand> = REGISTRY

    // ── Input parsing ─────────────────────────────────────────────────

    sealed class ParsedInput {
        data object Empty : ParsedInput()
        data class Text(val text: String) : ParsedInput()
        data class Slash(val command: String, val argumentText: String) : ParsedInput()
    }

    data class FileMentionInput(
        val query: String,
        val tokenStart: Int,
        val tokenEnd: Int
    )

    fun parseComposerInput(raw: String): ParsedInput {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return ParsedInput.Empty
        if (!trimmed.startsWith("/")) return ParsedInput.Text(trimmed)
        val spaceIndex = trimmed.indexOf(' ')
        val keyword = if (spaceIndex >= 0) trimmed.substring(0, spaceIndex) else trimmed
        val remainder = if (spaceIndex >= 0) trimmed.substring(spaceIndex).trim() else ""
        return ParsedInput.Slash(
            command = keyword.lowercase(),
            argumentText = remainder
        )
    }

    fun parseFileMentionInput(text: String): FileMentionInput? {
        if (text.isBlank()) return null
        val atIndex = text.lastIndexOf('@')
        if (atIndex == -1) return null
        if (atIndex > 0 && !text[atIndex - 1].isWhitespace()) {
            return null
        }
        val afterAt = text.substring(atIndex + 1)
        val tokenOffset = afterAt.indexOfFirst { it.isWhitespace() }
        val tokenEnd = if (tokenOffset >= 0) atIndex + 1 + tokenOffset else text.length
        val query = afterAt.take(if (tokenOffset >= 0) tokenOffset else afterAt.length)
        if (query.isEmpty() && tokenOffset >= 0) {
            return null
        }
        return FileMentionInput(
            query = query,
            tokenStart = atIndex,
            tokenEnd = tokenEnd
        )
    }

    // ── Command resolution ────────────────────────────────────────────

    fun resolveSlashCommand(command: String): SlashCommand? =
        REGISTRY.find { it.command == command.trim().lowercase() }

    // ── Discoverable commands (capability-gated) ──────────────────────

    fun getDiscoverableCommands(
        capabilities: Map<String, Boolean>,
        query: String = ""
    ): List<SlashCommand> {
        val q = query.trim().lowercase()
        return REGISTRY.filter { entry ->
            if (!entry.discoverable) {
                return@filter false
            }
            // Capability gate: if capabilityKey is set, it must be true
            if (entry.capabilityKey.isNotEmpty() && capabilities[entry.capabilityKey] != true) {
                return@filter false
            }
            // Query filter
            if (q.isEmpty() || q == "/") return@filter true
            if (REGISTRY.any { it.command == q }) {
                entry.command == q
            } else {
                entry.command.contains(q) || entry.titleKey.lowercase().contains(q.removePrefix("/"))
            }
        }
    }

    // ── Capability map builder ────────────────────────────────────────

    fun buildCapabilityMap(caps: CodexCapabilities?): Map<String, Boolean> {
        if (caps == null) return emptyMap()
        return mapOf(
            "slashCommands" to caps.slashCommands,
            "slashModel" to (caps.slashModel || caps.modelConfig),
            "slashPlan" to (caps.slashPlan || caps.planModeSupported),
            "skillsList" to caps.skillsList,
            "compact" to caps.compact,
            "fileMentions" to caps.fileMentions
        )
    }
}
