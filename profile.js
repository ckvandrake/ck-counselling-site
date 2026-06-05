// Mobile menu: handled by script.js (loaded before this file on profile.html)

function escapeHtmlCredit(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Same first-name rules as booking credit banner (supabaseClient). */
function getCreditFirstName(user) {
    if (!user) return 'there';
    var meta = user.user_metadata || {};
    var full = (meta.full_name || meta.name || '').trim();
    if (full) {
        var first = full.split(/\s+/)[0];
        if (first) return first;
    }
    if (meta.first_name && String(meta.first_name).trim()) {
        return String(meta.first_name).trim();
    }
    var email = user.email;
    if (email && email.indexOf('@') !== -1) {
        var local = email.split('@')[0];
        var token = local.split(/[.+_-]/)[0];
        if (token) {
            return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
        }
    }
    return 'there';
}

/** Two lines; aligned with booking banner via resolveUserBookingState (supabaseClient). */
function renderSessionCreditsCopy(user, minutes, profileForState) {
    var el = document.getElementById('credit-explanation');
    if (!el) return;
    var first = escapeHtmlCredit(getCreditFirstName(user));
    var formatted =
        typeof window.formatSessionTime === 'function'
            ? window.formatSessionTime(minutes)
            : String(minutes) + ' minutes';
    var line1 = 'Hey ' + first + ', you have ' + formatted + ' remaining.';
    var line2;
    var profile = profileForState || { credits_minutes: minutes, user_stage: 'returning' };
    var state =
        typeof window.resolveUserBookingState === 'function'
            ? window.resolveUserBookingState(profile)
            : minutes < 30
              ? 'no_credits'
              : minutes < 120
                ? 'medium_credits'
                : 'high_credits';
    if (state === 'new_user') {
        line2 = "Welcome — book when you're ready, and add credits anytime.";
    } else if (state === 'no_credits') {
        line2 = 'You will need additional credits soon.';
    } else if (state === 'medium_credits') {
        line2 = "You're in a good range — just keep an eye on your usage.";
    } else {
        line2 = "You're well covered!";
    }
    el.innerHTML = line1 + '<br>' + line2;
}

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
        // Prefer credits table (minutes_available). Fallback: profiles.credits_minutes. Always read user_stage from profiles.
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

        var profileForState = { credits_minutes: 0, user_stage: 'returning' };
        try {
            var profileResult = await supabase
                .from('profiles')
                .select('credits_minutes, user_stage')
                .eq('id', user.id)
                .single();
            if (profileResult.data) {
                if (profileResult.data.user_stage != null) {
                    profileForState.user_stage = profileResult.data.user_stage;
                }
                if (minutes === null && typeof profileResult.data.credits_minutes === 'number') {
                    minutes = profileResult.data.credits_minutes;
                }
            }
        } catch (e) {}
        if (minutes === null) minutes = 0;
        profileForState.credits_minutes = minutes;

        var bookingState =
            typeof window.resolveUserBookingState === 'function'
                ? window.resolveUserBookingState(profileForState)
                : minutes < 30
                  ? 'no_credits'
                  : minutes < 120
                    ? 'medium_credits'
                    : 'high_credits';

        var creditsCard = document.getElementById('session-credits-card');
        if (creditsCard) {
            creditsCard.classList.remove(
                'session-credits--low',
                'session-credits--medium',
                'session-credits--high'
            );
            if (bookingState === 'no_credits') {
                creditsCard.classList.add('session-credits--low');
            } else if (bookingState === 'medium_credits' || bookingState === 'new_user') {
                creditsCard.classList.add('session-credits--medium');
            } else {
                creditsCard.classList.add('session-credits--high');
            }
        }

        var numberEl = document.getElementById('credit-number');
        if (numberEl) {
            numberEl.innerText =
                typeof window.formatSessionTime === 'function'
                    ? window.formatSessionTime(minutes)
                    : String(minutes);
        }

        var bar = document.getElementById('credit-bar-fill');
        var maxCredits = 240;
        var percentage = Math.min((minutes / maxCredits) * 100, 100);
        if (bar) {
            bar.style.width = percentage + '%';
            bar.classList.remove('credit-bar-good', 'credit-bar-warning', 'credit-bar-critical');
            if (minutes >= 120) {
                bar.classList.add('credit-bar-good');
            } else if (minutes >= 30) {
                bar.classList.add('credit-bar-warning');
            } else {
                bar.classList.add('credit-bar-critical');
            }
        }

        renderSessionCreditsCopy(user, minutes, profileForState);

        var cta = document.getElementById('credit-cta');
        if (cta) {
            if (bookingState === 'high_credits') {
                cta.style.display = 'none';
                cta.setAttribute('aria-hidden', 'true');
            } else {
                cta.style.display = '';
                cta.removeAttribute('aria-hidden');
                if (bookingState === 'new_user') {
                    cta.className = 'credit-cta--topup';
                    cta.textContent = 'View pricing';
                    cta.href = 'pricing-online.html';
                } else if (bookingState === 'no_credits') {
                    cta.className = 'primary-btn';
                    cta.textContent = 'Purchase credits';
                    cta.href = 'work-with-me.html';
                } else {
                    cta.className = 'credit-cta--topup';
                    cta.textContent = 'Top up credits';
                    cta.href = 'work-with-me.html';
                }
            }
        }
    } catch (e) {
        console.error('Error loading credits:', e);
        var numberEl = document.getElementById('credit-number');
        if (numberEl) numberEl.innerText = '--';
        var creditsCard = document.getElementById('session-credits-card');
        if (creditsCard) {
            creditsCard.classList.remove(
                'session-credits--low',
                'session-credits--medium',
                'session-credits--high'
            );
        }
        var cta = document.getElementById('credit-cta');
        if (cta) {
            cta.style.display = '';
            cta.removeAttribute('aria-hidden');
            cta.className = 'primary-btn';
            cta.textContent = 'Purchase credits';
        }
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
                '<p class="empty-state">You don\'t have any upcoming sessions.<br><br>' +
                'When you\'re ready, you can book your next session using the button above.' +
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
    await loadUserResources();

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            document.querySelectorAll('.client-dashboard .fade-in').forEach(function (el) {
                el.classList.add('loaded');
            });
        });
    });
}

window.addEventListener('DOMContentLoaded', initDashboard);

function applyNotionResourceLinks(notionPageUrl) {
    var url = notionPageUrl != null ? String(notionPageUrl).trim() : '';
    if (!url) return;

    var cards = document.querySelectorAll(
        '.resources-grid .resource-card:not(#custom-payment-card)'
    );
    if (cards.length < 2) return;

    cards[0].href = url;
    cards[0].setAttribute('target', '_blank');
    cards[1].href = url;
    cards[1].setAttribute('target', '_blank');
}

async function loadUserResources() {
    try {
        var supabase = window.supabaseClient;
        if (!supabase) return;

        var result = await supabase.auth.getUser();
        var user = result.data && result.data.user;
        if (!user) return;

        var profileResult = await supabase
            .from('profiles')
            .select('payment_custom, notion_page_url')
            .eq('id', user.id)
            .single();

        var card = document.getElementById('custom-payment-card');
        if (!card) return;

        if (profileResult.error) {
            console.error('Error fetching profile:', profileResult.error);
            card.classList.add('hidden');
            card.href = '#';
            card.removeAttribute('target');
            card.removeAttribute('rel');
            return;
        }

        if (profileResult.data && profileResult.data.notion_page_url != null) {
            applyNotionResourceLinks(profileResult.data.notion_page_url);
        }

        var raw = profileResult.data && profileResult.data.payment_custom;
        var url = raw != null ? String(raw).trim() : '';
        if (url && /^https?:\/\//i.test(url) === false) {
            url = 'https://' + url.replace(/^\/+/, '');
        }

        if (url) {
            card.classList.remove('hidden');
            card.href = url;
            card.setAttribute('target', '_blank');
            card.setAttribute('rel', 'noopener noreferrer');
        } else {
            card.classList.add('hidden');
            card.href = '#';
            card.removeAttribute('target');
            card.removeAttribute('rel');
        }
    } catch (err) {
        console.error(err);
    }
}
