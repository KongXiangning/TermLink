package com.termlink.app.codex.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexMessageMarkdownLinkParserTest {

    @Test
    fun parsesConversationImagePathAndRemovesRawDestinationFromVisibleText() {
        val projection = parseCodexMessageMarkdownLinks(
            "![修复后的 Codex 会话页](E:/coding/TermLink/output/adb/codex-layout-after-awake.png)"
        )

        assertEquals("修复后的 Codex 会话页", projection.visibleText)
        assertEquals(1, projection.attachments.size)
        with(projection.attachments.single()) {
            assertEquals("image", kind)
            assertEquals("修复后的 Codex 会话页", label)
            assertEquals("E:/coding/TermLink/output/adb/codex-layout-after-awake.png", path)
            assertEquals(null, url)
            assertEquals("markdown", source)
        }
    }

    @Test
    fun parsesFileAndRemoteImageLinksWhileKeepingReadableLabels() {
        val projection = parseCodexMessageMarkdownLinks(
            "查看 [报告](docs/report.pdf)，以及 ![截图](https://example.com/screen.png)。"
        )

        assertEquals("查看 报告，以及 截图。", projection.visibleText)
        assertEquals(listOf("file", "image"), projection.attachments.map { it.kind })
        assertEquals("docs/report.pdf", projection.attachments[0].path)
        assertEquals("https://example.com/screen.png", projection.attachments[1].url)
    }

    @Test
    fun supportsNestedParenthesesAndAngleBracketDestinations() {
        val projection = parseCodexMessageMarkdownLinks(
            "[日志](docs/build_(final).txt) ![图](<output/my image.png>)"
        )

        assertEquals("日志 图", projection.visibleText)
        assertEquals("docs/build_(final).txt", projection.attachments[0].path)
        assertEquals("output/my image.png", projection.attachments[1].path)
    }

    @Test
    fun ignoresFencedInlineAndEscapedMarkdownExamples() {
        val markdown = """
            `![inline](inline.png)`
            \![escaped](escaped.png)
            ```md
            ![fenced](fenced.png)
            ```
        """.trimIndent()

        val projection = parseCodexMessageMarkdownLinks(markdown)

        assertEquals(markdown, projection.visibleText)
        assertTrue(projection.attachments.isEmpty())
    }

    @Test
    fun leavesUnsupportedAndIncompleteTargetsUntouched() {
        val markdown = "[危险](javascript:alert(1)) ![未完成](image.png"

        val projection = parseCodexMessageMarkdownLinks(markdown)

        assertEquals(markdown, projection.visibleText)
        assertTrue(projection.attachments.isEmpty())
    }

    @Test
    fun deduplicatesRepeatedTargetsButKeepsBothReadableLabels() {
        val projection = parseCodexMessageMarkdownLinks(
            "![首图](output/a.png) 与 [再次打开](output/a.png)"
        )

        assertEquals("首图 与 再次打开", projection.visibleText)
        assertEquals(1, projection.attachments.size)
        assertEquals("output/a.png", projection.attachments.single().path)
    }
}
