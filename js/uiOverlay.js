/**
 * Unified overlay: loader (brand spinner) + lightweight .ui-modal messages.
 * #ui-overlay-root stacks above login .modal (2000).
 */

let root;
let loaderEl;
let modalEl;
let escapeHandler;
let activeUiAutoTimer;

function getLogoSrc() {
    var img = document.querySelector('.logo-divider');
    if (img) {
        if (img.complete && img.naturalWidth > 0 && (img.currentSrc || img.src)) {
            return img.currentSrc || img.src;
        }
        var attr = img.getAttribute('src');
        if (attr) return attr;
        if (img.src) return img.src;
    }
    return 'images/CK Van Drizzle Logo .png';
}

export function ensureUiOverlay() {
    if (root) return;

    root = document.createElement('div');
    root.id = 'ui-overlay-root';
    root.className = 'ui-overlay';
    root.setAttribute('aria-hidden', 'true');

    loaderEl = document.createElement('div');
    loaderEl.className = 'loader';
    loaderEl.setAttribute('aria-hidden', 'true');
    loaderEl.style.display = 'none';

    var spinImg = document.createElement('img');
    spinImg.src = getLogoSrc();
    spinImg.alt = '';
    spinImg.width = 56;
    spinImg.height = 56;
    spinImg.loading = 'eager';
    spinImg.decoding = 'sync';
    loaderEl.appendChild(spinImg);

    modalEl = document.createElement('div');
    modalEl.className = 'ui-modal';
    modalEl.style.display = 'none';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');

    root.appendChild(loaderEl);
    root.appendChild(modalEl);
    document.body.appendChild(root);

    root.addEventListener('click', function (e) {
        if (e.target !== root) return;
        if (loaderEl.style.display === 'flex') return;
        hideUiOverlay({ animated: true });
    });
}

export function showLoader() {
    ensureUiOverlay();
    if (activeUiAutoTimer) {
        clearTimeout(activeUiAutoTimer);
        activeUiAutoTimer = null;
    }
    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
    }
    modalEl.style.display = 'none';
    modalEl.innerHTML = '';
    loaderEl.style.display = 'flex';
    loaderEl.setAttribute('aria-hidden', 'false');
    root.classList.add('active');
    root.setAttribute('aria-hidden', 'false');
}

export function hideLoader() {
    if (!root) return;
    loaderEl.style.display = 'none';
    loaderEl.setAttribute('aria-hidden', 'true');
    if (modalEl.style.display === 'none' || modalEl.innerHTML.trim() === '') {
        root.classList.remove('active');
        root.setAttribute('aria-hidden', 'true');
    }
}

function wireModalDismissButtons() {
    modalEl.querySelectorAll('.ui-modal-dismiss').forEach(function (btn) {
        btn.addEventListener('click', function () {
            hideUiOverlay({ animated: true });
        });
    });
}

/**
 * @param {string} contentHTML
 */
export function showUiModal(contentHTML) {
    ensureUiOverlay();
    if (activeUiAutoTimer) {
        clearTimeout(activeUiAutoTimer);
        activeUiAutoTimer = null;
    }
    loaderEl.style.display = 'none';
    loaderEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = contentHTML;
    wireModalDismissButtons();
    modalEl.style.display = 'block';
    root.classList.add('active');
    root.setAttribute('aria-hidden', 'false');
}

export function hideUiOverlay(options) {
    var animated = options && options.animated;
    if (!root) return;
    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
    }
    if (activeUiAutoTimer) {
        clearTimeout(activeUiAutoTimer);
        activeUiAutoTimer = null;
    }

    function clearDom() {
        if (loaderEl) {
            loaderEl.style.display = 'none';
            loaderEl.setAttribute('aria-hidden', 'true');
        }
        if (modalEl) {
            modalEl.style.display = 'none';
            modalEl.innerHTML = '';
        }
        root.setAttribute('aria-hidden', 'true');
    }

    if (!root.classList.contains('active')) {
        clearDom();
        return;
    }

    if (animated) {
        root.classList.remove('active');
        var finished = false;
        function done() {
            if (finished) return;
            finished = true;
            clearDom();
        }
        root.addEventListener(
            'transitionend',
            function (ev) {
                if (ev.target === root && ev.propertyName === 'opacity') done();
            },
            { once: true }
        );
        setTimeout(done, 320);
    } else {
        root.classList.remove('active');
        clearDom();
    }
}

export function registerUiModalEscape() {
    ensureUiOverlay();
    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
    }
    escapeHandler = function (e) {
        if (e.key === 'Escape') {
            hideUiOverlay({ animated: true });
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

export function scheduleUiModalAutoHide(ms) {
    if (activeUiAutoTimer) {
        clearTimeout(activeUiAutoTimer);
        activeUiAutoTimer = null;
    }
    activeUiAutoTimer = setTimeout(function () {
        activeUiAutoTimer = null;
        hideUiOverlay({ animated: true });
    }, ms);
}

/** After full navigation or bfcache restore: drop stuck nav loader (no animation, no artificial delay). */
export function resetGlobalOverlayAfterNavigation() {
    var el = document.getElementById('ui-overlay-root');
    if (!el) return;
    root = el;
    loaderEl = root.querySelector('.loader');
    modalEl = root.querySelector('.ui-modal');
    var hasModalContent = modalEl && modalEl.innerHTML.trim() !== '';
    if (hasModalContent) {
        return;
    }
    hideUiOverlay({ animated: false });
}
