(function () {
    'use strict';

    console.log('[Kinogo] Plugin loaded');

    if (typeof Lampa !== 'undefined' && Lampa.Noty && Lampa.Noty.show) {
        Lampa.Noty.show('Kinogo: плагин загружен');
    }
})();
