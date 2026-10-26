(function () {
    'use strict';

    var API = 'https://kinogo-search-proxy-inky.vercel.app/api/search?q=';
    var STYLE_ID = 'kinogo-plugin-styles';
    var PAGE_CLASS = 'kinogo-page';

    var activePage = null;
    var inputObserver = null;
    var keyboardWatchTimer = null;
    var searchTimer = null;
    var requestNumber = 0;

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .kinogo-page {
                width: 100%;
                height: 100%;
                overflow-y: auto;
                padding: 24px;
                box-sizing: border-box;
                color: #fff;
            }
            .kinogo-page * { box-sizing: border-box; }
            .kinogo-title {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 20px;
            }
            .kinogo-search {
                display: flex;
                gap: 10px;
                width: 100%;
                margin-bottom: 16px;
            }
            .kinogo-input {
                flex: 1;
                min-width: 0;
                padding: 14px;
                border: 2px solid #444;
                border-radius: 8px;
                background: #222;
                color: #fff;
                font-size: 18px;
                pointer-events: auto !important;
                user-select: text !important;
                -webkit-user-select: text !important;
                outline: none;
            }
            .kinogo-input:focus { border-color: #888; }
            .kinogo-button {
                padding: 12px 20px;
                border: 0;
                border-radius: 8px;
                background: #fff;
                color: #111;
                font-size: 16px;
                cursor: pointer;
            }
            .kinogo-status {
                margin: 16px 0;
                color: #bbb;
            }
            .kinogo-results {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 18px;
            }
            .kinogo-result {
                display: block;
                width: 100%;
                padding: 15px;
                border: 1px solid #333;
                border-radius: 8px;
                background: #1b1b1b;
                color: #fff;
                text-align: left;
                cursor: pointer;
            }
            .kinogo-result:focus,
            .kinogo-result:hover { background: #303030; }
            .kinogo-result-title {
                font-size: 17px;
                font-weight: 600;
            }
            .kinogo-result-url {
                margin-top: 6px;
                color: #999;
                font-size: 12px;
                overflow-wrap: anywhere;
            }
        `;

        document.head.appendChild(style);
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (c) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[c];
        });
    }

    /*
     * Исправленный ввод с поддержкой печати,
     * Backspace, Delete и выделения текста.
     */
    function installKeyboard(input) {
        if (!input || input.dataset.kinogoKeyboard === '1') return;

        input.disabled = false;
        input.readOnly = false;
        input.style.pointerEvents = 'auto';
        input.dataset.kinogoKeyboard = '1';

        input.addEventListener('keydown', function (e) {
            if (
                e.key.length === 1 &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
            ) {
                e.preventDefault();
                e.stopPropagation();

                var start = input.selectionStart == null
                    ? input.value.length
                    : input.selectionStart;

                var end = input.selectionEnd == null
                    ? input.value.length
                    : input.selectionEnd;

                input.value =
                    input.value.slice(0, start) +
                    e.key +
                    input.value.slice(end);

                var pos = start + e.key.length;
                input.setSelectionRange(pos, pos);

                input.dispatchEvent(new Event('input', {
                    bubbles: true
                }));

                return;
            }

            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                e.stopPropagation();

                var start = input.selectionStart == null
                    ? input.value.length
                    : input.selectionStart;

                var end = input.selectionEnd == null
                    ? input.value.length
                    : input.selectionEnd;

                if (start !== end) {
                    input.value =
                        input.value.slice(0, start) +
                        input.value.slice(end);
                } else if (e.key === 'Backspace' && start > 0) {
                    input.value =
                        input.value.slice(0, start - 1) +
                        input.value.slice(end);

                    start--;
                } else if (
                    e.key === 'Delete' &&
                    start < input.value.length
                ) {
                    input.value =
                        input.value.slice(0, start) +
                        input.value.slice(start + 1);
                }

                input.setSelectionRange(start, start);

                input.dispatchEvent(new Event('input', {
                    bubbles: true
                }));
            }
        }, true);

        input.addEventListener('click', function () {
            input.focus();
        });
    }

    /*
     * Проверяем поле во всём документе.
     * Это нужно, если Lampa пересоздаёт элементы страницы.
     */
    function startKeyboardWatch() {
        function checkInputs() {
            document
                .querySelectorAll('.' + PAGE_CLASS + ' input')
                .forEach(function (input) {
                    installKeyboard(input);
                });
        }

        checkInputs();

        if (inputObserver) {
            inputObserver.disconnect();
        }

        inputObserver = new MutationObserver(checkInputs);

        inputObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        if (keyboardWatchTimer) {
            clearInterval(keyboardWatchTimer);
        }

        keyboardWatchTimer = setInterval(checkInputs, 500);
    }

    function setStatus(message) {
        if (!activePage) return;

        var status = activePage.querySelector('.kinogo-status');

        if (status) {
            status.textContent = message;
        }
    }

    function normalizeResults(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        if (data && Array.isArray(data.items)) return data.items;

        return [];
    }

    function validResult(item) {
        if (!item || !item.title || !item.url) return false;

        if (
            /регистрация|забыли пароль|восстановить пароль|войти|главная|случайный фильм/i
                .test(item.title)
        ) {
            return false;
        }

        try {
            var url = new URL(item.url);

            return (
                (url.protocol === 'https:' || url.protocol === 'http:') &&
                /(^|\.)kinogo\./i.test(url.hostname)
            );
        } catch (e) {
            return false;
        }
    }

    function openMovie(url) {
        try {
            var parsed = new URL(url);

            if (!/(^|\.)kinogo\./i.test(parsed.hostname)) {
                setStatus('Некорректная ссылка.');
                return;
            }

            window.open(parsed.href, '_blank');
        } catch (e) {
            setStatus('Не удалось открыть фильм.');
        }
    }

    function renderResults(items) {
        if (!activePage) return;

        var container = activePage.querySelector('.kinogo-results');

        if (!container) return;

        var results = items.filter(validResult);

        if (!results.length) {
            container.innerHTML =
                '<div class="kinogo-status">Фильмы не найдены.</div>';

            return;
        }

        container.innerHTML = results.map(function (item, index) {
            return `
                <button
                    class="kinogo-result selector"
                    type="button"
                    data-index="${index}"
                >
                    <div class="kinogo-result-title">
                        ${escapeHtml(item.title)}
                    </div>
                    <div class="kinogo-result-url">
                        ${escapeHtml(item.url)}
                    </div>
                </button>
            `;
        }).join('');

        container.querySelectorAll('.kinogo-result').forEach(function (button) {
            function selectMovie() {
                var index = Number(button.dataset.index);

                if (results[index]) {
                    openMovie(results[index].url);
                }
            }

            button.addEventListener('click', selectMovie);
            button.addEventListener('hover:enter', selectMovie);
        });
    }

    async function search(query) {
        query = String(query || '').trim();

        if (query.length < 2) {
            setStatus('Введи название фильма или сериала.');
            return;
        }

        var thisRequest = ++requestNumber;

        setStatus('Ищем: ' + query + '…');

        var container = activePage &&
            activePage.querySelector('.kinogo-results');

        if (container) {
            container.innerHTML = '';
        }

        try {
            var response = await fetch(
                API + encodeURIComponent(query),
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            var data = await response.json();

            if (thisRequest !== requestNumber) return;

            var items = normalizeResults(data);

            renderResults(items);

            var count = items.filter(validResult).length;

            setStatus(
                count
                    ? 'Найдено результатов: ' + count
                    : 'По запросу «' + query + '» ничего не найдено.'
            );
        } catch (error) {
            console.error('[Kinogo] Search error:', error);

            setStatus(
                'Ошибка поиска. Проверь доступность поискового сервера.'
            );
        }
    }

    function createPage() {
        addStyles();

        var page = document.createElement('div');
        page.className = PAGE_CLASS;

        page.innerHTML = `
            <div class="kinogo-title">Kinogo</div>

            <form class="kinogo-search">
                <input
                    class="kinogo-input"
                    type="text"
                    autocomplete="off"
                    placeholder="Название фильма..."
                    aria-label="Название фильма"
                >

                <button class="kinogo-button" type="submit">
                    Найти
                </button>
            </form>

            <div class="kinogo-status">
                Введи название фильма или сериала.
            </div>

            <div class="kinogo-results"></div>
        `;

        activePage = page;

        var input = page.querySelector('.kinogo-input');
        var form = page.querySelector('.kinogo-search');

        installKeyboard(input);
        startKeyboardWatch();

        input.addEventListener('input', function () {
            clearTimeout(searchTimer);

            var query = input.value.trim();

            if (query.length >= 2) {
                searchTimer = setTimeout(function () {
                    search(query);
                }, 800);
            }
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopPropagation();

            search(input.value);
        });

        return page;
    }

    function openPage() {
        var page = createPage();

        if (
            typeof Lampa !== 'undefined' &&
            Lampa.Activity &&
            typeof Lampa.Activity.push === 'function'
        ) {
            Lampa.Activity.push({
                url: '',
                title: 'Kinogo',
                component: 'kinogo_plugin',
                page: page
            });
        } else {
            document.body.appendChild(page);
        }

        setTimeout(startKeyboardWatch, 0);
        setTimeout(startKeyboardWatch, 300);
        setTimeout(startKeyboardWatch, 1000);
    }

    function addMenuItem() {
        if (document.querySelector('.kinogo-menu-item')) return;

        var menu = document.querySelector('.menu .menu__list');

        if (!menu) {
            setTimeout(addMenuItem, 1000);
            return;
        }

        var item = document.createElement('div');

        item.className = 'menu__item selector kinogo-menu-item';

        item.innerHTML = `
            <div class="menu__ico">🎬</div>
            <div class="menu__text">Kinogo</div>
        `;

        item.addEventListener('click', openPage);
        item.addEventListener('hover:enter', openPage);

        menu.appendChild(item);
    }

    function init() {
        if (typeof Lampa === 'undefined') {
            setTimeout(init, 500);
            return;
        }

        if (
            Lampa.Listener &&
            typeof Lampa.Listener.follow === 'function'
        ) {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') {
                    addMenuItem();
                }
            });
        }

        addMenuItem();
    }

    init();
})();
