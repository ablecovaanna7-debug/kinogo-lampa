(function () {
    'use strict';

    var API_URL = 'https://kinogo-search-proxy-inky.vercel.app/api/search?q=';
    var MENU_ID = 'kinogo-menu-item';
    var page = null;
    var input = null;

    function init() {
        if (!window.Lampa) {
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

    function buttonStyle() {
        return 'padding:14px 22px;background:#2787f5;color:white;' +
            'border:0;border-radius:8px;font-size:18px;cursor:pointer;';
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
                <h1 style="font-size:30px;margin:0">Поиск фильмов Kinogo</h1>
            </div>

            <form class="kg-form" style="display:flex;gap:10px;margin-bottom:25px">
                <input class="kinogo-input" type="text"
                    placeholder="Введите название фильма на русском"
                    autocomplete="off" spellcheck="false"
                    style="flex:1;min-width:0;padding:15px;font-size:20px;
                    color:white;background:#222;border:2px solid #555;
                    border-radius:8px;outline:none;">
                <button type="submit" style="${buttonStyle()}">Найти</button>
            </form>

            <div class="kg-status" style="color:#aaa;margin-bottom:20px">
                Введите название фильма.
            </div>

            <div class="kg-results"
                style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:15px">
            </div>
        `;

        document.body.appendChild(page);

        input = page.querySelector('.kinogo-input');

        page.querySelector('.kg-back').addEventListener('click', closePage);

        page.querySelector('.kg-form').addEventListener('submit', function (event) {
            event.preventDefault();
            event.stopPropagation();
            searchMovies();
        });

        // Ручной ввод, проверенный через DevTools Console.
        input.addEventListener('keydown', handleKeyDown, true);

        input.addEventListener('click', function (event) {
            event.stopPropagation();
        });

        input.addEventListener('keyup', function (event) {
            event.stopPropagation();
        });

        input.addEventListener('beforeinput', function (event) {
            event.stopPropagation();
        }, true);

        input.addEventListener('input', function (event) {
            event.stopPropagation();
        }, true);

        input.addEventListener('paste', function (event) {
            event.preventDefault();
            event.stopPropagation();

            var clipboard = event.clipboardData || window.clipboardData;
            insertText(clipboard.getData('text'));
        }, true);

        setTimeout(function () {
            if (input) input.focus();
        }, 100);
    }

    function closePage() {
        if (page) page.remove();

        page = null;
        input = null;
    }

    function insertText(text) {
        if (!input || !text) return;

        var start = input.selectionStart ?? input.value.length;
        var end = input.selectionEnd ?? input.value.length;
        var value = input.value;

        var next = value.slice(0, start) + text + value.slice(end);
        var caret = start + text.length;

        input.value = next;

        try {
            input.setSelectionRange(caret, caret);
        } catch (e) {}

        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function deleteText(backward) {
        if (!input) return;

        var value = input.value;
        var start = input.selectionStart ?? value.length;
        var end = input.selectionEnd ?? value.length;

        if (start === end) {
            if (backward && start > 0) {
                start--;
            } else if (!backward && end < value.length) {
                end++;
            } else {
                return;
            }
        }

        var next = value.slice(0, start) + value.slice(end);

        input.value = next;

        try {
            input.setSelectionRange(start, start);
        } catch (e) {}

        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function handleKeyDown(event) {
        event.stopPropagation();

        if (!input) return;

        if (event.key === 'Enter') {
            event.preventDefault();
            searchMovies();
            return;
        }

        if ((event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === 'a') {
            event.preventDefault();
            input.select();
            return;
        }

        if (event.key === 'Backspace') {
            event.preventDefault();
            deleteText(true);
            return;
        }

        if (event.key === 'Delete') {
            event.preventDefault();
            deleteText(false);
            return;
        }

        if (event.key === 'ArrowLeft' ||
            event.key === 'ArrowRight' ||
            event.key === 'Home' ||
            event.key === 'End' ||
            event.key === 'Shift' ||
            event.key === 'Control' ||
            event.key === 'Meta' ||
            event.key === 'Alt' ||
            event.key === 'Tab') {
            return;
        }

        if (event.key.length === 1 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey) {
            event.preventDefault();
            insertText(event.key);
        }
    }

    function setStatus(message) {
        if (!page) return;

        var status = page.querySelector('.kg-status');
        if (status) status.textContent = message;
    }

    function searchMovies() {
        if (!input || !page) return;

        var query = input.value.trim();

        if (query.length < 2) {
            setStatus('Введите минимум 2 символа.');
            return;
        }

        var results = page.querySelector('.kg-results');
        results.innerHTML = '';

        setStatus('Ищем фильмы…');

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
                    var title = String(movie.title || movie.name || '').trim();
                    var url = String(movie.url || movie.link || '').trim();

                    if (!title || !url) return false;

                    if (/забыли пароль|регистрация|случайное|правообладател/i.test(title)) {
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
                    setStatus('По этому запросу фильмы не найдены.');
                    return;
                }

                setStatus('Найдено фильмов: ' + movies.length);

                movies.forEach(function (movie) {
                    var title = String(movie.title || movie.name || 'Без названия');
                    var url = String(movie.url || movie.link || '');

                    var card = document.createElement('div');

                    card.className = 'selector';
                    card.textContent = title;

                    card.style.cssText =
                        'padding:20px;background:#222;border:1px solid #444;' +
                        'border-radius:10px;cursor:pointer;font-size:19px;';

                    function openMovie() {
                        try {
                            var parsed = new URL(url);

                            if (parsed.protocol === 'https:' &&
                                /(^|\.)kinogo\.(ec|cool|town|foo)$/i.test(parsed.hostname)) {
                                window.open(parsed.href, '_blank');
                            }
                        } catch (e) {
                            console.error('[Kinogo] Ошибка ссылки:', e);
                        }
                    }

                    card.addEventListener('click', openMovie);
                    card.addEventListener('hover:enter', openMovie);

                    results.appendChild(card);
                });
            })
            .catch(function (error) {
                console.error('[Kinogo] Ошибка поиска:', error);
                setStatus('Ошибка поиска. Проверьте соединение.');
            });
    }

    init();

    console.log('[Kinogo] Плагин загружен');
})();
