(function () {
    'use strict';

    if (window.kinogo_plugin_started) return;

    function startPlugin() {
        if (window.kinogo_plugin_started) return;
        window.kinogo_plugin_started = true;

        var manifest = {
            type: 'video',
            version: '0.1.0',
            name: 'Kinogo',
            description: 'Каталог Kinogo',
            component: 'kinogo_main'
        };

        Lampa.Manifest.plugins = manifest;

        function KinogoComponent(object) {
            var self = this;
            var html = $('<div class="kinogo-page"></div>');

            this.create = function () {
                html.html(
                    '<div style="padding:2em;">' +
                    '<div style="font-size:2em;margin-bottom:1em;">Kinogo</div>' +
                    '<div style="font-size:1.2em;margin-bottom:1em;">' +
                    'Откройте каталог Kinogo в браузере, чтобы найти фильм.' +
                    '</div>' +
                    '<div class="selector kinogo-open" style="padding:1em;background:#333;">' +
                    'Открыть Kinogo' +
                    '</div>' +
                    '</div>'
                );

                html.find('.kinogo-open').on('hover:enter', function () {
                    Lampa.Noty.show('Следующий этап: подключение поиска фильмов.');
                });

                self.activity.render().find('.activity__body').append(html);
                self.activity.loader(false);
            };

            this.start = function () {};
            this.pause = function () {};
            this.stop = function () {};
            this.render = function () {
                return html;
            };
            this.destroy = function () {
                html.remove();
            };
        }

        Lampa.Component.add('kinogo_main', KinogoComponent);

        function addMenu() {
            var menu = $('.menu .menu__list').eq(0);

            if (!menu.length || menu.find('.kinogo-menu-item').length) return;

            var button = $(
                '<li class="menu__item selector kinogo-menu-item">' +
                '<div class="menu__ico">🎬</div>' +
                '<div class="menu__text">Kinogo</div>' +
                '</li>'
            );

            button.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Kinogo',
                    component: 'kinogo_main',
                    page: 1
                });
            });

            menu.append(button);
        }

        if (window.appready) {
            addMenu();
        } else {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') addMenu();
            });
        }

        console.log('[Kinogo] Plugin initialized');
    }

    function bootstrap() {
        if (typeof Lampa === 'undefined') {
            setTimeout(bootstrap, 200);
            return;
        }

        if (Lampa.Manifest && Lampa.Component && Lampa.Activity) {
            startPlugin();
        } else {
            setTimeout(bootstrap, 500);
        }
    }

    bootstrap();
})();
