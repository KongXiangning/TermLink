package com.termlink.app.codex.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexSlashRegistryTest {

    private val capabilities = mapOf(
        "slashModel" to true,
        "slashPlan" to true,
        "skillsList" to true,
        "compact" to true,
        "historyResume" to true,
        "fileMentions" to true
    )

    @Test
    fun discoverableCommandsExcludeLegacySkillsEntry() {
        val commands = CodexSlashRegistry.getDiscoverableCommands(capabilities).map { it.command }

        assertTrue(commands.contains("/skill"))
        assertTrue(commands.contains("/new"))
        assertTrue(commands.contains("/fork"))
        assertTrue(commands.contains("/compact"))
        assertFalse(commands.contains("/skills"))
        assertFalse(commands.contains("/model"))
    }

    @Test
    fun hiddenModelCommandStillResolvesForManualInput() {
        assertEquals("/model", CodexSlashRegistry.resolveSlashCommand("/model")?.command)
        assertTrue(
            CodexSlashRegistry.getDiscoverableCommands(
                capabilities = capabilities,
                query = "/model"
            ).isEmpty()
        )
    }

    @Test
    fun exactLegacySkillsQueryDoesNotSurfaceHiddenEntry() {
        val commands = CodexSlashRegistry.getDiscoverableCommands(
            capabilities = capabilities,
            query = "/skills"
        )

        assertTrue(commands.isEmpty())
    }

    @Test
    fun exactSkillQueryKeepsPrimarySkillCommandDiscoverable() {
        val commands = CodexSlashRegistry.getDiscoverableCommands(
            capabilities = capabilities,
            query = "/skill"
        )

        assertEquals(listOf("/skill"), commands.map { it.command })
    }

    @Test
    fun skillTokenHelpersBuildWindowsPathAndStripTokensFromComposerText() {
        assertEquals(
            listOf(
                "E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md",
                "E:\\coding\\TermLink\\skills\\adb-real-device-debug\\SKILL.md",
                "E:\\coding\\TermLink\\.claude\\skills\\adb-real-device-debug\\SKILL.md"
            ),
            CodexSlashRegistry.buildSkillPathCandidates(
                cwd = "E:/coding/TermLink/",
                skillName = "adb-real-device-debug"
            )
        )

        val token = CodexSlashRegistry.buildSkillToken(
            cwd = "E:\\coding\\TermLink",
            skillName = "adb-real-device-debug"
        )
        assertEquals(
            "[\$adb-real-device-debug](E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md)",
            token
        )

        assertEquals(
            listOf(
                CodexSlashRegistry.SkillToken(
                    raw = "[\$adb-real-device-debug](E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md)",
                    name = "adb-real-device-debug",
                    path = "E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md"
                ),
                CodexSlashRegistry.SkillToken(
                    raw = "[\$git-sensitive-scan](E:\\coding\\TermLink\\.codex\\skills\\git-sensitive-scan\\SKILL.md)",
                    name = "git-sensitive-scan",
                    path = "E:\\coding\\TermLink\\.codex\\skills\\git-sensitive-scan\\SKILL.md"
                )
            ),
            CodexSlashRegistry.extractSkillTokens(
                "Investigate $token and [\$git-sensitive-scan](E:\\coding\\TermLink\\.codex\\skills\\git-sensitive-scan\\SKILL.md)"
            )
        )

        assertEquals(
            "Investigate\n\nnow",
            CodexSlashRegistry.stripSkillTokens(
                "Investigate $token\n\n[\$git-sensitive-scan](E:\\coding\\TermLink\\.codex\\skills\\git-sensitive-scan\\SKILL.md) now"
            )
        )
    }
}
