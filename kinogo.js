(function () {
    'use strict';

    var PLUGIN_NAME = 'Kinogo';
    var API_URL = 'https://kinogo-search-proxy-lampa-project.vercel.app/api/search?q=';

    // Добавляем пункт Kinogo в меню Lampa
    function addMenuItem() {
        if (!window.Lampa || !Lampa.Listener) {
            setTimeout(addMenuItem, 500);
            return;
        }

        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                createMenu();
            }
        });

        createMenu();
    }

    function createMenu() {
        if (document.querySelector('[data-kinogo-menu]')) return;

        var menu = document.querySelector('.menu .menu__list');

        if (!menu) {
            setTimeout(createMenu, 1000);
            return;
        }

        var item = document.createElement('li');
        item.className = 'menu__item selector';
        item.setAttribute('data-kinogo-menu', 'true');
        item.innerHTML =
            '<div class="menu__ico">' +
                '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">' +
                    '<path d="M4 4h16v16H4z M7 7v10l9-5z"/>' +
                '</svg>' +
            '</div>' +
            '<div class="menu__text">Kinogo</div>';

        item.addEventListener('hover:enter', openSearch);
        item.addEventListener('click', openSearch);

        menu.appendChild(item);
    }

    // Открываем страницу поиска
    function openSearch() {
        var existing = document.querySelector('.kinogo-page');
        if (existing) existing.remove();

        var page = document.createElement('div');
        page.className = 'kinogo-page';
        page.style.cssText =
            'position:fixed;inset:0;z-index:9999;' +
            'background:#111;color:#fff;padding:35px;' +
            'box-sizing:border-box;overflow-y:auto;';

        page.innerHTML = `
            <div style="display:flex;align-items:center;gap:15px;margin-bottom:25px;">
                <button class="kinogo-back" style="${buttonStyle()}">← Назад</button>
                <h2 style="margin:0;font-size:28px;">Поиск фильмов Kinogo</h2>
            </div>

            <form class="kinogo-form" style="display:flex;gap:10px;margin-bottom:25px;max-width:900px;">
                <input
                    class="kinogo-input"
                    type="text"
                    placeholder="Введите название фильма на русском"
                    autocomplete="off"
                    style="flex:1;min-width:0;padding:15px;font-size:18px;
                    border:1px solid #555;border-radius:8px;
                    background:#222;color:#fff;outline:none;"
                >
                <button type="submit" style="${buttonStyle()}">Найти</button>
            </form>

            <div class="kinogo-status" style="margin-bottom:20px;color:#aaa;">
                Введите название фильма.
            </div>

            <div class="kinogo-results"
                style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:15px;">
            </div>
        `;

        document.body.appendChild(page);

        page.querySelector('.kinogo-back').addEventListener('click', function () {
            page.remove();
        });

        page.querySelector('.kinogo-form').addEventListener('submit', function (event) {
            event.preventDefault();

            var query = page.querySelector('.kinogo-input').value.trim();

            if (query.length < 2) {
                setStatus(page, 'Введите минимум 2 символа.');
                return;
            }

            searchMovies(page, query);
        });

        var input = page.querySelector('.kinogo-input');
        input.focus();
    }

    function buttonStyle() {
        return 'padding:13px 20px;border:0;border-radius:8px;' +
            'background:#2787f5;color:white;font-size:16px;' +
            'cursor:pointer;';
    }

    function setStatus(page, message) {
        var status = page.querySelector('.kinogo-status');
        if (status) status.textContent = message;
    }

    // Ищем фильмы через Vercel-прокси
    function searchMovies(page, query) {
        var results = page.querySelector('.kinogo-results');

        results.innerHTML = '';
        setStatus(page, 'Ищем фильмы…');

        fetch(API_URL + encodeURIComponent(query))
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Ошибка сервера: ' + response.status);
                }

                return response.json();
            })
            .then(function (data) {
                var movies = Array.isArray(data)
                    ? data
                    : (data.results || data.items || data.data || []);

                // Убираем ссылки на регистрацию, навигацию и прочий мусор
                movies = movies.filter(function (movie) {
                    var title = String(movie.title || movie.name || '').trim();
                    var url = String(movie.url || movie.link || '').trim();

                    if (!title || !url) return false;

                    if (/регистрация|забыли пароль|войти|главная|топ фильмов|правообладател/i.test(title)) {
                        return false;
                    }

                    try {
                        var parsed = new URL(url);
                        return parsed.protocol === 'https:' &&
                            /(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(parsed.hostname);
                    } catch (e) {
                        return false;
                    }
                });

                if (!movies.length) {
                    setStatus(page, 'Ничего не найдено. Попробуйте другое название.');
                    return;
                }

                setStatus(page, 'Найдено результатов: ' + movies.length);

                movies.forEach(function (movie) {
                    var title = String(movie.title || movie.name || 'Без названия');
                    var url = String(movie.url || movie.link || '');

                    var card = document.createElement('div');
                    card.style.cssText =
                        'padding:18px;background:#202020;border:1px solid #333;' +
                        'border-radius:10px;cursor:pointer;min-height:75px;';

                    var heading = document.createElement('div');
                    heading.textContent = title;
                    heading.style.cssText =
                        'font-size:17px;font-weight:600;line-height:1.4;margin-bottom:12px;';

                    var link = document.createElement('div');
                    link.textContent = 'Открыть на Kinogo →';
                    link.style.cssText = 'font-size:14px;color:#58a6ff;';

                    card.appendChild(heading);
                    card.appendChild(link);

                    card.addEventListener('click', function () {
                        openMovie(url);
                    });

                    results.appendChild(card);
                });
            })
            .catch(function (error) {
                console.error('[Kinogo] Ошибка поиска:', error);
                setStatus(page, 'Не удалось выполнить поиск. Попробуйте ещё раз.');
            });
    }

    // Открываем выбранный фильм
    function openMovie(url) {
        if (!url) return;

        try {
            var parsed = new URL(url);

            if (!/(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(parsed.hostname)) {
                console.error('[Kinogo] Заблокирован неизвестный адрес:', url);
                return;
            }

            window.open(parsed.href, '_blank');
        } catch (e) {
            console.error('[Kinogo] Неверная ссылка:', e);
        }
    }

    addMenuItem();

    console.log('[Kinogo] Плагин загружен');
})();
