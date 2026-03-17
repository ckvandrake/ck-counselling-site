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

async function checkAuth() {
    try {
        var supabase = window.supabaseClient;
        if (!supabase) {
            window.location.href = 'index.html';
            return null;
        }
        var result = await supabase.auth.getUser();
        var user = result.data && result.data.user;
        if (!user) {
            window.location.href = 'index.html';
            return null;
        }
        return user;
    } catch (e) {
        console.error('Error checking auth on profile:', e);
        window.location.href = 'index.html';
        return null;
    }
}

async function loadCredits(user) {
    try {
        var supabase = window.supabaseClient;
        if (!supabase) return;
        // Prefer credits table (minutes_available). Fallback to profiles.credits_minutes.
        var minutes = null;
        try {
            var creditsResult = await supabase
                .from('credits')
                .select('minutes_available')
                .eq('user_id', user.id)
                .single();
            if (creditsResult.data && typeof creditsResult.data.minutes_available === 'number') {
                minutes = creditsResult.data.minutes_available;
            }
        } catch (e) {}
        if (minutes === null) {
            var profileResult = await supabase
                .from('profiles')
                .select('credits_minutes')
                .eq('id', user.id)
                .single();
            if (profileResult.data && typeof profileResult.data.credits_minutes === 'number') {
                minutes = profileResult.data.credits_minutes;
            }
        }
        if (minutes === null) minutes = 0;

        var numberEl = document.getElementById('credit-number');
        if (numberEl) numberEl.innerText = String(minutes);

        var explanation = document.getElementById('credit-explanation');
        var bar = document.getElementById('credit-bar-fill');
        var maxCredits = 240;
        var percentage = Math.min((minutes / maxCredits) * 100, 100);
        if (bar) {
            bar.style.width = percentage + '%';
            bar.classList.remove('credit-bar-good', 'credit-bar-warning', 'credit-bar-critical');
            if (minutes > 120) {
                bar.classList.add('credit-bar-good');
            } else if (minutes >= 30) {
                bar.classList.add('credit-bar-warning');
            } else {
                bar.classList.add('credit-bar-critical');
            }
        }

        if (explanation) {
            if (minutes >= 90) {
                explanation.innerText = 'You have enough time for a full session.';
            } else if (minutes >= 30) {
                explanation.innerText = 'You have limited session time remaining.';
            } else {
                explanation.innerText = 'Your remaining time may not cover a full session.';
            }
        }

        var cta = document.getElementById('credit-cta');
        if (cta) {
            cta.innerText = minutes < 30 ? 'Add Session Credits' : 'View Session Options';
        }
    } catch (e) {
        console.error('Error loading credits:', e);
        var numberEl = document.getElementById('credit-number');
        if (numberEl) numberEl.innerText = '--';
    }
}

async function loadUpcomingSessions(user) {
    try {
        var supabase = window.supabaseClient;
        if (!supabase) return;
        var result = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'upcoming')
            .order('session_date');
        var container = document.getElementById('upcoming-sessions');
        if (!container) return;
        var sessions = result.data || [];
        if (!sessions || sessions.length === 0) {
            container.innerHTML =
                '<p class="empty-state">You have no upcoming sessions scheduled.<br><br>' +
                "When you're ready, book your next session using the button above." +
                '</p>';
            return;
        }
        container.innerHTML = sessions.map(function (session) {
            var date = new Date(session.session_date);
            var dateText = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            var timeText = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
            var duration = session.duration_minutes ? (session.duration_minutes + ' minute session') : 'Session';
            return (
                '<div class="session-card">' +
                '<strong>' + dateText + '</strong><br>' +
                timeText + '<br>' +
                duration +
                '</div>'
            );
        }).join('');
    } catch (e) {
        console.error('Error loading upcoming sessions:', e);
    }
}

async function loadLastSession(user) {
    try {
        var supabase = window.supabaseClient;
        if (!supabase) return;
        var el = document.getElementById('last-session');
        if (!el) return;

        // Prefer explicit "completed" status if it exists, otherwise fallback to any past session_date.
        var result = await supabase
            .from('sessions')
            .select('session_date,status')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('session_date', { ascending: false })
            .limit(1);

        var row = (result && result.data && result.data[0]) ? result.data[0] : null;
        if (!row) {
            var nowIso = new Date().toISOString();
            var fallback = await supabase
                .from('sessions')
                .select('session_date,status')
                .eq('user_id', user.id)
                .lt('session_date', nowIso)
                .order('session_date', { ascending: false })
                .limit(1);
            row = (fallback && fallback.data && fallback.data[0]) ? fallback.data[0] : null;
        }

        if (!row || !row.session_date) {
            el.style.display = 'none';
            el.innerText = '';
            return;
        }

        var d = new Date(row.session_date);
        var dateText = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        el.innerText = 'Last session: ' + dateText;
        el.style.display = 'block';
    } catch (e) {
        // Silent failure: this is an optional enhancement.
        var el = document.getElementById('last-session');
        if (el) {
            el.style.display = 'none';
            el.innerText = '';
        }
    }
}

async function initDashboard() {
    var user = await checkAuth();
    if (!user) return;

    var fullName =
        (user.user_metadata && (user.user_metadata.first_name || user.user_metadata.full_name || user.user_metadata.name)) ||
        user.email ||
        'friend';
    var firstName = (fullName || 'friend').split(' ')[0];
    var welcome = document.getElementById('welcome-message');
    if (welcome) {
        welcome.innerText = 'Welcome back, ' + firstName;
    }

    var avatar = document.getElementById('user-avatar');
    if (avatar) {
        var nameForInitials = (fullName || '').trim();
        var initials = nameForInitials
            .split(' ')
            .filter(Boolean)
            .map(function (n) { return n[0]; })
            .join('')
            .slice(0, 2)
            .toUpperCase();
        avatar.innerText = initials || '👤';
    }

    await loadCredits(user);
    await loadLastSession(user);
    await loadUpcomingSessions(user);
}

window.addEventListener('DOMContentLoaded', initDashboard);

// (format helpers removed — dashboard renders dates directly)

// Logout Handler (Supabase signOut)
var logoutLink = document.getElementById('logoutLink');
if (logoutLink) {
    logoutLink.addEventListener('click', function (e) {
        e.preventDefault();
        var supabase = window.supabaseClient;
        if (supabase) {
            supabase.auth.signOut().then(function () {
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            }).catch(function () {
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            });
        } else {
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    });
}
