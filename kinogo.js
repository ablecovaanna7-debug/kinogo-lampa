(function () {
    'use strict';

    var API_URL = 'https://kinogo-search-proxy-inky.vercel.app/api/search?q=';
    var PLUGIN_ID = 'kinogo_plugin';
    var STYLE_ID = 'kinogo-plugin-styles';

    var currentPage = null;
    var searchInput = null;
    var searchResults = null;
    var searchButton = null;
    var statusElement = null;
    var keyboardHandler = null;
    var searchTimer = null;

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;

        style.textContent = `
            .kinogo-page {
                box-sizing: border-box;
                width: 100%;
                padding: 24px;
                color: #fff;
                font-size: 16px;
                overflow-y: auto;
            }

            .kinogo-page * {
                box-sizing: border-box;
            }

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
                outline: none;
                pointer-events: auto;
                user-select: text;
                -webkit-user-select: text;
            }

            .kinogo-input:focus {
                border-color: #777;
            }

            .kinogo-button {
                padding: 12px 20px;
                border: 0;
                border-radius: 8px;
                background: #fff;
                color: #111;
                font-size: 16px;
                cursor: pointer;
            }

            .kinogo-button:focus,
            .kinogo-result:focus {
                outline: 2px solid #fff;
                outline-offset: 2px;
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

            .kinogo-result:hover,
            .kinogo-result:focus {
                background: #303030;
            }

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

            .kinogo-empty {
                padding: 20px 0;
                color: #aaa;
            }
        `;

        document.head.appendChild(style);
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    /*
     * Обработчик ручного ввода.
     * Основан на коде, который заработал в Console.
     */
    function installInputHandler(input) {
        if (!input) return;

        input.disabled = false;
        input.readOnly = false;
        input.style.pointerEvents = 'auto';

        if (input.dataset.kinogoKeyboardInstalled === '1') return;

        input.dataset.kinogoKeyboardInstalled = '1';

        input.addEventListener('keydown', function (e) {
            if (
                e.key.length === 1 &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
            ) {
                e.preventDefault();
                e.stopPropagation();

                var start = input.selectionStart ?? input.value.length;
                var end = input.selectionEnd ?? input.value.length;

                input.value =
                    input.value.slice(0, start) +
                    e.key +
                    input.value.slice(end);

                var position = start + e.key.length;

                input.setSelectionRange(position, position);

                input.dispatchEvent(
                    new Event('input', { bubbles: true })
                );

                return;
            }

            if (e.key === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();

                var start = input.selectionStart ?? input.value.length;
                var end = input.selectionEnd ?? input.value.length;

                if (start !== end) {
                    input.value =
                        input.value.slice(0, start) +
                        input.value.slice(end);

                    input.setSelectionRange(start, start);
                } else if (start > 0) {
                    input.value =
                        input.value.slice(0, start - 1) +
                        input.value.slice(end);

                    input.setSelectionRange(start - 1, start - 1);
                }

                input.dispatchEvent(
                    new Event('input', { bubbles: true })
                );

                return;
            }

            if (e.key === 'Delete') {
                e.preventDefault();
                e.stopPropagation();

                var start = input.selectionStart ?? input.value.length;
                var end = input.selectionEnd ?? input.value.length;

                if (start !== end) {
                    input.value =
                        input.value.slice(0, start) +
                        input.value.slice(end);
                } else if (start < input.value.length) {
                    input.value =
                        input.value.slice(0, start) +
                        input.value.slice(start + 1);
                }

                input.setSelectionRange(start, start);

                input.dispatchEvent(
                    new Event('input', { bubbles: true })
                );
            }
        }, true);

        input.addEventListener('click', function () {
            input.focus();
        });

        input.addEventListener('input', function () {
            clearTimeout(searchTimer);

            if (input.value.trim().length >= 2) {
                searchTimer = setTimeout(function () {
                    performSearch(input.value.trim());
                }, 800);
            }
        });
    }

    function showStatus(message) {
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    function normalizeResults(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        if (data && Array.isArray(data.items)) return data.items;

        return [];
    }

    function isUsefulResult(item) {
        if (!item || !item.title || !item.url) return false;

        var title = String(item.title).trim();
        var url = String(item.url).trim();

        if (title.length < 2) return false;

        if (/регистрация|забыли пароль|восстановить пароль|войти|главная|случайный фильм/i.test(title)) {
            return false;
        }

        try {
            var parsed = new URL(url);

            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                return false;
            }

            return /kinogo\./i.test(parsed.hostname);
        } catch (e) {
            return false;
        }
    }

    function renderResults(items) {
        if (!searchResults) return;

        var filtered = items.filter(isUsefulResult);

        if (!filtered.length) {
            searchResults.innerHTML =
                '<div class="kinogo-empty">Фильмы не найдены. Попробуй изменить название.</div>';
            return;
        }

        searchResults.innerHTML = filtered.map(function (item, index) {
            return `
                <button class="kinogo-result selector"
                        type="button"
                        data-index="${index}">
                    <div class="kinogo-result-title">
                        ${escapeHtml(item.title)}
                    </div>
                    <div class="kinogo-result-url">
                        ${escapeHtml(item.url)}
                    </div>
                </button>
            `;
        }).join('');

        var buttons = searchResults.querySelectorAll('.kinogo-result');

        buttons.forEach(function (button, index) {
            button.addEventListener('click', function () {
                openMovie(filtered[index].url);
            });

            button.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    openMovie(filtered[index].url);
                }
            });
        });
    }

    async function performSearch(query) {
        query = String(query || '').trim();

        if (query.length < 2) {
            showStatus('Введи название фильма или сериала.');
            return;
        }

        showStatus('Ищем: ' + query + '…');

        if (searchResults) {
            searchResults.innerHTML = '';
        }

        try {
            var response = await fetch(
                API_URL + encodeURIComponent(query),
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Ошибка сервера: ' + response.status);
            }

            var data = await response.json();
            var items = normalizeResults(data);

            renderResults(items);

            var count = items.filter(isUsefulResult).length;

            showStatus(
                count
                    ? 'Найдено результатов: ' + count
                    : 'По запросу «' + query + '» ничего не найдено.'
            );
        } catch (error) {
            console.error('[Kinogo] Ошибка поиска:', error);
            showStatus('Ошибка поиска. Проверь подключение к прокси.');
        }
    }

    function openMovie(url) {
        try {
            var parsed = new URL(url);

            if (!/kinogo\./i.test(parsed.hostname)) {
                showStatus('Некорректная ссылка на фильм.');
                return;
            }

            window.open(parsed.href, '_blank');
        } catch (e) {
            showStatus('Не удалось открыть страницу фильма.');
        }
    }

    function createPage() {
        addStyles();

        var oldPage = document.querySelector('.kinogo-page');

        if (oldPage) {
            oldPage.remove();
        }

        currentPage = document.createElement('div');
        currentPage.className = 'kinogo-page';

        currentPage.innerHTML = `
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

        document.body.appendChild(currentPage);

        searchInput = currentPage.querySelector('.kinogo-input');
        searchResults = currentPage.querySelector('.kinogo-results');
        searchButton = currentPage.querySelector('.kinogo-button');
        statusElement = currentPage.querySelector('.kinogo-status');

        installInputHandler(searchInput);

        currentPage.querySelector('form').addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopPropagation();

            performSearch(searchInput.value);
        });

        searchButton.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        searchInput.addEventListener('focus', function () {
            installInputHandler(searchInput);
        });

        searchInput.focus();

        return currentPage;
    }

    function openPage() {
        if (typeof Lampa === 'undefined') {
            console.error('[Kinogo] Lampa не найдена.');
            return;
        }

        createPage();

        if (Lampa.Activity && typeof Lampa.Activity.push === 'function') {
            Lampa.Activity.push({
                url: '',
                title: 'Kinogo',
                component: 'kinogo_plugin',
                page: currentPage
            });
        }
    }

    function registerPlugin() {
        if (typeof Lampa === 'undefined') {
            console.error('[Kinogo] Lampa не загружена.');
            return;
        }

        if (Lampa.Manifest && typeof Lampa.Manifest.plugins === 'function') {
            Lampa.Manifest.plugins([
                {
                    type: 'other',
                    name: 'Kinogo',
                    description: 'Поиск фильмов на Kinogo'
                }
            ]);
        }

        if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') {
                    addMenuItem();
                }
            });
        } else {
            addMenuItem();
        }
    }

    function addMenuItem() {
        if (document.querySelector('.kinogo-menu-item')) return;

        var menuList = document.querySelector('.menu .menu__list');

        if (!menuList) {
            setTimeout(addMenuItem, 1000);
            return;
        }

        var item = document.createElement('div');
        item.className = 'menu__item selector kinogo-menu-item';
        item.innerHTML = `
            <div class="menu__ico">
                <img src="https://www.google.com/s2/favicons?domain=kinogo.cool&sz=64"
                     style="width:24px;height:24px;">
            </div>
            <div class="menu__text">Kinogo</div>
        `;

        item.addEventListener('click', function () {
            openPage();
        });

        item.addEventListener('hover:enter', function () {
            openPage();
        });

        menuList.appendChild(item);
    }

    registerPlugin();
})();
