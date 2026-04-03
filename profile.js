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

function splitSessionsByStatusAndTime(sessions) {
    var now = new Date();

    var buckets = {
        upcoming: [],
        cancelled: []
    };

    (sessions || []).forEach(function (session) {
        if (!session || !session.session_date) return;

        if (session.status === 'cancelled') {
            buckets.cancelled.push(session);
            return;
        }

        var when = new Date(session.session_date);
        if (isNaN(when.getTime())) return;

        if (when.getTime() >= now.getTime()) {
            buckets.upcoming.push(session);
        }
    });

    buckets.upcoming.sort(function (a, b) {
        return new Date(a.session_date) - new Date(b.session_date);
    });

    return buckets;
}

async function loadUpcomingSessions(user) {
    try {
        var supabase = window.supabaseClient;
        if (!supabase) return;

        var result = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('session_date', { ascending: true });

        var container = document.getElementById('upcoming-sessions');
        if (!container) return;
        var sessions = result.data || [];
        var buckets = splitSessionsByStatusAndTime(sessions);

        if (!buckets.upcoming || buckets.upcoming.length === 0) {
            container.innerHTML =
                '<p class="empty-state">You have no upcoming sessions scheduled.<br><br>' +
                "When you're ready, book your next session using the button above." +
                '</p>';
            return;
        }

        var htmlParts = [];

        if (typeof window.getUserTimeZoneLabel === 'function') {
            var tzLabel = window.getUserTimeZoneLabel();
            htmlParts.push(
                '<p class="timezone-note">All times shown in <strong>' +
                tzLabel +
                '</strong>.</p>'
            );
        }

        if (buckets.upcoming && buckets.upcoming.length > 0) {
            htmlParts.push('<div class="dashboard-section">');
            htmlParts.push(buckets.upcoming.map(function (session) {
                var formattedTime = (typeof window.formatUserLocalTime === 'function')
                    ? window.formatUserLocalTime(session.session_date)
                    : '';
                var duration = session.duration_minutes
                    ? (session.duration_minutes + ' minute session')
                    : '60 minute session';

                var zoomHtml = '';
                if (session.zoom_link) {
                    zoomHtml =
                        '<a href="' + session.zoom_link + '" ' +
                        'target="_blank" rel="noopener noreferrer" ' +
                        'class="zoom-join-btn">' +
                        '📹 Join Zoom Session</a>';
                }

                return (
                    '<div class="session-card">' +
                    '<strong>' + formattedTime + '</strong><br>' +
                    duration + '<br>' +
                    zoomHtml +
                    '</div>'
                );
            }).join(''));
            htmlParts.push('</div>');
        }

        container.innerHTML = htmlParts.join('');
    } catch (e) {
        console.error('Error loading upcoming sessions:', e);
    }
}

async function loadLastSession(user) {
    try {
        var supabase = window.supabaseClient;
        if (!supabase) return;
        var wrap = document.getElementById('last-session');
        var detailsEl = document.getElementById('last-session-details');
        if (!wrap || !detailsEl) return;

        // Prefer explicit "completed" status if it exists, otherwise fallback to any past session_date.
        var result = await supabase
            .from('sessions')
            .select('session_date,status,duration_minutes')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('session_date', { ascending: false })
            .limit(1);

        var row = (result && result.data && result.data[0]) ? result.data[0] : null;
        if (!row) {
            var nowIso = new Date().toISOString();
            var fallback = await supabase
                .from('sessions')
                .select('session_date,status,duration_minutes')
                .eq('user_id', user.id)
                .lt('session_date', nowIso)
                .order('session_date', { ascending: false })
                .limit(1);
            row = (fallback && fallback.data && fallback.data[0]) ? fallback.data[0] : null;
        }

        if (!row || !row.session_date) {
            wrap.style.display = 'none';
            detailsEl.textContent = '';
            return;
        }

        var formattedTime = (typeof window.formatUserLocalTime === 'function')
            ? window.formatUserLocalTime(row.session_date)
            : '';
        var minutes = typeof row.duration_minutes === 'number' && row.duration_minutes > 0
            ? row.duration_minutes
            : 60;
        detailsEl.textContent = formattedTime + ' — ' + minutes + ' min';
        wrap.style.display = 'block';
    } catch (e) {
        // Silent failure: this is an optional enhancement.
        var wrap = document.getElementById('last-session');
        var detailsEl = document.getElementById('last-session-details');
        if (wrap) wrap.style.display = 'none';
        if (detailsEl) detailsEl.textContent = '';
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
// Logout: handled globally by script.js → logout confirmation modal + confirm-logout signOut
