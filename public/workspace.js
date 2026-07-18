(function () {
    const state = {
        sessionId: '', serverUrl: '', authHeader: '', defaultEntryPath: '', workspaceRoot: '', docsPath: '',
        hostSurface: 'web', currentDir: '', showHidden: true, treeEntries: [], selectedFilePath: '',
        selectedFileMeta: null, filePreview: null, diffPreview: null, activeView: 'content',
        markdownMode: 'rendered', diffLayout: window.innerWidth >= 900 ? 'split' : 'unified',
        imageScale: 1, imageFit: true, objectUrl: '', pdfDocument: null, pdfRenderTask: null,
        pdfPage: 1, pdfScale: 1.15, pdfFit: true, booted: false,
        loading: { tree: false, file: false, diff: false, more: false },
        seq: { tree: 0, file: 0, diff: 0, more: 0, search: 0, media: 0 }
    };

    const el = {};
    const byId = (id) => document.getElementById(id);
    const ids = [
        'workspace-title', 'workspace-subtitle', 'workspace-banner', 'workspace-breadcrumbs', 'workspace-main',
        'current-dir-label', 'browser-count', 'browser-list', 'browser-status', 'browser-empty',
        'viewer-kind', 'viewer-title', 'viewer-meta', 'viewer-status', 'viewer-mode-note', 'viewer-empty',
        'viewer-surface', 'viewer-body', 'viewer-code', 'line-numbers', 'text-viewer', 'text-toolbar',
        'markdown-mode', 'markdown-viewer', 'image-viewer', 'viewer-image', 'pdf-viewer', 'pdf-canvas',
        'pdf-page', 'pdf-pages', 'binary-viewer', 'binary-name', 'binary-meta', 'diff-viewer', 'diff-summary',
        'diff-body', 'viewer-actions', 'btn-mobile-back', 'btn-search', 'btn-docs', 'btn-root', 'btn-up',
        'btn-refresh', 'toggle-hidden', 'btn-view-content', 'btn-view-diff', 'btn-compare-files',
        'btn-reload-file', 'btn-copy', 'btn-markdown-preview', 'btn-markdown-source', 'btn-image-minus',
        'btn-image-fit', 'btn-image-actual', 'btn-image-plus', 'btn-pdf-prev', 'btn-pdf-next', 'btn-pdf-minus',
        'btn-pdf-fit', 'btn-pdf-plus', 'btn-open-binary', 'btn-diff-unified', 'btn-diff-split',
        'btn-load-more', 'btn-prev-segment', 'btn-next-segment', 'btn-limited-head', 'btn-limited-tail',
        'search-dialog', 'search-input', 'search-status', 'search-results', 'compare-dialog',
        'compare-left-label', 'compare-search-input', 'compare-status', 'compare-results'
    ];
    ids.forEach((id) => { el[id] = byId(id); });

    const COPY = {
        en: {
            branding: 'DOCUMENT WORKSPACE', readonly: 'Read only', docs: 'Docs', root: 'Root', up: 'Up', hidden: 'Hidden',
            directory: 'Directory', emptyDirectory: 'This directory is empty', preview: 'Preview', content: 'Content',
            headDiff: 'HEAD diff', compare: 'Compare', selectFile: 'Select a file to preview',
            selectFileHint: 'Text, Markdown, images and PDF are supported.', rendered: 'Preview', source: 'Source', copy: 'Copy',
            fit: 'Fit', fitWidth: 'Fit width', openExternal: 'Download / open', unified: 'Unified', split: 'Side by side',
            loadMore: 'Load more', previous: 'Previous', next: 'Next', head: 'Head', tail: 'Tail', workspace: 'Workspace',
            searchFiles: 'Search files', searchPlaceholder: 'Search by file name or path', chooseRightFile: 'Choose another file',
            loading: 'Loading…', noResults: 'No matching files', copied: 'Copied', copyFailed: 'Copy failed',
            notGit: 'This workspace is not a Git repository.', noChanges: 'No differences', binaryCompare: 'Binary files cannot be compared.',
            tooLarge: 'This file is too large to compare.', searchHint: 'Type at least one character', openFailed: 'Unable to open this file.',
            noFile: 'No file selected', fullPreview: 'Complete file', truncatedPreview: 'Partial preview',
            segmentedPreview: 'Segmented preview', limitedPreview: 'Large-file preview', diffLoadFailed: 'Unable to load comparison.',
            folder: 'Directory', emptyFolder: 'Empty directory'
        },
        zh: {
            branding: '文档工作区', readonly: '只读', docs: '文档', root: '根目录', up: '上一级', hidden: '隐藏文件',
            directory: '目录', emptyDirectory: '当前目录为空', preview: '预览', content: '内容', headDiff: '与 HEAD 比较',
            compare: '比较', selectFile: '选择文件进行预览', selectFileHint: '支持文本、Markdown、图片和 PDF。',
            rendered: '预览', source: '源码', copy: '复制', fit: '适应', fitWidth: '适应宽度', openExternal: '下载 / 系统打开',
            unified: '单栏', split: '双栏', loadMore: '加载更多', previous: '上一段', next: '下一段', head: '文件头', tail: '文件尾',
            workspace: '工作区', searchFiles: '搜索文件', searchPlaceholder: '按文件名或路径搜索', chooseRightFile: '选择另一个文件',
            loading: '加载中…', noResults: '没有匹配文件', copied: '已复制', copyFailed: '复制失败', notGit: '当前工作区不是 Git 仓库。',
            noChanges: '没有差异', binaryCompare: '二进制文件不能按文本比较。', tooLarge: '文件过大，无法比较。',
            searchHint: '请输入至少一个字符', openFailed: '无法打开该文件。', noFile: '尚未选择文件',
            fullPreview: '完整文件', truncatedPreview: '部分预览', segmentedPreview: '分段预览', limitedPreview: '大文件预览',
            diffLoadFailed: '无法加载比较结果。', folder: '目录', emptyFolder: '空目录'
        }
    };

    function localeKey() {
        const requested = new URLSearchParams(location.search).get('lang') || (window.i18n && window.i18n.locale) || navigator.language || 'en';
        return String(requested).toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }
    function copy(key) { return (COPY[localeKey()] && COPY[localeKey()][key]) || COPY.en[key] || key; }
    function tr(key, fallbackKey) {
        if (window.i18n && typeof window.i18n.t === 'function') {
            const translated = window.i18n.t(key);
            if (translated && translated !== key) return translated;
        }
        return fallbackKey ? copy(fallbackKey) : key;
    }
    function applyCopy() {
        document.querySelectorAll('[data-copy]').forEach((node) => { node.textContent = copy(node.dataset.copy); });
        document.querySelectorAll('[data-copy-placeholder]').forEach((node) => { node.placeholder = copy(node.dataset.copyPlaceholder); });
    }

    function syncVisualViewport() {
        const viewport = window.visualViewport;
        const viewportHeight = viewport ? viewport.height : window.innerHeight;
        const viewportTop = viewport ? viewport.offsetTop : 0;
        const coveredBottom = Math.max(0, window.innerHeight - viewportTop - viewportHeight);
        document.documentElement.style.setProperty('--workspace-viewport-height', `${Math.round(viewportHeight)}px`);
        document.documentElement.style.setProperty('--workspace-viewport-bottom', `${Math.round(coveredBottom)}px`);
    }

    function readConfig() { return window.__TERMLINK_CONFIG__ && typeof window.__TERMLINK_CONFIG__ === 'object' ? window.__TERMLINK_CONFIG__ : {}; }
    function applyConfig(config) {
        if (!config || typeof config !== 'object') return;
        window.__TERMLINK_CONFIG__ = config;
        const params = new URLSearchParams(location.search);
        state.sessionId = params.get('sessionId') || config.sessionId || '';
        state.serverUrl = String(config.serverUrl || '').replace(/\/+$/, '');
        state.authHeader = typeof config.authHeader === 'string' ? config.authHeader : '';
        state.defaultEntryPath = params.get('defaultEntryPath') || config.defaultEntryPath || '';
        state.hostSurface = config.hostSurface === 'android' ? 'android' : 'web';
        document.body.classList.toggle('host-android', state.hostSurface === 'android');
    }

    function apiUrl(suffix, query) {
        const base = state.serverUrl || (location.origin !== 'null' ? location.origin : '');
        const url = new URL(`${base}/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/${suffix}`, base || location.href);
        Object.entries(query || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
        });
        return url.toString();
    }
    async function fetchJson(suffix, query) {
        const headers = state.authHeader ? { Authorization: state.authHeader } : {};
        const response = await fetch(apiUrl(suffix, query), { headers });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = payload && payload.error ? payload.error : {};
            const failure = new Error(error.message || `HTTP ${response.status}`);
            failure.code = error.code || '';
            failure.status = response.status;
            throw failure;
        }
        return payload;
    }
    async function fetchBlob(pathName) {
        const headers = state.authHeader ? { Authorization: state.authHeader } : {};
        const response = await fetch(apiUrl('file-content', { path: pathName }), { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
    }
    async function fetchArrayBuffer(pathName) {
        const headers = state.authHeader ? { Authorization: state.authHeader } : {};
        const response = await fetch(apiUrl('file-content', { path: pathName }), { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
    }

    function setStatus(node, message, tone) {
        if (!node) return;
        node.hidden = !message;
        node.textContent = message || '';
        node.classList.toggle('is-loading', tone === 'loading');
        node.classList.toggle('is-error', tone === 'error');
    }
    function formatSize(size) {
        if (!Number.isFinite(size)) return '';
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    function dirname(portablePath) {
        const parts = String(portablePath || '').split('/').filter(Boolean);
        parts.pop();
        return parts.join('/');
    }
    function normalizeWorkspacePath(value, baseDir) {
        const parts = `${baseDir || ''}/${value || ''}`.split('/');
        const normalized = [];
        for (const part of parts) {
            if (!part || part === '.') continue;
            if (part === '..') { if (!normalized.length) return null; normalized.pop(); }
            else normalized.push(part);
        }
        return normalized.join('/');
    }

    function setPage(page) {
        el['workspace-main'].dataset.page = page;
        if (window.innerWidth < 900) {
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
    }
    function routeSnapshot(type, extra) { return { workspace: true, type, dir: state.currentDir, ...extra }; }
    function writeHistory(type, extra, replace) {
        const snapshot = routeSnapshot(type, extra);
        if (replace) history.replaceState(snapshot, '', location.href);
        else history.pushState(snapshot, '', location.href);
    }

    function renderBreadcrumbs() {
        const parts = state.currentDir.split('/').filter(Boolean);
        el['workspace-breadcrumbs'].replaceChildren();
        const nodes = [{ name: '/', path: '' }];
        parts.forEach((name, index) => nodes.push({ name, path: parts.slice(0, index + 1).join('/') }));
        nodes.forEach((item, index) => {
            if (index) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator'; separator.textContent = '/';
                el['workspace-breadcrumbs'].append(separator);
            }
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'breadcrumb-button'; button.textContent = item.name;
            button.addEventListener('click', () => void loadTree(item.path, { pushHistory: true }));
            el['workspace-breadcrumbs'].append(button);
        });
        requestAnimationFrame(() => { el['workspace-breadcrumbs'].scrollLeft = el['workspace-breadcrumbs'].scrollWidth; });
    }

    function entryIcon(entry) {
        if (entry.type === 'directory') return '▰';
        const extension = String(entry.name || '').split('.').pop().toLowerCase();
        if (['md', 'markdown'].includes(extension)) return 'M↓';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return '▧';
        if (extension === 'pdf') return 'PDF';
        return '▤';
    }
    function renderEntries() {
        el['browser-list'].replaceChildren();
        el['browser-count'].textContent = String(state.treeEntries.length);
        el['browser-empty'].hidden = state.treeEntries.length !== 0 || state.loading.tree;
        state.treeEntries.forEach((entry) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `browser-item${entry.path === state.selectedFilePath ? ' is-selected' : ''}`;
            button.dataset.path = entry.path;
            const icon = document.createElement('span'); icon.className = `file-icon ${entry.type}`; icon.textContent = entryIcon(entry);
            const main = document.createElement('span'); main.className = 'browser-item-main';
            const name = document.createElement('span'); name.className = 'browser-item-name'; name.textContent = entry.name;
            const detail = document.createElement('span'); detail.className = 'browser-item-path';
            detail.textContent = entry.type === 'directory' ? copy(entry.hasChildren ? 'folder' : 'emptyFolder') : formatSize(entry.size);
            main.append(name, detail);
            const badges = document.createElement('span'); badges.className = 'browser-badges';
            if (entry.gitStatus) {
                const git = document.createElement('span'); git.className = `badge badge-git git-${entry.gitStatus}`; git.textContent = entry.gitStatus;
                badges.append(git);
            }
            const arrow = document.createElement('span'); arrow.className = 'badge'; arrow.textContent = '›'; badges.append(arrow);
            button.append(icon, main, badges);
            button.addEventListener('click', () => entry.type === 'directory'
                ? void loadTree(entry.path, { pushHistory: true })
                : entry.exists === false
                    ? void openDeletedFile(entry)
                    : void openFile(entry, { pushHistory: true }));
            el['browser-list'].append(button);
        });
    }

    async function loadTree(nextPath, options = {}) {
        const requestId = ++state.seq.tree;
        state.loading.tree = true;
        setStatus(el['browser-status'], copy('loading'), 'loading');
        try {
            const payload = await fetchJson('tree', { path: nextPath || '', showHidden: state.showHidden, refresh: options.refresh });
            if (requestId !== state.seq.tree) return;
            state.currentDir = payload.path || '';
            state.treeEntries = Array.isArray(payload.entries) ? payload.entries : [];
            el['current-dir-label'].textContent = state.currentDir || '/';
            renderBreadcrumbs(); renderEntries(); setPage('browser');
            if (options.pushHistory) writeHistory('directory', {}, false);
            setStatus(el['browser-status'], '');
        } catch (error) {
            if (requestId === state.seq.tree) setStatus(el['browser-status'], error.message, 'error');
        } finally {
            if (requestId === state.seq.tree) { state.loading.tree = false; renderControls(); }
        }
    }

    function disposeMedia() {
        state.seq.media += 1;
        if (state.objectUrl && URL.revokeObjectURL) URL.revokeObjectURL(state.objectUrl);
        state.objectUrl = '';
        if (state.pdfRenderTask && typeof state.pdfRenderTask.cancel === 'function') state.pdfRenderTask.cancel();
        state.pdfRenderTask = null;
        if (state.pdfDocument && typeof state.pdfDocument.destroy === 'function') void state.pdfDocument.destroy();
        state.pdfDocument = null;
    }
    function hideViewerModes() {
        ['text-viewer', 'markdown-viewer', 'image-viewer', 'pdf-viewer', 'binary-viewer', 'diff-viewer'].forEach((id) => { el[id].hidden = true; });
        el['text-toolbar'].hidden = true;
    }
    function setViewerEmpty(message) {
        el['viewer-empty'].hidden = !message;
        if (message) el['viewer-empty'].textContent = message;
        el['viewer-surface'].hidden = !!message;
    }
    function renderControls() {
        const selected = !!state.selectedFilePath;
        el['btn-root'].disabled = state.currentDir === '' || state.loading.tree;
        el['btn-up'].disabled = state.currentDir === '' || state.loading.tree;
        el['btn-docs'].disabled = !state.docsPath || state.currentDir === state.docsPath;
        el['btn-view-content'].disabled = !selected || state.loading.file;
        el['btn-view-diff'].disabled = !selected || state.loading.diff;
        el['btn-compare-files'].disabled = !selected;
        el['btn-reload-file'].disabled = !selected || state.loading.file || state.loading.diff || state.loading.more;
        el['btn-view-content'].classList.toggle('active', state.activeView === 'content');
        el['btn-view-diff'].classList.toggle('active', state.activeView === 'diff' && state.diffPreview && state.diffPreview.mode === 'git');
        el['btn-compare-files'].classList.toggle('active', state.activeView === 'diff' && state.diffPreview && state.diffPreview.mode === 'files');
        el['btn-diff-unified'].classList.toggle('active', state.diffLayout === 'unified');
        el['btn-diff-split'].classList.toggle('active', state.diffLayout === 'split');
        const preview = state.filePreview || {};
        el['btn-load-more'].hidden = !(state.activeView === 'content' && preview.viewMode === 'truncated' && preview.hasMore);
        el['btn-prev-segment'].hidden = !(state.activeView === 'content' && preview.viewMode === 'segmented');
        el['btn-next-segment'].hidden = !(state.activeView === 'content' && preview.viewMode === 'segmented');
        el['btn-limited-head'].hidden = !(state.activeView === 'content' && preview.viewMode === 'limited');
        el['btn-limited-tail'].hidden = !(state.activeView === 'content' && preview.viewMode === 'limited');
        el['viewer-actions'].hidden = Array.from(el['viewer-actions'].children).every((button) => button.hidden);
    }

    function renderLineNumbers(content, offset = 0) {
        const count = String(content || '').split('\n').length;
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < count; index += 1) {
            const item = document.createElement('li'); item.value = offset + index + 1; fragment.append(item);
        }
        el['line-numbers'].replaceChildren(fragment);
    }
    function renderText(preview) {
        hideViewerModes();
        const content = preview.content || '';
        el['text-viewer'].hidden = false; el['text-toolbar'].hidden = false; el['markdown-mode'].hidden = true;
        el['viewer-code'].className = '';
        el['viewer-code'].textContent = content;
        if (content.length <= 256 * 1024 && window.hljs && preview.languageHint && preview.languageHint !== 'text' && window.hljs.getLanguage(preview.languageHint)) {
            try { el['viewer-code'].innerHTML = window.hljs.highlight(content, { language: preview.languageHint, ignoreIllegals: true }).value; }
            catch (error) { el['viewer-code'].textContent = content; }
        }
        renderLineNumbers(content, preview.offset ? Math.max(0, String(preview.leadingContent || '').split('\n').length - 1) : 0);
    }
    function safeMarkdownHref(href) {
        const value = String(href || '').trim();
        if (!value) return '';
        if (/^(https?:|mailto:)/i.test(value)) return value;
        if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return '';
        return value;
    }
    function renderMarkdown(preview) {
        hideViewerModes(); el['text-toolbar'].hidden = false; el['markdown-mode'].hidden = false;
        el['btn-markdown-preview'].classList.toggle('active', state.markdownMode === 'rendered');
        el['btn-markdown-source'].classList.toggle('active', state.markdownMode === 'source');
        if (state.markdownMode === 'source' || !window.markdownit) { renderText(preview); el['markdown-mode'].hidden = false; return; }
        const md = window.markdownit({ html: false, linkify: false, breaks: false, highlight(code, language) {
            if (window.hljs && language && window.hljs.getLanguage(language)) {
                try { return window.hljs.highlight(code, { language, ignoreIllegals: true }).value; } catch (error) { /* fall through */ }
            }
            return md.utils.escapeHtml(code);
        }});
        const defaultLinkOpen = md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
        md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
            const hrefIndex = tokens[idx].attrIndex('href');
            if (hrefIndex >= 0) tokens[idx].attrs[hrefIndex][1] = safeMarkdownHref(tokens[idx].attrs[hrefIndex][1]);
            tokens[idx].attrSet('rel', 'noopener noreferrer');
            return defaultLinkOpen(tokens, idx, options, env, self);
        };
        el['markdown-viewer'].innerHTML = md.render(preview.content || '');
        el['markdown-viewer'].hidden = false;
    }
    function renderBinary(preview) {
        hideViewerModes(); el['binary-viewer'].hidden = false;
        el['binary-name'].textContent = preview.name || preview.path;
        el['binary-meta'].textContent = [preview.mimeType, formatSize(preview.size)].filter(Boolean).join(' · ');
    }
    async function renderImage(preview) {
        hideViewerModes(); el['image-viewer'].hidden = false; el['viewer-image'].alt = preview.name || '';
        const mediaId = ++state.seq.media;
        try {
            const blob = await fetchBlob(preview.path);
            if (mediaId !== state.seq.media) return;
            state.objectUrl = URL.createObjectURL(blob); el['viewer-image'].src = state.objectUrl;
            state.imageFit = true; state.imageScale = 1; updateImageScale();
        } catch (error) { if (mediaId === state.seq.media) setStatus(el['viewer-status'], error.message, 'error'); }
    }
    function updateImageScale() {
        el['viewer-image'].style.width = state.imageFit ? 'auto' : `${Math.round(state.imageScale * 100)}%`;
        el['viewer-image'].style.maxWidth = state.imageFit ? '100%' : 'none';
    }
    async function renderPdfPage() {
        if (!state.pdfDocument) return;
        const page = await state.pdfDocument.getPage(state.pdfPage);
        const stage = el['pdf-canvas'].parentElement;
        const unscaled = page.getViewport({ scale: 1 });
        const scale = state.pdfFit ? Math.max(.25, (stage.clientWidth - 36) / unscaled.width) : state.pdfScale;
        const viewport = page.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = el['pdf-canvas']; const context = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`; canvas.style.height = `${Math.floor(viewport.height)}px`;
        if (state.pdfRenderTask && typeof state.pdfRenderTask.cancel === 'function') state.pdfRenderTask.cancel();
        state.pdfRenderTask = page.render({ canvasContext: context, viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] });
        await state.pdfRenderTask.promise.catch((error) => { if (!String(error && error.name).includes('RenderingCancelled')) throw error; });
        el['pdf-page'].textContent = String(state.pdfPage); el['pdf-pages'].textContent = String(state.pdfDocument.numPages);
        el['btn-pdf-prev'].disabled = state.pdfPage <= 1; el['btn-pdf-next'].disabled = state.pdfPage >= state.pdfDocument.numPages;
    }
    async function renderPdf(preview) {
        hideViewerModes(); el['pdf-viewer'].hidden = false;
        const mediaId = ++state.seq.media;
        try {
            const [data, pdfjs] = await Promise.all([fetchArrayBuffer(preview.path), import('./vendor/pdfjs/pdf.mjs')]);
            if (mediaId !== state.seq.media) return;
            pdfjs.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.mjs', location.href).href;
            state.pdfDocument = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
            if (mediaId !== state.seq.media) { await state.pdfDocument.destroy(); return; }
            state.pdfPage = 1; state.pdfFit = true; await renderPdfPage();
        } catch (error) { if (mediaId === state.seq.media) setStatus(el['viewer-status'], error.message, 'error'); }
    }
    function previewNote(preview) {
        if (preview.viewMode === 'full') return tr('workspace.viewer.fullPreview', 'fullPreview');
        if (preview.viewMode === 'truncated') return tr('workspace.viewer.truncatedPreview', 'truncatedPreview');
        if (preview.viewMode === 'segmented') return tr('workspace.viewer.segmentedPreview', 'segmentedPreview');
        if (preview.viewMode === 'limited') return tr('workspace.viewer.limitedPreview', 'limitedPreview');
        return '';
    }
    function renderContent() {
        state.activeView = 'content'; state.diffPreview = null; hideViewerModes();
        const preview = state.filePreview;
        if (!preview) { setViewerEmpty(tr('workspace.viewer.selectFile', 'selectFile')); renderControls(); return; }
        setViewerEmpty(''); setStatus(el['viewer-status'], '');
        el['viewer-kind'].textContent = String(preview.kind || 'text').toUpperCase();
        const note = previewNote(preview); el['viewer-mode-note'].hidden = !note; el['viewer-mode-note'].textContent = note;
        const kind = preview.kind || (preview.previewable === false ? 'binary' : 'text');
        if (kind === 'markdown') renderMarkdown(preview);
        else if (kind === 'image') void renderImage(preview);
        else if (kind === 'pdf') void renderPdf(preview);
        else if (kind === 'binary' || preview.previewable === false) renderBinary(preview);
        else renderText(preview);
        renderControls();
    }

    async function openFile(entry, options = {}) {
        const requestId = ++state.seq.file;
        state.seq.diff += 1; state.seq.more += 1; disposeMedia();
        state.loading.diff = false; state.loading.more = false;
        state.selectedFilePath = entry.path; state.selectedFileMeta = entry; state.filePreview = null; state.diffPreview = null;
        state.activeView = 'content'; state.loading.file = true; renderEntries(); setPage('viewer');
        el['viewer-title'].textContent = entry.name || entry.path; el['viewer-meta'].textContent = entry.path;
        setViewerEmpty(''); hideViewerModes(); setStatus(el['viewer-status'], copy('loading'), 'loading'); renderControls();
        if (options.pushHistory) writeHistory('file', { path: entry.path, name: entry.name || entry.path }, false);
        try {
            const payload = await fetchJson('file', { path: entry.path });
            if (requestId !== state.seq.file || state.selectedFilePath !== entry.path) return;
            state.filePreview = { ...payload, path: payload.path || entry.path, name: payload.name || entry.name || entry.path };
            el['viewer-title'].textContent = state.filePreview.name;
            const details = [state.filePreview.path, state.filePreview.languageHint, state.filePreview.encoding, formatSize(state.filePreview.size)].filter(Boolean);
            el['viewer-meta'].textContent = details.length > 1 ? details.join(' · ') : state.filePreview.path;
            renderContent();
        } catch (error) {
            if (requestId === state.seq.file) { setStatus(el['viewer-status'], error.message, 'error'); setViewerEmpty(error.message); }
        } finally {
            if (requestId === state.seq.file) { state.loading.file = false; renderControls(); }
        }
    }

    async function openDeletedFile(entry, options = {}) {
        state.seq.file += 1; state.seq.diff += 1; state.seq.more += 1; disposeMedia();
        state.selectedFilePath = entry.path; state.selectedFileMeta = entry; state.filePreview = null; state.diffPreview = null;
        state.activeView = 'diff'; state.loading.file = false; setPage('viewer'); renderEntries();
        el['viewer-title'].textContent = entry.name || entry.path;
        el['viewer-meta'].textContent = `${entry.path} · deleted`;
        if (options.pushHistory !== false) writeHistory('file', { path: entry.path, name: entry.name || entry.path, deleted: true }, false);
        await loadHeadDiff();
    }

    function renderLegacyDiff(diffText) {
        const pre = document.createElement('pre'); pre.className = 'legacy-diff'; pre.textContent = diffText || '';
        el['diff-body'].replaceChildren(pre);
    }
    function diffText(row, side) { return side === 'old' ? (row.oldText ?? '') : (row.newText ?? ''); }
    function renderStructuredDiff(payload) {
        el['diff-body'].replaceChildren();
        const additions = payload.stats ? payload.stats.additions : 0; const deletions = payload.stats ? payload.stats.deletions : 0;
        el['diff-summary'].innerHTML = `<span class="diff-additions">+${additions}</span><span class="diff-deletions">−${deletions}</span><span>${payload.stats ? payload.stats.hunks : 0} hunks</span>`;
        if (!payload.hunks || !payload.hunks.length) {
            const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = copy('noChanges'); el['diff-body'].append(empty); return;
        }
        payload.hunks.forEach((hunk) => {
            const section = document.createElement('section'); section.className = 'diff-hunk';
            const header = document.createElement('div'); header.className = 'diff-hunk-header'; header.textContent = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`; section.append(header);
            hunk.rows.forEach((row) => {
                const line = document.createElement('div'); line.className = `diff-row ${state.diffLayout} ${row.type}`;
                if (state.diffLayout === 'split') {
                    const oldNo = document.createElement('span'); oldNo.className = 'diff-line-number'; oldNo.textContent = row.oldLine ?? '';
                    const oldCell = document.createElement('span'); oldCell.className = 'diff-cell old-cell'; oldCell.textContent = diffText(row, 'old');
                    const newNo = document.createElement('span'); newNo.className = 'diff-line-number'; newNo.textContent = row.newLine ?? '';
                    const newCell = document.createElement('span'); newCell.className = 'diff-cell new-cell'; newCell.textContent = diffText(row, 'new');
                    line.append(oldNo, oldCell, newNo, newCell);
                } else {
                    const oldNo = document.createElement('span'); oldNo.className = 'diff-line-number'; oldNo.textContent = row.oldLine ?? '';
                    const newNo = document.createElement('span'); newNo.className = 'diff-line-number'; newNo.textContent = row.newLine ?? '';
                    const marker = document.createElement('span'); marker.className = 'diff-marker'; marker.textContent = row.type === 'add' ? '+' : row.type === 'delete' ? '−' : row.type === 'change' ? '±' : ' ';
                    const cell = document.createElement('span'); cell.className = 'diff-cell'; cell.textContent = row.type === 'delete' ? diffText(row, 'old') : diffText(row, 'new');
                    line.append(oldNo, newNo, marker, cell);
                }
                section.append(line);
            });
            el['diff-body'].append(section);
        });
    }
    function renderDiff() {
        const payload = state.diffPreview;
        if (!payload) return;
        state.activeView = 'diff'; hideViewerModes(); setViewerEmpty(''); el['diff-viewer'].hidden = false;
        el['viewer-kind'].textContent = payload.mode === 'files' ? copy('compare').toUpperCase() : 'GIT · HEAD';
        el['viewer-mode-note'].hidden = true;
        if (Array.isArray(payload.hunks)) renderStructuredDiff(payload); else renderLegacyDiff(payload.diffText || '');
        renderControls();
    }
    function compareErrorMessage(error) {
        if (error.code === 'WORKSPACE_COMPARE_BINARY') return copy('binaryCompare');
        if (error.code === 'WORKSPACE_COMPARE_TOO_LARGE' || error.code === 'WORKSPACE_COMPARE_TOO_MANY_LINES') return copy('tooLarge');
        return error.message;
    }
    async function loadHeadDiff() {
        if (!state.selectedFilePath) return;
        const requestId = ++state.seq.diff; state.loading.diff = true; state.activeView = 'diff';
        setViewerEmpty(''); hideViewerModes(); setStatus(el['viewer-status'], copy('loading'), 'loading'); renderControls();
        try {
            const payload = await fetchJson('diff', { path: state.selectedFilePath, baseline: 'head', format: 'structured' });
            if (requestId !== state.seq.diff) return;
            if (payload.reason === 'not_git_repo') throw new Error(copy('notGit'));
            state.diffPreview = payload; renderDiff(); setStatus(el['viewer-status'], '');
        } catch (error) {
            if (requestId !== state.seq.diff) return;
            setStatus(el['viewer-status'], compareErrorMessage(error), 'error');
            setViewerEmpty(tr('workspace.viewer.diffLoadFailed', 'diffLoadFailed'));
        } finally { if (requestId === state.seq.diff) { state.loading.diff = false; renderControls(); } }
    }
    async function loadFileComparison(rightPath, options = {}) {
        const requestId = ++state.seq.diff; state.loading.diff = true; closeDialog(el['compare-dialog']);
        setPage('compare'); setViewerEmpty(''); hideViewerModes(); setStatus(el['viewer-status'], copy('loading'), 'loading'); renderControls();
        try {
            const payload = await fetchJson('compare', { leftPath: state.selectedFilePath, rightPath });
            if (requestId !== state.seq.diff) return;
            state.diffPreview = payload; renderDiff(); setStatus(el['viewer-status'], '');
            if (options.pushHistory !== false) writeHistory('compare', { leftPath: state.selectedFilePath, rightPath }, false);
        } catch (error) {
            if (requestId === state.seq.diff) { setStatus(el['viewer-status'], compareErrorMessage(error), 'error'); setViewerEmpty(compareErrorMessage(error)); }
        } finally { if (requestId === state.seq.diff) { state.loading.diff = false; renderControls(); } }
    }

    async function loadMore(offsetOverride) {
        if (!state.filePreview || !state.selectedFilePath) return;
        const requestId = ++state.seq.more; state.loading.more = true; renderControls();
        const preview = state.filePreview;
        try {
            const segment = await fetchJson('file-segment', {
                path: state.selectedFilePath,
                offset: offsetOverride === undefined ? preview.nextOffset : offsetOverride,
                length: 64 * 1024
            });
            if (requestId !== state.seq.more || state.selectedFilePath !== preview.path) return;
            state.filePreview = {
                ...preview, ...segment,
                content: preview.viewMode === 'truncated' && segment.offset > 0 ? `${preview.content || ''}${segment.content || ''}` : segment.content,
                languageHint: preview.languageHint, kind: preview.kind, name: preview.name, size: preview.size, encoding: preview.encoding
            };
            renderContent();
        } catch (error) { if (requestId === state.seq.more) setStatus(el['viewer-status'], error.message, 'error'); }
        finally { if (requestId === state.seq.more) { state.loading.more = false; renderControls(); } }
    }
    async function loadLimited(mode) {
        if (!state.filePreview) return;
        const requestId = ++state.seq.more; state.loading.more = true;
        try {
            const segment = await fetchJson('file-limited', { path: state.selectedFilePath, mode });
            if (requestId !== state.seq.more) return;
            state.filePreview = { ...state.filePreview, ...segment }; renderContent();
        } catch (error) { if (requestId === state.seq.more) setStatus(el['viewer-status'], error.message, 'error'); }
        finally { if (requestId === state.seq.more) { state.loading.more = false; renderControls(); } }
    }

    function ensureDialog(dialog) {
        if (!dialog.showModal) dialog.showModal = function () { this.setAttribute('open', ''); };
        if (!dialog.close) dialog.close = function () { this.removeAttribute('open'); };
    }
    function openDialog(dialog) { ensureDialog(dialog); dialog.showModal(); }
    function closeDialog(dialog) { if (dialog && dialog.hasAttribute('open')) dialog.close(); }
    function pickerItem(entry, onClick) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'picker-item';
        const icon = document.createElement('span'); icon.className = 'file-icon'; icon.textContent = entryIcon(entry);
        const main = document.createElement('span'); main.className = 'browser-item-main';
        const name = document.createElement('span'); name.className = 'browser-item-name'; name.textContent = entry.name;
        const detail = document.createElement('span'); detail.className = 'browser-item-path'; detail.textContent = entry.path;
        main.append(name, detail); button.append(icon, main); button.addEventListener('click', onClick); return button;
    }
    async function runSearch(query, target, status, mode) {
        const requestId = ++state.seq.search; target.replaceChildren();
        if (!String(query || '').trim()) { setStatus(status, copy('searchHint')); return; }
        setStatus(status, copy('loading'), 'loading');
        try {
            const payload = await fetchJson('search', { q: query, limit: 100 });
            if (requestId !== state.seq.search) return;
            const entries = Array.isArray(payload.entries) ? payload.entries : [];
            setStatus(status, entries.length ? '' : copy('noResults'));
            entries.forEach((entry) => target.append(pickerItem(entry, () => {
                if (mode === 'compare') void loadFileComparison(entry.path);
                else { closeDialog(el['search-dialog']); state.currentDir = entry.parentPath || ''; void openFile(entry, { pushHistory: true }); }
            })));
        } catch (error) { if (requestId === state.seq.search) setStatus(status, error.message, 'error'); }
    }

    function openSearchDialog() { openDialog(el['search-dialog']); el['search-input'].value = ''; el['search-results'].replaceChildren(); setStatus(el['search-status'], copy('searchHint')); setTimeout(() => el['search-input'].focus(), 0); }
    function openCompareDialog() { if (!state.selectedFilePath) return; openDialog(el['compare-dialog']); el['compare-left-label'].textContent = state.selectedFilePath; el['compare-search-input'].value = ''; el['compare-results'].replaceChildren(); setStatus(el['compare-status'], copy('searchHint')); setTimeout(() => el['compare-search-input'].focus(), 0); }
    function debounce(fn, wait) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; }

    async function openBinary() {
        const preview = state.filePreview; if (!preview) return;
        if (state.hostSurface === 'android' && window.TermLinkWorkspace && typeof window.TermLinkWorkspace.openWorkspaceFile === 'function') {
            window.TermLinkWorkspace.openWorkspaceFile(preview.path, preview.mimeType || 'application/octet-stream'); return;
        }
        try {
            const blob = await fetchBlob(preview.path); const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a'); anchor.href = url; anchor.download = preview.name || 'download'; document.body.append(anchor); anchor.click(); anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) { setStatus(el['viewer-status'], copy('openFailed'), 'error'); }
    }
    function openExternalUrl(url) {
        if (state.hostSurface === 'android' && window.TermLinkWorkspace && typeof window.TermLinkWorkspace.openExternalUrl === 'function') window.TermLinkWorkspace.openExternalUrl(url);
        else window.open(url, '_blank', 'noopener');
    }

    function bindEvents() {
        el['btn-refresh'].addEventListener('click', () => void loadTree(state.currentDir, { refresh: true }));
        el['btn-root'].addEventListener('click', () => void loadTree('', { pushHistory: true }));
        el['btn-docs'].addEventListener('click', () => void loadTree(state.docsPath, { pushHistory: true }));
        el['btn-up'].addEventListener('click', () => void loadTree(dirname(state.currentDir), { pushHistory: true }));
        el['toggle-hidden'].addEventListener('change', () => { state.showHidden = el['toggle-hidden'].checked; void loadTree(state.currentDir); });
        el['btn-mobile-back'].addEventListener('click', () => workspaceBack()); el['btn-search'].addEventListener('click', openSearchDialog);
        el['btn-view-content'].addEventListener('click', renderContent); el['btn-view-diff'].addEventListener('click', () => void loadHeadDiff());
        el['btn-compare-files'].addEventListener('click', openCompareDialog);
        el['btn-reload-file'].addEventListener('click', () => state.selectedFileMeta && void openFile(state.selectedFileMeta));
        el['btn-copy'].addEventListener('click', async () => {
            try { await navigator.clipboard.writeText((state.filePreview && state.filePreview.content) || ''); setStatus(el['viewer-status'], copy('copied')); }
            catch (error) { setStatus(el['viewer-status'], copy('copyFailed'), 'error'); }
        });
        el['btn-markdown-preview'].addEventListener('click', () => { state.markdownMode = 'rendered'; renderContent(); });
        el['btn-markdown-source'].addEventListener('click', () => { state.markdownMode = 'source'; renderContent(); });
        el['btn-load-more'].addEventListener('click', () => void loadMore());
        el['btn-prev-segment'].addEventListener('click', () => void loadMore(Math.max(0, (state.filePreview.offset || 0) - 64 * 1024)));
        el['btn-next-segment'].addEventListener('click', () => void loadMore(state.filePreview.nextOffset || 0));
        el['btn-limited-head'].addEventListener('click', () => void loadLimited('head')); el['btn-limited-tail'].addEventListener('click', () => void loadLimited('tail'));
        el['btn-image-minus'].addEventListener('click', () => { state.imageFit = false; state.imageScale = Math.max(.25, state.imageScale - .25); updateImageScale(); });
        el['btn-image-plus'].addEventListener('click', () => { state.imageFit = false; state.imageScale = Math.min(4, state.imageScale + .25); updateImageScale(); });
        el['btn-image-fit'].addEventListener('click', () => { state.imageFit = true; updateImageScale(); });
        el['btn-image-actual'].addEventListener('click', () => { state.imageFit = false; state.imageScale = 1; updateImageScale(); });
        el['btn-pdf-prev'].addEventListener('click', () => { if (state.pdfPage > 1) { state.pdfPage -= 1; void renderPdfPage(); } });
        el['btn-pdf-next'].addEventListener('click', () => { if (state.pdfDocument && state.pdfPage < state.pdfDocument.numPages) { state.pdfPage += 1; void renderPdfPage(); } });
        el['btn-pdf-minus'].addEventListener('click', () => { state.pdfFit = false; state.pdfScale = Math.max(.35, state.pdfScale - .2); void renderPdfPage(); });
        el['btn-pdf-plus'].addEventListener('click', () => { state.pdfFit = false; state.pdfScale = Math.min(3, state.pdfScale + .2); void renderPdfPage(); });
        el['btn-pdf-fit'].addEventListener('click', () => { state.pdfFit = true; void renderPdfPage(); });
        el['btn-open-binary'].addEventListener('click', () => void openBinary());
        el['btn-diff-unified'].addEventListener('click', () => { state.diffLayout = 'unified'; renderDiff(); });
        el['btn-diff-split'].addEventListener('click', () => { state.diffLayout = 'split'; renderDiff(); });
        el['search-input'].addEventListener('input', debounce((event) => void runSearch(event.target.value, el['search-results'], el['search-status'], 'open'), 180));
        el['compare-search-input'].addEventListener('input', debounce((event) => void runSearch(event.target.value, el['compare-results'], el['compare-status'], 'compare'), 180));
        el['markdown-viewer'].addEventListener('click', (event) => {
            const anchor = event.target.closest('a'); if (!anchor) return; const href = anchor.getAttribute('href') || ''; if (!href) { event.preventDefault(); return; }
            if (/^(https?:|mailto:)/i.test(href)) { event.preventDefault(); openExternalUrl(href); return; }
            const relative = normalizeWorkspacePath(href.split('#')[0], dirname(state.selectedFilePath));
            if (relative) { event.preventDefault(); void openFile({ name: relative.split('/').pop(), path: relative }, { pushHistory: true }); }
        });
        window.addEventListener('popstate', (event) => void restoreRoute(event.state));
        window.addEventListener('resize', debounce(() => { if (!state.diffPreview) return; if (window.innerWidth < 900 && state.diffLayout === 'split') { state.diffLayout = 'unified'; renderDiff(); } }, 120));
    }

    async function restoreRoute(route) {
        if (!route || !route.workspace) { setPage('browser'); return; }
        if (route.type === 'directory') await loadTree(route.dir || '');
        else if (route.type === 'file') {
            if (state.currentDir !== route.dir) await loadTree(route.dir || '');
            const entry = { path: route.path, name: route.name || String(route.path).split('/').pop(), exists: route.deleted ? false : true };
            if (route.deleted) await openDeletedFile(entry, { pushHistory: false }); else await openFile(entry);
        }
        else if (route.type === 'compare') { if (state.selectedFilePath !== route.leftPath) await openFile({ path: route.leftPath, name: String(route.leftPath).split('/').pop() }); await loadFileComparison(route.rightPath, { pushHistory: false }); }
    }
    function workspaceBack() {
        if (el['search-dialog'].hasAttribute('open')) {
            closeDialog(el['search-dialog']);
            if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
            return true;
        }
        if (el['compare-dialog'].hasAttribute('open')) {
            closeDialog(el['compare-dialog']);
            if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
            return true;
        }
        const page = el['workspace-main'].dataset.page;
        if (page !== 'browser' && history.state && history.state.workspace) { history.back(); return true; }
        if (state.currentDir) { void loadTree(dirname(state.currentDir), { pushHistory: true }); return true; }
        return false;
    }

    async function boot() {
        if (state.booted || !state.sessionId) return;
        state.booted = true; bindEvents(); syncVisualViewport();
        window.addEventListener('resize', syncVisualViewport);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', syncVisualViewport);
            window.visualViewport.addEventListener('scroll', syncVisualViewport);
        }
        try {
            if (window.i18n && typeof window.i18n.init === 'function') await window.i18n.init();
            applyCopy();
            document.documentElement.lang = localeKey();
            el['viewer-title'].textContent = tr('workspace.viewer.noFile', 'noFile');
            el['viewer-empty'].textContent = tr('workspace.viewer.selectFile', 'selectFile');
            const meta = await fetchJson('meta');
            state.workspaceRoot = meta.workspaceRoot || ''; state.docsPath = meta.defaultEntryPath || '';
            state.defaultEntryPath = state.defaultEntryPath || state.docsPath;
            el['workspace-title'].textContent = state.workspaceRoot ? state.workspaceRoot.split(/[\\/]/).filter(Boolean).pop() || state.workspaceRoot : 'Workspace';
            el['workspace-subtitle'].textContent = state.workspaceRoot || '';
            if (meta.disabledReason) { el['workspace-banner'].hidden = false; el['workspace-banner'].textContent = meta.disabledReason; }
            await loadTree(state.defaultEntryPath || '');
            writeHistory('directory', {}, true);
        } catch (error) {
            el['workspace-banner'].hidden = false; el['workspace-banner'].textContent = error.message;
        }
    }

    window.__applyWorkspaceConfig = function (config) { applyConfig(config); void boot(); };
    window.__workspaceBack = workspaceBack;
    window.__workspaceDebugState = state;
    applyConfig(readConfig());
    void boot();
}());
