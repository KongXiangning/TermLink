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
        "fileMentions" to true
    )

    @Test
    fun discoverableCommandsExcludeLegacySkillsEntry() {
        val commands = CodexSlashRegistry.getDiscoverableCommands(capabilities).map { it.command }

        assertTrue(commands.contains("/skill"))
        assertFalse(commands.contains("/skills"))
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
}
