/**
 * Lightweight Markdown-to-HTML renderer for plan workflow text.
 * Handles: headings, lists, bold, italic, inline code, fenced code blocks,
 *          blockquotes, horizontal rules, and paragraphs.
 * All input is HTML-escaped first to prevent XSS.
 */
(function (root) {
    'use strict';

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderInline(line) {
        return line
            .replace(/`([^`]+)`/g, '<code class="plan-inline-code">$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            .replace(/(?:^|\s)\*([^*]+)\*(?:\s|$)/g, function (m, p1) {
                var pre = m.charAt(0) === '*' ? '' : m.charAt(0);
                var suf = m.charAt(m.length - 1) === '*' ? '' : m.charAt(m.length - 1);
                return pre + '<em>' + p1 + '</em>' + suf;
            })
            .replace(/(?:^|\s)_([^_]+)_(?:\s|$)/g, function (m, p1) {
                var pre = m.charAt(0) === '_' ? '' : m.charAt(0);
                var suf = m.charAt(m.length - 1) === '_' ? '' : m.charAt(m.length - 1);
                return pre + '<em>' + p1 + '</em>' + suf;
            });
    }

    function renderPlanMarkdown(text) {
        if (!text || typeof text !== 'string') return '';

        var escaped = escapeHtml(text);
        var lines = escaped.split('\n');
        var html = [];
        var inCodeBlock = false;
        var codeBlockLines = [];
        var inList = false;
        var listType = '';

        function closeList() {
            if (inList) {
                html.push(listType === 'ol' ? '</ol>' : '</ul>');
                inList = false;
                listType = '';
            }
        }

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            // Fenced code block
            if (/^```/.test(line)) {
                if (inCodeBlock) {
                    html.push('<code>' + codeBlockLines.join('\n') + '</code></pre>');
                    codeBlockLines = [];
                    inCodeBlock = false;
                } else {
                    closeList();
                    inCodeBlock = true;
                    var lang = line.replace(/^```\s*/, '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
                    html.push('<pre class="plan-code-block"' + (lang ? ' data-lang="' + lang + '"' : '') + '>');
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockLines.push(line);
                continue;
            }

            var trimmed = line.trim();

            // Empty line
            if (!trimmed) {
                closeList();
                continue;
            }

            // Horizontal rule
            if (/^[-*_]{3,}\s*$/.test(trimmed)) {
                closeList();
                html.push('<hr class="plan-hr">');
                continue;
            }

            // Headings
            var headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
            if (headingMatch) {
                closeList();
                var level = headingMatch[1].length;
                html.push('<h' + level + ' class="plan-heading plan-h' + level + '">' +
                    renderInline(headingMatch[2]) + '</h' + level + '>');
                continue;
            }

            // Blockquote
            if (/^&gt;\s?/.test(trimmed)) {
                closeList();
                var quoteText = trimmed.replace(/^&gt;\s?/, '');
                html.push('<blockquote class="plan-blockquote">' + renderInline(quoteText) + '</blockquote>');
                continue;
            }

            // Unordered list item
            var ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
            if (ulMatch) {
                if (!inList || listType !== 'ul') {
                    closeList();
                    html.push('<ul class="plan-list">');
                    inList = true;
                    listType = 'ul';
                }
                html.push('<li>' + renderInline(ulMatch[1]) + '</li>');
                continue;
            }

            // Ordered list item
            var olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
            if (olMatch) {
                if (!inList || listType !== 'ol') {
                    closeList();
                    html.push('<ol class="plan-list">');
                    inList = true;
                    listType = 'ol';
                }
                html.push('<li>' + renderInline(olMatch[1]) + '</li>');
                continue;
            }

            // Table row (simple: | col | col |)
            if (/^\|(.+)\|$/.test(trimmed)) {
                // Skip separator rows
                if (/^\|[\s:|-]+\|$/.test(trimmed)) continue;
                closeList();
                var cells = trimmed.slice(1, -1).split('|');
                var row = '<tr>' + cells.map(function (c) {
                    return '<td>' + renderInline(c.trim()) + '</td>';
                }).join('') + '</tr>';
                // Check if previous was a table
                if (html.length > 0 && html[html.length - 1] === '</table>') {
                    html.pop(); // remove closing tag
                    html.push(row);
                    html.push('</table>');
                } else {
                    html.push('<table class="plan-table">' + row + '</table>');
                }
                continue;
            }

            // Regular paragraph
            closeList();
            html.push('<p class="plan-para">' + renderInline(trimmed) + '</p>');
        }

        // Close any open blocks
        if (inCodeBlock) {
            html.push('<code>' + codeBlockLines.join('\n') + '</code></pre>');
        }
        closeList();

        return html.join('\n');
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { renderPlanMarkdown: renderPlanMarkdown };
    } else {
        root.renderPlanMarkdown = renderPlanMarkdown;
    }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
