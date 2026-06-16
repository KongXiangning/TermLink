(function () {
  'use strict';

  // ── API ─────────────────────────────────────────────────────────────────
  function api(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    return fetch(url, opts).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return r.json();
    });
  }

  // ── drawer session list enhancer ────────────────────────────────────────
  function enhanceDrawer() {
    var list = document.getElementById('session-list');
    if (!list) { setTimeout(enhanceDrawer, 200); return; }

    // Observe the session list for changes
    var observer = new MutationObserver(function () {
      enhanceSessionItems(list);
    });
    observer.observe(list, { childList: true, subtree: false });

    // Initial enhancement
    enhanceSessionItems(list);
  }

  function enhanceSessionItems(list) {
    api('/api/sessions').then(function (sessions) {
      var items = list.querySelectorAll('li');
      // Build a map of existing items by their text content
      items.forEach(function (li, i) {
        // Find matching session by name
        var name = (li.textContent || '').replace(/[×✕]/g, '').trim();
        var match = sessions.find(function (s) { return s.name === name || s.id === name; });
        if (match) {
          // Add mode badge if not already present
          if (!li.querySelector('.sessions-mode-badge')) {
            var mode = match.sessionMode || 'terminal';
            var badge = document.createElement('span');
            badge.className = 'sessions-mode-badge ' + mode;
            badge.textContent = mode;
            badge.style.cssText = 'margin-left:6px;font-size:0.6em;padding:1px 5px;border-radius:3px;' +
              (mode === 'codex' ? 'background:rgba(0,123,255,0.2);color:#4da3ff;' : 'background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);');
            li.insertBefore(badge, li.firstChild);
          }
          // Store session data
          li._sessionData = match;
        }
      });

      // Add click handlers for codex sessions
      items.forEach(function (li) {
        if (li._hasCodexHandler) return;
        li._hasCodexHandler = true;
        li.addEventListener('click', function (e) {
          // Don't interfere with delete button
          if (e.target.closest('button')) return;
          var s = li._sessionData;
          if (s && (s.sessionMode === 'codex')) {
            location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(s.id);
          }
        });
      });
    }).catch(function () {
      // API not available — drawer works without enhancement
    });
  }

  // ── new session modal builder ───────────────────────────────────────────
  function buildNewSessionModal() {
    // Check if we're on terminal.html (needs modal injected) or codex_ipc.html (already has it)
    var existing = document.getElementById('sessions-new-modal');
    if (existing) return existing;

    var overlay = document.createElement('div');
    overlay.id = 'sessions-new-modal';
    overlay.className = 'sessions-modal-overlay';
    overlay.innerHTML =
      '<div class="sessions-modal">' +
        '<div class="sessions-modal-title">新建会话</div>' +
        '<div class="sessions-form-group">' +
          '<label class="sessions-form-label">名称</label>' +
          '<input class="sessions-form-input" id="snew-name" type="text" placeholder="会话名称" maxlength="64">' +
        '</div>' +
        '<div class="sessions-form-group">' +
          '<label class="sessions-form-label">会话类型</label>' +
          '<div class="sessions-mode-tabs" id="snew-mode-tabs">' +
            '<button class="sessions-mode-tab is-active" data-mode="codex">Codex</button>' +
            '<button class="sessions-mode-tab" data-mode="terminal">Terminal</button>' +
          '</div>' +
        '</div>' +
        '<div class="sessions-cwd-group is-active" id="snew-cwd-group">' +
          '<label class="sessions-form-label">目标文件夹</label>' +
          '<div class="sessions-cwd-row">' +
            '<input class="sessions-form-input" id="snew-cwd" type="text" placeholder="例如 D:\\projects\\my-app">' +
            '<button class="sessions-btn sessions-btn-subtle sessions-btn-small" id="snew-browse">浏览</button>' +
          '</div>' +
          '<div class="sessions-picker-tree" id="snew-picker-tree"></div>' +
        '</div>' +
        '<div class="sessions-modal-actions">' +
          '<button class="sessions-btn sessions-btn-subtle" id="snew-cancel">取消</button>' +
          '<button class="sessions-btn sessions-btn-primary" id="snew-create">创建</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    // Wire events
    var currentMode = 'codex';
    var pickerVisible = false;

    document.getElementById('snew-cancel').addEventListener('click', function () { overlay.classList.remove('is-active'); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('is-active'); });

    document.getElementById('snew-mode-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.sessions-mode-tab');
      if (!tab) return;
      currentMode = tab.dataset.mode;
      var tabs = overlay.querySelectorAll('.sessions-mode-tab');
      tabs.forEach(function (t) { t.classList.toggle('is-active', t.dataset.mode === currentMode); });
      document.getElementById('snew-cwd-group').classList.toggle('is-active', currentMode === 'codex');
    });

    document.getElementById('snew-browse').addEventListener('click', function () {
      var tree = document.getElementById('snew-picker-tree');
      if (pickerVisible) { tree.classList.remove('is-active'); pickerVisible = false; return; }
      var path = document.getElementById('snew-cwd').value || '';
      var url = '/api/workspace/picker/tree';
      if (path) url += '?path=' + encodeURIComponent(path);
      api(url).then(function (data) {
        tree.innerHTML = '';
        if (path) {
          var parentPath = path.replace(/[\\/]?[^\\/]*$/, '') || '';
          if (parentPath !== path) {
            var pe = document.createElement('div');
            pe.className = 'sessions-picker-item sessions-picker-parent';
            pe.textContent = '← 上级目录';
            pe.addEventListener('click', function () { document.getElementById('snew-cwd').value = parentPath; document.getElementById('snew-browse').click(); });
            tree.appendChild(pe);
          }
        }
        var dirs = Array.isArray(data) ? data : (data.entries || []);
        dirs.forEach(function (d) {
          var name = typeof d === 'string' ? d : (d.name || d.path || '');
          var fp = typeof d === 'string' ? (path ? path + '\\' + d : d) : (d.path || (path ? path + '\\' + name : name));
          var el = document.createElement('div');
          el.className = 'sessions-picker-item';
          el.textContent = '📁 ' + name;
          el.addEventListener('click', function () { document.getElementById('snew-cwd').value = fp; document.getElementById('snew-browse').click(); });
          tree.appendChild(el);
        });
        tree.classList.add('is-active');
        pickerVisible = true;
      }).catch(function () {
        tree.innerHTML = '<div class="sessions-picker-item">加载失败</div>';
        tree.classList.add('is-active');
        pickerVisible = true;
      });
    });

    document.getElementById('snew-create').addEventListener('click', function () {
      var name = document.getElementById('snew-name').value.trim() || (currentMode === 'codex' ? 'Codex Session' : 'Terminal Session');
      var body = { name: name, sessionMode: currentMode };
      if (currentMode === 'codex') {
        var cwd = document.getElementById('snew-cwd').value.trim();
        if (!cwd) { alert('Codex 会话需要指定目标文件夹'); return; }
        body.cwd = cwd;
      }
      api('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (created) {
          overlay.classList.remove('is-active');
          var id = created.id || (created.session && created.session.id);
          if (currentMode === 'codex') location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(id);
          else location.href = 'terminal.html?sessionId=' + encodeURIComponent(id);
        }).catch(function (err) { alert('创建失败: ' + err.message); });
    });

    return overlay;
  }

  // ── hook into existing "+" button ──────────────────────────────────────
  function hookNewSessionButton() {
    // Try the existing btn-new-session first
    var btn = document.getElementById('btn-new-session');
    if (!btn) { setTimeout(hookNewSessionButton, 200); return; }

    // Override click to show our modal
    btn.addEventListener('click', function (e) {
      e.stopImmediatePropagation();
      e.preventDefault();
      var modal = buildNewSessionModal();
      // Reset form
      document.getElementById('snew-name').value = '';
      document.getElementById('snew-cwd').value = '';
      document.getElementById('snew-picker-tree').innerHTML = '';
      document.getElementById('snew-picker-tree').classList.remove('is-active');
      // Default codex mode
      document.getElementById('snew-mode-tabs').querySelector('[data-mode="codex"]').click();
      modal.classList.add('is-active');
    });

    // Also hook the drawer's "+" buttons that might appear
    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest('button');
      if (addBtn && (addBtn.textContent || '').includes('添加') && (addBtn.textContent || '').includes('会话')) {
        e.stopPropagation();
        e.preventDefault();
        btn.click();
      }
    });
  }

  // ── codex_ipc: add drawer toggle if missing ────────────────────────────
  function addDrawerToggleToCodex() {
    if (!location.pathname.includes('codex_ipc')) return;
    var bar = document.querySelector('.ipc-status-bar');
    if (!bar) { setTimeout(addDrawerToggleToCodex, 200); return; }

    // Check if toggle already exists
    if (bar.querySelector('#codex-drawer-toggle')) return;

    var toggle = document.createElement('button');
    toggle.id = 'codex-drawer-toggle';
    toggle.textContent = '☰';
    toggle.style.cssText = 'background:none;border:none;color:var(--text-color,#e0e0e0);font-size:1.2rem;cursor:pointer;padding:0 6px';
    toggle.title = '会话管理';

    // Build a minimal drawer panel
    var drawer = document.createElement('div');
    drawer.id = 'codex-drawer';
    drawer.style.cssText = 'display:none;position:fixed;top:0;left:0;width:280px;max-width:80vw;height:100dvh;z-index:200;background:var(--secondary-color,#2c2c2c);border-right:1px solid rgba(255,255,255,0.1);overflow-y:auto;padding:16px;';
    drawer.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<span style="font-weight:700">会话</span>' +
        '<button id="codex-drawer-close" style="background:none;border:none;color:var(--text-color,#e0e0e0);font-size:1.2rem;cursor:pointer">✕</button>' +
      '</div>' +
      '<div id="codex-drawer-list" style="margin-bottom:12px">加载中…</div>' +
      '<button id="codex-drawer-new" style="width:100%;padding:8px;font-size:0.85rem;background:var(--primary-color,#007bff);color:#fff;border:none;border-radius:6px;cursor:pointer">+ 新建会话</button>';
    document.body.appendChild(drawer);

    toggle.addEventListener('click', function () { drawer.style.display = 'block'; });
    document.getElementById('codex-drawer-close').addEventListener('click', function () { drawer.style.display = 'none'; });

    // Load sessions into drawer
    function loadDrawer() {
      api('/api/sessions').then(function (sessions) {
        var listEl = document.getElementById('codex-drawer-list');
        listEl.innerHTML = '';
        if (!sessions.length) { listEl.textContent = '暂无会话'; return; }
        sessions.forEach(function (s) {
          var row = document.createElement('div');
          row.style.cssText = 'padding:8px;margin-bottom:4px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.03)';
          var mode = s.sessionMode || 'terminal';
          row.innerHTML =
            '<span style="font-size:0.65em;padding:1px 5px;border-radius:3px;' +
              (mode === 'codex' ? 'background:rgba(0,123,255,0.2);color:#4da3ff;' : 'background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);') + '">' + mode + '</span>' +
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.85rem">' + escHtml(s.name || s.id) + '</span>';
          row.addEventListener('click', function () {
            if (mode === 'codex') location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(s.id);
            else location.href = 'terminal.html?sessionId=' + encodeURIComponent(s.id);
          });
          listEl.appendChild(row);
        });
      }).catch(function () { document.getElementById('codex-drawer-list').textContent = '加载失败'; });
    }
    loadDrawer();

    // Hook new session button in drawer
    document.getElementById('codex-drawer-new').addEventListener('click', function () {
      var modal = buildNewSessionModal();
      document.getElementById('snew-name').value = '';
      document.getElementById('snew-cwd').value = '';
      document.getElementById('snew-picker-tree').innerHTML = '';
      document.getElementById('snew-picker-tree').classList.remove('is-active');
      document.getElementById('snew-mode-tabs').querySelector('[data-mode="codex"]').click();
      modal.classList.add('is-active');
    });

    // Insert toggle as first child of status bar
    bar.insertBefore(toggle, bar.firstChild);
  }

  // ── utilities ──────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── start ──────────────────────────────────────────────────────────────
  enhanceDrawer();
  hookNewSessionButton();
  addDrawerToggleToCodex();
})();
