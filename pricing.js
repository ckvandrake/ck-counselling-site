// Mobile menu: script.js. Navbar auth: script.js updateNavFromAuth (session only).

window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href^="payment.html?plan="]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var paymentUrl = link.getAttribute('href') || link.href || 'payment.html?plan=single';
            window.requireAuth(function () {
                window.location.href = paymentUrl;
            }, paymentUrl);
        });
    });
});
