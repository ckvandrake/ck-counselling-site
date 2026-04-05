const MIN_LENGTH = 10;

/**
 * @param {string} password
 * @returns {boolean}
 */
export function validatePassword(password) {
    return typeof password === 'string' && password.length >= MIN_LENGTH;
}

/**
 * Strength is only meaningful when length >= 10; below that, valid is false and label is empty.
 * @param {string} password
 * @returns {{ valid: boolean, score: number, label: string, color: string }}
 */
export function getPasswordStrength(password) {
    const p = typeof password === 'string' ? password : '';

    if (p.length < MIN_LENGTH) {
        return {
            valid: false,
            score: 0,
            label: '',
            color: '#b00020'
        };
    }

    let score = 0;

    if (p.length >= 14) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    let label = 'Weak';
    let color = '#b00020';

    if (score <= 2) {
        label = 'Weak';
        color = '#b00020';
    } else if (score <= 4) {
        label = 'Good';
        color = '#f57c00';
    } else {
        label = 'Strong';
        color = '#2e7d32';
    }

    return {
        valid: true,
        score,
        label,
        color
    };
}

/**
 * @param {string} password
 * @returns {{ length: boolean, lowercase: boolean, uppercase: boolean, number: boolean, symbol: boolean }}
 */
export function getPasswordChecklist(password) {
    const p = typeof password === 'string' ? password : '';
    return {
        length: p.length >= MIN_LENGTH,
        lowercase: /[a-z]/.test(p),
        uppercase: /[A-Z]/.test(p),
        number: /[0-9]/.test(p),
        symbol: /[^A-Za-z0-9]/.test(p)
    };
}

const MSG_TOO_SHORT_HINT = 'Must be at least 10 characters';
const MSG_TOO_SHORT_SUBMIT = 'Password must be at least 10 characters';

/**
 * Live feedback under the password field (signup / reset).
 * @param {string} value
 * @param {HTMLElement | null} strengthEl
 */
export function syncPasswordStrengthElement(value, strengthEl) {
    if (!strengthEl) return;
    const v = typeof value === 'string' ? value : '';
    if (v.length === 0) {
        clearPasswordStrengthElement(strengthEl);
        return;
    }
    if (v.length < MIN_LENGTH) {
        strengthEl.textContent = MSG_TOO_SHORT_HINT;
        strengthEl.style.color = '#b00020';
        strengthEl.className = 'password-strength';
        return;
    }
    const s = getPasswordStrength(v);
    strengthEl.textContent = s.label;
    strengthEl.style.color = s.color;
    strengthEl.className = 'password-strength';
    if (s.label === 'Weak') strengthEl.classList.add('weak');
    else if (s.label === 'Good') strengthEl.classList.add('moderate');
    else if (s.label === 'Strong') strengthEl.classList.add('strong');
}

/**
 * @param {HTMLElement | null} strengthEl
 */
export function clearPasswordStrengthElement(strengthEl) {
    if (!strengthEl) return;
    strengthEl.textContent = '';
    strengthEl.style.color = '';
    strengthEl.className = 'password-strength';
}

/**
 * When submit is blocked by length — same message as legacy PasswordPolicy.
 * @param {HTMLElement | null} strengthEl
 */
export function showPasswordMinLengthSubmitError(strengthEl) {
    if (!strengthEl) return;
    strengthEl.textContent = MSG_TOO_SHORT_SUBMIT;
    strengthEl.style.color = '#b00020';
    strengthEl.className = 'password-strength';
}

/**
 * Live checklist (#check-length … #check-symbol). Uses {@link getPasswordChecklist}.
 * @param {string} password
 */
export function syncPasswordChecklistUI(password) {
    const checks = getPasswordChecklist(password);
    const pairs = [
        ['check-length', checks.length],
        ['check-lower', checks.lowercase],
        ['check-upper', checks.uppercase],
        ['check-number', checks.number],
        ['check-symbol', checks.symbol]
    ];
    pairs.forEach(function (entry) {
        var el = document.getElementById(entry[0]);
        if (!el) return;
        if (entry[1]) {
            el.classList.add('valid');
        } else {
            el.classList.remove('valid');
        }
    });
}
