(function () {
    'use strict';

    if (window.kinogo_plugin_ready) return;
    window.kinogo_plugin_ready = true;

    var COMPONENT = 'kinogo_main';
    var MENU_CLASS = 'kinogo-menu-item';

    function Kinogo() {
        var html = $('<div class="kinogo-page"></div>');

        this.create = function () {
            html.html(
                '<div style="padding:2em">' +
                    '<div style="font-size:2em;margin-bottom:1em">Kinogo</div>' +
                    '<div style="opacity:.7">' +
                        'Плагин подключён к Lampa.' +
                    '</div>' +
                '</div>'
            );

            this.activity.render()
                .find('.activity__body')
                .append(html);

            this.activity.loader(false);
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

    function registerComponent() {
        if (!Lampa.Component.get(COMPONENT)) {
            Lampa.Component.add(COMPONENT, Kinogo);
        }
    }

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);

        if (!menu.length) return false;

        if (menu.find('.' + MENU_CLASS).length) {
            return true;
        }

        var button = $(
            '<li class="menu__item selector ' + MENU_CLASS + '">' +
                '<div class="menu__ico">' +
                    '<svg width="44" height="44" viewBox="0 0 44 44" ' +
                    'xmlns="http://www.w3.org/2000/svg">' +
                        '<rect x="5" y="8" width="34" height="28" ' +
                        'rx="4" fill="currentColor" opacity=".2"/>' +
                        '<path d="M17 14 L17 30 L30 22 Z" ' +
                        'fill="currentColor"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">Kinogo</div>' +
            '</li>'
        );

        button.on('hover:enter', function () {
            registerComponent();

            Lampa.Activity.push({
                url: '',
                title: 'Kinogo',
                component: COMPONENT,
                page: 1
            });
        });

        menu.append(button);

        return true;
    }

    function init() {
        registerComponent();

        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;

            registerComponent();

            if (addMenu() || attempts >= 20) {
                clearInterval(timer);
            }
        }, 500);
    }

    function waitForLampa() {
        if (
            window.Lampa &&
            Lampa.Component &&
            Lampa.Activity &&
            Lampa.Listener
        ) {
            if (window.appready) {
                init();
            } else {
                Lampa.Listener.follow('app', function (event) {
                    if (event.type === 'ready') {
                        init();
                    }
                });

                // На случай, если событие ready уже прошло.
                setTimeout(function () {
                    if (window.appready) init();
                }, 1000);
            }
        } else {
            setTimeout(waitForLampa, 300);
        }
    }

    waitForLampa();
})();
