(function () {
    'use strict';

    if (window.kinogo_test_plugin_loaded) return;
    window.kinogo_test_plugin_loaded = true;

    function init() {
        if (typeof Lampa === 'undefined') {
            console.error('[Kinogo] Lampa API not found');
            return;
        }

        Lampa.Noty.show('Тестовый плагин успешно загружен!');
        console.log('[Kinogo] Plugin loaded successfully');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
