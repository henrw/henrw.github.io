(function () {
    var root = document.querySelector('[data-pixel-portrait]');
    if (!root) return;

    var canvas = root.querySelector('canvas');
    var video = root.querySelector('.pixel-portrait-source');
    var ctx = canvas.getContext('2d');
    var original = new Image();
    var originalLayer = document.createElement('canvas');
    var originalCtx = originalLayer.getContext('2d');
    var sourceSize = 720;
    var width = 720;
    var height = 680;
    var pointer = { x: -1000, y: -1000 };
    var originalReady = false;
    var videoReady = false;
    var running = true;
    var currentTheme = document.documentElement.dataset.theme || 'light';
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function sizeCanvas() {
        var ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.aspectRatio = width + ' / ' + height;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.imageSmoothingEnabled = true;
    }

    function randomAt(value) {
        var raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
        return raw - Math.floor(raw);
    }

    function drawBottomDissolve() {
        var tile = 10;
        var columns = Math.ceil(width / tile);

        for (var column = 0; column < columns; column++) {
            var rows = 2 + Math.floor(randomAt(column + 11) * 2);
            var x = column * tile;
            var y = height - rows * tile;
            ctx.fillStyle = currentTheme === 'dark' ? '#111210' : '#ffffff';
            ctx.fillRect(x, y, tile, height - y);
        }
    }

    function drawCursorReveal() {
        var tile = 10;
        var radius = 60;
        var startColumn = Math.floor((pointer.x - radius) / tile);
        var endColumn = Math.ceil((pointer.x + radius) / tile);
        var startRow = Math.floor((pointer.y - radius) / tile);
        var endRow = Math.ceil((pointer.y + radius) / tile);

        for (var row = startRow; row <= endRow; row++) {
            for (var column = startColumn; column <= endColumn; column++) {
                var x = column * tile;
                var y = row * tile;
                if (x < 0 || y < 0 || x >= width || y >= height) continue;

                var centerX = x + tile / 2;
                var centerY = y + tile / 2;
                var distance = Math.hypot(centerX - pointer.x, centerY - pointer.y);
                var edgeNoise = (randomAt(column * 31 + row * 17) - .5) * 12;
                if (distance > radius + edgeNoise) continue;

                var alpha = distance < 34 ? 1 : distance < 48 ? .62 : .3;
                ctx.globalAlpha = alpha;
                ctx.drawImage(originalLayer, x, y, tile, tile, x, y, tile, tile);
            }
        }
        ctx.globalAlpha = 1;
    }

    function draw() {
        if (!videoReady) return;
        ctx.globalAlpha = 1;
        ctx.drawImage(video, 0, 0, sourceSize, height, 0, 0, width, height);

        if (originalReady && pointer.x > 0 && pointer.x < width && pointer.y > 0 && pointer.y < height) {
            drawCursorReveal();
        }

        drawBottomDissolve();
    }

    function loop() {
        if (running) draw();
        requestAnimationFrame(loop);
    }

    function reveal() {
        videoReady = true;
        draw();
        root.classList.add('is-ready');
        if (!reduceMotion) video.play().catch(function () {});
    }

    function setTheme(theme) {
        currentTheme = theme;
        var desiredSource = theme === 'dark' ? video.dataset.darkSrc : video.dataset.lightSrc;
        if (!desiredSource || video.getAttribute('src') === desiredSource) {
            draw();
            return;
        }
        videoReady = false;
        video.setAttribute('src', desiredSource);
        video.load();
    }

    sizeCanvas();
    video.addEventListener('loadeddata', reveal);
    video.addEventListener('seeked', draw);
    window.addEventListener('themechange', function (event) {
        setTheme(event.detail.theme);
    });
    setTheme(currentTheme);
    original.onload = function () {
        originalLayer.width = width;
        originalLayer.height = height;
        var originalCropHeight = original.naturalHeight * height / width;
        originalCtx.drawImage(
            original,
            0,
            0,
            original.naturalWidth,
            originalCropHeight,
            0,
            0,
            width,
            height
        );
        originalReady = true;
    };
    original.src = '/images/profile.jpg';

    root.addEventListener('pointermove', function (event) {
        if (event.target.closest('.theme-toggle')) {
            pointer.x = -1000;
            pointer.y = -1000;
            draw();
            return;
        }
        var rect = canvas.getBoundingClientRect();
        pointer.x = (event.clientX - rect.left) * width / rect.width;
        pointer.y = (event.clientY - rect.top) * height / rect.height;
    });
    root.addEventListener('pointerleave', function () {
        pointer.x = -1000;
        pointer.y = -1000;
        draw();
    });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            running = entries[0].isIntersecting;
            if (reduceMotion || !videoReady) return;
            if (running) video.play().catch(function () {});
            else video.pause();
        }).observe(root);
    }

    if (reduceMotion) {
        video.pause();
        video.currentTime = 0;
    }

    requestAnimationFrame(loop);
})();
