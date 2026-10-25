(function () {
    'use strict';

    window.kinogo_test_loaded = true;

    if (typeof Lampa !== 'undefined' && Lampa.Noty) {
        Lampa.Noty.show('KINOGO CODE RUNS');
    }

    console.log('[Kinogo] CODE RUNS');
})();
