(function () {
    const state = {
        sessionId: '',
        serverUrl: '',
        authHeader: '',
        workspaceRoot: '',
        defaultEntryPath: '',
        currentDir: '',
        showHidden: true,
        selectedFilePath: '',
        selectedFileMeta: null,
        activeView: 'content',
        filePreview: null,
        diffPreview: null,
        treeEntries: [],
        meta: {
            isGitRepo: false,
            gitRoot: '',
            disabledReason: ''
        },
        loadingState: {
            meta: false,
            tree: false,
            file: false,
            diff: false,
            more: false
        },
        errorState: {
            page: '',
            tree: '',
            file: '',
            diff: ''
        },
        requestState: {
            treeSeq: 0,
            fileSeq: 0,
            diffSeq: 0,
            moreSeq: 0
        }
    };

    const elements = {
        title: document.getElementById('workspace-title'),
        subtitle: document.getElementById('workspace-subtitle'),
        banner: document.getElementById('workspace-banner'),
        currentDirLabel: document.getElementById('current-dir-label'),
        browserList: document.getElementById('browser-list'),
        browserStatus: document.getElementById('browser-status'),
        browserEmpty: document.getElementById('browser-empty'),
        viewerTitle: document.getElementById('viewer-title'),
        viewerMeta: document.getElementById('viewer-meta'),
        viewerStatus: document.getElementById('viewer-status'),
        viewerModeNote: document.getElementById('viewer-mode-note'),
        viewerEmpty: document.getElementById('viewer-empty'),
        viewerBody: document.getElementById('viewer-body'),
        viewerActions: document.getElementById('viewer-actions'),
        btnRefresh: document.getElementById('btn-refresh'),
        btnRoot: document.getElementById('btn-root'),
        btnUp: document.getElementById('btn-up'),
        toggleHidden: document.getElementById('toggle-hidden'),
        btnViewContent: document.getElementById('btn-view-content'),
        btnViewDiff: document.getElementById('btn-view-diff'),
        btnReloadFile: document.getElementById('btn-reload-file'),
        btnLoadMore: document.getElementById('btn-load-more'),
        btnPrevSegment: document.getElementById('btn-prev-segment'),
        btnNextSegment: document.getElementById('btn-next-segment'),
        btnLimitedHead: document.getElementById('btn-limited-head'),
        btnLimitedTail: document.getElementById('btn-limited-tail')
    };

    function readInjectedConfig() {
        if (window.__TERMLINK_CONFIG__ && typeof window.__TERMLINK_CONFIG__ === 'object') {
            return window.__TERMLINK_CONFIG__;
        }
        return {};
    }

    function applyInjectedConfig(config) {
        if (!config || typeof config !== 'object') {
            return;
        }
        window.__TERMLINK_CONFIG__ = config;
        state.sessionId = getQueryParam('sessionId') || config.sessionId || '';
        state.serverUrl = normalizeServerUrl(config.serverUrl || '');
        state.authHeader = typeof config.authHeader === 'string' ? config.authHeader : '';
    }

    function normalizeServerUrl(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim().replace(/\/+$/, '');
    }

    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name) || '';
    }

    function buildApiUrl(pathName, query) {
        const baseUrl = state.serverUrl || (window.location.origin && window.location.origin !== 'null' ? window.location.origin : '');
        const url = new URL(`${baseUrl}${pathName}`, baseUrl || window.location.href);
        if (query) {
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.set(key, String(value));
                }
            });
        }
        return url.toString();
    }

    async function fetchJson(pathName, query) {
        const headers = {};
        if (state.authHeader) {
            headers.Authorization = state.authHeader;
        }
        const response = await fetch(buildApiUrl(pathName, query), { headers });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMessage = payload && payload.error
                ? (payload.error.message || payload.error)
                : `HTTP ${response.status}`;
            throw new Error(errorMessage);
        }
        return payload;
    }

    function setBanner(message, hidden) {
        elements.banner.hidden = hidden;
        elements.banner.textContent = hidden ? '' : message;
    }

    function setStatusBox(element, message, tone) {
        if (!element) {
            return;
        }
        const hasMessage = typeof message === 'string' && message.trim().length > 0;
        element.hidden = !hasMessage;
        element.textContent = hasMessage ? message : '';
        element.classList.remove('is-error', 'is-loading');
        if (!hasMessage) {
            return;
        }
        if (tone === 'error') {
            element.classList.add('is-error');
        } else if (tone === 'loading') {
            element.classList.add('is-loading');
        }
    }

    function setLoadingFlag(key, value) {
        state.loadingState[key] = value;
        renderControls();
    }

    function renderControls() {
        const hasSelection = !!state.selectedFilePath;
        const hasDiffView = state.activeView === 'diff';
        const contentPreview = state.filePreview || {};
        const isSegmented = contentPreview.viewMode === 'segmented';
        const isTruncated = contentPreview.viewMode === 'truncated';
        const isLimited = contentPreview.viewMode === 'limited';

        elements.toggleHidden.checked = state.showHidden;
        elements.btnRoot.disabled = state.loadingState.tree || state.currentDir === '';
        elements.btnUp.disabled = state.loadingState.tree || state.currentDir === '';
        elements.btnRefresh.disabled = state.loadingState.meta || state.loadingState.tree || state.loadingState.file || state.loadingState.diff || state.loadingState.more;
        elements.toggleHidden.disabled = state.loadingState.tree;

        elements.btnViewContent.disabled = !hasSelection || state.loadingState.file || state.loadingState.more;
        elements.btnViewDiff.disabled = !hasSelection || state.loadingState.diff;
        elements.btnReloadFile.disabled = !hasSelection || state.loadingState.file || state.loadingState.diff || state.loadingState.more;

        elements.btnViewContent.classList.toggle('active', state.activeView === 'content');
        elements.btnViewDiff.classList.toggle('active', hasDiffView);

        elements.btnLoadMore.hidden = !(state.activeView === 'content' && isTruncated && contentPreview.hasMore);
        elements.btnPrevSegment.hidden = !(state.activeView === 'content' && isSegmented);
        elements.btnNextSegment.hidden = !(state.activeView === 'content' && isSegmented);
        elements.btnLimitedHead.hidden = !(state.activeView === 'content' && isLimited);
        elements.btnLimitedTail.hidden = !(state.activeView === 'content' && isLimited);

        elements.btnLoadMore.disabled = state.loadingState.more;
        elements.btnPrevSegment.disabled = state.loadingState.more || !isSegmented || !((contentPreview.offset || 0) > 0);
        elements.btnNextSegment.disabled = state.loadingState.more || !isSegmented || !contentPreview.hasMore;
        elements.btnLimitedHead.disabled = state.loadingState.more || !isLimited || contentPreview.currentLimitedMode === 'head';
        elements.btnLimitedTail.disabled = state.loadingState.more || !isLimited || contentPreview.currentLimitedMode === 'tail';
    }

    function renderHeader() {
        elements.title.textContent = state.workspaceRoot || 'Workspace';
        if (state.meta.disabledReason) {
            elements.subtitle.textContent = '当前工作区不可用';
            return;
        }
        elements.subtitle.textContent = state.meta.isGitRepo
            ? `Git Root: ${state.meta.gitRoot || ''}`
            : '当前目录不在 Git 仓库中';
    }

    function renderBrowserList(entries) {
        elements.browserList.innerHTML = '';
        entries.forEach((entry) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'browser-item';
            button.innerHTML = `
                <span class="browser-item-main">
                    <span class="browser-item-name">${escapeHtml(entry.name)}</span>
                    <span class="browser-item-path">${escapeHtml(entry.path || '/')}</span>
                </span>
                <span class="browser-badges">
                    <span class="badge ${entry.type === 'directory' ? 'badge-dir' : 'badge-file'}">
                        ${entry.type === 'directory' ? 'DIR' : 'FILE'}
                    </span>
                    ${entry.gitStatus ? `<span class="badge badge-git">${escapeHtml(entry.gitStatus)}</span>` : ''}
                </span>
            `;
            button.disabled = state.loadingState.tree;
            button.addEventListener('click', () => {
                if (entry.type === 'directory') {
                    void loadTree(entry.path);
                } else {
                    void openFile(entry);
                }
            });
            elements.browserList.appendChild(button);
        });
    }

    function renderBrowserPane() {
        const displayPath = state.currentDir || '/';
        elements.currentDirLabel.textContent = displayPath;

        if (state.errorState.tree) {
            setStatusBox(elements.browserStatus, state.errorState.tree, 'error');
        } else if (state.loadingState.tree) {
            setStatusBox(elements.browserStatus, '正在加载目录...', 'loading');
        } else {
            setStatusBox(elements.browserStatus, '', '');
        }

        if (state.errorState.tree) {
            elements.browserList.innerHTML = '';
            elements.browserEmpty.hidden = false;
            elements.browserEmpty.textContent = '目录加载失败，请重试。';
            return;
        }

        renderBrowserList(state.treeEntries);
        const showEmpty = !state.loadingState.tree && state.treeEntries.length === 0;
        elements.browserEmpty.hidden = !showEmpty;
        elements.browserEmpty.textContent = '当前目录为空。';
    }

    function buildContentModeMessage(preview) {
        if (preview.previewable === false) {
            return '该文件不可作为文本预览。';
        }
        if (preview.viewMode === 'full') {
            return '完整预览';
        }
        if (preview.viewMode === 'truncated') {
            return preview.hasMore
                ? `截断预览，当前已加载 ${preview.returnedBytes || 0} 字节，可继续加载更多。`
                : '截断预览';
        }
        if (preview.viewMode === 'segmented') {
            const start = Number.isFinite(preview.offset) ? preview.offset : 0;
            const end = start + (preview.returnedBytes || 0);
            return `分段查看模式，当前显示 ${start}-${end} 字节区间。`;
        }
        if (preview.viewMode === 'limited') {
            const modeLabel = preview.currentLimitedMode === 'tail' ? '尾部' : '头部';
            return `受限查看模式，当前显示文件${modeLabel}片段。`;
        }
        return '';
    }

    function buildDiffStatusMessage(preview) {
        if (preview.reason === 'not_git_repo') {
            return '当前目录不在 Git 仓库中。';
        }
        if (preview.reason === 'untracked_file') {
            return '当前文件未被 Git 跟踪，无法生成有效 Diff。';
        }
        if (preview.hasChanges === false) {
            return '当前文件没有 Git 变更。';
        }
        if (preview.truncated) {
            return 'Diff 输出已截断。';
        }
        return '统一文本 Diff。';
    }

    function renderViewerPane() {
        const selected = state.selectedFileMeta;
        const preview = state.activeView === 'diff' ? state.diffPreview : state.filePreview;

        elements.viewerTitle.textContent = selected ? selected.name : '未选择文件';
        elements.viewerMeta.textContent = selected
            ? (selected.path || '')
            : '打开文件后可查看内容或 Diff';

        setStatusBox(elements.viewerStatus, '', '');
        elements.viewerModeNote.hidden = true;
        elements.viewerModeNote.textContent = '';
        elements.viewerBody.hidden = true;
        elements.viewerBody.textContent = '';
        elements.viewerActions.hidden = true;

        if (!selected) {
            elements.viewerEmpty.hidden = false;
            elements.viewerEmpty.textContent = '请选择一个文本文件。';
            renderControls();
            return;
        }

        if (state.activeView === 'content') {
            if (state.errorState.file) {
                setStatusBox(elements.viewerStatus, state.errorState.file, 'error');
                elements.viewerEmpty.hidden = false;
                elements.viewerEmpty.textContent = '文件内容加载失败。';
                renderControls();
                return;
            }
            if (state.loadingState.file && !state.filePreview) {
                setStatusBox(elements.viewerStatus, '正在加载文件内容...', 'loading');
                elements.viewerEmpty.hidden = false;
                elements.viewerEmpty.textContent = '正在获取文件内容。';
                renderControls();
                return;
            }
            if (!preview) {
                elements.viewerEmpty.hidden = false;
                elements.viewerEmpty.textContent = '请选择一个文本文件。';
                renderControls();
                return;
            }

            elements.viewerEmpty.hidden = true;
            elements.viewerActions.hidden = false;
            elements.viewerModeNote.hidden = false;
            elements.viewerModeNote.textContent = buildContentModeMessage(preview);

            if (preview.previewable === false) {
                renderControls();
                return;
            }

            elements.viewerBody.hidden = false;
            elements.viewerBody.textContent = preview.content || '';
            renderControls();
            return;
        }

        if (state.errorState.diff) {
            setStatusBox(elements.viewerStatus, state.errorState.diff, 'error');
            elements.viewerEmpty.hidden = false;
            elements.viewerEmpty.textContent = 'Diff 加载失败，可切回内容视图继续查看文件。';
            renderControls();
            return;
        }
        if (state.loadingState.diff && !state.diffPreview) {
            setStatusBox(elements.viewerStatus, '正在加载 Diff...', 'loading');
            elements.viewerEmpty.hidden = false;
            elements.viewerEmpty.textContent = '正在获取 Diff。';
            renderControls();
            return;
        }
        if (!state.diffPreview) {
            elements.viewerEmpty.hidden = false;
            elements.viewerEmpty.textContent = '点击 Diff 以按需加载当前文件变更。';
            renderControls();
            return;
        }

        elements.viewerEmpty.hidden = true;
        elements.viewerModeNote.hidden = false;
        elements.viewerModeNote.textContent = buildDiffStatusMessage(state.diffPreview);

        if (state.diffPreview.hasChanges) {
            elements.viewerBody.hidden = false;
            elements.viewerBody.textContent = state.diffPreview.diffText || '';
        }
        renderControls();
    }

    function renderPage() {
        renderHeader();
        renderBrowserPane();
        renderViewerPane();
        renderControls();
    }

    function resetViewerStateForSelection(entry) {
        state.requestState.diffSeq += 1;
        state.requestState.moreSeq += 1;
        state.loadingState.diff = false;
        state.loadingState.more = false;
        state.selectedFilePath = entry.path;
        state.selectedFileMeta = entry;
        state.activeView = 'content';
        state.filePreview = null;
        state.diffPreview = null;
        state.errorState.file = '';
        state.errorState.diff = '';
        renderPage();
    }

    async function loadMeta() {
        setLoadingFlag('meta', true);
        state.errorState.page = '';
        try {
            const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/meta`);
            state.workspaceRoot = payload.workspaceRoot || '';
            state.defaultEntryPath = payload.defaultEntryPath || '';
            state.meta.isGitRepo = payload.isGitRepo === true;
            state.meta.gitRoot = payload.gitRoot || '';
            state.meta.disabledReason = payload.disabledReason || '';
            renderHeader();
            if (payload.disabledReason) {
                setBanner('当前会话缺少可用的 workspaceRoot，无法浏览工作区。', false);
                return false;
            }
            setBanner('', true);
            return true;
        } catch (error) {
            state.errorState.page = error.message || '加载工作区失败。';
            setBanner(state.errorState.page, false);
            throw error;
        } finally {
            setLoadingFlag('meta', false);
        }
    }

    async function loadTree(nextPath) {
        const requestSeq = state.requestState.treeSeq + 1;
        state.requestState.treeSeq = requestSeq;
        state.currentDir = typeof nextPath === 'string' ? nextPath : '';
        state.errorState.tree = '';
        setLoadingFlag('tree', true);
        renderBrowserPane();

        try {
            const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/tree`, {
                path: state.currentDir,
                showHidden: state.showHidden
            });
            if (requestSeq !== state.requestState.treeSeq) {
                return;
            }
            state.currentDir = payload.path || '';
            state.treeEntries = Array.isArray(payload.entries) ? payload.entries : [];
            state.errorState.tree = '';
            renderBrowserPane();
        } catch (error) {
            if (requestSeq !== state.requestState.treeSeq) {
                return;
            }
            state.treeEntries = [];
            state.errorState.tree = error.message || '目录加载失败。';
            renderBrowserPane();
        } finally {
            if (requestSeq === state.requestState.treeSeq) {
                setLoadingFlag('tree', false);
                renderBrowserPane();
            }
        }
    }

    async function openFile(entry) {
        const requestSeq = state.requestState.fileSeq + 1;
        state.requestState.fileSeq = requestSeq;
        resetViewerStateForSelection(entry);
        setLoadingFlag('file', true);

        try {
            const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file`, {
                path: entry.path
            });
            if (requestSeq !== state.requestState.fileSeq || state.selectedFilePath !== entry.path) {
                return;
            }
            state.filePreview = payload;
            state.errorState.file = '';
            renderViewerPane();
        } catch (error) {
            if (requestSeq !== state.requestState.fileSeq || state.selectedFilePath !== entry.path) {
                return;
            }
            state.filePreview = null;
            state.errorState.file = error.message || '文件内容加载失败。';
            renderViewerPane();
        } finally {
            if (requestSeq === state.requestState.fileSeq && state.selectedFilePath === entry.path) {
                setLoadingFlag('file', false);
                renderViewerPane();
            }
        }
    }

    async function loadDiff() {
        if (!state.selectedFilePath) {
            return;
        }
        const requestPath = state.selectedFilePath;
        const requestSeq = state.requestState.diffSeq + 1;
        state.requestState.diffSeq = requestSeq;
        state.activeView = 'diff';
        state.errorState.diff = '';
        setLoadingFlag('diff', true);
        renderViewerPane();

        try {
            const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/diff`, {
                path: requestPath
            });
            if (requestSeq !== state.requestState.diffSeq || state.selectedFilePath !== requestPath) {
                return;
            }
            state.diffPreview = payload;
            state.errorState.diff = '';
            renderViewerPane();
        } catch (error) {
            if (requestSeq !== state.requestState.diffSeq || state.selectedFilePath !== requestPath) {
                return;
            }
            state.errorState.diff = error.message || 'Diff 加载失败。';
            renderViewerPane();
        } finally {
            if (requestSeq === state.requestState.diffSeq && state.selectedFilePath === requestPath) {
                setLoadingFlag('diff', false);
                renderViewerPane();
            }
        }
    }

    async function reloadSelectedFile() {
        if (!state.selectedFilePath || !state.selectedFileMeta) {
            return;
        }
        if (state.activeView === 'diff') {
            await loadDiff();
            return;
        }
        await openFile(state.selectedFileMeta);
    }

    async function loadMore() {
        if (!state.filePreview || !state.filePreview.hasMore || !state.selectedFilePath) {
            return;
        }
        const requestPath = state.selectedFilePath;
        const requestSeq = state.requestState.moreSeq + 1;
        state.requestState.moreSeq = requestSeq;
        setLoadingFlag('more', true);
        state.errorState.file = '';
        renderViewerPane();
        try {
            const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file-segment`, {
                path: requestPath,
                offset: state.filePreview.nextOffset,
                length: 131072
            });
            if (requestSeq !== state.requestState.moreSeq || state.selectedFilePath !== requestPath) {
                return;
            }
            state.filePreview = Object.assign({}, state.filePreview, payload, {
                content: `${state.filePreview.content || ''}${payload.content || ''}`
            });
            renderViewerPane();
        } catch (error) {
            if (requestSeq === state.requestState.moreSeq && state.selectedFilePath === requestPath) {
                state.errorState.file = error.message || '继续加载文件失败。';
                renderViewerPane();
            }
        } finally {
            if (requestSeq === state.requestState.moreSeq) {
                setLoadingFlag('more', false);
                if (state.selectedFilePath === requestPath) {
                    renderViewerPane();
                }
            }
        }
    }

    async function moveSegment(direction) {
        if (!state.filePreview || !state.selectedFilePath) {
            return;
        }
        const requestPath = state.selectedFilePath;
        const currentOffset = Number.isFinite(state.filePreview.offset) ? state.filePreview.offset : 0;
        const nextOffset = direction === 'prev'
            ? Math.max(0, currentOffset - 65536)
            : (state.filePreview.nextOffset || 0);
        const requestSeq = state.requestState.moreSeq + 1;
        state.requestState.moreSeq = requestSeq;
        setLoadingFlag('more', true);
        state.errorState.file = '';
        renderViewerPane();
        try {
            const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file-segment`, {
                path: requestPath,
                offset: nextOffset,
                length: 65536
            });
            if (requestSeq !== state.requestState.moreSeq || state.selectedFilePath !== requestPath) {
                return;
            }
            state.filePreview = Object.assign({}, state.filePreview, payload);
            renderViewerPane();
        } catch (error) {
            if (requestSeq === state.requestState.moreSeq && state.selectedFilePath === requestPath) {
                state.errorState.file = error.message || '分段加载失败。';
                renderViewerPane();
            }
        } finally {
            if (requestSeq === state.requestState.moreSeq) {
                setLoadingFlag('more', false);
                if (state.selectedFilePath === requestPath) {
                    renderViewerPane();
                }
            }
        }
    }

    async function loadLimited(mode) {
        if (!state.selectedFilePath) {
            return;
        }
        const requestPath = state.selectedFilePath;
        const requestSeq = state.requestState.moreSeq + 1;
        state.requestState.moreSeq = requestSeq;
        setLoadingFlag('more', true);
        state.errorState.file = '';
        renderViewerPane();
        try {
            const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file-limited`, {
                path: requestPath,
                mode
            });
            if (requestSeq !== state.requestState.moreSeq || state.selectedFilePath !== requestPath) {
                return;
            }
            state.filePreview = Object.assign({}, state.filePreview || {}, payload);
            renderViewerPane();
        } catch (error) {
            if (requestSeq === state.requestState.moreSeq && state.selectedFilePath === requestPath) {
                state.errorState.file = error.message || '切换受限查看模式失败。';
                renderViewerPane();
            }
        } finally {
            if (requestSeq === state.requestState.moreSeq) {
                setLoadingFlag('more', false);
                if (state.selectedFilePath === requestPath) {
                    renderViewerPane();
                }
            }
        }
    }

    function goUpDirectory() {
        if (!state.currentDir) {
            return;
        }
        const parts = state.currentDir.split('/').filter(Boolean);
        parts.pop();
        void loadTree(parts.join('/'));
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function bindEvents() {
        elements.btnRefresh.addEventListener('click', async () => {
            await loadTree(state.currentDir);
            if (state.selectedFilePath) {
                await reloadSelectedFile();
            }
        });
        elements.btnRoot.addEventListener('click', () => {
            void loadTree('');
        });
        elements.btnUp.addEventListener('click', () => {
            goUpDirectory();
        });
        elements.toggleHidden.addEventListener('change', async (event) => {
            state.showHidden = event.target.checked;
            await loadTree(state.currentDir);
        });
        elements.btnViewContent.addEventListener('click', () => {
            state.activeView = 'content';
            renderViewerPane();
        });
        elements.btnViewDiff.addEventListener('click', async () => {
            await loadDiff();
        });
        elements.btnReloadFile.addEventListener('click', async () => {
            await reloadSelectedFile();
        });
        elements.btnLoadMore.addEventListener('click', async () => {
            await loadMore();
        });
        elements.btnPrevSegment.addEventListener('click', async () => {
            await moveSegment('prev');
        });
        elements.btnNextSegment.addEventListener('click', async () => {
            await moveSegment('next');
        });
        elements.btnLimitedHead.addEventListener('click', async () => {
            await loadLimited('head');
        });
        elements.btnLimitedTail.addEventListener('click', async () => {
            await loadLimited('tail');
        });
    }

    async function bootstrap() {
        applyInjectedConfig(readInjectedConfig());

        if (!state.sessionId) {
            setBanner('缺少 sessionId，无法打开工作区。', false);
            return;
        }

        renderPage();

        try {
            const enabled = await loadMeta();
            if (!enabled) {
                renderPage();
                return;
            }
            await loadTree(state.defaultEntryPath || '');
        } catch (error) {
            setBanner(error.message || '加载工作区失败。', false);
        }
    }

    bindEvents();
    window.__applyWorkspaceConfig = function (config) {
        applyInjectedConfig(config);
        void bootstrap();
    };
    void bootstrap();
})();
