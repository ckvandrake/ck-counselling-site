/**
 * Password rules and strength: validatePassword, getPasswordStrength, getPasswordChecklist
 * (+ syncPasswordStrengthElement, clearPasswordStrengthElement, showPasswordMinLengthSubmitError)
 * in ./js/passwordUtils.js
 */
import {
    validatePassword,
    syncPasswordStrengthElement,
    clearPasswordStrengthElement,
    showPasswordMinLengthSubmitError,
    syncPasswordChecklistUI
} from './js/passwordUtils.js';

import {
    ensureUiOverlay,
    showLoader,
    hideLoader,
    showUiModal,
    registerUiModalEscape,
    scheduleUiModalAutoHide,
    resetGlobalOverlayAfterNavigation
} from './js/uiOverlay.js';

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

/* Pre-navigation loading: show brand loader on same-origin navigations only (instant; no preventDefault / no delays). */
(function initPreNavigationOverlay() {
    ensureUiOverlay();

    document.querySelectorAll('a[href]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var href = link.getAttribute('href');
            if (
                !href ||
                href === '#' ||
                href.startsWith('#') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:') ||
                href.startsWith('javascript:')
            ) {
                return;
            }
            if (
                link.target === '_blank' ||
                link.target === '_parent' ||
                link.target === '_top'
            ) {
                return;
            }
            if (link.hasAttribute('download')) {
                return;
            }
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                return;
            }
            try {
                var url = new URL(href, window.location.href);
                if (url.origin !== window.location.origin) {
                    return;
                }
            } catch (ignore) {
                return;
            }

            showLoader();
        });
    });

    window.addEventListener('pageshow', function () {
        resetGlobalOverlayAfterNavigation();
    });

    window.addEventListener('load', function () {
        resetGlobalOverlayAfterNavigation();
    });
})();

// Booking is handled by embedded Cal.com iframe (index.html #booking)
const paymentSection = document.getElementById('payment');
const bookingSection = document.getElementById('booking');
let bookingData = {};

function openPricing() {
    window.location.href = 'work-with-me.html';
}

async function checkBookingAccess() {
    var lockedEl = document.getElementById('booking-locked');
    var unlockedEl = document.getElementById('booking-unlocked');
    if (!lockedEl || !unlockedEl) return;
    var supabase = window.supabaseClient;
    if (!supabase) {
        lockedEl.style.display = '';
        unlockedEl.style.display = 'none';
        return;
    }
    try {
        // Booking access is auth-based only. Credit messaging is handled elsewhere.
        var sessionResult = await supabase.auth.getSession();
        var session = sessionResult.data && sessionResult.data.session;
        var user = session && session.user;
        if (user) {
            lockedEl.style.display = 'none';
            unlockedEl.style.display = '';
        } else {
            lockedEl.style.display = '';
            unlockedEl.style.display = 'none';
        }
    } catch (e) {
        console.error('Error checking booking access:', e);
        lockedEl.style.display = '';
        unlockedEl.style.display = 'none';
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Format time for display
function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Payment Form Handler
const paymentForm = document.getElementById('paymentForm');
const backToBookingBtn = document.getElementById('backToBooking');

if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Collect payment data
        const paymentData = {
            cardName: document.getElementById('cardName').value,
            cardNumber: document.getElementById('cardNumber').value,
            expiry: document.getElementById('expiry').value,
            cvv: document.getElementById('cvv').value
        };

        // Validate card number (basic validation)
        if (!validateCardNumber(paymentData.cardNumber)) {
            alert('Please enter a valid card number');
            return;
        }

        // Show loading state
        const submitBtn = paymentForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;
        showLoader();

        try {
            // In production, this would call your payment gateway API
            // For now, we'll simulate the payment process
            await processPayment(bookingData, paymentData);
            
            // Create calendar event and send Zoom link
            await createCalendarEvent(bookingData);
            
            // Show success message
            showSuccessMessage();
            
            // Reset forms
            const bookingFormEl = document.getElementById('bookingForm');
            if (bookingFormEl) bookingFormEl.reset();
            paymentForm.reset();
            
            // Hide payment section, show booking section
            paymentSection.style.display = 'none';
            bookingSection.style.display = 'block';
            
        } catch (error) {
            alert('Payment processing failed. Please try again.');
            console.error('Payment error:', error);
        } finally {
            hideLoader();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

if (backToBookingBtn) {
    backToBookingBtn.addEventListener('click', () => {
        paymentSection.style.display = 'none';
        bookingSection.style.display = 'block';
        bookingSection.scrollIntoView({ behavior: 'smooth' });
    });
}

// Validate Card Number (Luhn algorithm)
function validateCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
        return false;
    }
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

// Process Payment (Integration point for payment gateway)
async function processPayment(bookingData, paymentData) {
    // TODO: Integrate with your payment gateway (Stripe, PayPal, etc.)
    // Example structure:
    /*
    const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            booking: bookingData,
            payment: {
                amount: bookingData.price,
                currency: 'USD',
                // Note: Never send full card details to your server
                // Use payment gateway's secure token instead
            }
        })
    });
    
    if (!response.ok) {
        throw new Error('Payment failed');
    }
    
    return await response.json();
    */
    
    // Simulate API call delay
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true, transactionId: 'TXN' + Date.now() });
        }, 2000);
    });
}

// Create Calendar Event and Send Zoom Link
async function createCalendarEvent(bookingData) {
    // TODO: Integrate with your calendar API (Google Calendar, Calendly, etc.)
    // Example structure for Google Calendar API:
    /*
    const event = {
        summary: `${bookingData.serviceType} Session - ${bookingData.name}`,
        description: `Counselling session with ${bookingData.name}`,
        start: {
            dateTime: `${bookingData.date}T${bookingData.time}:00`,
            timeZone: 'America/New_York', // Adjust to your timezone
        },
        end: {
            dateTime: `${bookingData.date}T${addHours(bookingData.time, 1)}:00`,
            timeZone: 'America/New_York',
        },
        attendees: [
            { email: bookingData.email }
        ],
        conferenceData: {
            createRequest: {
                requestId: 'zoom-' + Date.now(),
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        }
    };
    
    const response = await fetch('/api/create-calendar-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
    });
    
    if (!response.ok) {
        throw new Error('Failed to create calendar event');
    }
    
    const result = await response.json();
    
    // Send confirmation email with Zoom link
    await sendConfirmationEmail(bookingData, result.zoomLink);
    */
    
    // Simulate API call
    return new Promise((resolve) => {
        setTimeout(() => {
            // Generate a mock Zoom link
            const zoomLink = `https://zoom.us/j/${Math.random().toString(36).substr(2, 9)}`;
            sendConfirmationEmail(bookingData, zoomLink);
            resolve({ zoomLink });
        }, 1000);
    });
}

// Send Confirmation Email with Zoom Link
async function sendConfirmationEmail(bookingData, zoomLink) {
    // TODO: Integrate with your email service (SendGrid, Mailgun, AWS SES, etc.)
    /*
    const emailData = {
        to: bookingData.email,
        subject: 'Your Counselling Session Confirmation',
        html: `
            <h2>Session Confirmed!</h2>
            <p>Dear ${bookingData.name},</p>
            <p>Your ${bookingData.serviceType} session has been confirmed.</p>
            <p><strong>Date:</strong> ${formatDate(bookingData.date)}</p>
            <p><strong>Time:</strong> ${formatTime(bookingData.time)}</p>
            <p><strong>Zoom Link:</strong> <a href="${zoomLink}">Join Session</a></p>
            <p>We look forward to seeing you!</p>
            <p>Best regards,<br>Cronje Karuna Van Drake</p>
        `
    };
    
    const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
        throw new Error('Failed to send confirmation email');
    }
    */
    
    console.log('Email would be sent to:', bookingData.email);
    console.log('Zoom link:', zoomLink);
}

// Show Success Message
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.classList.add('active');
        successMessage.setAttribute('aria-hidden', 'false');
    }
}

const successMessageEl = document.getElementById('successMessage');
const closeSuccessBtn = document.getElementById('closeSuccess');
function closeSuccessOverlay() {
    if (successMessageEl) {
        successMessageEl.classList.remove('active');
        successMessageEl.setAttribute('aria-hidden', 'true');
    }
}
if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
        closeSuccessOverlay();
    });
}
if (successMessageEl) {
    successMessageEl.addEventListener('click', (e) => {
        if (e.target === successMessageEl) closeSuccessOverlay();
    });
}

window.showLoader = showLoader;
window.hideLoader = hideLoader;
window.showUiModal = showUiModal;

// Login Modal
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginLink = document.getElementById('loginLink');
const logoutNavLink = document.getElementById('logoutNavLink');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');

function clearLoginError() {
    var errEl = document.getElementById('loginError');
    if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = 'Incorrect email or password';
    }
    var resend = document.getElementById('resend-confirmation');
    if (resend) resend.remove();
    var emailInput = document.getElementById('loginEmail');
    var passwordInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.classList.remove('error');
    if (passwordInput) passwordInput.classList.remove('error');
}

function showError(message) {
    var loginErrorEl = document.getElementById('loginError');
    if (loginErrorEl) {
        loginErrorEl.textContent = message || 'Something went wrong.';
        loginErrorEl.style.display = 'block';
    } else {
        showAuthError(message);
    }
}

async function resendConfirmationEmail(email) {
    var supabase = window.supabaseClient;
    if (!supabase) {
        showAuthMessage('Error sending email. Try again.');
        return;
    }
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
    });

    if (error) {
        showAuthMessage('Error sending email. Try again.');
    } else {
        showAuthMessage('Confirmation email sent.');
    }
}

function showResendConfirmation(email) {
    const container = document.querySelector('#loginModal .modal-content');
    if (!container) return;

    let el = document.getElementById('resend-confirmation');

    if (!el) {
        el = document.createElement('div');
        el.id = 'resend-confirmation';
        el.style.marginTop = '12px';
        el.style.textAlign = 'center';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = 'Resend confirmation email';
        btn.style.background = 'none';
        btn.style.border = 'none';
        btn.style.color = '#5A1A32';
        btn.style.cursor = 'pointer';
        btn.style.textDecoration = 'underline';

        el.appendChild(btn);
        container.appendChild(el);
    }

    const btn = el.querySelector('button');
    if (btn) {
        btn.onclick = function () {
            resendConfirmationEmail(email);
        };
    }
}

function openLoginModal() {
    clearLoginError();
    var pendingEmail = localStorage.getItem('pendingEmail');
    if (pendingEmail) {
        var loginEmailInput = document.getElementById('loginEmail');
        if (loginEmailInput) loginEmailInput.value = pendingEmail;
    }
    if (loginModal) loginModal.classList.add('active');
}

function closeLoginModal() {
    clearLoginError();
    if (loginModal) loginModal.classList.remove('active');
}

function closeSignupModal() {
    if (signupModal) signupModal.classList.remove('active');
}

function escapeHtml(text) {
    var d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
}

/** Global auth info — unified #ui-overlay-root + .ui-modal */
function showAuthMessage(message) {
    var html =
        '<p id="auth-message-label">' +
        escapeHtml(message) +
        '</p><button type="button" class="ui-modal-dismiss">OK</button>';
    showUiModal(html);
    registerUiModalEscape();
    scheduleUiModalAutoHide(5200);
}

function showAuthError(message) {
    alert(message || 'Something went wrong. Please try again.');
}

window.openLoginModal = openLoginModal;

if (showSignup) {
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginModal) loginModal.classList.remove('active');
        if (signupModal) signupModal.classList.add('active');
    });
}

if (showLogin) {
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        if (signupModal) signupModal.classList.remove('active');
        openLoginModal();
    });
}

// Close modals
document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        if (loginModal) {
            clearLoginError();
            loginModal.classList.remove('active');
        }
        if (signupModal) signupModal.classList.remove('active');
    });
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        clearLoginError();
        loginModal.classList.remove('active');
    }
    if (e.target === signupModal) {
        signupModal.classList.remove('active');
    }
});

// Forgot password view toggle (inside login modal)
const forgotLink = document.getElementById('forgot-password-link');
const backLink = document.getElementById('back-to-login');

const loginView = document.getElementById('login-view');
const forgotView = document.getElementById('forgot-password-view');

const resetBtn = document.getElementById('send-reset-link-btn');
const resetEmailInput = document.getElementById('reset-email');
const resetMessage = document.getElementById('reset-message');

if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearLoginError();
        if (loginView) loginView.style.display = 'none';
        if (forgotView) forgotView.style.display = 'block';
    });
}

if (backLink) {
    backLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearLoginError();
        if (forgotView) forgotView.style.display = 'none';
        if (loginView) loginView.style.display = 'block';
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
        const email = (resetEmailInput && resetEmailInput.value ? resetEmailInput.value : '').trim();

        if (!email) {
            if (resetMessage) resetMessage.textContent = 'Please enter your email.';
            return;
        }

        // loading state
        resetBtn.disabled = true;
        resetBtn.textContent = 'Sending...';
        if (resetMessage) resetMessage.textContent = '';

        try {
            var supabase = window.supabaseClient;
            if (!supabase) throw new Error('Supabase not configured');

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password.html`
            });

            if (error) throw error;

            // IMPORTANT: neutral success message (security)
            if (resetMessage) resetMessage.textContent = 'If that email exists, a reset link has been sent.';
        } catch (err) {
            // Do NOT expose specific errors
            if (resetMessage) resetMessage.textContent = 'Something went wrong. Please try again.';
        }

        // reset button state
        resetBtn.disabled = false;
        resetBtn.textContent = 'Send reset link';
    });
}

// Login Form Handler (Supabase Auth)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = document.getElementById('login-button');
        var emailInput = document.getElementById('loginEmail');
        var passwordInput = document.getElementById('loginPassword');
        var email = emailInput ? emailInput.value.trim() : '';
        clearLoginError();
        var supabase = window.supabaseClient;
        if (!supabase) return;

        if (loginBtn) loginBtn.disabled = true;
        showLoader();
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: passwordInput ? passwordInput.value : ''
            });

            if (error) {
                showError(error.message);
                if (emailInput) emailInput.classList.add('error');
                if (passwordInput) passwordInput.classList.add('error');
                return;
            }

            var user = data.user;

            if (!user || !user.email_confirmed_at) {
                await supabase.auth.signOut();

                showAuthMessage('Please confirm your email before logging in.');

                showResendConfirmation(email);
                return;
            }

            closeLoginModal();
        } finally {
            hideLoader();
            if (loginBtn) loginBtn.disabled = false;
        }
    });

    var loginEmailField = document.getElementById('loginEmail');
    var loginPasswordField = document.getElementById('loginPassword');
    if (loginEmailField) {
        loginEmailField.addEventListener('input', clearLoginError);
    }
    if (loginPasswordField) {
        loginPasswordField.addEventListener('input', clearLoginError);
    }

    var loginPasswordToggle = document.getElementById('togglePassword');
    if (loginPasswordToggle && loginPasswordField) {
        loginPasswordToggle.addEventListener('click', function () {
            if (loginPasswordField.type === 'password') {
                loginPasswordField.type = 'text';
                loginPasswordToggle.textContent = 'Hide';
                loginPasswordToggle.setAttribute('aria-label', 'Hide password');
            } else {
                loginPasswordField.type = 'password';
                loginPasswordToggle.textContent = 'Show';
                loginPasswordToggle.setAttribute('aria-label', 'Show password');
            }
        });
    }
}

// Signup: email confirmation flow — never treat user as logged in until session exists
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    var signupPasswordInput = document.getElementById('signupPassword');
    var signupStrengthEl = document.getElementById('password-strength');
    if (signupPasswordInput && signupStrengthEl) {
        signupPasswordInput.addEventListener('input', function () {
            var v = signupPasswordInput.value;
            syncPasswordStrengthElement(v, signupStrengthEl);
            syncPasswordChecklistUI(v);
        });
    }

    function wireSignupPasswordToggle(toggleBtn, passwordInput) {
        if (!toggleBtn || !passwordInput) return;
        toggleBtn.addEventListener('click', function () {
            var isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
            toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        });
    }
    wireSignupPasswordToggle(
        document.getElementById('toggle-signup-password'),
        document.getElementById('signupPassword')
    );
    wireSignupPasswordToggle(
        document.getElementById('toggle-signup-password-confirm'),
        document.getElementById('signupPasswordConfirm')
    );

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        var nameField = document.getElementById('signupName');
        var emailField = document.getElementById('signupEmail');
        var passwordField = document.getElementById('signupPassword');
        var passwordConfirmField = document.getElementById('signupPasswordConfirm');
        var name = nameField ? nameField.value.trim() : '';
        var marketingOptIn = document.getElementById('marketingOptIn')
            ? document.getElementById('marketingOptIn').checked
            : false;
        var email = emailField ? emailField.value.trim() : '';
        var password = passwordField ? passwordField.value : '';
        var passwordConfirm = passwordConfirmField ? passwordConfirmField.value : '';
        var strengthEl = document.getElementById('password-strength');

        if (!validatePassword(password)) {
            showPasswordMinLengthSubmitError(strengthEl);
            return;
        }

        if (password !== passwordConfirm) {
            showAuthError('Passwords do not match');
            return;
        }

        var supabase = window.supabaseClient;
        if (!supabase) {
            showAuthError('Authentication is not configured. Please set Supabase URL and key.');
            return;
        }

        showLoader();
        try {
            var signUpPayload = { email: email, password: password };
            signUpPayload.options = {
                data: {
                    marketing_opt_in: marketingOptIn
                }
            };
            if (name) {
                signUpPayload.options.data.full_name = name;
            }
            const { data: signData, error } = await supabase.auth.signUp(signUpPayload);

            if (error) {
                showAuthError(error.message);
                return;
            }

            var newUser = signData && signData.user;
            if (newUser && newUser.id) {
                var profilePayload = {
                    id: newUser.id,
                    email: newUser.email || email,
                    marketing_opt_in: marketingOptIn
                };
                var profileResult = await supabase
                    .from('profiles')
                    .upsert(profilePayload, { onConflict: 'id' });
                if (profileResult.error) {
                    console.warn('profiles marketing_opt_in sync:', profileResult.error.message);
                }
            }

            try {
                localStorage.removeItem('user');
            } catch (ignore) {}

            try {
                localStorage.setItem('pendingEmail', email);
            } catch (ignore) {}

            await supabase.auth.signOut();

            closeSignupModal();
            signupForm.reset();
            var togglePw = document.getElementById('toggle-signup-password');
            var togglePw2 = document.getElementById('toggle-signup-password-confirm');
            if (togglePw) {
                togglePw.textContent = 'Show';
                togglePw.setAttribute('aria-label', 'Show password');
            }
            if (togglePw2) {
                togglePw2.textContent = 'Show';
                togglePw2.setAttribute('aria-label', 'Show password');
            }
            if (strengthEl) {
                clearPasswordStrengthElement(strengthEl);
            }
            syncPasswordChecklistUI('');

            showAuthMessage('Check your email to confirm your account before logging in.');

            window.dispatchEvent(new Event('supabase-session-synced'));
        } catch (err) {
            console.error('Signup error:', err);
            showAuthError(err.message || 'Registration failed. Please try again.');
        } finally {
            hideLoader();
        }
    });
}

// Auth helpers for nav/Profile
async function goToProfile() {
    try {
        var supabase = window.supabaseClient;
        if (!supabase) {
            openLoginModal();
            return;
        }
        var result = await supabase.auth.getUser();
        var user = result.data && result.data.user;
        if (user) {
            window.location.href = 'profile.html';
        } else {
            openLoginModal();
        }
    } catch (e) {
        console.error('Error checking auth for profile:', e);
        openLoginModal();
    }
}

async function logout() {
    // Open logout confirmation modal if present; actual sign-out happens there.
    var modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.remove('hidden');
        return;
    }

    // Fallback: direct logout if modal is missing for some reason.
    try {
        var supabase = window.supabaseClient;
        if (supabase) {
            await supabase.auth.signOut();
        }
    } catch (e) {
        console.error('Error during logout:', e);
    } finally {
        try { localStorage.removeItem('user'); } catch (e) {}
        window.location.href = 'index.html';
    }
}

function setLoginNavLoggedOut() {
    if (!loginLink) return;
    loginLink.textContent = 'Login';
    if (document.getElementById('loginModal')) {
        loginLink.href = '#login';
        loginLink.onclick = function (e) {
            e.preventDefault();
            openLoginModal();
        };
    } else {
        loginLink.href = 'index.html#login';
        loginLink.onclick = null;
    }
}

// Navbar auth: only a real Supabase session (getSession) toggles Profile vs Login
function updateNavFromAuth() {
    var supabase = window.supabaseClient;
    if (supabase) {
        supabase.auth.getSession().then(function (result) {
            var data = result.data;
            var session = data && data.session;
            var authed = !!(session && session.user);

            if (loginLink) {
                if (authed) {
                    loginLink.textContent = 'Profile';
                    loginLink.href = '#profile';
                    loginLink.onclick = function (e) {
                        e.preventDefault();
                        goToProfile();
                    };
                } else {
                    setLoginNavLoggedOut();
                }
            }
            if (logoutNavLink) {
                if (authed) {
                    logoutNavLink.style.display = 'inline-block';
                    if (logoutNavLink.parentElement) logoutNavLink.parentElement.style.display = '';
                } else {
                    logoutNavLink.style.display = 'none';
                    if (logoutNavLink.parentElement) logoutNavLink.parentElement.style.display = 'none';
                }
                logoutNavLink.onclick = null;
            }
        }).catch(function () {
            if (loginLink) {
                setLoginNavLoggedOut();
            }
            if (logoutNavLink) {
                logoutNavLink.style.display = 'none';
                if (logoutNavLink.parentElement) logoutNavLink.parentElement.style.display = 'none';
                logoutNavLink.onclick = null;
            }
        });
    } else {
        if (loginLink) {
            setLoginNavLoggedOut();
        }
        if (logoutNavLink) {
            logoutNavLink.style.display = 'none';
            if (logoutNavLink.parentElement) logoutNavLink.parentElement.style.display = 'none';
            logoutNavLink.onclick = null;
        }
    }
}

window.updateNavFromAuth = updateNavFromAuth;

/** Used by pricing.js: run callback only when session exists (never localStorage). */
window.requireAuth = function (onAuthed, _returnUrl) {
    var supabase = window.supabaseClient;
    if (!supabase) {
        window.location.href = 'index.html#login';
        return;
    }
    supabase.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (session && session.user) {
            if (typeof onAuthed === 'function') onAuthed();
        } else {
            window.location.href = 'index.html#login';
        }
    }).catch(function () {
        window.location.href = 'index.html#login';
    });
};

/** Index page: teal active state on Services / Book a Session from scroll position */
function initHomePageSectionNavHighlight() {
    var servicesSection = document.getElementById('services');
    var bookingSection = document.getElementById('booking');
    var navMenu = document.getElementById('navMenu');
    if (!servicesSection || !bookingSection || !navMenu) return;

    var navServices = navMenu.querySelector('a[href="#services"]');
    var navBooking = navMenu.querySelector('a[href="#booking"]');
    if (!navServices || !navBooking) return;

    function docTop(el) {
        return el.getBoundingClientRect().top + window.scrollY;
    }

    function update() {
        var marker = window.scrollY + 110;
        var servicesTop = docTop(servicesSection);
        var bookingTop = docTop(bookingSection);

        navServices.classList.remove('nav-link--active');
        navBooking.classList.remove('nav-link--active');

        if (marker >= bookingTop) {
            navBooking.classList.add('nav-link--active');
        } else if (marker >= servicesTop) {
            navServices.classList.add('nav-link--active');
        }
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('hashchange', update);
    window.addEventListener('load', update);
    requestAnimationFrame(update);
}

window.addEventListener('DOMContentLoaded', async function () {
    var confirmHash = window.location.hash;
    if (
        confirmHash &&
        confirmHash.includes('access_token') &&
        loginModal &&
        window.supabaseClient
    ) {
        window.history.replaceState({}, document.title, window.location.pathname);
        try {
            await window.supabaseClient.auth.signOut();
        } catch (e) {
            console.warn('signOut after email confirmation:', e);
        }
        openLoginModal();
        showAuthMessage('Email confirmed. Please log in.');
        window.dispatchEvent(new Event('supabase-session-synced'));
    }

    updateNavFromAuth();
    initHomePageSectionNavHighlight();
    checkBookingAccess();
    window.addEventListener('supabase-session-synced', function () {
        updateNavFromAuth();
        checkBookingAccess();
    });

    var params = new URLSearchParams(window.location.search);
    var redirect = params.get('redirect');
    var hasRedirect = !!redirect;
    if (hasRedirect && typeof redirect === 'string') {
        window.pendingAction = function () {
            window.location.href = redirect;
        };
    }
    if (loginModal && (window.location.hash === '#login' || hasRedirect)) {
        openLoginModal();
    }

    var bookingLoginBtn = document.getElementById('bookingLoginBtn');
    if (bookingLoginBtn) {
        bookingLoginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openLoginModal();
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("logout-modal");
    const navLogout = document.getElementById("logoutNavLink");
    const confirmBtn = document.getElementById("confirm-logout");
    const cancelBtn = document.getElementById("cancel-logout");

    if (!modal || !navLogout) return;

    navLogout.onclick = null;

    // Open modal (only path from navbar Logout → confirmation)
    navLogout.addEventListener("click", (e) => {
        e.preventDefault();
        modal.classList.remove("hidden");
    });

    // Cancel logout
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
        });
    }

    // Confirm logout (ONLY place where logout happens)
    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            try {
                await window.supabaseClient.auth.signOut();
            } catch (err) {
                console.error("Logout error:", err);
            }

            window.location.href = "/index.html";
        });
    }
});

// e.g. in-page link to #login after load (Book Your Session uses JS; this covers hash-only navigation)
window.addEventListener('hashchange', function () {
    if (window.location.hash === '#login' && loginModal) {
        openLoginModal();
    }
});

// Format card number input
const cardNumberInput = document.getElementById('cardNumber');
if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        e.target.value = formattedValue;
    });
}

// Format expiry date input
const expiryInput = document.getElementById('expiry');
if (expiryInput) {
    expiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    });
}

/** About page: mobile-only progressive disclosure (CSS gates visuals; JS works on all widths harmlessly) */
document.querySelectorAll('.about-page .expand-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
        const content = toggle.previousElementSibling;
        if (!content || !content.classList.contains('collapsible-content')) {
            return;
        }
        const expanded = content.classList.toggle('expanded');
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggle.textContent = expanded ? 'Show less ↑' : 'Read more ↓';
    });
});

// Smooth scroll for same-page #section links only (not bare #, #login, or URLs updated later e.g. profile payment card)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || !href.startsWith('#')) {
            return;
        }
        if (href === '#' || href === '#login') {
            return;
        }
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
