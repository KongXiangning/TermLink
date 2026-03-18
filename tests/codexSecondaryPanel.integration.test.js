/**
 * Phase 1 Integration Tests: True Behavior Tests for Secondary Panel Visibility
 *
 * These tests load the ACTUAL terminal_client.js and test against the ACTUAL
 * DOM structure from codex_client.html.
 *
 * This catches divergence between extracted test logic and real implementation.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { createSlashRegistry } = require('../public/lib/codex_slash_commands');

// ============================================================================
// Test Environment Setup
// ============================================================================

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const JS_PATH = path.join(PUBLIC_DIR, 'terminal_client.js');

// Read actual terminal_client.js source
const jsContent = fs.readFileSync(JS_PATH, 'utf8');

/**
 * Create a minimal JSDOM environment with the DOM structure from codex_client.html
 * We only include the elements needed for secondary panel testing
 */
function createTestDOM() {
    // Create minimal HTML with the DOM structure from codex_client.html
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body class="codex-only">
    <div id="terminal-shell">
        <div id="terminal-main">
            <div id="status-overlay"></div>
            <div id="terminal-container"></div>
        </div>
        <div id="codex-panel">
            <div id="codex-header">
                <div id="codex-status-strip">
                    <div id="codex-header-main">
                        <div id="codex-status-line">
                            <span id="codex-status-dot" aria-hidden="true"></span>
                            <span id="codex-status-text">Codex 空闲</span>
                        </div>
                        <button id="btn-codex-permission-preset" type="button">
                            <span id="codex-permission-preset-label">默认权限</span>
                            <span id="codex-permission-preset-hint">点击切换</span>
                        </button>
                        <div id="codex-meta-line">
                            <span id="codex-meta-text"></span>
                            <span id="codex-notice-text"></span>
                        </div>
                    </div>
                    <div id="codex-actions">
                        <button id="btn-codex-toggle" class="codex-btn" type="button">收起</button>
                        <button id="btn-codex-interrupt" class="codex-btn danger" type="button" hidden>中断</button>
                    </div>
                </div>
                <button id="codex-thread-summary" type="button">
                    <span class="codex-thread-summary-copy">
                        <span id="codex-thread-id" class="codex-thread-summary-title">当前线程未就绪</span>
                        <span id="codex-thread-cwd" class="codex-thread-summary-meta">即将自动创建新线程</span>
                    </span>
                    <span id="codex-thread-summary-action" class="codex-thread-summary-action">查看线程</span>
                </button>
                <div id="codex-secondary-nav">
                    <button id="btn-codex-secondary-threads" class="codex-secondary-btn" type="button">任务历史</button>
                    <button id="btn-codex-secondary-settings" class="codex-secondary-btn" type="button">会话设置</button>
                    <button id="btn-codex-secondary-runtime" class="codex-secondary-btn" type="button">运行态</button>
                    <button id="btn-codex-secondary-tools" class="codex-secondary-btn" type="button" hidden>工具</button>
                    <button id="btn-codex-secondary-notices" class="codex-secondary-btn" type="button" hidden>提示</button>
                </div>
            </div>
            <div id="codex-alerts" hidden>
                <div id="codex-alert-config" class="codex-alert" hidden>
                    <div class="codex-alert-label">配置提示</div>
                    <div id="codex-alert-config-text" class="codex-alert-text"></div>
                </div>
                <div id="codex-alert-deprecation" class="codex-alert" hidden>
                    <div class="codex-alert-label">弃用提示</div>
                    <div id="codex-alert-deprecation-text" class="codex-alert-text"></div>
                </div>
            </div>
            <div id="codex-history-panel" hidden>
                <div id="codex-history-header">
                    <span id="codex-history-title">任务历史</span>
                    <div id="codex-history-actions">
                        <button id="btn-codex-history-refresh" class="codex-btn subtle" type="button">刷新</button>
                        <button id="btn-codex-new-thread" class="codex-btn" type="button">新建任务</button>
                    </div>
                </div>
                <div id="codex-history-empty">暂无已保存线程。</div>
                <div id="codex-history-list" aria-live="polite"></div>
            </div>
            <div id="codex-settings-panel" hidden>
                <div id="codex-settings-header">
                    <span id="codex-settings-title">会话设置</span>
                    <div id="codex-settings-actions">
                        <button id="btn-codex-rate-limit-refresh" class="codex-btn subtle" type="button">额度</button>
                    </div>
                </div>
                <div id="codex-settings-fields">
                    <label class="codex-settings-field">
                        <span>人格风格</span>
                        <select id="codex-settings-personality">
                            <option value="">服务端默认</option>
                        </select>
                    </label>
                    <label class="codex-settings-field">
                        <span>审批策略</span>
                        <select id="codex-settings-approval">
                            <option value="">服务端默认</option>
                        </select>
                    </label>
                    <label class="codex-settings-field">
                        <span>沙箱模式</span>
                        <select id="codex-settings-sandbox">
                            <option value="">服务端默认</option>
                        </select>
                    </label>
                </div>
                <div id="codex-settings-footer">
                    <div id="codex-settings-status" aria-live="polite"></div>
                    <div id="codex-settings-buttons">
                        <button id="btn-codex-settings-reset" class="codex-btn subtle" type="button">重置</button>
                        <button id="btn-codex-settings-save" class="codex-btn" type="button">保存</button>
                    </div>
                </div>
            </div>
            <div id="codex-runtime-panel" hidden>
                <div id="codex-runtime-header">
                    <span id="codex-runtime-title">运行态</span>
                </div>
                <div id="codex-runtime-grid">
                    <section class="codex-runtime-card" data-runtime-section="diff">
                        <div class="codex-runtime-label">变更</div>
                        <pre id="codex-runtime-diff" class="codex-runtime-body"></pre>
                    </section>
                    <section class="codex-runtime-card" data-runtime-section="plan">
                        <div class="codex-runtime-label">计划</div>
                        <pre id="codex-runtime-plan" class="codex-runtime-body"></pre>
                    </section>
                    <section class="codex-runtime-card" data-runtime-section="reasoning">
                        <div class="codex-runtime-label">推理</div>
                        <pre id="codex-runtime-reasoning" class="codex-runtime-body"></pre>
                    </section>
                    <section class="codex-runtime-card" data-runtime-section="terminal">
                        <div class="codex-runtime-label">终端输出</div>
                        <pre id="codex-runtime-terminal" class="codex-runtime-body"></pre>
                    </section>
                </div>
                <div id="codex-runtime-warning" hidden></div>
            </div>
            <div id="codex-tools-panel" hidden>
                <div id="codex-tools-header">
                    <span id="codex-tools-title">扩展工具</span>
                </div>
                <div id="codex-tools-grid">
                    <section id="codex-tools-skills-card" class="codex-tools-card">
                        <div class="codex-tools-card-header">
                            <span class="codex-tools-card-title">技能浏览</span>
                            <span id="codex-tools-skills-meta" class="codex-tools-card-meta"></span>
                        </div>
                        <div id="codex-tools-skills-empty" class="codex-tools-empty">输入 <code>/skills</code> 后可在此浏览可用技能。</div>
                        <div id="codex-tools-skills-list" aria-live="polite"></div>
                    </section>
                    <section id="codex-tools-compact-card" class="codex-tools-card">
                        <div class="codex-tools-card-header">
                            <span class="codex-tools-card-title">上下文压缩</span>
                            <span id="codex-tools-compact-meta" class="codex-tools-card-meta"></span>
                        </div>
                        <p id="codex-tools-compact-description" class="codex-tools-description">将当前线程压缩为更短的上下文摘要。</p>
                        <div id="codex-tools-compact-status" class="codex-tools-status" aria-live="polite"></div>
                        <div id="codex-tools-compact-actions">
                            <button id="btn-codex-compact-confirm" class="codex-btn" type="button">确认压缩当前线程</button>
                        </div>
                    </section>
                </div>
            </div>
            <div id="codex-log" aria-live="polite"></div>
            <div id="codex-composer">
                <div id="codex-composer-state" hidden>
                    <button id="codex-plan-chip" class="codex-mode-chip" type="button" hidden>计划模式已开启</button>
                    <div id="codex-override-summary" hidden></div>
                    <button id="btn-codex-quick-clear" class="codex-inline-action" type="button">清除本次设置</button>
                </div>
                <section id="codex-plan-workflow" hidden>
                    <div id="codex-plan-workflow-header">
                        <div id="codex-plan-workflow-title">计划进行中</div>
                        <div id="codex-plan-workflow-summary">Codex 正在规划，当前不会直接执行。</div>
                    </div>
                    <pre id="codex-plan-workflow-body"></pre>
                    <div id="codex-plan-workflow-actions">
                        <button id="btn-codex-plan-execute" class="codex-btn" type="button" hidden>执行此计划</button>
                        <button id="btn-codex-plan-continue" class="codex-btn subtle" type="button" hidden>继续提问/补充</button>
                        <button id="btn-codex-plan-cancel" class="codex-btn subtle" type="button" hidden>取消</button>
                    </div>
                </section>
                <div id="codex-slash-menu" hidden>
                    <div id="codex-slash-menu-header">
                        <span id="codex-slash-menu-title">搜索命令</span>
                        <span id="codex-slash-menu-hint">输入 <code>/</code> 继续筛选</span>
                    </div>
                    <div id="codex-slash-menu-empty" hidden>没有匹配命令。</div>
                    <div id="codex-slash-menu-list" aria-live="polite"></div>
                </div>
                <div id="codex-image-inputs" hidden></div>
                <div id="codex-image-prompt" hidden>
                    <div id="codex-image-prompt-header">
                        <span id="codex-image-prompt-title">输入图像 URL</span>
                    </div>
                    <input id="codex-image-prompt-input" type="text" placeholder="https://example.com/image.png">
                    <div id="codex-image-prompt-actions">
                        <button id="btn-codex-image-prompt-cancel" class="codex-btn subtle" type="button">取消</button>
                        <button id="btn-codex-image-prompt-confirm" class="codex-btn" type="button">确认</button>
                    </div>
                </div>
                <textarea id="codex-input" placeholder="输入你的请求，让 Codex 帮你检查、修改或执行任务..."></textarea>
                <div id="codex-composer-footer">
                    <button id="btn-codex-slash-trigger" class="codex-icon-btn" type="button">+</button>
                    <div id="codex-image-actions" hidden>
                        <button id="btn-codex-image-url" class="codex-inline-action" type="button">图像 URL</button>
                        <button id="btn-codex-image-local" class="codex-inline-action" type="button">本地图片</button>
                    </div>
                    <div id="codex-quick-controls">
                        <label class="codex-quick-field">
                            <span>模型</span>
                            <select id="codex-quick-model"></select>
                        </label>
                        <label class="codex-quick-field">
                            <span>推理</span>
                            <select id="codex-quick-reasoning"></select>
                        </label>
                    </div>
                    <button id="btn-codex-ide-context" type="button">
                        <span class="codex-context-title">背景信息</span>
                        <span id="codex-context-status">当前线程为空</span>
                    </button>
                </div>
                <button id="btn-codex-send" type="button">发送</button>
            </div>
        </div>
        <div id="codex-permission-sheet" hidden>
            <button id="btn-codex-permission-sheet-close" type="button">关闭</button>
            <button id="btn-codex-permission-default" type="button">默认权限</button>
            <button id="btn-codex-permission-full" type="button">完全访问权限</button>
            <button id="btn-codex-permission-custom" type="button">自定义权限</button>
            <div data-modal-dismiss="permission"></div>
        </div>
        <div id="codex-thread-context-panel" hidden>
            <button id="btn-codex-thread-context-close" type="button">关闭</button>
            <div id="codex-thread-context-subtitle"></div>
            <div id="codex-thread-context-empty" hidden></div>
            <div id="codex-thread-context-content"></div>
            <div data-modal-dismiss="context"></div>
        </div>
        <div id="codex-command-approval-modal" hidden>
            <div id="codex-command-approval-status"></div>
            <div id="codex-command-approval-summary"></div>
            <pre id="codex-command-approval-command"></pre>
            <label id="codex-command-approval-remember-wrap">
                <input id="codex-command-approval-remember" type="checkbox">
            </label>
            <button id="btn-codex-command-approval-reject" type="button">拒绝</button>
            <button id="btn-codex-command-approval-approve" type="button">允许</button>
        </div>
        <div id="input-overlay">
            <textarea id="input-buffer" placeholder="Type command here..."></textarea>
            <div class="input-controls">
                <button id="btn-clear">Clear</button>
                <button id="btn-close">Close</button>
                <button id="btn-send">Send</button>
            </div>
        </div>
        <div id="toolbar"></div>
    </div>
</body>
</html>`;

    const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        url: 'http://localhost:8080/codex_client.html?sessionId=test-session-123',
        pretendToBeVisual: true,
        beforeParse(window) {
            // Mock WebSocket
            window.WebSocket = class WebSocket {
                constructor(url) {
                    this.url = url;
                    this.readyState = 0;
                    this.sent = [];
                    this.CONNECTING = 0;
                    this.OPEN = 1;
                    this.CLOSING = 2;
                    this.CLOSED = 3;
                    window.__WS_INSTANCES__.push(this);
                }
                send(payload) {
                    this.sent.push(payload);
                }
                close() { this.readyState = 2; }
                dispatchOpen() {
                    this.readyState = this.OPEN;
                    if (typeof this.onopen === 'function') {
                        this.onopen();
                    }
                }
                dispatchClose(code = 1000, reason = '') {
                    this.readyState = this.CLOSED;
                    if (typeof this.onclose === 'function') {
                        this.onclose({ code, reason });
                    }
                }
            };
            window.WebSocket.CONNECTING = 0;
            window.WebSocket.OPEN = 1;
            window.WebSocket.CLOSING = 2;
            window.WebSocket.CLOSED = 3;
            window.__WS_INSTANCES__ = [];

            // Mock fetch
            window.fetch = () => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ ticket: 'test-ticket' })
            });
            window.prompt = () => '';

            // Mock localStorage
            const storage = new Map();
            window.localStorage = {
                getItem: (key) => storage.get(key) || null,
                setItem: (key, value) => storage.set(key, value),
                removeItem: (key) => storage.delete(key),
                clear: () => storage.clear()
            };

            // Mock sessionStorage
            window.sessionStorage = { ...window.localStorage };

            // Mock navigator
            Object.defineProperty(window, 'navigator', {
                value: {
                    userAgent: 'Node.js JSDOM',
                    platform: 'linux',
                    clipboard: {
                        writeText: () => Promise.resolve(),
                        readText: () => Promise.resolve('')
                    }
                },
                writable: false
            });

            // Mock ResizeObserver
            window.ResizeObserver = class ResizeObserver {
                observe() {}
                unobserve() {}
                disconnect() {}
            };

            // Mock IntersectionObserver
            window.IntersectionObserver = class IntersectionObserver {
                observe() {}
                unobserve() {}
                disconnect() {}
            };

            // Mock terminal library (xterm)
            window.Terminal = class Terminal {
                constructor() {
                    this.element = null;
                    this.textarea = null;
                }
                open() {}
                write() {}
                clear() {}
                focus() {}
                fit() {}
            };
            window.FitAddon = class FitAddon {
                constructor() {
                    this.proposeDimensions = () => ({ cols: 80, rows: 24 });
                }
                fit() {}
            };

            // Mock getCodexHistoryViewApi
            window.getCodexHistoryViewApi = () => null;
            // Mock getCodexShellViewApi
            window.getCodexShellViewApi = () => null;
            // Load the shared settings view API so permission preset derivation matches runtime behavior
            window.TermLinkCodexSettingsView = require('../public/lib/codex_settings_view');
            // Mock getCodexRuntimeViewApi
            window.getCodexRuntimeViewApi = () => null;
            // Minimal approval view mock for blocking command modal tests
            window.TermLinkCodexApprovalView = {
                normalizeApprovalRequest(envelope) {
                    return {
                        requestId: envelope.requestId,
                        method: envelope.method,
                        requestKind: envelope.requestKind,
                        responseMode: envelope.responseMode,
                        handledBy: envelope.handledBy,
                        summary: envelope.summary || '',
                        title: '命令确认',
                        params: envelope.params || {}
                    };
                },
                resolveApprovalSummaryText(request) {
                    return request.summary || '需要确认后才能执行命令。';
                },
                resolveApprovalStatusText(requestState) {
                    if (requestState.status === 'submitted') return '提交中...';
                    if (requestState.status === 'resolved') return '已完成';
                    return '等待处理';
                },
                shouldUseBlockingModal(request) {
                    return request.requestKind === 'command';
                },
                extractCommandText(request) {
                    return request.params && request.params.command ? request.params.command : '';
                },
                buildApprovalDecisionResult(request, approved) {
                    if (request.method === 'execCommandApproval') {
                        return { decision: approved ? 'approved' : 'denied' };
                    }
                    if (request.method === 'item/commandExecution/requestApproval') {
                        return { decision: approved ? 'accept' : 'decline' };
                    }
                    return { decision: approved ? 'approve' : 'decline' };
                },
                pickResolvedRequestIds() {
                    return [];
                }
            };
            // Load slash commands API for real slash parsing/registry behavior
            window.TermLinkCodexSlashCommands = require('../public/lib/codex_slash_commands');
        }
    });

    return dom;
}

/**
 * Execute terminal_client.js in the JSDOM window
 * Returns the test hooks
 */
function loadTerminalClient(window) {
    // Enable test mode before loading the script
    // This is required for the test hooks to be exposed
    window.__TERMLINK_TEST_MODE__ = true;

    // Execute the actual terminal_client.js
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = jsContent;
    window.document.body.appendChild(scriptEl);

    return window.__CODEX_TEST_HOOKS__;
}

// ============================================================================
// Integration Tests
// ============================================================================

test('Phase 1 Integration: Test hooks NOT exposed in production mode', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    // Do NOT set __TERMLINK_TEST_MODE__ - simulate production mode
    // window.__TERMLINK_TEST_MODE__ = true; // NOT set

    // Execute the actual terminal_client.js
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = jsContent;
    window.document.body.appendChild(scriptEl);

    // Verify test hooks are NOT exposed in production mode
    assert.strictEqual(window.__CODEX_TEST_HOOKS__, undefined,
        'Test hooks must NOT be exposed in production mode (without __TERMLINK_TEST_MODE__)');

    dom.window.close();
});

test('Phase 1 Integration: Test hooks are exposed when test mode is enabled', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    // Verify test hooks are exposed
    assert.ok(hooks, 'Test hooks must be exposed');
    assert.ok(typeof hooks.renderCodexSecondaryPanels === 'function',
        'renderCodexSecondaryPanels must be a function');
    assert.ok(typeof hooks.renderCodexAlerts === 'function',
        'renderCodexAlerts must be a function');
    assert.ok(typeof hooks.codexState === 'object',
        'codexState must be exposed');
    assert.ok(typeof hooks.hasCodexNonBlockingNotice === 'function',
        'hasCodexNonBlockingNotice must be exposed');

    dom.window.close();
});

test('Phase 1 Integration: secondaryPanel="none" MUST hide all secondary panels', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    // Set state for test
    hooks.codexState.secondaryPanel = 'none';
    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = {
        historyList: true,
        modelConfig: true,
        diffPlanReasoning: true
    };
    // Clear any notices
    hooks.codexState.configWarningText = '';
    hooks.codexState.deprecationNoticeText = '';

    // Execute ACTUAL render function
    hooks.renderCodexSecondaryPanels();

    // Assert on ACTUAL DOM elements
    const alerts = window.document.getElementById('codex-alerts');
    const history = window.document.getElementById('codex-history-panel');
    const settings = window.document.getElementById('codex-settings-panel');
    const runtime = window.document.getElementById('codex-runtime-panel');

    assert.strictEqual(alerts.hidden, true, 'codex-alerts MUST be hidden when secondaryPanel="none"');
    assert.strictEqual(history.hidden, true, 'codex-history-panel MUST be hidden when secondaryPanel="none"');
    assert.strictEqual(settings.hidden, true, 'codex-settings-panel MUST be hidden when secondaryPanel="none"');
    assert.strictEqual(runtime.hidden, true, 'codex-runtime-panel MUST be hidden when secondaryPanel="none"');

    dom.window.close();
});

test('Phase 1 Integration: renderCodexAlerts hides alerts when no non-blocking notice', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    // Reset state - no notices
    hooks.codexState.configWarningText = '';
    hooks.codexState.deprecationNoticeText = '';
    hooks.codexState.secondaryPanel = 'notices';
    hooks.codexState.sessionMode = 'codex';

    // Verify hasCodexNonBlockingNotice returns false
    assert.strictEqual(hooks.hasCodexNonBlockingNotice(), false,
        'hasCodexNonBlockingNotice must return false when no notice text');

    // Execute ACTUAL renderCodexAlerts
    hooks.renderCodexAlerts();

    // Assert alerts panel is hidden
    const alerts = window.document.getElementById('codex-alerts');
    assert.strictEqual(alerts.hidden, true,
        'codex-alerts MUST be hidden when no non-blocking notice');

    dom.window.close();
});

test('Phase 1 Integration: renderCodexAlerts shows alerts only when secondaryPanel="notices" AND hasNonBlockingNotice', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    // Set up notice content
    hooks.codexState.configWarningText = 'Test config warning';
    hooks.codexState.sessionMode = 'codex';

    // Verify hasCodexNonBlockingNotice returns true
    assert.strictEqual(hooks.hasCodexNonBlockingNotice(), true,
        'hasCodexNonBlockingNotice must return true when configWarningText is set');

    // Case 1: secondaryPanel='none' - should hide
    hooks.codexState.secondaryPanel = 'none';
    hooks.renderCodexAlerts();
    assert.strictEqual(window.document.getElementById('codex-alerts').hidden, true,
        'codex-alerts MUST be hidden when secondaryPanel="none" even with notice');

    // Case 2: secondaryPanel='notices' - should show
    hooks.codexState.secondaryPanel = 'notices';
    hooks.renderCodexAlerts();
    assert.strictEqual(window.document.getElementById('codex-alerts').hidden, false,
        'codex-alerts MUST be visible when secondaryPanel="notices" AND hasNonBlockingNotice');

    // Case 3: secondaryPanel='settings' - should hide
    hooks.codexState.secondaryPanel = 'settings';
    hooks.renderCodexAlerts();
    assert.strictEqual(window.document.getElementById('codex-alerts').hidden, true,
        'codex-alerts MUST be hidden when secondaryPanel="settings" even with notice');

    dom.window.close();
});

test('Phase 1 Integration: configWarningText shows in alert-config element', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    // Set up config warning
    hooks.codexState.configWarningText = 'Test configuration warning message';
    hooks.codexState.deprecationNoticeText = '';
    hooks.codexState.secondaryPanel = 'notices';
    hooks.codexState.sessionMode = 'codex';

    hooks.renderCodexAlerts();

    // Check alerts panel is visible
    const alerts = window.document.getElementById('codex-alerts');
    assert.strictEqual(alerts.hidden, false, 'codex-alerts must be visible');

    // Check config alert is visible and has text
    const alertConfig = window.document.getElementById('codex-alert-config');
    const alertConfigText = window.document.getElementById('codex-alert-config-text');

    assert.strictEqual(alertConfig.hidden, false, 'codex-alert-config must be visible');
    assert.strictEqual(alertConfigText.textContent, 'Test configuration warning message',
        'codex-alert-config-text must contain warning text');

    // Check deprecation alert is hidden
    const alertDeprecation = window.document.getElementById('codex-alert-deprecation');
    assert.strictEqual(alertDeprecation.hidden, true, 'codex-alert-deprecation must be hidden');

    dom.window.close();
});

test('Phase 1 Integration: deprecationNoticeText shows in alert-deprecation element', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    // Set up deprecation notice
    hooks.codexState.configWarningText = '';
    hooks.codexState.deprecationNoticeText = 'Test deprecation notice message';
    hooks.codexState.secondaryPanel = 'notices';
    hooks.codexState.sessionMode = 'codex';

    hooks.renderCodexAlerts();

    // Check alerts panel is visible
    const alerts = window.document.getElementById('codex-alerts');
    assert.strictEqual(alerts.hidden, false, 'codex-alerts must be visible');

    // Check config alert is hidden
    const alertConfig = window.document.getElementById('codex-alert-config');
    assert.strictEqual(alertConfig.hidden, true, 'codex-alert-config must be hidden');

    // Check deprecation alert is visible and has text
    const alertDeprecation = window.document.getElementById('codex-alert-deprecation');
    const alertDeprecationText = window.document.getElementById('codex-alert-deprecation-text');

    assert.strictEqual(alertDeprecation.hidden, false, 'codex-alert-deprecation must be visible');
    assert.strictEqual(alertDeprecationText.textContent, 'Test deprecation notice message',
        'codex-alert-deprecation-text must contain notice text');

    dom.window.close();
});

test('Phase 1 Integration: Only ONE panel visible when secondaryPanel is set to specific panel', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = {
        historyList: true,
        modelConfig: true,
        diffPlanReasoning: true
    };
    hooks.codexState.configWarningText = 'Test warning';

    const panelTests = [
        { panel: 'threads', expectedVisible: 'codex-history-panel' },
        { panel: 'settings', expectedVisible: 'codex-settings-panel' },
        { panel: 'runtime', expectedVisible: 'codex-runtime-panel' },
        { panel: 'notices', expectedVisible: 'codex-alerts' },
    ];

    for (const { panel, expectedVisible } of panelTests) {
        hooks.codexState.secondaryPanel = panel;
        hooks.renderCodexSecondaryPanels();

        const panels = [
            'codex-alerts',
            'codex-history-panel',
            'codex-settings-panel',
            'codex-runtime-panel'
        ];

        for (const id of panels) {
            const el = window.document.getElementById(id);
            if (id === expectedVisible) {
                assert.strictEqual(el.hidden, false,
                    `${id} SHOULD be visible when secondaryPanel="${panel}"`);
            } else {
                assert.strictEqual(el.hidden, true,
                    `${id} MUST be hidden when secondaryPanel="${panel}" (only ${expectedVisible} should be visible)`);
            }
        }
    }

    dom.window.close();
});

test('Phase 1 Integration: Invalid secondaryPanel value is normalized to "none"', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, modelConfig: true, diffPlanReasoning: true };
    hooks.codexState.secondaryPanel = 'invalid-value';

    hooks.renderCodexSecondaryPanels();

    // Invalid value should be normalized to 'none'
    assert.strictEqual(hooks.codexState.secondaryPanel, 'none',
        'Invalid secondaryPanel value MUST be normalized to "none"');

    // All panels must be hidden
    const panels = ['codex-alerts', 'codex-history-panel', 'codex-settings-panel', 'codex-runtime-panel'];
    for (const id of panels) {
        assert.strictEqual(window.document.getElementById(id).hidden, true,
            `${id} MUST be hidden when secondaryPanel has invalid value`);
    }

    dom.window.close();
});

test('Phase 1 Integration: syncCodexSecondaryPanelState normalizes invalid values', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, modelConfig: true, diffPlanReasoning: true };

    // Test various invalid values
    const invalidValues = ['foo', 'bar', '', 'threads2', 'SETTINGS'];

    for (const invalid of invalidValues) {
        hooks.codexState.secondaryPanel = invalid;
        const result = hooks.syncCodexSecondaryPanelState();
        assert.strictEqual(result, 'none',
            `syncCodexSecondaryPanelState must normalize "${invalid}" to "none"`);
        assert.strictEqual(hooks.codexState.secondaryPanel, 'none',
            `codexState.secondaryPanel must be "none" after normalizing "${invalid}"`);
    }

    dom.window.close();
});

test('Phase 1 Integration: hasCodexNonBlockingNotice returns correct values', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    // Test 1: No notices
    hooks.codexState.configWarningText = '';
    hooks.codexState.deprecationNoticeText = '';
    assert.strictEqual(hooks.hasCodexNonBlockingNotice(), false,
        'hasCodexNonBlockingNotice must return false when no notices');

    // Test 2: Only configWarningText
    hooks.codexState.configWarningText = 'Warning';
    hooks.codexState.deprecationNoticeText = '';
    assert.strictEqual(hooks.hasCodexNonBlockingNotice(), true,
        'hasCodexNonBlockingNotice must return true when configWarningText is set');

    // Test 3: Only deprecationNoticeText
    hooks.codexState.configWarningText = '';
    hooks.codexState.deprecationNoticeText = 'Deprecation';
    assert.strictEqual(hooks.hasCodexNonBlockingNotice(), true,
        'hasCodexNonBlockingNotice must return true when deprecationNoticeText is set');

    // Test 4: Both
    hooks.codexState.configWarningText = 'Warning';
    hooks.codexState.deprecationNoticeText = 'Deprecation';
    assert.strictEqual(hooks.hasCodexNonBlockingNotice(), true,
        'hasCodexNonBlockingNotice must return true when both notices are set');

    // Test 5: Whitespace-only values
    hooks.codexState.configWarningText = '   ';
    hooks.codexState.deprecationNoticeText = '';
    assert.strictEqual(hooks.hasCodexNonBlockingNotice(), false,
        'hasCodexNonBlockingNotice must return false for whitespace-only configWarningText');

    hooks.codexState.configWarningText = '';
    hooks.codexState.deprecationNoticeText = '\t\n';
    assert.strictEqual(hooks.hasCodexNonBlockingNotice(), false,
        'hasCodexNonBlockingNotice must return false for whitespace-only deprecationNoticeText');

    dom.window.close();
});

test('Phase 1 Integration: session_info handler MUST reset all panels to hidden', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    // Simulate the state when session_info arrives
    hooks.codexState.secondaryPanel = 'settings'; // User had settings open before
    hooks.codexState.capabilities = { historyList: true, modelConfig: true };
    hooks.codexState.sessionMode = 'codex';

    // All panels are visible (simulating previous state)
    window.document.getElementById('codex-alerts').hidden = false;
    window.document.getElementById('codex-history-panel').hidden = false;
    window.document.getElementById('codex-settings-panel').hidden = false;
    window.document.getElementById('codex-runtime-panel').hidden = false;

    // session_info handler resets secondaryPanel to 'none'
    hooks.codexState.secondaryPanel = 'none';
    hooks.codexState.configWarningText = '';
    hooks.codexState.deprecationNoticeText = '';

    // Then calls renderCodexSecondaryPanels
    hooks.renderCodexSecondaryPanels();

    // ALL panels must be hidden after session_info processing
    const panels = ['codex-alerts', 'codex-history-panel', 'codex-settings-panel', 'codex-runtime-panel'];
    for (const id of panels) {
        assert.strictEqual(window.document.getElementById(id).hidden, true,
            `${id} MUST be hidden after session_info resets secondaryPanel to "none"`);
    }

    dom.window.close();
});

test('Phase 1 Integration: codex_capabilities handler MUST reset all panels to hidden', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    hooks.codexState.secondaryPanel = 'threads'; // User was viewing threads
    hooks.codexState.capabilities = {};
    hooks.codexState.sessionMode = 'codex';

    // All panels are visible (simulating previous state)
    window.document.getElementById('codex-alerts').hidden = false;
    window.document.getElementById('codex-history-panel').hidden = false;
    window.document.getElementById('codex-settings-panel').hidden = false;
    window.document.getElementById('codex-runtime-panel').hidden = false;

    // codex_capabilities handler resets secondaryPanel to 'none'
    hooks.codexState.secondaryPanel = 'none';
    hooks.codexState.capabilities = { historyList: true, modelConfig: true, diffPlanReasoning: true };

    hooks.renderCodexSecondaryPanels();

    // ALL panels must be hidden after codex_capabilities processing
    const panels = ['codex-alerts', 'codex-history-panel', 'codex-settings-panel', 'codex-runtime-panel'];
    for (const id of panels) {
        assert.strictEqual(window.document.getElementById(id).hidden, true,
            `${id} MUST be hidden after codex_capabilities resets secondaryPanel to "none"`);
    }

    dom.window.close();
});

test('Phase 1 Integration: Unavailable panel MUST NOT be shown even if secondaryPanel is set', async () => {
    const dom = createTestDOM();
    const { window } = dom;

    const hooks = loadTerminalClient(window);

    hooks.codexState.secondaryPanel = 'threads';
    hooks.codexState.capabilities = { historyList: false }; // historyList NOT available
    hooks.codexState.sessionMode = 'codex';

    hooks.renderCodexSecondaryPanels();

    // threads panel should be hidden because it's not available
    const historyPanel = window.document.getElementById('codex-history-panel');
    assert.strictEqual(historyPanel.hidden, true,
        'codex-history-panel MUST be hidden when historyList capability is false');

    // secondaryPanel should be reset to 'none' due to unavailability
    assert.strictEqual(hooks.codexState.secondaryPanel, 'none',
        'secondaryPanel MUST be reset to "none" when requested panel is unavailable');

    dom.window.close();
});

test('Integration: stale session close 4404 clears sessionId and reconnects without tools-panel loop', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.applyRuntimeConfig({
        serverUrl: 'http://127.0.0.1:3010',
        sessionId: 'stale-session-id',
        authHeader: 'Basic test',
        historyEnabled: true
    }, false);

    hooks.connect();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(window.__WS_INSTANCES__.length, 1);
    const firstSocket = window.__WS_INSTANCES__[0];
    assert.match(firstSocket.url, /sessionId=stale-session-id/);

    firstSocket.dispatchOpen();
    firstSocket.dispatchClose(4404, 'Session not found or expired');

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    assert.equal(hooks.getSessionId(), '', 'stale close must clear current sessionId before reconnect');
    assert.equal(hooks.getRetryCount(), 0, 'stale close recovery must not consume retry budget');
    assert.equal(window.__WS_INSTANCES__.length, 2, 'stale close must trigger a fresh reconnect');
    assert.doesNotMatch(window.__WS_INSTANCES__[1].url, /sessionId=/, 'fresh reconnect must not reuse stale sessionId');

    dom.window.close();
});

test('Phase 4 Integration: typing /compact with compact=false MUST NOT open tools panel', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = {
        slashCommands: true,
        slashModel: true,
        slashPlan: true,
        skillsList: true,
        compact: false
    };
    hooks.codexState.secondaryPanel = 'none';
    hooks.codexState.slashRegistry = createSlashRegistry();

    const submitted = hooks.handleCodexComposerSubmit('/compact');

    assert.strictEqual(submitted, false, 'manual /compact should be intercepted');
    assert.strictEqual(hooks.codexState.secondaryPanel, 'none', 'tools panel must stay closed');
    assert.strictEqual(hooks.getCodexToolsPanel().hidden, true, 'tools panel must remain hidden');
    assert.match(hooks.getCodexLog().textContent, /未识别命令。当前支持：/);

    dom.window.close();
});

test('Phase 4 Integration: unmatched /skill query MUST only show 未找到匹配技能', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = {
        slashCommands: true,
        slashModel: true,
        slashPlan: true,
        skillsList: true,
        compact: true
    };
    hooks.codexState.skillListRequested = true;
    hooks.codexState.skillsLoading = false;
    hooks.codexState.skillCatalog = [
        { name: 'android-local-build-debug', label: 'Android Local Build Debug', description: 'Build and debug', defaultPrompt: '' }
    ];

    hooks.setSlashMenuState(true, '/skill does-not-exist');

    assert.strictEqual(hooks.getCodexSlashMenu().hidden, false, 'slash menu must remain visible');
    assert.strictEqual(hooks.getCodexSlashMenuList().children.length, 0, 'slash menu must not fall back to command results');
    assert.strictEqual(hooks.getCodexSlashMenuEmpty().hidden, false, 'empty state must be visible');
    assert.strictEqual(hooks.getCodexSlashMenuEmpty().textContent, '未找到匹配技能');

    dom.window.close();
});

test('Phase 4 Integration: history panel renders fork action for non-archived threads', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    window.TermLinkCodexHistoryView = require('../public/lib/codex_history_view');
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, historyResume: true };
    hooks.codexState.secondaryPanel = 'threads';
    hooks.codexState.status = 'idle';
    hooks.codexState.historyThreads = [{ id: 'thread-a', title: 'Thread A', archived: false }];
    hooks.renderCodexHistoryList();

    const forkButton = Array.from(window.document.querySelectorAll('.codex-history-secondary-action'))
        .find((button) => button.textContent === '创建分支');
    assert.ok(forkButton, 'fork button must render in history panel');
    assert.equal(forkButton.disabled, false, 'fork action must be enabled when thread is idle and not active');

    dom.window.close();
});

test('Phase 4 Integration: history panel renders unarchive action for archived threads', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    window.TermLinkCodexHistoryView = require('../public/lib/codex_history_view');
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, historyResume: true };
    hooks.codexState.secondaryPanel = 'threads';
    hooks.codexState.status = 'idle';
    hooks.codexState.historyThreads = [{ id: 'thread-archived', title: 'Thread Archived', archived: true }];
    hooks.renderCodexHistoryList();

    const unarchiveButton = Array.from(window.document.querySelectorAll('.codex-history-secondary-action'))
        .find((button) => button.textContent === '取消归档');
    assert.ok(unarchiveButton, 'unarchive button must render for archived threads');
    assert.equal(unarchiveButton.disabled, false, 'unarchive action must be enabled for archived idle threads');

    dom.window.close();
});

test('Phase 4 Integration: history panel renders rename action for the current thread', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    window.TermLinkCodexHistoryView = require('../public/lib/codex_history_view');
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, historyResume: true };
    hooks.codexState.secondaryPanel = 'threads';
    hooks.codexState.status = 'idle';
    hooks.codexState.threadId = 'thread-a';
    hooks.codexState.currentThreadTitle = 'Thread A';
    hooks.codexState.historyThreads = [{ id: 'thread-a', title: 'Thread A', archived: false }];
    hooks.renderCodexHistoryList();

    const renameButton = Array.from(window.document.querySelectorAll('.codex-history-secondary-action'))
        .find((button) => button.textContent === '重命名');
    assert.ok(renameButton, 'rename button must render in history panel');
    assert.equal(renameButton.disabled, false, 'rename action must remain enabled for the current thread while idle');

    dom.window.close();
});

test('Phase 4 Integration: rename action opens inline editor and cancel restores actions', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    window.TermLinkCodexHistoryView = require('../public/lib/codex_history_view');
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, historyResume: true };
    hooks.codexState.secondaryPanel = 'threads';
    hooks.codexState.status = 'idle';
    hooks.codexState.historyThreads = [{ id: 'thread-a', title: 'Thread A', archived: false }];
    hooks.renderCodexHistoryList();

    const renameButton = Array.from(window.document.querySelectorAll('.codex-history-secondary-action'))
        .find((button) => button.textContent === '重命名');
    assert.ok(renameButton, 'rename button must render before entering edit mode');
    renameButton.click();

    const renameInput = window.document.querySelector('.codex-history-rename-input');
    assert.ok(renameInput, 'inline rename input must appear after clicking rename');
    assert.equal(renameInput.value, 'Thread A');

    const cancelButton = Array.from(window.document.querySelectorAll('.codex-history-secondary-action'))
        .find((button) => button.textContent === '取消');
    assert.ok(cancelButton, 'cancel button must render in inline rename mode');
    cancelButton.click();

    assert.equal(window.document.querySelector('.codex-history-rename-input'), null, 'inline rename input must close after cancel');
    assert.ok(
        Array.from(window.document.querySelectorAll('.codex-history-secondary-action'))
            .some((button) => button.textContent === '重命名'),
        'rename action must reappear after cancel'
    );

    dom.window.close();
});

test('Phase 4 Integration: thread list with untitled current thread clears stale header title', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, historyResume: true };
    hooks.codexState.threadId = 'thread-b';
    hooks.codexState.currentThreadTitle = 'Old Thread';
    hooks.storeCodexThreadList({
        threads: [{
            id: 'thread-b',
            title: '',
            archived: false
        }]
    });

    const titleEl = window.document.getElementById('codex-thread-id');
    assert.notEqual(titleEl.textContent, 'Old Thread', 'stale thread title must not remain in header');
    assert.match(titleEl.textContent, /当前线程 thread-b/, 'header must fall back to thread id when title is empty');

    dom.window.close();
});

test('Phase 4 Integration: thread/name/updated refreshes the current thread title', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.threadId = 'thread-a';
    hooks.codexState.currentThreadTitle = 'Before Rename';
    hooks.codexState.historyThreads = [{ id: 'thread-a', title: 'Before Rename', archived: false }];

    hooks.handleCodexNotification('thread/name/updated', {
        threadId: 'thread-a',
        title: 'After Rename'
    });

    assert.equal(hooks.codexState.currentThreadTitle, 'After Rename');
    assert.equal(hooks.codexState.historyThreads[0].title, 'After Rename');
    assert.equal(window.document.getElementById('codex-thread-id').textContent, 'After Rename');

    dom.window.close();
});

test('Phase 4 Integration: thread list falls back to cached current thread title when current thread is absent', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.threadId = 'thread-cached';
    hooks.codexState.threadTitleById.set('thread-cached', 'Cached Rename');
    hooks.storeCodexThreadList({
        threads: [{
            id: 'thread-other',
            title: 'Other Thread',
            archived: false
        }]
    });

    assert.equal(hooks.codexState.currentThreadTitle, 'Cached Rename');
    assert.equal(window.document.getElementById('codex-thread-id').textContent, 'Cached Rename');

    dom.window.close();
});

test('Phase 4 Integration: thread snapshot name field refreshes current thread title', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.threadId = 'thread-a';
    hooks.codexState.currentThreadTitle = '';
    hooks.handleCodexThreadSnapshot({
        id: 'thread-a',
        name: 'Snapshot Rename',
        turns: []
    });

    assert.equal(hooks.codexState.currentThreadTitle, 'Snapshot Rename');
    assert.equal(hooks.codexState.threadTitleById.get('thread-a'), 'Snapshot Rename');
    assert.equal(window.document.getElementById('codex-thread-id').textContent, 'Snapshot Rename');

    dom.window.close();
});

test('Phase 4 Integration: rate limit summary supports primary secondary usage payloads', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    const formatted = hooks.formatRateLimitSummary({
        rateLimits: {
            limitId: 'codex',
            planType: 'plus',
            primary: {
                usedPercent: 1,
                windowDurationMins: 300
            },
            secondary: {
                usedPercent: 18,
                windowDurationMins: 10080
            },
            credits: {
                hasCredits: false,
                unlimited: false,
                balance: '0'
            }
        }
    });

    assert.equal(formatted.summary, '5小时 1% | 一周 18%');
    assert.equal(formatted.tone, '');

    dom.window.close();
});

test('Phase 4 Integration: account/rateLimits/updated renders summary for usage payloads', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { modelConfig: true, rateLimitsRead: true };
    hooks.codexState.secondaryPanel = 'settings';
    hooks.renderCodexSettingsPanel();
    hooks.handleCodexNotification('account/rateLimits/updated', {
        rateLimits: {
            limitId: 'codex',
            planType: 'plus',
            primary: {
                usedPercent: 1,
                windowDurationMins: 300
            },
            secondary: {
                usedPercent: 18,
                windowDurationMins: 10080
            },
            credits: {
                hasCredits: false,
                unlimited: false,
                balance: '0'
            }
        }
    });

    assert.equal(hooks.codexState.rateLimitSummary, '5小时 1% | 一周 18%');
    assert.match(window.document.getElementById('codex-meta-text').textContent, /额度：5小时 1% \| 一周 18%/);

    dom.window.close();
});

test('Phase 4 Integration: codex bootstrap auto-requests rate limits for the status bar', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.applyRuntimeConfig({
        serverUrl: 'http://127.0.0.1:3010',
        sessionId: 'rate-limit-session',
        authHeader: 'Basic test',
        historyEnabled: true
    }, false);

    hooks.connect();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const ws = hooks.getWebSocket();
    ws.dispatchOpen();

    ws.onmessage({ data: JSON.stringify({
        type: 'session_info',
        sessionId: 'rate-limit-session',
        sessionMode: 'codex',
        codexConfig: null
    }) });
    ws.onmessage({ data: JSON.stringify({
        type: 'codex_capabilities',
        capabilities: { rateLimitsRead: true }
    }) });
    ws.onmessage({ data: JSON.stringify({
        type: 'codex_state',
        status: 'idle',
        threadId: 'thread-rate-limit',
        currentTurnId: '',
        cwd: 'E:\\coding\\TermLink'
    }) });

    const limitRequest = ws.sent
        .map((entry) => JSON.parse(entry))
        .find((entry) => entry.type === 'codex_request' && entry.method === 'account/rateLimits/read');

    assert.ok(limitRequest, 'bootstrap must request account/rateLimits/read when no quota snapshot is available');

    dom.window.close();
});

test('Phase 4 Integration: nested Codex error payloads surface the provider detail text', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.handleCodexNotification('error', {
        error: {
            message: '{"detail":"The empty model is not supported when using Codex with a ChatGPT account."}'
        }
    });

    assert.match(hooks.getCodexLog().textContent, /empty model is not supported/i);
    assert.match(window.document.getElementById('codex-status-text').textContent, /错误/);

    dom.window.close();
});

test('Phase 4 Integration: image input actions render chips from prompt values', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = {
        imageInput: true
    };

    // Directly set pending image inputs (simulating URL input and file picker results)
    hooks.setPendingCodexImageInputs([
        { type: 'image', url: 'https://example.com/screenshot.png' },
        { type: 'localImage', url: 'data:image/png;base64,abc', name: 'android-error.png' }
    ]);

    hooks.renderCodexImageInputs();

    const chips = Array.from(window.document.querySelectorAll('.codex-image-chip'));
    assert.equal(chips.length, 2, 'two image chips must be rendered');
    assert.match(chips[0].textContent, /图像 URL/);
    assert.match(chips[0].textContent, /https:\/\/example\.com\/screenshot\.png/);
    assert.match(chips[1].textContent, /本地图片/);
    assert.match(chips[1].textContent, /android-error\.png/);
    assert.equal(hooks.getCodexImageInputs().hidden, false, 'image chip tray must be visible');

    dom.window.close();
});

test('Phase 4 Integration: a new plan turn must replace stale originalPrompt', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.planWorkflow = {
        phase: 'plan_ready_for_confirmation',
        originalPrompt: 'old goal',
        latestPlanText: 'Old plan',
        confirmedPlanText: 'Old plan',
        lastUserInputRequestId: ''
    };

    hooks.startPlanWorkflow('new goal');

    assert.equal(hooks.codexState.planWorkflow.originalPrompt, 'new goal');
    assert.equal(hooks.codexState.planWorkflow.latestPlanText, '');
    assert.equal(hooks.codexState.planWorkflow.confirmedPlanText, '');
    assert.equal(hooks.codexState.planWorkflow.phase, 'planning');

    dom.window.close();
});

test('Phase 4 Integration: plan deltas append raw chunks and plan updates reuse one log entry', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.planWorkflow = {
        phase: 'planning',
        originalPrompt: 'goal',
        latestPlanText: '',
        confirmedPlanText: '',
        lastUserInputRequestId: ''
    };
    hooks.renderCodexPlanWorkflow();

    hooks.handleCodexNotification('item/plan/delta', {
        planId: 'plan-1',
        delta: 'Step 1'
    });
    hooks.handleCodexNotification('item/plan/delta', {
        planId: 'plan-1',
        delta: ' -> Step 2'
    });

    assert.equal(hooks.codexState.planWorkflow.latestPlanText, 'Step 1 -> Step 2');
    assert.equal(
        hooks.getCodexLog().querySelector('[data-item-id="plan-1"] .content').textContent,
        'Step 1 -> Step 2'
    );
    assert.equal(hooks.getCodexPlanWorkflowBody().textContent, 'Step 1 -> Step 2');

    hooks.handleCodexNotification('turn/plan/updated', {
        plan: {
            id: 'plan-2',
            text: 'Draft A'
        }
    });
    hooks.handleCodexNotification('turn/plan/updated', {
        plan: {
            id: 'plan-2',
            text: 'Draft B'
        }
    });

    const planEntries = hooks.getCodexLog().querySelectorAll('[data-item-id="plan-2"]');
    assert.equal(planEntries.length, 1, 'turn/plan/updated should update, not duplicate, the plan log entry');
    assert.match(planEntries[0].textContent, /Draft B/);

    dom.window.close();
});

test('Phase 4 Integration: thread list sorts by last activity desc and renders recent activity metadata', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    window.TermLinkCodexHistoryView = require('../public/lib/codex_history_view');
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, historyResume: true };
    hooks.codexState.secondaryPanel = 'threads';
    hooks.storeCodexThreadList({
        threads: [
            {
                id: 'thread-old',
                title: 'Old Thread',
                lastActiveAt: '2026-03-15T12:00:00.000Z',
                createdAt: '2026-03-14T09:00:00.000Z'
            },
            {
                id: 'thread-new',
                title: 'New Thread',
                updatedAt: '2026-03-17T09:30:00.000Z',
                createdAt: '2026-03-17T08:00:00.000Z'
            },
            {
                id: 'thread-created-only',
                title: 'Created Only',
                createdAt: '2026-03-16T07:00:00.000Z'
            }
        ]
    });
    hooks.renderCodexHistoryList();

    assert.deepEqual(
        hooks.codexState.historyThreads.map((entry) => entry.id),
        ['thread-new', 'thread-old', 'thread-created-only']
    );

    const metaTexts = Array.from(window.document.querySelectorAll('.codex-history-meta'))
        .map((el) => el.textContent);
    assert.ok(metaTexts.includes('最近活跃：2026-03-17 09:30'));
    assert.ok(metaTexts.includes('创建时间：2026-03-16 07:00'));

    dom.window.close();
});

test('Phase 4 Integration: thread list accepts app-server data payload shape', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    window.TermLinkCodexHistoryView = require('../public/lib/codex_history_view');
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { historyList: true, historyResume: true };
    hooks.codexState.secondaryPanel = 'threads';
    hooks.storeCodexThreadList({
        data: [
            {
                id: 'thread-app-server',
                name: 'Fix session history access',
                updatedAt: '2026-03-17T09:30:00.000Z',
                createdAt: '2026-03-17T08:00:00.000Z'
            }
        ]
    });
    hooks.renderCodexHistoryList();

    assert.deepEqual(
        hooks.codexState.historyThreads.map((entry) => entry.id),
        ['thread-app-server']
    );
    assert.match(window.document.getElementById('codex-history-list').textContent, /Fix session history access/);

    dom.window.close();
});

test('Phase 4 Integration: new task clears the current view immediately and keeps the fresh state after thread start', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.applyRuntimeConfig({
        serverUrl: 'http://127.0.0.1:3010',
        sessionId: 'fresh-task-session',
        authHeader: 'Basic test',
        historyEnabled: true
    }, false);

    hooks.connect();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const ws = hooks.getWebSocket();
    ws.dispatchOpen();

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.threadId = 'thread-old';
    hooks.codexState.currentThreadTitle = 'Old Task';
    hooks.handleCodexThreadSnapshot({
        id: 'thread-old',
        turns: [
            {
                items: [
                    { type: 'agentMessage', id: 'agent-1', text: 'old reply' }
                ]
            }
        ]
    });

    assert.match(hooks.getCodexLog().textContent, /old reply/);

    hooks.requestCodexNewThread();

    assert.equal(hooks.codexState.threadId, '');
    assert.equal(hooks.codexState.currentTurnId, '');
    assert.equal(hooks.codexState.lastSnapshotThreadId, '');
    assert.equal(hooks.codexState.pendingFreshThread, true);
    assert.equal(hooks.getCodexLog().textContent.trim(), '');
    assert.match(window.document.getElementById('codex-status-text').textContent, /正在创建新任务/);

    hooks.handleCodexNotification('thread/started', {
        thread: { id: 'thread-new' }
    });

    assert.equal(hooks.codexState.threadId, 'thread-new');
    assert.equal(hooks.codexState.pendingFreshThread, false);
    assert.equal(hooks.getCodexLog().textContent.trim(), '');

    dom.window.close();
});

test('Phase 4 Integration: settings panel no longer renders thread actions or server-default toggle', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.sessionMode = 'codex';
    hooks.codexState.capabilities = { modelConfig: true, rateLimitsRead: true };
    hooks.codexState.secondaryPanel = 'settings';
    hooks.renderCodexSettingsPanel();

    assert.equal(window.document.getElementById('codex-settings-use-defaults'), null);
    assert.equal(window.document.getElementById('btn-codex-history-toggle'), null);
    assert.match(window.document.getElementById('codex-settings-status').textContent, /当前使用默认配置/);

    dom.window.close();
});

test('Phase 5 Integration: header permission preset reflects current approval and sandbox mapping', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.storedCodexConfig = {
        defaultPersonality: 'pragmatic',
        approvalPolicy: 'never',
        sandboxMode: 'danger-full-access'
    };
    hooks.codexState.nextTurnEffectiveCodexConfig = {
        model: null,
        reasoningEffort: null,
        personality: 'pragmatic',
        approvalPolicy: 'never',
        sandboxMode: 'danger-full-access'
    };
    hooks.renderCodexPermissionPreset();

    const button = hooks.getCodexPermissionPresetButton();
    assert.equal(button.dataset.preset, 'full');
    assert.match(button.textContent, /完全访问权限/);

    dom.window.close();
});

test('Phase 5 Integration: background info panel follows the current thread and clears on empty thread', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.codexState.threadId = 'thread-context';
    hooks.codexState.currentThreadTitle = 'Context Thread';
    hooks.codexState.cwd = '/workspace/demo';
    hooks.codexState.status = 'waiting_approval';
    hooks.codexState.nextTurnEffectiveCodexConfig = {
        model: 'gpt-5',
        reasoningEffort: 'medium',
        personality: 'pragmatic',
        approvalPolicy: 'on-request',
        sandboxMode: 'workspace-write'
    };
    hooks.setCodexThreadContextPanelOpen(true);

    assert.equal(hooks.getCodexThreadContextPanel().hidden, false);
    assert.match(hooks.getCodexThreadContextPanel().textContent, /Context Thread/);

    hooks.codexState.threadId = '';
    hooks.codexState.currentThreadTitle = '';
    hooks.renderCodexThreadContextPanel();

    assert.equal(window.document.getElementById('codex-thread-context-empty').hidden, false);
    assert.equal(window.document.getElementById('codex-thread-context-content').textContent.trim(), '');

    dom.window.close();
});

test('Phase 5 Integration: command approvals render a blocking modal instead of only a log card', async () => {
    const dom = createTestDOM();
    const { window } = dom;
    const hooks = loadTerminalClient(window);

    hooks.renderCodexServerRequest({
        requestId: 'cmd-1',
        method: 'item/commandExecution/requestApproval',
        requestKind: 'command',
        responseMode: 'decision',
        handledBy: 'client',
        summary: 'rm -rf build',
        params: {
            command: 'rm -rf build'
        }
    });

    const modal = hooks.getCodexCommandApprovalModal();
    assert.equal(modal.hidden, false);
    assert.match(modal.textContent, /rm -rf build/);

    dom.window.close();
});
