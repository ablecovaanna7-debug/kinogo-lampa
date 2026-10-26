(function () {
    'use strict';

    var API_URL = 'https://kinogo-search-proxy-lampa-project.vercel.app/api/search?q=';
    var page = null;

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
        if (document.getElementById('kinogo-menu-item')) return;

        var menu = document.querySelector('.menu .menu__list');

        if (!menu) {
            setTimeout(addMenu, 1000);
            return;
        }

        var item = document.createElement('li');
        item.id = 'kinogo-menu-item';
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

        page = document.createElement('div');
        page.className = 'kinogo-page';
        page.style.cssText =
            'position:fixed;inset:0;z-index:99999;' +
            'background:#111;color:#fff;padding:30px;' +
            'box-sizing:border-box;overflow:auto;';

        page.innerHTML = `
            <div style="display:flex;align-items:center;gap:20px;margin-bottom:25px">
                <button class="kg-back" style="${buttonStyle()}">← Назад</button>
                <h1 style="font-size:30px;margin:0">Kinogo</h1>
            </div>

            <form class="kg-form" style="display:flex;gap:10px;margin-bottom:25px">
                <input class="kg-input" type="text"
                    placeholder="Введите название фильма..."
                    autocomplete="off"
                    style="flex:1;min-width:0;padding:15px;font-size:20px;
                    color:white;background:#222;border:2px solid #555;
                    border-radius:8px;outline:none;">
                <button type="submit" style="${buttonStyle()}">Найти</button>
            </form>

            <div class="kg-status" style="color:#aaa;margin-bottom:20px">
                Введите название фильма с клавиатуры MacBook.
            </div>

            <div class="kg-results"
                style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:15px">
            </div>
        `;

        document.body.appendChild(page);

        var input = page.querySelector('.kg-input');
        var form = page.querySelector('.kg-form');

        page.querySelector('.kg-back').addEventListener('click', closePage);

        // Не позволяем обработчикам Lampa перехватывать ввод.
        input.addEventListener('keydown', function (event) {
            event.stopPropagation();
        });

        input.addEventListener('keyup', function (event) {
            event.stopPropagation();
        });

        input.addEventListener('click', function (event) {
            event.stopPropagation();
            input.focus();
        });

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            event.stopPropagation();

            var query = input.value.trim();
            if (query.length < 2) {
                setStatus('Введите минимум 2 символа.');
                input.focus();
                return;
            }

            searchMovies(query);
        });

        // Передаём фокус полю ввода.
        setTimeout(function () {
            input.focus();
        }, 100);
    }

    function buttonStyle() {
        return 'padding:14px 22px;background:#2787f5;color:white;' +
            'border:0;border-radius:8px;font-size:18px;cursor:pointer;';
    }

    function closePage() {
        if (page) {
            page.remove();
            page = null;
        }
    }

    function setStatus(text) {
        if (!page) return;
        var status = page.querySelector('.kg-status');
        if (status) status.textContent = text;
    }

    function searchMovies(query) {
        if (!page) return;

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
                    if (/регистрация|забыли пароль|правообладател/i.test(title)) {
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

                    card.addEventListener('click', function () {
                        openMovie(url);
                    });

                    card.addEventListener('hover:enter', function () {
                        openMovie(url);
                    });

                    results.appendChild(card);
                });
            })
            .catch(function (error) {
                console.error('[Kinogo] Ошибка:', error);
                setStatus('Ошибка поиска. Проверь соединение.');
            });
    }

    function openMovie(url) {
        try {
            var parsed = new URL(url);

            if (
                parsed.protocol !== 'https:' ||
                !/(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(parsed.hostname)
            ) {
                setStatus('Недопустимая ссылка.');
                return;
            }

            window.open(parsed.href, '_blank');
        } catch (error) {
            console.error('[Kinogo] Ошибка ссылки:', error);
        }
    }

    init();
})();
