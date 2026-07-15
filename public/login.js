(function () {
    'use strict';

    var form = document.getElementById('login-form');
    var usernameInput = document.getElementById('username');
    var passwordInput = document.getElementById('password');
    var togglePassword = document.getElementById('toggle-password');
    var submitButton = document.getElementById('login-submit');
    var submitLabel = submitButton && submitButton.querySelector('.submit-label');
    var errorMessage = document.getElementById('login-error');
    var transportStatus = document.getElementById('transport-status');
    var transportLabel = document.getElementById('transport-label');
    var transportHint = document.getElementById('transport-hint');

    function translate(key) {
        if (window.i18n && typeof window.i18n.t === 'function') {
            return window.i18n.t(key);
        }
        return key;
    }

    function safeNextPath(value) {
        if (typeof value !== 'string') return '/terminal.html';
        var trimmed = value.trim();
        if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/terminal.html';
        if (/^\/login(?:\.html)?(?:[?#]|$)/i.test(trimmed)) return '/terminal.html';
        try {
            var parsed = new URL(trimmed, window.location.origin);
            if (parsed.origin !== window.location.origin) return '/terminal.html';
            return parsed.pathname + parsed.search + parsed.hash;
        } catch (_error) {
            return '/terminal.html';
        }
    }

    function getNextPath() {
        return safeNextPath(new URLSearchParams(window.location.search).get('next') || '/terminal.html');
    }

    function navigate(nextPath) {
        if (typeof window.__TERMLINK_LOGIN_NAVIGATE__ === 'function') {
            window.__TERMLINK_LOGIN_NAVIGATE__(nextPath);
            return;
        }
        window.location.replace(nextPath);
    }

    function setTransportState(secure) {
        if (!transportStatus || !transportLabel || !transportHint) return;
        transportStatus.classList.toggle('is-secure', secure);
        transportStatus.classList.toggle('is-insecure', !secure);
        transportLabel.textContent = translate(secure ? 'login.status.secure' : 'login.status.insecure');
        transportHint.hidden = secure;
    }

    function clearError() {
        if (!errorMessage) return;
        errorMessage.hidden = true;
        errorMessage.textContent = '';
        usernameInput.removeAttribute('aria-invalid');
        passwordInput.removeAttribute('aria-invalid');
        usernameInput.closest('.field-control').classList.remove('has-error');
        passwordInput.closest('.field-control').classList.remove('has-error');
    }

    function showError(key, markFields) {
        if (!errorMessage) return;
        errorMessage.textContent = translate(key);
        errorMessage.hidden = false;
        if (markFields) {
            usernameInput.setAttribute('aria-invalid', 'true');
            passwordInput.setAttribute('aria-invalid', 'true');
            usernameInput.closest('.field-control').classList.add('has-error');
            passwordInput.closest('.field-control').classList.add('has-error');
        }
    }

    function setLoading(loading) {
        submitButton.disabled = loading;
        submitButton.classList.toggle('is-loading', loading);
        form.setAttribute('aria-busy', loading ? 'true' : 'false');
        submitLabel.textContent = translate(loading ? 'login.action.submitting' : 'login.action.submit');
    }

    async function checkExistingSession() {
        try {
            var response = await window.fetch('/api/auth/session', {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) {
                setTransportState(window.location.protocol === 'https:');
                return;
            }
            var state = await response.json();
            setTransportState(state.transportSecure === true);
            if (state.authenticated === true) {
                navigate(getNextPath());
            }
        } catch (_error) {
            setTransportState(window.location.protocol === 'https:');
        }
    }

    async function submitLogin(event) {
        event.preventDefault();
        clearError();

        var username = usernameInput.value.trim();
        var password = passwordInput.value;
        if (!username || !password) {
            showError('login.error.required', true);
            (!username ? usernameInput : passwordInput).focus();
            return;
        }

        setLoading(true);
        try {
            var response = await window.fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    next: getNextPath()
                })
            });
            var result = await response.json().catch(function () { return {}; });
            if (!response.ok || result.authenticated !== true) {
                passwordInput.value = '';
                showError(response.status === 401 ? 'login.error.invalid' : 'login.error.unavailable', true);
                passwordInput.focus();
                return;
            }
            navigate(safeNextPath(result.next));
        } catch (_error) {
            passwordInput.value = '';
            showError('login.error.unavailable', false);
            passwordInput.focus();
        } finally {
            setLoading(false);
        }
    }

    function togglePasswordVisibility() {
        var show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        togglePassword.setAttribute('aria-pressed', show ? 'true' : 'false');
        togglePassword.textContent = translate(show ? 'login.action.hidePassword' : 'login.action.showPassword');
        passwordInput.focus({ preventScroll: true });
    }

    async function boot() {
        if (!form || !usernameInput || !passwordInput || !togglePassword || !submitButton) return;
        if (window.i18n && typeof window.i18n.init === 'function') {
            await window.i18n.init();
            window.i18n.translatePage();
            document.documentElement.lang = window.i18n.locale || 'en';
        }
        form.addEventListener('submit', submitLogin);
        usernameInput.addEventListener('input', clearError);
        passwordInput.addEventListener('input', clearError);
        togglePassword.addEventListener('click', togglePasswordVisibility);
        setTransportState(window.location.protocol === 'https:');
        await checkExistingSession();
        if (document.activeElement === document.body) usernameInput.focus();
    }

    boot();
})();
