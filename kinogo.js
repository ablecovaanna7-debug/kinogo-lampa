(function () {
    'use strict';

    var API_URL = 'https://kinogo-search-proxy-lampa-project.vercel.app/api/search?q=';
    var MENU_ID = 'kinogo-menu-item';
    var page = null;
    var query = '';

    function init() {
        if (!window.Lampa || !Lampa.Listener) {
            setTimeout(init, 500);
            return;
        }

        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') addMenu();
        });

        addMenu();
    }

    function addMenu() {
        if (document.getElementById(MENU_ID)) return;

        var menu = document.querySelector('.menu .menu__list');

        if (!menu) {
            setTimeout(addMenu, 1000);
            return;
        }

        var item = document.createElement('li');
        item.id = MENU_ID;
        item.className = 'menu__item selector';
        item.innerHTML =
            '<div class="menu__ico">🎬</div>' +
            '<div class="menu__text">Kinogo</div>';

        item.addEventListener('hover:enter', openPage);
        item.addEventListener('click', openPage);

        menu.appendChild(item);
    }

    function openPage() {
        if (page) page.remove();

        query = '';

        page = document.createElement('div');
        page.className = 'kinogo-page';
        page.style.cssText =
            'position:fixed;inset:0;z-index:99999;' +
            'background:#111;color:#fff;padding:30px;' +
            'box-sizing:border-box;overflow:auto;';

        page.innerHTML = `
            <div style="display:flex;align-items:center;gap:20px;margin-bottom:25px">
                <div class="selector kg-back" style="${buttonStyle()}">← Назад</div>
                <h1 style="font-size:30px;margin:0">Kinogo</h1>
            </div>

            <div class="selector kg-input" style="
                padding:18px;background:#222;border:2px solid #555;
                border-radius:10px;font-size:22px;margin-bottom:15px;
                cursor:pointer;overflow-wrap:anywhere">
                Нажмите, чтобы ввести название фильма
            </div>

            <div class="selector kg-search" style="
                display:inline-block;padding:15px 30px;
                background:#2787f5;border-radius:10px;
                font-size:20px;margin-bottom:25px;cursor:pointer">
                Найти
            </div>

            <div class="kg-status" style="color:#aaa;font-size:20px;margin-bottom:20px">
                Введите название фильма.
            </div>

            <div class="kg-results" style="
                display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:15px">
            </div>
        `;

        document.body.appendChild(page);

        page.querySelector('.kg-back').addEventListener('click', closePage);
        page.querySelector('.kg-back').addEventListener('hover:enter', closePage);

        page.querySelector('.kg-input').addEventListener('click', showKeyboard);
        page.querySelector('.kg-input').addEventListener('hover:enter', showKeyboard);

        page.querySelector('.kg-search').addEventListener('click', search);
        page.querySelector('.kg-search').addEventListener('hover:enter', search);
    }

    function buttonStyle() {
        return 'padding:14px 22px;background:#2787f5;color:white;' +
            'border-radius:8px;font-size:18px;cursor:pointer;';
    }

    function closePage() {
        if (page) {
            page.remove();
            page = null;
        }
    }

    function setStatus(message) {
        if (!page) return;
        var status = page.querySelector('.kg-status');
        if (status) status.textContent = message;
    }

    // Штатная клавиатура Lampa
    function showKeyboard() {
        if (!window.Lampa || !Lampa.Input || typeof Lampa.Input.edit !== 'function') {
            setStatus('Ошибка: Lampa.Input.edit недоступен.');
            return;
        }

        try {
            Lampa.Input.edit({
                title: 'Поиск фильмов Kinogo',
                value: query,
                placeholder: 'Введите название фильма',
                free: true,
                nosave: true
            }, function (value) {
                if (typeof value !== 'string') return;

                query = value.trim();

                if (page) {
                    var input = page.querySelector('.kg-input');
                    if (input) {
                        input.textContent = query || 'Нажмите, чтобы ввести название фильма';
                    }
                }

                if (query.length >= 2) search();
            });
        } catch (error) {
            console.error('[Kinogo] Ошибка клавиатуры:', error);
            setStatus('Не удалось открыть клавиатуру Lampa.');
        }
    }

    // Поиск через Vercel-прокси
    function search() {
        if (!page) return;

        if (!query || query.length < 2) {
            showKeyboard();
            return;
        }

        var results = page.querySelector('.kg-results');
        results.innerHTML = '';
        setStatus('Ищем фильмы…');

        fetch(API_URL + encodeURIComponent(query))
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) {
                var movies = Array.isArray(data)
                    ? data
                    : data.results || data.items || data.data || [];

                movies = movies.filter(function (movie) {
                    var title = String(movie.title || movie.name || '').trim();
                    var url = String(movie.url || movie.link || '').trim();

                    if (!title || !url) return false;
                    if (/регистрация|забыли пароль|правообладател/i.test(title)) return false;

                    try {
                        var parsed = new URL(url);
                        return parsed.protocol === 'https:' &&
                            /(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(parsed.hostname);
                    } catch (error) {
                        return false;
                    }
                });

                if (!movies.length) {
                    setStatus('Фильмы не найдены. Попробуйте другое название.');
                    return;
                }

                setStatus('Найдено результатов: ' + movies.length);

                movies.forEach(function (movie) {
                    var title = String(movie.title || movie.name || 'Без названия');
                    var url = String(movie.url || movie.link || '');

                    var card = document.createElement('div');
                    card.className = 'selector';
                    card.style.cssText =
                        'padding:20px;background:#222;border:1px solid #444;' +
                        'border-radius:10px;cursor:pointer;font-size:19px;';

                    card.textContent = title;

                    function openMovie() {
                        try {
                            var parsed = new URL(url);

                            if (
                                parsed.protocol === 'https:' &&
                                /(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(parsed.hostname)
                            ) {
                                window.open(parsed.href, '_blank');
                            }
                        } catch (error) {
                            console.error('[Kinogo] Ошибка ссылки:', error);
                        }
                    }

                    card.addEventListener('click', openMovie);
                    card.addEventListener('hover:enter', openMovie);
                    results.appendChild(card);
                });

                if (window.Lampa && Lampa.Controller) {
                    try {
                        Lampa.Controller.collectionSet(results);
                        Lampa.Controller.collectionFocus(false, results);
                    } catch (error) {
                        console.warn('[Kinogo] Навигация:', error);
                    }
                }
            })
            .catch(function (error) {
                console.error('[Kinogo] Ошибка поиска:', error);
                setStatus('Ошибка поиска. Проверьте соединение.');
            });
    }

    init();

    console.log('[Kinogo] Плагин загружен');
})();
