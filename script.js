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
    var result = await supabase.auth.getUser();
    var user = result.data && result.data.user;
    if (!user) {
        lockedEl.style.display = '';
        unlockedEl.style.display = 'none';
        return;
    }
    var minutesResult = await supabase.from('profiles').select('credits_minutes').eq('id', user.id).maybeSingle();
    var credits_minutes = (minutesResult.data && typeof minutesResult.data.credits_minutes === 'number') ? minutesResult.data.credits_minutes : 0;
    console.log("User minutes remaining:", credits_minutes);
    if (credits_minutes >= 30) {
        lockedEl.style.display = 'none';
        unlockedEl.style.display = '';
    } else {
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
        successMessage.style.display = 'flex';
    }
}

const closeSuccessBtn = document.getElementById('closeSuccess');
if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
        const successMessage = document.getElementById('successMessage');
        if (successMessage) {
            successMessage.style.display = 'none';
        }
    });
}

// Login Modal
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginLink = document.getElementById('loginLink');
const logoutNavLink = document.getElementById('logoutNavLink');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');

function openLoginModal() {
    if (loginModal) loginModal.style.display = 'block';
}
function closeLoginModal() {
    if (loginModal) loginModal.style.display = 'none';
}
window.openLoginModal = openLoginModal;

if (showSignup) {
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginModal) loginModal.style.display = 'none';
        if (signupModal) signupModal.style.display = 'block';
    });
}

if (showLogin) {
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        if (signupModal) signupModal.style.display = 'none';
        if (loginModal) loginModal.style.display = 'block';
    });
}

// Close modals
document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        if (loginModal) loginModal.style.display = 'none';
        if (signupModal) signupModal.style.display = 'none';
    });
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
    }
    if (e.target === signupModal) {
        signupModal.style.display = 'none';
    }
});

// Login Form Handler (Supabase Auth)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        var emailInput = document.getElementById('loginEmail');
        var passwordInput = document.getElementById('loginPassword');
        var supabase = window.supabaseClient;
        if (!supabase) return;
        var result = await supabase.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value
        });
        var data = result.data;
        var error = result.error;
        if (error) {
            console.error(error);
            return;
        }
        console.log("User signed in:", data.user);
        closeLoginModal();
    });
}

// Signup Form Handler (Supabase Auth + insert into users table)
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
        
        if (password !== passwordConfirm) {
            alert('Passwords do not match');
            return;
        }
        
        var supabase = window.supabaseClient;
        if (!supabase) {
            alert('Authentication is not configured. Please set Supabase URL and key.');
            return;
        }
        
        try {
            var result = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: name } }
            });
            var err = result.error;
            if (err) throw new Error(err.message);
            
            var user = result.data.user;
            if (user) {
                var insertResult = await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    credits_minutes: 0
                }).select();
                if (insertResult.error && insertResult.error.code !== '23505') {
                    console.warn('Profiles insert warning:', insertResult.error.message);
                }
            }
            
            var session = result.data.session;
            if (window.__supabaseSyncSession) window.__supabaseSyncSession(session);
            
            signupModal.style.display = 'none';
            if (window.pendingAction) {
                return;
            }
            var params = new URLSearchParams(window.location.search);
            var redirect = params.get('redirect');
            if (redirect) {
                window.location.href = redirect;
            } else {
                if (loginLink) {
                    loginLink.textContent = 'Profile';
                    loginLink.href = 'profile.html';
                }
            }
        } catch (error) {
            alert(error.message || 'Registration failed. Please try again.');
            console.error('Signup error:', error);
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

// Check if user is logged in on page load (Supabase session or synced localStorage)
function updateNavFromAuth() {
    var supabase = window.supabaseClient;
    if (supabase) {
        supabase.auth.getSession().then(function (result) {
            var session = result.data.session;
            if (window.__supabaseSyncSession) window.__supabaseSyncSession(session);
            if (loginLink) {
                if (session) {
                    loginLink.textContent = 'Profile';
                    loginLink.href = '#profile';
                    loginLink.onclick = function (e) {
                        e.preventDefault();
                        goToProfile();
                    };
                } else {
                    loginLink.textContent = 'Login';
                    loginLink.href = '#login';
                    loginLink.onclick = function (e) {
                        e.preventDefault();
                        openLoginModal();
                    };
                }
            }
            if (logoutNavLink) {
                if (session) {
                    logoutNavLink.style.display = 'inline-block';
                    logoutNavLink.onclick = function (e) {
                        e.preventDefault();
                        logout();
                    };
                } else {
                    logoutNavLink.style.display = 'none';
                    logoutNavLink.onclick = null;
                }
            }
        }).catch(function () {
            if (loginLink) {
                loginLink.textContent = 'Login';
                loginLink.href = '#login';
                loginLink.onclick = function (e) {
                    e.preventDefault();
                    openLoginModal();
                };
            }
            if (logoutNavLink) {
                logoutNavLink.style.display = 'none';
                logoutNavLink.onclick = null;
            }
        });
    } else {
        var userData = localStorage.getItem('user');
        if (loginLink) {
            if (userData) {
                loginLink.textContent = 'Profile';
                loginLink.href = '#profile';
                loginLink.onclick = function (e) {
                    e.preventDefault();
                    goToProfile();
                };
            } else {
                loginLink.textContent = 'Login';
                loginLink.href = '#login';
                loginLink.onclick = function (e) {
                    e.preventDefault();
                    openLoginModal();
                };
            }
        }
        if (logoutNavLink) {
            if (userData) {
                logoutNavLink.style.display = 'inline-block';
                logoutNavLink.onclick = function (e) {
                    e.preventDefault();
                    logout();
                };
            } else {
                logoutNavLink.style.display = 'none';
                logoutNavLink.onclick = null;
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', function () {
    updateNavFromAuth();
    checkBookingAccess();
    window.addEventListener('supabase-session-synced', checkBookingAccess);

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

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '#login') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});
