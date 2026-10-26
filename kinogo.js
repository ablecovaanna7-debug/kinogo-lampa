(function () {
    'use strict';

    var API_URL = 'https://kinogo-search-proxy-lampa-project.vercel.app/api/search?q=';
    var MENU_ID = 'kinogo_plugin_menu';
    var currentPage = null;

    // ==========================================
    // МЕНЮ LAMPA
    // ==========================================

    function init() {
        if (!window.Lampa || !Lampa.Listener) {
            setTimeout(init, 500);
            return;
        }

        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                addMenuItem();
            }
        });

        addMenuItem();

        console.log('[Kinogo] Плагин загружен');
    }

    function addMenuItem() {
        if (document.getElementById(MENU_ID)) return;

        var menu = document.querySelector('.menu .menu__list');

        if (!menu) {
            setTimeout(addMenuItem, 1000);
            return;
        }

        var item = document.createElement('li');

        item.id = MENU_ID;
        item.className = 'menu__item selector';

        item.innerHTML = `
            <div class="menu__ico">
                <svg viewBox="0 0 24 24"
                     width="24"
                     height="24"
                     fill="currentColor">
                    <path d="M4 4h16v16H4z M7 7v10l9-5z"/>
                </svg>
            </div>
            <div class="menu__text">Kinogo</div>
        `;

        item.addEventListener('hover:enter', openSearch);
        item.addEventListener('click', openSearch);

        menu.appendChild(item);
    }

    // ==========================================
    // СТРАНИЦА ПОИСКА
    // ==========================================

    function openSearch() {
        if (currentPage) {
            currentPage.remove();
            currentPage = null;
        }

        var page = document.createElement('div');

        page.className = 'kinogo-page';

        page.style.cssText = `
            position:fixed;
            inset:0;
            z-index:99999;
            background:#111;
            color:#fff;
            padding:35px;
            box-sizing:border-box;
            overflow-y:auto;
        `;

        page.innerHTML = `
            <div style="
                display:flex;
                align-items:center;
                gap:20px;
                margin-bottom:30px;
                flex-wrap:wrap;
            ">
                <div class="selector kinogo-back" style="
                    padding:12px 20px;
                    background:#2787f5;
                    border-radius:10px;
                    font-size:20px;
                    cursor:pointer;
                ">← Назад</div>

                <h1 style="
                    margin:0;
                    font-size:32px;
                ">Поиск фильмов Kinogo</h1>
            </div>

            <div style="
                display:flex;
                gap:12px;
                margin-bottom:25px;
                flex-wrap:wrap;
            ">
                <div class="selector kinogo-search-button" style="
                    padding:16px 22px;
                    background:#252525;
                    border:2px solid #555;
                    border-radius:10px;
                    font-size:20px;
                    cursor:pointer;
                    flex:1;
                    min-width:250px;
                ">
                    <span class="kinogo-query">
                        Нажмите, чтобы ввести название фильма
                    </span>
                </div>

                <div class="selector kinogo-find" style="
                    padding:16px 28px;
                    background:#2787f5;
                    border-radius:10px;
                    font-size:20px;
                    cursor:pointer;
                ">Найти</div>
            </div>

            <div class="kinogo-status" style="
                color:#aaa;
                font-size:20px;
                margin-bottom:25px;
            ">Введите название фильма.</div>

            <div class="kinogo-results" style="
                display:grid;
                grid-template-columns:repeat(auto-fill,minmax(240px,1fr));
                gap:15px;
            "></div>
        `;

        document.body.appendChild(page);
        currentPage = page;

        var query = '';

        var back = page.querySelector('.kinogo-back');
        var searchButton = page.querySelector('.kinogo-search-button');
        var findButton = page.querySelector('.kinogo-find');

        back.addEventListener('hover:enter', closePage);
        back.addEventListener('click', closePage);

        searchButton.addEventListener('hover:enter', showKeyboard);
        searchButton.addEventListener('click', showKeyboard);

        findButton.addEventListener('hover:enter', runSearch);
        findButton.addEventListener('click', runSearch);

        function closePage() {
            if (currentPage) {
                currentPage.remove();
                currentPage = null;
            }
        }

        function showKeyboard() {
            if (!window.Lampa || !Lampa.Input) {
                setStatus('Ошибка: клавиатура Lampa недоступна.');
                return;
            }

            Lampa.Input.show({
                title: 'Поиск фильмов Kinogo',
                value: query,
                placeholder: 'Введите название фильма',
                free: true
            }, function (value) {
                if (typeof value !== 'string') return;

                query = value.trim();

                var label = page.querySelector('.kinogo-query');

                label.textContent = query ||
                    'Нажмите, чтобы ввести название фильма';

                if (query) {
                    runSearch();
                }
            });
        }

        function setStatus(message) {
            var status = page.querySelector('.kinogo-status');
            if (status) status.textContent = message;
        }

        function runSearch() {
            if (!query || query.length < 2) {
                showKeyboard();
                return;
            }

            searchMovies(page, query);
        }
    }

    // ==========================================
    // ПОИСК ЧЕРЕЗ VERCEL
    // ==========================================

    function searchMovies(page, query) {
        var status = page.querySelector('.kinogo-status');
        var results = page.querySelector('.kinogo-results');

        results.innerHTML = '';
        status.textContent = 'Ищем фильмы…';

        fetch(API_URL + encodeURIComponent(query))
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }

                return response.json();
            })
            .then(function (data) {
                var movies = Array.isArray(data)
                    ? data
                    : data.results || data.items || data.data || [];

                movies = movies.filter(function (movie) {
                    var title = String(
                        movie.title || movie.name || ''
                    ).trim();

                    var url = String(
                        movie.url || movie.link || ''
                    ).trim();

                    if (!title || !url) return false;

                    if (/регистрация|забыли пароль|войти|главная|правообладател/i.test(title)) {
                        return false;
                    }

                    try {
                        var parsed = new URL(url);

                        return parsed.protocol === 'https:' &&
                            /(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(
                                parsed.hostname
                            );
                    } catch (e) {
                        return false;
                    }
                });

                if (!movies.length) {
                    status.textContent =
                        'Ничего не найдено. Попробуйте другое название.';
                    return;
                }

                status.textContent =
                    'Найдено фильмов: ' + movies.length;

                movies.forEach(function (movie) {
                    var title = String(
                        movie.title || movie.name || 'Без названия'
                    );

                    var url = String(movie.url || movie.link || '');

                    var card = document.createElement('div');

                    card.className = 'selector';

                    card.style.cssText = `
                        padding:20px;
                        background:#222;
                        border:2px solid #383838;
                        border-radius:12px;
                        cursor:pointer;
                    `;

                    var heading = document.createElement('div');

                    heading.textContent = title;

                    heading.style.cssText = `
                        font-size:20px;
                        font-weight:600;
                        line-height:1.4;
                        margin-bottom:12px;
                    `;

                    var caption = document.createElement('div');

                    caption.textContent = 'Открыть фильм →';

                    caption.style.cssText = `
                        color:#58a6ff;
                        font-size:16px;
                    `;

                    card.appendChild(heading);
                    card.appendChild(caption);

                    card.addEventListener('hover:enter', function () {
                        openMovie(url);
                    });

                    card.addEventListener('click', function () {
                        openMovie(url);
                    });

                    results.appendChild(card);
                });

                if (window.Lampa && Lampa.Controller) {
                    try {
                        Lampa.Controller.collectionSet(
                            results
                        );

                        Lampa.Controller.collectionFocus(
                            false,
                            results
                        );
                    } catch (e) {
                        console.log('[Kinogo] Навигация:', e);
                    }
                }
            })
            .catch(function (error) {
                console.error('[Kinogo] Ошибка поиска:', error);

                status.textContent =
                    'Ошибка поиска. Проверьте соединение и попробуйте снова.';
            });
    }

    // ==========================================
    // ОТКРЫТИЕ ФИЛЬМА
    // ==========================================

    function openMovie(url) {
        try {
            var parsed = new URL(url);

            if (
                parsed.protocol !== 'https:' ||
                !/(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(
                    parsed.hostname
                )
            ) {
                console.error('[Kinogo] Недопустимый адрес:', url);
                return;
            }

            window.open(parsed.href, '_blank');
        } catch (e) {
            console.error('[Kinogo] Ошибка открытия фильма:', e);
        }
    }

    init();
})();
