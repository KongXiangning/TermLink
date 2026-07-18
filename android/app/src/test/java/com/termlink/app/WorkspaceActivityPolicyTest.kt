package com.termlink.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkspaceActivityPolicyTest {
    @Test
    fun `native workspace bridge accepts only relative workspace paths`() {
        assertTrue(WorkspaceFileOpenPolicy.isSafeRelativePath("docs/guide.pdf"))
        assertTrue(WorkspaceFileOpenPolicy.isSafeRelativePath("assets\\diagram.png"))
        assertEquals("assets/diagram.png", WorkspaceFileOpenPolicy.normalizeRelativePath(" assets\\diagram.png "))
        assertEquals(null, WorkspaceFileOpenPolicy.normalizeRelativePath("../secret.txt"))
        assertFalse(WorkspaceFileOpenPolicy.isSafeRelativePath("../secret.txt"))
        assertFalse(WorkspaceFileOpenPolicy.isSafeRelativePath("docs/.git/config"))
        assertFalse(WorkspaceFileOpenPolicy.isSafeRelativePath("C:\\secret.txt"))
        assertFalse(WorkspaceFileOpenPolicy.isSafeRelativePath("/etc/passwd"))
    }

    @Test
    fun `native workspace bridge normalizes untrusted MIME values`() {
        assertEquals("application/pdf", WorkspaceFileOpenPolicy.normalizeMimeType(" Application/PDF "))
        assertEquals("application/octet-stream", WorkspaceFileOpenPolicy.normalizeMimeType("text/html; charset=utf-8"))
        assertEquals("application/octet-stream", WorkspaceFileOpenPolicy.normalizeMimeType("../../activity"))
        assertEquals("application/octet-stream", WorkspaceFileOpenPolicy.normalizeMimeType(null))
    }
}
