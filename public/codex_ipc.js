(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };

  var sessName   = $('session-name');
  var sessCwd    = $('session-cwd');
  var wsStatus   = $('ws-status');
  var ipcStatus  = $('ipc-status');
  var convSel    = $('conv-selector');
  var convBadge  = $('conv-status-badge');
  var offlineBn  = $('offline-banner');
  var surfaceEl  = $('ipc-surface');
  var emptyEl    = $('surface-empty');
  var approvalPn = $('approval-panel');
  var planPn     = $('plan-panel');
  var followerPn = $('follower-input-panel');
  var followerIn = $('follower-input');
  var followerBtn= $('follower-send-btn');
  var followerSt = $('follower-send-status');
  var followerHi = $('follower-hint');

  // Approval
  var apprTitle  = $('approval-title');
  var apprDesc   = $('approval-desc');
  var apprCmd    = $('approval-command');
  var apprAccept = $('approval-accept-btn');
  var apprReject = $('approval-reject-btn');
  var apprStatus = $('approval-status');

  // Plan
  var planText   = $('plan-text');
  var planAccept = $('plan-accept-btn');
  var planFbIn   = $('plan-feedback-input');
  var planFbBtn  = $('plan-feedback-btn');
  var planStatus = $('plan-status');

  // ── state ──────────────────────────────────────────────────────────────
  var state = {
    ws: null,
    ipcOnline: false,
    sessionId: '',
    activeConversationId: '',
    conversations: {},        // conversationId → { surface, status, updatedAt }
    pendingApproval: null,
    pendingPlanAction: null,
    reconnectDelay: 1000,
    reconnectTimer: null
  };

  // ── WebSocket ──────────────────────────────────────────────────────────
  function connectWs() {
    // Fetch a one-time ticket first (browser sends stored BasicAuth creds).
    fetch('/api/ws-ticket')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        var url = proto + '//' + location.host + '/?ticket=' + encodeURIComponent(data.ticket || '');
        if (state.sessionId) {
          url += '&sessionId=' + encodeURIComponent(state.sessionId);
        }
        openSocket(url);
      })
      .catch(function () {
        // Fallback: try without ticket (may fail with 401 but the page
        // survives; onclose will schedule a reconnect).
        var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        var url = proto + '//' + location.host + '/';
        if (state.sessionId) {
          url += '?sessionId=' + encodeURIComponent(state.sessionId);
        }
        openSocket(url);
      });
  }

  function openSocket(url) {
    var ws = new WebSocket(url);
    state.ws = ws;

    ws.onopen = function () {
      setWsOnline(true);
      state.reconnectDelay = 1000;
    };

    ws.onmessage = function (e) {
      var msg;
      try { msg = JSON.parse(e.data); }
      catch (_) { return; }
      handleMessage(msg);
    };

    ws.onclose = function () {
      setWsOnline(false);
      scheduleReconnect();
    };

    ws.onerror = function () {
      // onclose will fire after this
    };
  }

  function scheduleReconnect() {
    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(function () {
      state.reconnectTimer = null;
      connectWs();
      state.reconnectDelay = Math.min(state.reconnectDelay * 2, 30000);
    }, state.reconnectDelay);
  }

  function setWsOnline(on) {
    updateDot(wsStatus, on);
  }

  function setIpcOnline(on) {
    state.ipcOnline = on;
    updateDot(ipcStatus, on);
    if (on) {
      offlineBn.classList.remove('is-active');
    } else {
      offlineBn.classList.add('is-active');
    }
  }

  function updateDot(el, on) {
    var dot = el.querySelector('.ipc-status-dot');
    if (!dot) return;
    dot.classList.toggle('online', on);
    dot.classList.toggle('offline', !on);
  }

  // ── message dispatch ───────────────────────────────────────────────────
  function handleMessage(msg) {
    switch (msg.type) {
      case 'session_info':
        state.sessionId = msg.sessionId || '';
        break;
      case 'codex_ipc_status':
        if (msg.status) setIpcOnline(!!msg.status.online);
        break;
      case 'codex_ipc_conversations':
        handleConversationList(msg.conversations);
        break;
      case 'conversation_surface_snapshot':
        handleSnapshot(msg);
        break;
      case 'follower_message_sent':
        showFollowerStatus('消息已发送');
        break;
      case 'follower_approval_response_sent':
        showFollowerStatus('审批已提交');
        hideApprovalPanel();
        break;
      case 'follower_plan_response_sent':
        showFollowerStatus('PLAN 响应已提交');
        hidePlanPanel();
        break;
      case 'error':
        showFollowerStatus(msg.message || '操作失败');
        apprStatus.textContent = '';
        planStatus.textContent = '';
        break;
    }
  }

  // ── snapshot → conversation aggregation ────────────────────────────────
  function handleSnapshot(msg) {
    var convId = msg.conversationId;
    var surface = msg.snapshot;
    if (!convId || !surface) return;

    // Store in conversations map.
    state.conversations[convId] = {
      surface: surface,
      status: surface.status || 'unknown',
      updatedAt: surface.updatedAt || Date.now()
    };

    refreshConversationSelector();

    // If this matches the active conversation, render (Step 4 will fill this in).
    if (convId === state.activeConversationId) {
      renderSurface(surface);
    }
  }

  // ── conversation list from server ─────────────────────────────────────
  function handleConversationList(list) {
    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!state.conversations[c.conversationId]) {
        state.conversations[c.conversationId] = {
          surface: null,
          status: c.status || 'unknown',
          updatedAt: c.updatedAt || Date.now()
        };
      }
    }
    refreshConversationSelector();
  }

  // ── conversation selector ──────────────────────────────────────────────
  function refreshConversationSelector() {
    var ids = Object.keys(state.conversations);
    // Sort by updatedAt descending.
    ids.sort(function (a, b) {
      return (state.conversations[b].updatedAt || 0) - (state.conversations[a].updatedAt || 0);
    });

    var currentValue = convSel.value;
    convSel.innerHTML = '<option value="">-- 选择会话 --</option>';

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var c = state.conversations[id];
      var shortId = id.length > 8 ? id.slice(0, 8) : id;
      var label = shortId + ' [' + (c.status || '?') + ']';
      var opt = document.createElement('option');
      opt.value = id;
      opt.textContent = label;
      convSel.appendChild(opt);
    }

    // Restore selection if still present.
    if (currentValue && state.conversations[currentValue]) {
      convSel.value = currentValue;
    }
    convSel.disabled = ids.length === 0;
  }

  convSel.addEventListener('change', function () {
    var convId = convSel.value;
    if (!convId) {
      state.activeConversationId = '';
      surfaceEl.innerHTML = '';
      surfaceEl.appendChild(emptyEl);
      emptyEl.style.display = '';
      return;
    }
    state.activeConversationId = convId;

    // Send set_active_conversation to gateway.
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: convId }));
    }

    // If we already have a cached snapshot, render it immediately.
    var cached = state.conversations[convId];
    if (cached) {
      renderSurface(cached.surface);
    }
  });

  // ── surface rendering ──────────────────────────────────────────────────
  function renderSurface(surface) {
    if (!surface) return;
    var convId = state.activeConversationId;
    if (!convId) return;

    // Full redraw: clear all previous items, rebuild from snapshot.
    // Empty-state element is preserved and re-appended after rebuild.
    surfaceEl.innerHTML = '';
    surfaceEl.appendChild(emptyEl);

    var items = surface.items || [];
    var hasContent = false;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var key = item.key;
      if (!key) continue;

      var el = buildSurfaceItemEl(item);
      if (el) {
        surfaceEl.insertBefore(el, emptyEl);
        hasContent = true;
      }
    }

    emptyEl.style.display = hasContent ? 'none' : '';
    updateConvBadge(surface);

    if (surface.pendingApproval) showApprovalPanel(surface.pendingApproval);
    if (surface.pendingPlanAction) showPlanPanel(surface.pendingPlanAction);

    updateFollowerInputState(surface.status);

    // Scroll to top on new render, or to bottom if following live updates.
    surfaceEl.scrollTop = surfaceEl.scrollHeight;
  }

  function buildSurfaceItemEl(item) {
    var el = document.createElement('div');
    el.className = 'ipc-surface-item';

    switch (item.kind) {
      case 'message':
        if (item.role === 'user') {
          el.classList.add('is-user');
          el.innerHTML = '<span class="ipc-item-label">You</span><div>' + escHtml(item.text || '') + '</div>';
        } else {
          el.classList.add('is-assistant');
          var label = item.phase === 'commentary' ? '思考中' : 'Codex';
          el.innerHTML = '<span class="ipc-item-label">' + label + '</span><div>' + escHtml(item.text || '') + '</div>';
        }
        return el;

      case 'status':
        el.classList.add('is-status');
        el.textContent = item.text || '';
        return el;

      case 'approval_request':
        el.classList.add('is-approval');
        el.innerHTML = '<span class="ipc-item-label">等待审批</span><div>' + escHtml(item.text || '') + '</div>';
        return el;

      case 'plan_prompt':
        el.classList.add('is-plan');
        el.innerHTML = '<span class="ipc-item-label">PLAN</span><pre style="white-space:pre-wrap;margin:0;font:inherit">' + escHtml(item.text || '') + '</pre>';
        return el;

      case 'goal_prompt':
        el.classList.add('is-plan');
        el.innerHTML = '<span class="ipc-item-label">GOAL</span><pre style="white-space:pre-wrap;margin:0;font:inherit">' + escHtml(item.text || '') + '</pre>';
        return el;

      default:
        return null;
    }
  }

  function updateConvBadge(surface) {
    if (!surface) {
      convBadge.hidden = true;
      return;
    }
    convBadge.textContent = surface.status || 'unknown';
    convBadge.hidden = false;
  }

  // ── approval panel ────────────────────────────────────────────────────
  function showApprovalPanel(approval) {
    state.pendingApproval = approval;
    apprTitle.textContent = approval.title || '等待命令审批';
    apprDesc.textContent = approval.description || '';
    apprCmd.textContent = approval.command || '';
    apprStatus.textContent = '';
    approvalPn.classList.add('is-active');
  }

  function hideApprovalPanel() {
    approvalPn.classList.remove('is-active');
    state.pendingApproval = null;
    apprStatus.textContent = '';
  }

  // ── plan panel ─────────────────────────────────────────────────────────
  function showPlanPanel(action) {
    state.pendingPlanAction = action;
    planText.textContent = action.planContent || '';
    planStatus.textContent = '';
    planPn.classList.add('is-active');
  }

  function hidePlanPanel() {
    planPn.classList.remove('is-active');
    state.pendingPlanAction = null;
    planStatus.textContent = '';
    planFbIn.value = '';
  }

  // ── follower input state ──────────────────────────────────────────────
  function updateFollowerInputState(status) {
    var canSend = state.ipcOnline &&
                  state.activeConversationId &&
                  status !== 'running' &&
                  status !== 'waiting_for_approval';

    if (canSend) {
      followerIn.disabled = false;
      followerBtn.disabled = false;
      followerHi.hidden = true;
    } else {
      followerIn.disabled = true;
      followerBtn.disabled = true;
      if (status === 'running') {
        followerHi.textContent = '任务运行中，请等待完成';
        followerHi.hidden = false;
      } else if (status === 'waiting_for_approval') {
        followerHi.textContent = '等待审批中，请先处理审批';
        followerHi.hidden = false;
      } else if (!state.ipcOnline) {
        followerHi.textContent = 'IPC 离线，无法发送消息';
        followerHi.hidden = false;
      } else {
        followerHi.hidden = true;
      }
    }
  }

  // ── follower send ──────────────────────────────────────────────────────
  followerBtn.addEventListener('click', function () {
    var input = followerIn.value.trim();
    if (!input) return;
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    if (!state.activeConversationId) return;

    state.ws.send(JSON.stringify({
      type: 'follower_send_message',
      conversationId: state.activeConversationId,
      input: input
    }));
    followerIn.value = '';
  });

  followerIn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      followerBtn.click();
    }
  });

  // ── approval actions ──────────────────────────────────────────────────
  apprAccept.addEventListener('click', function () {
    if (!state.pendingApproval || !state.activeConversationId) return;
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify({
      type: 'follower_approval_response',
      conversationId: state.activeConversationId,
      requestId: state.pendingApproval.requestId || '',
      decision: 'accept'
    }));
    apprStatus.textContent = '正在提交…';
  });

  apprReject.addEventListener('click', function () {
    if (!state.pendingApproval || !state.activeConversationId) return;
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify({
      type: 'follower_approval_response',
      conversationId: state.activeConversationId,
      requestId: state.pendingApproval.requestId || '',
      decision: 'reject'
    }));
    apprStatus.textContent = '正在提交…';
  });

  // ── plan actions ──────────────────────────────────────────────────────
  planAccept.addEventListener('click', function () {
    if (!state.pendingPlanAction || !state.activeConversationId) return;
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify({
      type: 'follower_plan_response',
      conversationId: state.activeConversationId,
      input: '是，实施此计划',
      requestId: state.pendingPlanAction.requestId || ''
    }));
    planStatus.textContent = '正在提交…';
  });

  planFbBtn.addEventListener('click', function () {
    var fb = planFbIn.value.trim();
    if (!fb || !state.activeConversationId) return;
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify({
      type: 'follower_plan_response',
      conversationId: state.activeConversationId,
      input: fb,
      requestId: state.pendingPlanAction ? state.pendingPlanAction.requestId || '' : ''
    }));
    planStatus.textContent = '正在提交…';
    planFbIn.value = '';
  });

  // ── follower status helper ─────────────────────────────────────────────
  var _statusTimer = null;
  function showFollowerStatus(text) {
    if (_statusTimer) { clearTimeout(_statusTimer); _statusTimer = null; }
    followerSt.textContent = text;
    _statusTimer = setTimeout(function () { followerSt.textContent = ''; _statusTimer = null; }, 3000);
  }

  // ── utilities ──────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── session init ───────────────────────────────────────────────────────
  (function initSession() {
    var params = new URLSearchParams(location.search);
    var sid = params.get('sessionId');
    if (!sid) {
      // No sessionId — redirect back to sessions page
      location.replace('terminal.html');
      return;
    }
    state.sessionId = sid;

    // Fetch session meta for header display
    fetch('/api/sessions/' + encodeURIComponent(sid), { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (s) {
        sessName.textContent = s.name || sid;
        if (s.cwd) { sessCwd.textContent = s.cwd; sessCwd.hidden = false; }
      })
      .catch(function () {
        sessName.textContent = sid.slice(0, 8);
      });
  })();

  // ── start ──────────────────────────────────────────────────────────────
  connectWs();
})();
