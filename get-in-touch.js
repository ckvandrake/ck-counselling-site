// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

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
window.addEventListener('DOMContentLoaded', function () {
    updateLoginLink();
    window.addEventListener('supabase-session-synced', updateLoginLink);
});
