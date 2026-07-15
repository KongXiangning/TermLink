(function () {
  'use strict';

  function tr(key, params) {
    if (window.i18n && typeof window.i18n.t === 'function') return window.i18n.t(key, params);
    if (typeof window.t === 'function') return window.t(key, params);
    return key;
  }

  function focusableElements(container) {
    return Array.from(container.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(function (element) {
      return !element.hidden && !element.closest('.sessions-cwd-group:not(.is-active)');
    });
  }

  // ── API ─────────────────────────────────────────────────────────────────
  function resolveApiUrl(url) {
    if (typeof url !== 'string' || !url.startsWith('/api/') || typeof window.getBaseUrl !== 'function') return url;
    var baseUrl = window.getBaseUrl();
    if (!baseUrl) return url;
    try {
      return new URL(url, baseUrl.replace(/\/$/, '') + '/').toString();
    } catch (_error) {
      return url;
    }
  }

  function api(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    return fetch(resolveApiUrl(url), opts).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return r.json();
    });
  }

  // ── SPA view switching ──────────────────────────────────────────────────
  function switchToView(mode, sessionId) {
    var termView = document.getElementById('terminal-view');
    var codexView = document.getElementById('codex-view');
    if (mode === 'codex') {
      if (termView) termView.style.display = 'none';
      if (codexView) {
        codexView.style.display = '';
        // Load redesigned codex client page inside an iframe
        var iframe = codexView.querySelector('iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.style.cssText = 'width:100%;height:100%;border:none;';
          codexView.innerHTML = '';
          codexView.appendChild(iframe);
        }
        iframe.src = '/codex_client.html?sessionId=' + encodeURIComponent(sessionId || '');
      }
    } else {
      if (codexView) codexView.style.display = 'none';
      if (termView) termView.style.display = '';
      if (sessionId) {
        if (typeof window.switchSession === 'function') {
          window.switchSession(sessionId);
          return;
        }
        var url = new URL(location.href);
        url.searchParams.set('sessionId', sessionId);
        history.replaceState(null, '', url.toString());
      }
    }
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
        var storedId = li.dataset && li.dataset.sessionId;
        var match = sessions.find(function (s) { return s.id === storedId || s.name === name || s.id === name; });
        if (match) {
          // Add mode badge if not already present
          if (!li.querySelector('.sessions-mode-badge')) {
            var mode = match.sessionMode || 'terminal';
            var badge = document.createElement('span');
            badge.className = 'sessions-mode-badge ' + mode;
            badge.textContent = mode;
            badge.setAttribute('aria-label', tr('terminal.session.modeLabel', { mode: mode }));
            li.insertBefore(badge, li.firstChild);
          }
          // Store session data
          li._sessionData = match;
        }
      });

      // Add click handlers for codex sessions
      items.forEach(function (li) {
        if (li.dataset && li.dataset.sessionId) return; // terminal.js owns modern session rows
        if (li._hasCodexHandler) return;
        li._hasCodexHandler = true;
        li.addEventListener('click', function (e) {
          // Don't interfere with delete button
          if (e.target.closest('button')) return;
          var s = li._sessionData;
          if (s) {
            switchToView(s.sessionMode || 'terminal', s.id);
          }
        });
      });
    }).catch(function () {
      // API not available — drawer works without enhancement
    });
  }

  // ── new session modal builder ───────────────────────────────────────────
  function buildNewSessionModal() {
    var existing = document.getElementById('sessions-new-modal');
    if (existing && existing._sessionsWired) return existing;

    var overlay = existing || document.createElement('div');
    if (!existing) {
      overlay.id = 'sessions-new-modal';
      overlay.className = 'sessions-modal-overlay';
      overlay.setAttribute('role', 'presentation');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML =
        '<div class="sessions-modal" role="dialog" aria-modal="true" aria-labelledby="sessions-new-title" aria-describedby="sessions-new-description" tabindex="-1">' +
          '<div class="sessions-modal-header">' +
            '<div><div class="sessions-modal-eyebrow">' + escHtml(tr('sessions.new.eyebrow')) + '</div>' +
            '<div class="sessions-modal-title" id="sessions-new-title">' + escHtml(tr('sessions.new.title')) + '</div></div>' +
            '<button class="sessions-modal-close" id="snew-close" type="button" aria-label="' + escHtml(tr('common.close')) + '">×</button>' +
          '</div>' +
          '<p class="sessions-modal-description" id="sessions-new-description">' + escHtml(tr('sessions.new.description')) + '</p>' +
          '<form id="snew-form" novalidate>' +
            '<div class="sessions-form-group">' +
              '<label class="sessions-form-label" for="snew-name">' + escHtml(tr('sessions.new.nameLabel')) + '</label>' +
              '<input class="sessions-form-input" id="snew-name" name="name" type="text" placeholder="' + escHtml(tr('sessions.new.namePlaceholder')) + '" maxlength="64" autocomplete="off" aria-describedby="snew-status">' +
            '</div>' +
            '<fieldset class="sessions-form-group sessions-mode-fieldset">' +
              '<legend class="sessions-form-label">' + escHtml(tr('sessions.new.modeLabel')) + '</legend>' +
              '<div class="sessions-mode-tabs" id="snew-mode-tabs" role="radiogroup">' +
                '<button class="sessions-mode-tab is-active" type="button" role="radio" aria-checked="true" data-mode="codex">Codex</button>' +
                '<button class="sessions-mode-tab" type="button" role="radio" aria-checked="false" data-mode="terminal">Terminal</button>' +
              '</div>' +
              '<span class="sessions-form-hint">' + escHtml(tr('sessions.new.modeHint')) + '</span>' +
            '</fieldset>' +
            '<div class="sessions-cwd-group is-active" id="snew-cwd-group">' +
              '<label class="sessions-form-label" for="snew-cwd">' + escHtml(tr('sessions.new.cwdLabel')) + '</label>' +
              '<div class="sessions-cwd-row">' +
                '<input class="sessions-form-input" id="snew-cwd" name="cwd" type="text" placeholder="' + escHtml(tr('sessions.new.cwdPlaceholder')) + '" autocomplete="off" aria-describedby="snew-cwd-hint snew-status">' +
                '<button class="sessions-btn sessions-btn-subtle sessions-btn-small" id="snew-browse" type="button" aria-expanded="false" aria-controls="snew-picker-tree">' + escHtml(tr('sessions.new.browse')) + '</button>' +
              '</div>' +
              '<span class="sessions-form-hint" id="snew-cwd-hint">' + escHtml(tr('sessions.new.cwdHint')) + '</span>' +
              '<div class="sessions-picker-tree" id="snew-picker-tree" role="list" aria-label="' + escHtml(tr('sessions.new.pickerLabel')) + '"></div>' +
            '</div>' +
            '<div class="sessions-form-status" id="snew-status" role="status" aria-live="polite"></div>' +
            '<div class="sessions-modal-actions">' +
              '<button class="sessions-btn sessions-btn-subtle" id="snew-cancel" type="button">' + escHtml(tr('common.cancel')) + '</button>' +
              '<button class="sessions-btn sessions-btn-primary" id="snew-create" type="submit">' + escHtml(tr('common.create')) + '</button>' +
            '</div>' +
          '</form>' +
        '</div>';
      document.body.appendChild(overlay);
    }
    overlay._sessionsWired = true;

    var currentMode = 'codex';
    var pickerVisible = false;
    var restoreTarget = null;
    var nameInput = overlay.querySelector('#snew-name');
    var cwdInput = overlay.querySelector('#snew-cwd');
    var tree = overlay.querySelector('#snew-picker-tree');
    var browseButton = overlay.querySelector('#snew-browse');
    var createButton = overlay.querySelector('#snew-create');
    var status = overlay.querySelector('#snew-status');
    var form = overlay.querySelector('#snew-form');

    function setStatus(message, tone) {
      status.textContent = message || '';
      status.className = 'sessions-form-status' + (tone ? ' is-' + tone : '');
    }

    function closeModal() {
      overlay.classList.remove('is-active');
      overlay.setAttribute('aria-hidden', 'true');
      if (restoreTarget && document.contains(restoreTarget)) restoreTarget.focus();
      restoreTarget = null;
    }

    function setMode(mode) {
      currentMode = mode === 'terminal' ? 'terminal' : 'codex';
      overlay.querySelectorAll('.sessions-mode-tab').forEach(function (tab) {
        var selected = tab.dataset.mode === currentMode;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-checked', selected ? 'true' : 'false');
      });
      overlay.querySelector('#snew-cwd-group').classList.toggle('is-active', currentMode === 'codex');
      cwdInput.toggleAttribute('required', currentMode === 'codex');
      cwdInput.removeAttribute('aria-invalid');
      setStatus('');
    }

    function renderPickerState(message, tone) {
      tree.innerHTML = '';
      var state = document.createElement('div');
      state.className = 'sessions-picker-state' + (tone ? ' is-' + tone : '');
      state.textContent = message;
      tree.appendChild(state);
    }

    function loadPicker(path) {
      browseButton.disabled = true;
      browseButton.setAttribute('aria-busy', 'true');
      renderPickerState(tr('sessions.new.pickerLoading'));
      tree.classList.add('is-active');
      browseButton.setAttribute('aria-expanded', 'true');
      pickerVisible = true;
      var url = '/api/workspace/picker/tree';
      if (path) url += '?path=' + encodeURIComponent(path);
      api(url).then(function (data) {
        tree.innerHTML = '';
        var parentPath = data && typeof data.parentPath === 'string' ? data.parentPath : (path ? path.replace(/[\\/]?[^\\/]*$/, '') : '');
        if (path && parentPath !== path) {
          var parent = document.createElement('button');
          parent.type = 'button';
          parent.className = 'sessions-picker-item sessions-picker-parent';
          parent.textContent = tr('sessions.new.parentDirectory');
          parent.addEventListener('click', function () { cwdInput.value = parentPath; loadPicker(parentPath); });
          tree.appendChild(parent);
        }
        var dirs = Array.isArray(data) ? data : ((data && data.entries) || []);
        if (!dirs.length && !tree.children.length) renderPickerState(tr('sessions.new.pickerEmpty'));
        dirs.forEach(function (directory) {
          var directoryName = typeof directory === 'string' ? directory : (directory.name || directory.path || '');
          var fullPath = typeof directory === 'string'
            ? (path ? path.replace(/[\\/]$/, '') + '/' + directory : directory)
            : (directory.path || (path ? path.replace(/[\\/]$/, '') + '/' + directoryName : directoryName));
          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'sessions-picker-item';
          item.textContent = '▸ ' + directoryName;
          item.addEventListener('click', function () { cwdInput.value = fullPath; loadPicker(fullPath); });
          tree.appendChild(item);
        });
      }).catch(function () {
        renderPickerState(tr('sessions.new.pickerError'), 'error');
      }).finally(function () {
        browseButton.disabled = false;
        browseButton.removeAttribute('aria-busy');
      });
    }

    overlay.querySelector('#snew-cancel').addEventListener('click', closeModal);
    overlay.querySelector('#snew-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = focusableElements(overlay);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    overlay.querySelector('#snew-mode-tabs').addEventListener('click', function (event) {
      var tab = event.target.closest('.sessions-mode-tab');
      if (!tab) return;
      setMode(tab.dataset.mode);
    });

    browseButton.addEventListener('click', function () {
      if (pickerVisible) {
        tree.classList.remove('is-active');
        browseButton.setAttribute('aria-expanded', 'false');
        pickerVisible = false;
      } else {
        loadPicker(cwdInput.value.trim());
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = nameInput.value.trim() || tr(currentMode === 'codex' ? 'sessions.new.defaultCodexName' : 'sessions.new.defaultTerminalName');
      var body = { name: name, sessionMode: currentMode };
      if (currentMode === 'codex') {
        var cwd = cwdInput.value.trim();
        if (!cwd) {
          cwdInput.setAttribute('aria-invalid', 'true');
          setStatus(tr('sessions.new.cwdRequired'), 'error');
          cwdInput.focus();
          return;
        }
        body.cwd = cwd;
      }
      cwdInput.removeAttribute('aria-invalid');
      createButton.disabled = true;
      form.setAttribute('aria-busy', 'true');
      setStatus(tr('sessions.new.creating'));
      api('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (created) {
          var id = created.id || (created.session && created.session.id);
          if (!id) throw new Error('missing session id');
          closeModal();
          switchToView(currentMode, id);
        }).catch(function (error) {
          setStatus(tr('sessions.new.createError', { error: error.message }), 'error');
        }).finally(function () {
          createButton.disabled = false;
          form.setAttribute('aria-busy', 'false');
        });
    });

    overlay._sessionsOpen = function (opener) {
      restoreTarget = opener || document.activeElement;
      nameInput.value = '';
      cwdInput.value = '';
      cwdInput.removeAttribute('aria-invalid');
      tree.innerHTML = '';
      tree.classList.remove('is-active');
      browseButton.setAttribute('aria-expanded', 'false');
      pickerVisible = false;
      setMode('codex');
      setStatus('');
      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () { nameInput.focus(); });
    };

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
      modal._sessionsOpen(btn);
    });

  }

  // ── codex_ipc: add drawer toggle if missing ────────────────────────────
  function addDrawerToggleToCodex() {
    // Skip in embedded SPA mode — the shell has its own drawer.
    if (typeof window.__CODEX_EMBEDDED !== 'undefined') return;
    if (!location.pathname.includes('codex_ipc')) return;
    var bar = document.querySelector('.ipc-status-bar');
    if (!bar) { setTimeout(addDrawerToggleToCodex, 200); return; }

    // Check if toggle already exists
    if (bar.querySelector('#codex-drawer-toggle')) return;

    var toggle = document.createElement('button');
    toggle.id = 'codex-drawer-toggle';
    toggle.type = 'button';
    toggle.className = 'sessions-drawer-toggle';
    toggle.textContent = '☰';
    toggle.title = tr('sessions.drawer.title');
    toggle.setAttribute('aria-label', tr('sessions.drawer.open'));
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'codex-drawer');

    var backdrop = document.createElement('div');
    backdrop.className = 'sessions-drawer-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    var drawer = document.createElement('aside');
    drawer.id = 'codex-drawer';
    drawer.className = 'sessions-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'codex-drawer-title');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.hidden = true;
    drawer.innerHTML =
      '<div class="sessions-drawer-header">' +
        '<div><div class="sessions-modal-eyebrow">' + escHtml(tr('sessions.drawer.eyebrow')) + '</div>' +
        '<span class="sessions-drawer-title" id="codex-drawer-title">' + escHtml(tr('sessions.drawer.title')) + '</span></div>' +
        '<button id="codex-drawer-close" class="sessions-modal-close" type="button" aria-label="' + escHtml(tr('common.close')) + '">×</button>' +
      '</div>' +
      '<div id="codex-drawer-list" class="sessions-drawer-list" aria-live="polite">' + escHtml(tr('sessions.drawer.loading')) + '</div>' +
      '<button id="codex-drawer-new" class="sessions-btn sessions-btn-primary sessions-drawer-new" type="button">' + escHtml(tr('sessions.drawer.new')) + '</button>';
    document.body.append(backdrop, drawer);

    function closeDrawer() {
      drawer.classList.remove('is-active');
      backdrop.classList.remove('is-active');
      drawer.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
      drawer.hidden = true;
      backdrop.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }

    function openDrawer() {
      drawer.hidden = false;
      backdrop.hidden = false;
      drawer.classList.add('is-active');
      backdrop.classList.add('is-active');
      drawer.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      loadDrawer();
      requestAnimationFrame(function () { document.getElementById('codex-drawer-close').focus(); });
    }

    toggle.addEventListener('click', openDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.getElementById('codex-drawer-close').addEventListener('click', closeDrawer);
    drawer.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); return; }
      if (event.key !== 'Tab') return;
      var focusable = focusableElements(drawer);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    // Load sessions into drawer
    function loadDrawer() {
      api('/api/sessions').then(function (sessions) {
        var listEl = document.getElementById('codex-drawer-list');
        listEl.innerHTML = '';
        if (!sessions.length) { listEl.textContent = tr('sessions.drawer.empty'); return; }
        sessions.forEach(function (s) {
          var row = document.createElement('button');
          row.type = 'button';
          row.className = 'sessions-drawer-row';
          var mode = s.sessionMode || 'terminal';
          var badge = document.createElement('span');
          badge.className = 'sessions-mode-badge ' + mode;
          badge.textContent = mode;
          var label = document.createElement('span');
          label.className = 'sessions-drawer-row-label';
          label.textContent = s.name || s.id;
          row.append(badge, label);
          row.addEventListener('click', function () {
            closeDrawer();
            switchToView(mode, s.id);
          });
          listEl.appendChild(row);
        });
      }).catch(function () { document.getElementById('codex-drawer-list').textContent = tr('sessions.drawer.error'); });
    }

    // Hook new session button in drawer
    document.getElementById('codex-drawer-new').addEventListener('click', function () {
      closeDrawer();
      var modal = buildNewSessionModal();
      modal._sessionsOpen(toggle);
    });

    // Insert toggle as first child of status bar
    bar.insertBefore(toggle, bar.firstChild);
  }

  // ── utilities ──────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── start ──────────────────────────────────────────────────────────────
  function start() {
    enhanceDrawer();
    hookNewSessionButton();
    addDrawerToggleToCodex();
  }

  if (window.i18n && typeof window.i18n.init === 'function' && !window.i18n.ready) {
    var i18nReady = window.__TERMLINK_I18N_READY__ || window.i18n.init();
    window.__TERMLINK_I18N_READY__ = i18nReady;
    i18nReady.catch(function (error) {
      console.warn('sessions i18n init failed', error);
    }).then(function () {
      if (typeof window.i18n.translatePage === 'function') window.i18n.translatePage();
      start();
    });
  } else if (window.i18n && typeof window.i18n.translatePage === 'function') {
    window.i18n.translatePage();
    start();
  } else {
    start();
  }
})();
