(function () {
    'use strict';

    if (window.kinogo_plugin_ready) return;
    window.kinogo_plugin_ready = true;

    var COMPONENT = 'kinogo_main';

    function Kinogo() {
        var html = $('<div class="kinogo-page"></div>');

        this.create = function () {
            html.html(
                '<div style="padding:2em">' +
                    '<div style="font-size:2em;margin-bottom:1em">Kinogo</div>' +
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

    function init() {
        Lampa.Component.add(COMPONENT, Kinogo);

        Lampa.Menu.addButton(
            '<svg viewBox="0 0 24 24" width="24" height="24">' +
                '<path fill="currentColor" d="M4 4h16v16H4z"/>' +
            '</svg>',
            'Kinogo',
            function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Kinogo',
                    component: COMPONENT,
                    page: 1
                });
            }
        );

        console.log('[Kinogo] Initialized');
    }

    function wait() {
        if (
            window.Lampa &&
            Lampa.Component &&
            Lampa.Activity &&
            Lampa.Controller &&
            Lampa.Menu &&
            typeof Lampa.Menu.addButton === 'function'
        ) {
            if (window.appready) {
                init();
            } else {
                Lampa.Listener.follow('app', function (event) {
                    if (event.type === 'ready') init();
                });
            }
        } else {
            setTimeout(wait, 500);
        }
    }

    wait();
})();
