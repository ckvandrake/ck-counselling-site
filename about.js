// Mobile menu: handled by script.js (loaded before this file)

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
