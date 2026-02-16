(function bootstrapLegacyIndex() {
    // Keep index.html backward compatible while terminal logic lives in terminal.js.
    var script = document.createElement('script');
    script.src = 'terminal.js?v=1';
    script.defer = true;
    document.head.appendChild(script);
})();
