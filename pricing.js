// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Update nav Login/Profile from auth state
function updateLoginLink() {
    var loginLink = document.getElementById('loginLink');
    if (!loginLink) return;
    var userData = localStorage.getItem('user');
    if (userData) {
        loginLink.textContent = 'Profile';
        loginLink.href = 'profile.html';
    } else {
        loginLink.textContent = 'Login';
        loginLink.href = 'index.html#login';
    }
}

// Check if user is logged in and update login link
window.addEventListener('DOMContentLoaded', function () {
    updateLoginLink();
    window.addEventListener('supabase-session-synced', updateLoginLink);

    // Purchase Now: require auth, then go to payment; if not logged in, open login modal or redirect to index and continue after login
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
