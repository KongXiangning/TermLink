/**
 * TermLink i18n — lightweight client-side internationalisation module.
 *
 * Usage:
 *   <script src="/i18n/i18n.js"></script>
 *   await i18n.init();          // auto-detect language
 *   i18n.t('workspace.toolbar.refresh');
 *   i18n.translatePage();       // batch-replace data-i18n elements
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Supported locales & mapping table                                  */
  /* ------------------------------------------------------------------ */

  var SUPPORTED_LOCALES = ['en', 'zh-CN'];
  var DEFAULT_LOCALE = 'en';

  // Custom locale base-path overrides set via registerLocale().
  // Keys are locale codes, values are base URLs (without trailing slash).
  var _localeBasePaths = {};

  /**
   * Resolve a BCP-47 language tag to one of SUPPORTED_LOCALES.
   *
   * Resolution order:
   *   1. Exact match against SUPPORTED_LOCALES (case-insensitive).
   *   2. Language-prefix match (e.g. zh-TW → zh-CN).
   *   3. Fallback to DEFAULT_LOCALE.
   */
  function resolveLocale(tag) {
    if (!tag) return DEFAULT_LOCALE;
    var lower = tag.toLowerCase();

    // Exact match (case-insensitive)
    for (var i = 0; i < SUPPORTED_LOCALES.length; i++) {
      if (SUPPORTED_LOCALES[i].toLowerCase() === lower) return SUPPORTED_LOCALES[i];
    }

    // Prefix match: zh-TW → zh-CN, ja-JP → ja (if registered)
    var prefix = lower.split('-')[0];
    if (prefix === 'zh') return 'zh-CN';
    for (var j = 0; j < SUPPORTED_LOCALES.length; j++) {
      if (SUPPORTED_LOCALES[j].toLowerCase().split('-')[0] === prefix) return SUPPORTED_LOCALES[j];
    }

    return DEFAULT_LOCALE;
  }

  /* ------------------------------------------------------------------ */
  /*  Internal state                                                     */
  /* ------------------------------------------------------------------ */

  var _locale = DEFAULT_LOCALE;
  var _messages = {};       // current language pack (flat key → string)
  var _fallback = {};       // fallback language pack (always 'en')
  var _ready = false;

  /* ------------------------------------------------------------------ */
  /*  Language-pack loader                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Build the URL for a locale's JSON pack.
   * Checks _localeBasePaths first, then defaults to /i18n/<locale>.json.
   */
  function localeURL(locale) {
    if (_localeBasePaths[locale]) {
      return _localeBasePaths[locale] + '/' + locale + '.json';
    }
    return '/i18n/' + locale + '.json';
  }

  function loadJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('i18n: failed to load ' + url + ' (' + res.status + ')');
      return res.json();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  var i18n = {};

  /**
   * Initialise the i18n module.
   *
   * @param {Object} [options]
   * @param {string} [options.locale]   – force a specific locale
   * @param {string} [options.fallback] – fallback locale (default 'en')
   * @returns {Promise<void>}
   */
  i18n.init = async function init(options) {
    options = options || {};
    var fallbackLocale = options.fallback || DEFAULT_LOCALE;

    // Priority: explicit option > URL ?lang= > navigator
    var raw = options.locale
      || new URLSearchParams(window.location.search).get('lang')
      || (typeof navigator !== 'undefined' && (navigator.language || (navigator.languages && navigator.languages[0])))
      || DEFAULT_LOCALE;

    _locale = resolveLocale(raw);

    // Load packs in parallel; fallback is always loaded for missing-key safety
    var packs = [loadJSON(localeURL(_locale))];
    if (_locale !== fallbackLocale) {
      packs.push(loadJSON(localeURL(fallbackLocale)));
    }

    var results = await Promise.all(packs);
    _messages = results[0];
    _fallback = results[1] || _messages;  // if locale == fallback, reuse
    _ready = true;
  };

  /**
   * Translate a key.
   *
   * @param {string}  key     – dot-separated key, e.g. 'workspace.toolbar.refresh'
   * @param {Object}  [params] – interpolation values, e.g. { max: '10MB' }
   * @returns {string}
   */
  i18n.t = function t(key, params) {
    var msg = _messages[key] || _fallback[key] || key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return msg;
  };

  /** Current resolved locale. */
  Object.defineProperty(i18n, 'locale', { get: function () { return _locale; } });

  /** Whether init() has completed. */
  Object.defineProperty(i18n, 'ready', { get: function () { return _ready; } });

  /**
   * Batch-translate all elements with `data-i18n` attribute in the DOM.
   *
   * Supported forms:
   *   <span data-i18n="key">fallback</span>             → textContent
   *   <input data-i18n="key" data-i18n-attr="placeholder" placeholder="fallback">
   */
  i18n.translatePage = function translatePage(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      var translated = i18n.t(key);
      if (translated === key) continue;  // no translation found, keep original
      if (attr) {
        el.setAttribute(attr, translated);
      } else if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = translated;
      } else {
        el.textContent = translated;
      }
    }
  };

  /**
   * Register an additional locale at runtime.
   *
   * @param {string} locale   – BCP-47 locale code, e.g. 'ja'
   * @param {Object} [options]
   * @param {string} [options.basePath] – base URL where <locale>.json lives
   *                                       (default: '/i18n')
   *
   * After registration, call init({ locale: 'ja' }) to switch.
   */
  i18n.registerLocale = function registerLocale(locale, options) {
    if (!locale) return;
    if (SUPPORTED_LOCALES.indexOf(locale) === -1) {
      SUPPORTED_LOCALES.push(locale);
    }
    if (options && options.basePath) {
      _localeBasePaths[locale] = options.basePath.replace(/\/+$/, '');
    }
  };

  /** List of currently supported locale codes (read-only copy). */
  i18n.getSupportedLocales = function getSupportedLocales() {
    return SUPPORTED_LOCALES.slice();
  };

  /** Expose resolveLocale for testing / Android bridge usage. */
  i18n.resolveLocale = resolveLocale;

  /* ------------------------------------------------------------------ */
  /*  Globals                                                            */
  /* ------------------------------------------------------------------ */

  window.i18n = i18n;
  window.t = i18n.t;   // convenience shortcut
})();
