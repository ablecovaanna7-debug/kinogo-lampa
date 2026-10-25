(function () {
    'use strict';

    if (window.kinogo_plugin_ready) return;
    window.kinogo_plugin_ready = true;

    var COMPONENT = 'kinogo_main';
    var initialized = false;

    var ICON =
        '<svg viewBox="0 0 24 24" width="24" height="24" ' +
        'xmlns="http://www.w3.org/2000/svg">' +
        '<path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 3v10h16V7H4zm5 1 7 4-7 4V8z"/>' +
        '</svg>';

    function Kinogo() {
        var html = $('<div class="kinogo-page"></div>');

        this.create = function () {
            html.html(
                '<div style="padding:2em">' +
                    '<div style="font-size:2em;margin-bottom:1em">' +
                        'Kinogo' +
                    '</div>' +
                    '<div>Плагин подключён.</div>' +
                '</div>'
            );

            this.activity.render()
                .find('.activity__body')
                .append(html);

            this.activity.loader(false);
        };

        this.start = function () {
            Lampa.Controller.add(COMPONENT, {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(false, html);
                },
                left: function () {
                    Lampa.Controller.toggle('menu');
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle(COMPONENT);
        };

        this.pause = function () {};
        this.stop = function () {};

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            html.remove();
        };
    }

    function openKinogo() {
        Lampa.Activity.push({
            url: '',
            title: 'Kinogo',
            component: COMPONENT,
            page: 1
        });
    }

    function init() {
        if (initialized) return;
        initialized = true;

        try {
            Lampa.Component.add(COMPONENT, Kinogo);

            if (
                Lampa.Menu &&
                typeof Lampa.Menu.addButton === 'function'
            ) {
                Lampa.Menu.addButton(ICON, 'Kinogo', openKinogo);
            } else {
                addFallbackMenu();
            }

            console.log('[Kinogo] Plugin initialized');
        } catch (error) {
            console.error('[Kinogo] Initialization error:', error);
        }
    }

    function addFallbackMenu() {
        var attempts = 0;

        var timer = setInterval(function () {
            attempts++;

            var menu = $('.menu .menu__list').eq(0);

            if (
                menu.length &&
                !menu.find('.kinogo-menu-item').length
            ) {
                var button = $(
                    '<li class="menu__item selector kinogo-menu-item">' +
                        '<div class="menu__ico">' + ICON + '</div>' +
                        '<div class="menu__text">Kinogo</div>' +
                    '</li>'
                );

                button.on('hover:enter', openKinogo);
                menu.append(button);
                clearInterval(timer);
            }

            if (attempts >= 40) {
                clearInterval(timer);
                console.error('[Kinogo] Menu was not found');
            }
        }, 500);
    }

    function waitForLampa() {
        if (
            window.Lampa &&
            Lampa.Component &&
            typeof Lampa.Component.add === 'function' &&
            Lampa.Activity &&
            Lampa.Controller
        ) {
            if (window.appready) {
                init();
            } else {
                Lampa.Listener.follow('app', function (event) {
                    if (event.type === 'ready') init();
                });
            }
        } else {
            setTimeout(waitForLampa, 500);
        }
    }

    waitForLampa();
})();
