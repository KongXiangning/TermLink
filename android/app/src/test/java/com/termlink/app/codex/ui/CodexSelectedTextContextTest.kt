package com.termlink.app.codex.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class CodexSelectedTextContextTest {

    @Test
    fun selectedTextIsQuotedBeforeTheComposerDraft() {
        assertEquals(
            "> 第一行\n> 第二行\n\n请分析这段内容",
            buildCodexSelectedTextTaskPrompt(
                selectedText = "第一行\n第二行",
                draft = "请分析这段内容"
            )
        )
    }

    @Test
    fun blankLinesRemainInsideTheQuotedSelection() {
        assertEquals(
            "> 第一行\n>\n> 第三行",
            buildCodexSelectedTextTaskPrompt(
                selectedText = "第一行\n\n第三行",
                draft = ""
            )
        )
    }

    @Test
    fun blankSelectionFallsBackToTheComposerDraft() {
        assertEquals(
            "继续",
            buildCodexSelectedTextTaskPrompt(
                selectedText = "   ",
                draft = "  继续  "
            )
        )
    }

    @Test
    fun selectionCanBeSubmittedWithoutAdditionalDraftText() {
        assertEquals(
            "> 仅所选文本",
            buildCodexSelectedTextTaskPrompt(
                selectedText = "仅所选文本",
                draft = ""
            )
        )
    }
}
