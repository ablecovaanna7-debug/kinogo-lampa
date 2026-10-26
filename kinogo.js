(function () {
    'use strict';

    if (window.kinogoPluginLoaded) return;
    window.kinogoPluginLoaded = true;

    var API_URL = 'https://kinogo-search-proxy-lampa-project.vercel.app/api/search?q=';
    var page = null;
    var query = '';

    function init() {
        if (!window.Lampa || !Lampa.Listener) {
            setTimeout(init, 500);
            return;
        }

        if (window.appready) {
            addMenu();
        } else {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') addMenu();
            });
        }
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

        query = '';

        page = document.createElement('div');
        page.className = 'kinogo-page';

        page.style.cssText =
            'position:fixed;inset:0;z-index:99999;' +
            'background:#111;color:#fff;padding:35px;' +
            'box-sizing:border-box;overflow:auto;';

        page.innerHTML = `
            <div style="display:flex;align-items:center;gap:20px;margin-bottom:30px">
                <div class="selector kg-back" style="padding:14px 22px;background:#2787f5;border-radius:10px;font-size:20px">
                    ← Назад
                </div>
                <h1 style="font-size:32px;margin:0">Поиск фильмов Kinogo</h1>
            </div>

            <div class="selector kg-input" style="padding:18px;background:#222;border:2px solid #555;border-radius:10px;font-size:22px;margin-bottom:15px">
                Введите название фильма
            </div>

            <div class="selector kg-search" style="display:inline-block;padding:15px 30px;background:#2787f5;border-radius:10px;font-size:20px;margin-bottom:25px">
                Найти
            </div>

            <div class="kg-status" style="font-size:20px;color:#aaa;margin-bottom:20px">
                Нажмите на поле выше, чтобы открыть клавиатуру.
            </div>

            <div class="kg-results" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:15px"></div>
        `;

        document.body.appendChild(page);

        page.querySelector('.kg-back').addEventListener('hover:enter', closePage);
        page.querySelector('.kg-back').addEventListener('click', closePage);

        page.querySelector('.kg-input').addEventListener('hover:enter', showKeyboard);
        page.querySelector('.kg-input').addEventListener('click', showKeyboard);

        page.querySelector('.kg-search').addEventListener('hover:enter', search);
        page.querySelector('.kg-search').addEventListener('click', search);
    }

    function closePage() {
        if (page) {
            page.remove();
            page = null;
        }
    }

    function showKeyboard() {
        // Используем штатный механизм ввода Lampa.
        if (window.Lampa && Lampa.Input && typeof Lampa.Input.show === 'function') {
            try {
                Lampa.Input.show({
                    title: 'Поиск фильмов Kinogo',
                    value: query,
                    placeholder: 'Название фильма'
                }, function (value) {
                    if (typeof value === 'string') {
                        query = value.trim();

                        var field = page && page.querySelector('.kg-input');
                        if (field) {
                            field.textContent = query || 'Введите название фильма';
                        }
                    }
                });
                return;
            } catch (error) {
                console.error('[Kinogo] Lampa.Input:', error);
            }
        }

        // Запасной вариант для сборок Lampa без Lampa.Input.show.
        if (window.Lampa && Lampa.Modal && typeof Lampa.Modal.open === 'function') {
            var html = document.createElement('div');
            html.innerHTML = `
                <div class="settings-param selector"
                     data-type="input"
                     data-name="kinogo_query"
                     data-string="true"
                     placeholder="Введите название фильма">
                    <div class="settings-param__name">Название фильма</div>
                    <div class="settings-param__value"></div>
                </div>
            `;

            Lampa.Modal.open({
                title: 'Поиск фильмов Kinogo',
                html: html,
                size: 'medium'
            });

            console.warn('[Kinogo] Открыт запасной диалог ввода.');
        } else {
            setStatus('В этой сборке Lampa не найден доступный механизм клавиатуры.');
        }
    }

    function setStatus(message) {
        var status = page && page.querySelector('.kg-status');
        if (status) status.textContent = message;
    }

    function search() {
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
                    } catch (e) {
                        return false;
                    }
                });

                if (!movies.length) {
                    setStatus('Ничего не найдено.');
                    return;
                }

                setStatus('Найдено результатов: ' + movies.length);

                movies.forEach(function (movie) {
                    var title = String(movie.title || movie.name || 'Без названия');
                    var url = String(movie.url || movie.link || '');

                    var card = document.createElement('div');
                    card.className = 'selector';
                    card.style.cssText =
                        'padding:20px;background:#222;border-radius:10px;' +
                        'border:2px solid #383838;font-size:20px;';

                    card.textContent = title;

                    function openMovie() {
                        try {
                            var parsed = new URL(url);
                            if (/^https:$/.test(parsed.protocol) &&
                                /(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(parsed.hostname)) {
                                window.open(parsed.href, '_blank');
                            }
                        } catch (e) {
                            console.error('[Kinogo] URL:', e);
                        }
                    }

                    card.addEventListener('hover:enter', openMovie);
                    card.addEventListener('click', openMovie);
                    results.appendChild(card);
                });
            })
            .catch(function (error) {
                console.error('[Kinogo] Search error:', error);
                setStatus('Ошибка поиска. Проверьте соединение.');
            });
    }

    init();
})();
