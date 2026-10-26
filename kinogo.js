(function () {
    'use strict';

    var API = 'https://kinogo-search-proxy-inky.vercel.app/api/search?q=';
    var STYLE_ID = 'kinogo-catalog-styles';
    var activePage = null;
    var catalog = [];

    var categories = [
        { title: 'Популярное', query: '2025' },
        { title: 'Фильмы 2026', query: '2026' },
        { title: 'Боевики', query: 'боевик' },
        { title: 'Комедии', query: 'комедия' },
        { title: 'Фантастика', query: 'фантастика' },
        { title: 'Сериалы', query: 'сериал' }
    ];

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .kg-catalog {
                width: 100%;
                height: 100%;
                overflow: auto;
                padding: 24px;
                background: #111;
                color: #fff;
                box-sizing: border-box;
            }
            .kg-catalog * { box-sizing: border-box; }
            .kg-heading {
                font-size: 30px;
                font-weight: 700;
                margin-bottom: 6px;
            }
            .kg-subtitle {
                color: #aaa;
                margin-bottom: 24px;
            }
            .kg-categories {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 24px;
            }
            .kg-category {
                padding: 10px 16px;
                border: 1px solid #444;
                border-radius: 20px;
                background: #242424;
                color: #fff;
                font-size: 15px;
            }
            .kg-category.active,
            .kg-category:focus {
                background: #fff;
                color: #111;
            }
            .kg-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
                gap: 16px;
            }
            .kg-card {
                min-width: 0;
                padding: 0;
                overflow: hidden;
                border: 1px solid #303030;
                border-radius: 12px;
                background: #1c1c1c;
                color: #fff;
                text-align: left;
            }
            .kg-card:focus,
            .kg-card:hover {
                border-color: #aaa;
                background: #292929;
            }
            .kg-poster {
                height: 215px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 12px;
                background: linear-gradient(145deg, #292929, #111);
                text-align: center;
                font-size: 17px;
                font-weight: 700;
            }
            .kg-card-title {
                padding: 12px;
                font-size: 14px;
                line-height: 1.4;
                min-height: 58px;
            }
            .kg-state {
                padding: 20px 0;
                color: #aaa;
            }
            .kg-back {
                padding: 10px 14px;
                margin-bottom: 16px;
                border: 1px solid #555;
                border-radius: 8px;
                background: #292929;
                color: #fff;
            }
            .kg-player {
                width: 100%;
                height: 70vh;
                border: 0;
                background: #000;
            }
            .kg-player-title {
                margin: 12px 0;
                font-size: 22px;
                font-weight: 700;
            }
            @media (max-width: 600px) {
                .kg-catalog { padding: 14px; }
                .kg-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 10px;
                }
                .kg-poster { height: 190px; }
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

    function getResults(query) {
        return fetch(API + encodeURIComponent(query), {
            headers: { Accept: 'application/json' }
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        }).then(function (data) {
            var items = Array.isArray(data)
                ? data
                : (data.results || data.items || []);

            var seen = {};

            return items.filter(function (item) {
                if (!item || !item.title || !item.url) return false;

                if (/регистрация|забыли пароль|восстановить пароль|войти|главная|случайный фильм/i.test(item.title)) {
                    return false;
                }

                try {
                    var url = new URL(item.url);

                    if (!/^https?:$/.test(url.protocol)) return false;
                    if (!/(^|\.)kinogo\./i.test(url.hostname)) return false;
                    if (seen[url.href]) return false;

                    seen[url.href] = true;
                    return true;
                } catch (e) {
                    return false;
                }
            });
        });
    }

    function setStatus(message) {
        var state = activePage &&
            activePage.querySelector('.kg-state');

        if (state) state.textContent = message;
    }

    function renderCards(items) {
        if (!activePage) return;

        var grid = activePage.querySelector('.kg-grid');
        if (!grid) return;

        catalog = items;

        if (!items.length) {
            grid.innerHTML = '';
            setStatus('Фильмы не найдены. Попробуй другую категорию.');
            return;
        }

        setStatus('Найдено фильмов: ' + items.length);

        grid.innerHTML = items.map(function (item, index) {
            return `
                <button class="kg-card selector"
                        type="button"
                        data-index="${index}">
                    <div class="kg-poster">
                        ${escapeHtml(item.title)}
                    </div>
                    <div class="kg-card-title">
                        ${escapeHtml(item.title)}
                    </div>
                </button>
            `;
        }).join('');

        grid.querySelectorAll('.kg-card').forEach(function (button) {
            function selectMovie() {
                var item = catalog[Number(button.dataset.index)];
                if (item) openMovie(item);
            }

            button.addEventListener('click', selectMovie);
            button.addEventListener('hover:enter', selectMovie);
        });
    }

    function loadCategory(index) {
        var category = categories[index] || categories[0];

        setStatus('Загружаем категорию «' + category.title + '»…');

        var grid = activePage.querySelector('.kg-grid');
        if (grid) grid.innerHTML = '';

        getResults(category.query).then(renderCards).catch(function (error) {
            console.error('[Kinogo]', error);
            setStatus('Ошибка загрузки каталога. Проверь поисковый сервер.');
        });
    }

    function showCatalog() {
        activePage.innerHTML = `
            <div class="kg-heading">Kinogo</div>
            <div class="kg-subtitle">Каталог фильмов и сериалов</div>

            <div class="kg-categories">
                ${categories.map(function (category, index) {
                    return `
                        <button
                            class="kg-category selector${index === 0 ? ' active' : ''}"
                            type="button"
                            data-category="${index}">
                            ${escapeHtml(category.title)}
                        </button>
                    `;
                }).join('')}
            </div>

            <div class="kg-state">Загружаем каталог…</div>
            <div class="kg-grid"></div>
        `;

        activePage.querySelectorAll('.kg-category').forEach(function (button) {
            function selectCategory() {
                activePage.querySelectorAll('.kg-category').forEach(function (item) {
                    item.classList.remove('active');
                });

                button.classList.add('active');
                loadCategory(Number(button.dataset.category));
            }

            button.addEventListener('click', selectCategory);
            button.addEventListener('hover:enter', selectCategory);
        });

        loadCategory(0);
    }

    function openMovie(item) {
        activePage.innerHTML = `
            <button class="kg-back selector" type="button">
                ← Назад к каталогу
            </button>

            <div class="kg-player-title">
                ${escapeHtml(item.title)}
            </div>

            <iframe
                class="kg-player"
                src="${escapeHtml(item.url)}"
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen>
            </iframe>

            <div class="kg-state">
                Если видео не отображается, сайт может запрещать
                воспроизведение во встроенном окне.
            </div>
        `;

        var back = activePage.querySelector('.kg-back');

        back.addEventListener('click', showCatalog);
        back.addEventListener('hover:enter', showCatalog);
    }

    function openPage() {
        addStyles();

        var page = document.createElement('div');
        page.className = 'kg-catalog';
        activePage = page;

        showCatalog();

        if (
            typeof Lampa !== 'undefined' &&
            Lampa.Activity &&
            typeof Lampa.Activity.push === 'function'
        ) {
            Lampa.Activity.push({
                url: '',
                title: 'Kinogo',
                component: 'kinogo_catalog',
                page: page
            });
        } else {
            document.body.appendChild(page);
        }
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

        if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') addMenuItem();
            });
        }

        addMenuItem();
    }

    init();
})();
