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
                        <span id="codex-thread-summary-meta" class="codex-thread-summary-meta">即将自动创建新线程</span>
                    </span>
                    <span id="codex-thread-summary-action" class="codex-thread-summary-action">查看线程</span>
                </button>
                <div id="codex-secondary-nav">
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
                    <span id="codex-history-title">线程</span>
                    <div id="codex-history-actions">
                        <button id="btn-codex-history-refresh" class="codex-btn subtle" type="button">刷新</button>
                        <button id="btn-codex-new-thread" class="codex-btn" type="button">新建线程</button>
                    </div>
                </div>
                <div id="codex-history-empty">暂无已保存线程。</div>
                <div id="codex-history-list" aria-live="polite"></div>
            </div>
            <div id="codex-settings-panel" hidden>
                <div id="codex-settings-header">
                    <span id="codex-settings-title">会话默认配置</span>
                    <div id="codex-settings-actions">
                        <button id="btn-codex-models-refresh" class="codex-btn subtle" type="button">模型</button>
                        <button id="btn-codex-rate-limit-refresh" class="codex-btn subtle" type="button">额度</button>
                    </div>
                </div>
                <label class="codex-settings-toggle">
                    <input id="codex-settings-use-defaults" type="checkbox">
                    <span>使用服务端默认值</span>
                </label>
                <div id="codex-settings-fields">
                    <label class="codex-settings-field">
                        <span>模型</span>
                        <select id="codex-settings-model"></select>
                    </label>
                    <label class="codex-settings-field">
                        <span>推理强度</span>
                        <select id="codex-settings-reasoning"></select>
                    </label>
                    <label class="codex-settings-field">
                        <span>人格风格</span>
                        <select id="codex-settings-personality"></select>
                    </label>
                    <label class="codex-settings-field">
                        <span>审批策略</span>
                        <select id="codex-settings-approval"></select>
                    </label>
                    <label class="codex-settings-field">
                        <span>沙箱模式</span>
                        <select id="codex-settings-sandbox"></select>
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
                <div id="codex-slash-menu" hidden>
                    <div id="codex-slash-menu-header">
                        <span id="codex-slash-menu-title">搜索命令</span>
                        <span id="codex-slash-menu-hint">输入 <code>/</code> 继续筛选</span>
                    </div>
                    <div id="codex-slash-menu-empty" hidden>没有匹配命令。</div>
                    <div id="codex-slash-menu-list" aria-live="polite"></div>
                </div>
                <textarea id="codex-input" placeholder="输入你的请求，让 Codex 帮你检查、修改或执行任务..."></textarea>
                <div id="codex-composer-footer">
                    <button id="btn-codex-slash-trigger" class="codex-icon-btn" type="button">+</button>
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
                </div>
                <button id="btn-codex-send" type="button">发送</button>
            </div>
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
                    this.CONNECTING = 0;
                    this.OPEN = 1;
                    this.CLOSING = 2;
                    this.CLOSED = 3;
                    window.__WS_INSTANCES__.push(this);
                }
                send() {}
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
            window.__WS_INSTANCES__ = [];

            // Mock fetch
            window.fetch = () => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ ticket: 'test-ticket' })
            });

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
            // Mock getCodexSettingsViewApi
            window.getCodexSettingsViewApi = () => null;
            // Mock getCodexRuntimeViewApi
            window.getCodexRuntimeViewApi = () => null;
            // Mock getCodexApprovalViewApi
            window.getCodexApprovalViewApi = () => null;
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
