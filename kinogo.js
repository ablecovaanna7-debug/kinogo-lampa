(function () {
    'use strict';

    if (window.kinogoPluginStarted) return;
    window.kinogoPluginStarted = true;

    function startPlugin() {
        var manifest = {
            type: 'video',
            version: '0.1.0',
            name: 'Kinogo',
            description: 'Поиск фильмов Kinogo',
            component: 'kinogo_main'
        };

        Lampa.Manifest.plugins = manifest;

        function Kinogo(object) {
            var self = this;
            var html = $('<div class="kinogo-page"></div>');

            this.create = function () {
                html.html(
                    '<div style="padding:2em">' +
                    '<div style="font-size:2em;margin-bottom:1em">Kinogo</div>' +
                    '<input class="kinogo-query" placeholder="Название фильма" ' +
                    'style="padding:1em;width:80%;color:#fff;background:#333">' +
                    '<div class="kinogo-search selector" ' +
                    'style="padding:1em;background:#333;margin-top:1em">Найти</div>' +
                    '<div class="kinogo-results" style="margin-top:1em"></div>' +
                    '</div>'
                );

                html.find('.kinogo-search').on('hover:enter', search);
                html.find('.kinogo-query').on('keydown', function (e) {
                    if (e.key === 'Enter') search();
                });

                self.activity.render().find('.activity__body').append(html);
                self.activity.loader(false);
            };

            function search() {
                var query = html.find('.kinogo-query').val().trim();
                if (!query) {
                    Lampa.Noty.show('Введи название фильма');
                    return;
                }

                var url = 'https://kinogo.ec/index.php?do=search&subaction=search&story=' +
                    encodeURIComponent(query);

                Lampa.Noty.show('Открываю результаты Kinogo…');

                Lampa.Activity.push({
                    url: url,
                    title: 'Результаты Kinogo',
                    component: 'book',
                    page: 1
                });
            }

            this.start = function () {};
            this.pause = function () {};
            this.stop = function () {};
            this.render = function () { return html; };
            this.destroy = function () { html.remove(); };
        }

        Lampa.Component.add('kinogo_main', Kinogo);

        function addMenu() {
            var menu = $('.menu .menu__list').eq(0);
            if (!menu.length || menu.find('.kinogo-menu-item').length) return;

            var button = $(
                '<li class="menu__item selector kinogo-menu-item">' +
                '<div class="menu__ico">🎬</div>' +
                '<div class="menu__text">Kinogo</div></li>'
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
    }

    function wait() {
        if (typeof Lampa !== 'undefined' &&
            Lampa.Manifest && Lampa.Component && Lampa.Activity) {
            if (!Lampa.Manifest.app_digital ||
                Lampa.Manifest.app_digital >= 300) {
                startPlugin();
            }
        } else {
            setTimeout(wait, 500);
        }
    }

    wait();
})();
