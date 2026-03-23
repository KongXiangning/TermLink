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
        diffPreview: null
    };

    const elements = {
        title: document.getElementById('workspace-title'),
        subtitle: document.getElementById('workspace-subtitle'),
        banner: document.getElementById('workspace-banner'),
        currentDirLabel: document.getElementById('current-dir-label'),
        browserList: document.getElementById('browser-list'),
        browserEmpty: document.getElementById('browser-empty'),
        viewerTitle: document.getElementById('viewer-title'),
        viewerMeta: document.getElementById('viewer-meta'),
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
            const message = payload && payload.error
                ? (payload.error.message || payload.error)
                : `HTTP ${response.status}`;
            throw new Error(message);
        }
        return payload;
    }

    function setBanner(message, hidden) {
        elements.banner.hidden = hidden;
        elements.banner.textContent = hidden ? '' : message;
    }

    function renderBrowser(entries) {
        elements.browserList.innerHTML = '';
        elements.browserEmpty.hidden = entries.length > 0;
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
            button.addEventListener('click', () => {
                if (entry.type === 'directory') {
                    loadTree(entry.path);
                } else {
                    openFile(entry);
                }
            });
            elements.browserList.appendChild(button);
        });
    }

    function renderViewer() {
        const preview = state.activeView === 'diff' ? state.diffPreview : state.filePreview;
        const selected = state.selectedFileMeta;
        elements.btnViewContent.classList.toggle('active', state.activeView === 'content');
        elements.btnViewDiff.classList.toggle('active', state.activeView === 'diff');
        elements.viewerTitle.textContent = selected ? selected.name : '未选择文件';
        elements.viewerMeta.textContent = selected ? (selected.path || '') : '打开文件后可查看内容或 Diff';

        if (!preview) {
            elements.viewerEmpty.hidden = false;
            elements.viewerBody.hidden = true;
            elements.viewerActions.hidden = true;
            elements.viewerModeNote.hidden = true;
            return;
        }

        elements.viewerEmpty.hidden = true;
        elements.viewerBody.hidden = false;
        elements.viewerActions.hidden = false;

        if (preview.previewable === false) {
            elements.viewerBody.textContent = '';
            elements.viewerModeNote.hidden = false;
            elements.viewerModeNote.textContent = '该文件不可作为文本预览。';
        } else if (state.activeView === 'diff') {
            elements.viewerModeNote.hidden = false;
            if (preview.hasChanges === false) {
                elements.viewerModeNote.textContent = preview.reason === 'untracked_file'
                    ? '当前文件未被 Git 跟踪，无法生成有效 Diff。'
                    : '当前文件没有 Git 变更。';
                elements.viewerBody.textContent = '';
            } else {
                elements.viewerModeNote.textContent = preview.truncated
                    ? 'Diff 输出已截断。'
                    : '统一文本 Diff。';
                elements.viewerBody.textContent = preview.diffText || '';
            }
        } else {
            elements.viewerModeNote.hidden = false;
            elements.viewerModeNote.textContent = buildViewModeMessage(preview);
            elements.viewerBody.textContent = preview.content || '';
        }

        const contentPreview = state.filePreview || {};
        const isSegmented = contentPreview.viewMode === 'segmented';
        const isTruncated = contentPreview.viewMode === 'truncated';
        const isLimited = contentPreview.viewMode === 'limited';

        elements.btnLoadMore.hidden = !(state.activeView === 'content' && isTruncated && contentPreview.hasMore);
        elements.btnPrevSegment.hidden = !(state.activeView === 'content' && isSegmented && contentPreview.offset > 0);
        elements.btnNextSegment.hidden = !(state.activeView === 'content' && isSegmented && contentPreview.hasMore);
        elements.btnLimitedHead.hidden = !(state.activeView === 'content' && isLimited);
        elements.btnLimitedTail.hidden = !(state.activeView === 'content' && isLimited);
    }

    function buildViewModeMessage(preview) {
        if (preview.previewable === false) {
            return '该文件不可作为文本预览。';
        }
        if (preview.viewMode === 'full') {
            return '完整预览';
        }
        if (preview.viewMode === 'truncated') {
            return preview.hasMore ? '截断预览，可继续加载更多。' : '截断预览';
        }
        if (preview.viewMode === 'segmented') {
            return '分段查看模式';
        }
        if (preview.viewMode === 'limited') {
            return '受限查看模式，可切换头部或尾部片段。';
        }
        return '';
    }

    async function loadMeta() {
        const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/meta`);
        state.workspaceRoot = payload.workspaceRoot || '';
        state.defaultEntryPath = payload.defaultEntryPath || '';
        elements.title.textContent = payload.workspaceRoot || 'Workspace';
        elements.subtitle.textContent = payload.isGitRepo
            ? `Git Root: ${payload.gitRoot || ''}`
            : '当前目录不在 Git 仓库中';

        if (payload.disabledReason) {
            setBanner('当前会话缺少可用的 workspaceRoot，无法浏览工作区。', false);
            return false;
        }
        setBanner('', true);
        return true;
    }

    async function loadTree(nextPath) {
        state.currentDir = nextPath || '';
        const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/tree`, {
            path: state.currentDir,
            showHidden: state.showHidden
        });
        elements.currentDirLabel.textContent = payload.path || '/';
        renderBrowser(payload.entries || []);
    }

    async function openFile(entry) {
        state.selectedFilePath = entry.path;
        state.selectedFileMeta = entry;
        state.activeView = 'content';
        state.diffPreview = null;
        state.filePreview = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file`, {
            path: entry.path
        });
        renderViewer();
    }

    async function loadDiff() {
        if (!state.selectedFilePath) {
            return;
        }
        state.diffPreview = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/diff`, {
            path: state.selectedFilePath
        });
        state.activeView = 'diff';
        renderViewer();
    }

    async function reloadSelectedFile() {
        if (!state.selectedFilePath) {
            return;
        }
        if (state.activeView === 'diff') {
            await loadDiff();
            return;
        }
        state.filePreview = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file`, {
            path: state.selectedFilePath
        });
        renderViewer();
    }

    async function loadMore() {
        if (!state.filePreview || !state.filePreview.hasMore) {
            return;
        }
        const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file-segment`, {
            path: state.selectedFilePath,
            offset: state.filePreview.nextOffset,
            length: 131072
        });
        state.filePreview.content = `${state.filePreview.content || ''}${payload.content || ''}`;
        state.filePreview.offset = payload.offset;
        state.filePreview.returnedBytes = payload.returnedBytes;
        state.filePreview.nextOffset = payload.nextOffset;
        state.filePreview.hasMore = payload.hasMore;
        renderViewer();
    }

    async function moveSegment(direction) {
        if (!state.filePreview) {
            return;
        }
        const nextOffset = direction === 'prev'
            ? Math.max(0, (state.filePreview.offset || 0) - 65536)
            : (state.filePreview.nextOffset || 0);
        const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file-segment`, {
            path: state.selectedFilePath,
            offset: nextOffset,
            length: 65536
        });
        state.filePreview = Object.assign({}, state.filePreview, payload);
        renderViewer();
    }

    async function loadLimited(mode) {
        const payload = await fetchJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/workspace/file-limited`, {
            path: state.selectedFilePath,
            mode
        });
        state.filePreview = Object.assign({}, state.filePreview || {}, payload);
        renderViewer();
    }

    function goUpDirectory() {
        if (!state.currentDir) {
            return;
        }
        const parts = state.currentDir.split('/').filter(Boolean);
        parts.pop();
        loadTree(parts.join('/'));
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
            await reloadSelectedFile();
        });
        elements.btnRoot.addEventListener('click', () => loadTree(''));
        elements.btnUp.addEventListener('click', () => goUpDirectory());
        elements.toggleHidden.addEventListener('change', async (event) => {
            state.showHidden = event.target.checked;
            await loadTree(state.currentDir);
        });
        elements.btnViewContent.addEventListener('click', () => {
            state.activeView = 'content';
            renderViewer();
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
        const injectedConfig = readInjectedConfig();
        state.sessionId = getQueryParam('sessionId') || injectedConfig.sessionId || '';
        state.serverUrl = normalizeServerUrl(injectedConfig.serverUrl || '');
        state.authHeader = typeof injectedConfig.authHeader === 'string' ? injectedConfig.authHeader : '';

        if (!state.sessionId) {
            setBanner('缺少 sessionId，无法打开工作区。', false);
            return;
        }

        try {
            const enabled = await loadMeta();
            if (!enabled) {
                return;
            }
            await loadTree(state.defaultEntryPath || '');
        } catch (error) {
            setBanner(error.message || '加载工作区失败。', false);
        }
    }

    bindEvents();
    bootstrap();
})();
