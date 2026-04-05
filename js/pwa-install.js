/**
 * PWA install: Android (beforeinstallprompt), iOS (manual instructions),
 * smart eligibility, dismiss persistence. Vanilla JS; no dependencies.
 */
(function () {
  'use strict';

  var STORAGE_DISMISS = 'installDismissed';
  var ELIGIBILITY_DELAY_MS = 8000;

  var deferredPrompt = null;
  var eligible = false;
  var bannerBound = false;
  var scheduleQueued = false;

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function isInStandaloneMode() {
    return 'standalone' in window.navigator && window.navigator.standalone === true;
  }

  function isInstalled() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      isInStandaloneMode() === true
    );
  }

  function isDismissed() {
    try {
      return localStorage.getItem(STORAGE_DISMISS) === 'true';
    } catch (e) {
      return false;
    }
  }

  function isDashboard() {
    return (
      /profile\.html/i.test(window.location.pathname) ||
      (document.body && document.body.classList.contains('portal-page'))
    );
  }

  function showInstallUI() {
    var banner = ensureBanner();
    if (!banner) return;
    setAndroidMode(banner);
    banner.classList.remove('hidden');
  }

  function showIOSInstructions() {
    var banner = ensureBanner();
    if (!banner) return;
    setIOSMode(banner);
    banner.classList.remove('hidden');
  }

  function hideInstallUI() {
    var banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
  }

  function setAndroidMode(banner) {
    banner.classList.remove('install-banner--ios');
    banner.classList.add('install-banner--android');
    var text = banner.querySelector('#install-banner-text');
    var iosBlock = banner.querySelector('#install-ios-steps');
    var primary = banner.querySelector('#install-btn');
    if (text) {
      text.classList.remove('hidden');
      text.textContent = 'Save Karuna to your phone for easy access';
    }
    if (iosBlock) iosBlock.classList.add('hidden');
    if (primary) {
      primary.style.display = '';
      primary.textContent = 'Add to Home Screen';
    }
  }

  function setIOSMode(banner) {
    banner.classList.remove('install-banner--android');
    banner.classList.add('install-banner--ios');
    var text = banner.querySelector('#install-banner-text');
    var iosBlock = banner.querySelector('#install-ios-steps');
    var primary = banner.querySelector('#install-btn');
    if (text) text.classList.add('hidden');
    if (iosBlock) {
      iosBlock.classList.remove('hidden');
      iosBlock.innerHTML =
        'To install this app:<br />Tap the Share icon (\u2B06\uFE0F)<br />Then select &ldquo;Add to Home Screen&rdquo;';
    }
    if (primary) {
      primary.style.display = '';
      primary.textContent = 'Got it';
    }
  }

  function bindBannerOnce(banner) {
    if (bannerBound) return;
    bannerBound = true;

    var btnInstall = banner.querySelector('#install-btn');
    var btnClose = banner.querySelector('#close-install');

    if (btnInstall) {
      btnInstall.addEventListener('click', function () {
        if (banner.classList.contains('install-banner--ios')) {
          hideInstallUI();
          return;
        }
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice
          .then(function (choice) {
            if (choice.outcome === 'accepted') hideInstallUI();
            deferredPrompt = null;
          })
          .catch(function () {
            deferredPrompt = null;
          });
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', function () {
        try {
          localStorage.setItem(STORAGE_DISMISS, 'true');
        } catch (e) {}
        hideInstallUI();
      });
    }
  }

  function ensureBanner() {
    var el = document.getElementById('install-banner');
    if (el) {
      bindBannerOnce(el);
      return el;
    }
    el = document.createElement('div');
    el.id = 'install-banner';
    el.className = 'install-banner hidden';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Install Karuna Counselling');
    el.innerHTML =
      '<div class="install-banner__inner">' +
      '<p id="install-banner-text" class="install-banner__text"></p>' +
      '<p id="install-ios-steps" class="install-banner__steps hidden" aria-live="polite"></p>' +
      '<div class="install-banner__actions">' +
      '<button type="button" id="install-btn" class="install-banner__btn install-banner__btn--primary"></button>' +
      '<button type="button" id="close-install" class="install-banner__btn install-banner__btn--ghost">Not now</button>' +
      '</div></div>';
    document.body.appendChild(el);
    bindBannerOnce(el);
    return el;
  }

  function setEligible() {
    if (eligible) return;
    eligible = true;
    tryScheduleShow();
  }

  function tryScheduleShow() {
    if (scheduleQueued) return;
    scheduleQueued = true;
    window.requestAnimationFrame(function () {
      scheduleQueued = false;
      maybeShowInstallOffer_inner();
    });
  }

  function maybeShowInstallOffer_inner() {
    if (isDismissed() || isInstalled()) return;
    if (!eligible) return;

    if (isIOS() && !isInStandaloneMode()) {
      showIOSInstructions();
      return;
    }

    if (deferredPrompt) {
      showInstallUI();
    }
  }

  function onFirstInteraction() {
    setEligible();
    window.removeEventListener('click', onFirstInteraction, true);
    window.removeEventListener('keydown', onFirstInteraction, true);
    window.removeEventListener('scroll', onFirstInteraction, true);
    window.removeEventListener('touchstart', onFirstInteraction, true);
  }

  function watchSession() {
    var client = window.supabaseClient;
    if (!client || !client.auth) return;
    client.auth
      .getSession()
      .then(function (res) {
        var session = res.data && res.data.session;
        if (session && session.user) setEligible();
      })
      .catch(function () {});

    if (typeof client.auth.onAuthStateChange === 'function') {
      client.auth.onAuthStateChange(function (_event, session) {
        if (session && session.user) setEligible();
      });
    }
  }

  function init() {
    if (isDismissed() || isInstalled()) return;

    if (isDashboard()) setEligible();

    setTimeout(function () {
      setEligible();
    }, ELIGIBILITY_DELAY_MS);

    window.addEventListener('click', onFirstInteraction, true);
    window.addEventListener('keydown', onFirstInteraction, true);
    window.addEventListener('scroll', onFirstInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', onFirstInteraction, { capture: true, passive: true });

    watchSession();

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      tryScheduleShow();
    });

    window.addEventListener('appinstalled', function () {
      hideInstallUI();
      deferredPrompt = null;
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
