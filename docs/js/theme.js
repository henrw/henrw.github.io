(function () {
    var root = document.documentElement;
    var toggle = document.querySelector('.theme-toggle');
    var media = window.matchMedia('(prefers-color-scheme: dark)');

    if (!toggle) return;

    function applyTheme(theme) {
        var isDark = theme === 'dark';
        root.dataset.theme = theme;
        toggle.setAttribute('aria-pressed', String(isDark));
        toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#111210' : '#fbfbfa');
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }

    applyTheme(root.dataset.theme);
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            root.classList.add('theme-ready');
        });
    });

    toggle.addEventListener('click', function () {
        var nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', nextTheme);
        applyTheme(nextTheme);
    });

    media.addEventListener('change', function (event) {
        if (!localStorage.getItem('theme')) {
            applyTheme(event.matches ? 'dark' : 'light');
        }
    });
})();
