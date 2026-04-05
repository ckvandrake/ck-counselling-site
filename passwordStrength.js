/**
 * Shared password rules: min 10 chars (Supabase), strength only after minimum met.
 */
(function (window) {
    var MIN_LENGTH = 10;

    function clearStrengthEl(el) {
        if (!el) return;
        el.textContent = '';
        el.style.color = '';
        el.className = 'password-strength';
    }

    function syncPasswordStrength(passwordInput, strengthEl) {
        if (!passwordInput || !strengthEl) return;
        var value = passwordInput.value;

        if (value.length === 0) {
            clearStrengthEl(strengthEl);
            return;
        }

        if (value.length < MIN_LENGTH) {
            strengthEl.textContent = 'Must be at least 10 characters';
            strengthEl.style.color = '#b00020';
            strengthEl.className = 'password-strength';
            return;
        }

        var score = 0;
        if (value.length >= 14) score++;
        if (/[a-z]/.test(value)) score++;
        if (/[A-Z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;

        strengthEl.className = 'password-strength';
        if (score <= 2) {
            strengthEl.textContent = 'Weak';
            strengthEl.style.color = '#b00020';
            strengthEl.classList.add('weak');
        } else if (score <= 4) {
            strengthEl.textContent = 'Good';
            strengthEl.style.color = '#f57c00';
            strengthEl.classList.add('moderate');
        } else {
            strengthEl.textContent = 'Strong';
            strengthEl.style.color = '#2e7d32';
            strengthEl.classList.add('strong');
        }
    }

    function validateMinLengthOnSubmit(password, strengthEl) {
        if (password.length < MIN_LENGTH) {
            if (strengthEl) {
                strengthEl.textContent = 'Password must be at least 10 characters';
                strengthEl.style.color = '#b00020';
                strengthEl.className = 'password-strength';
            }
            return false;
        }
        return true;
    }

    window.PasswordPolicy = {
        MIN_LENGTH: MIN_LENGTH,
        syncPasswordStrength: syncPasswordStrength,
        clearStrength: clearStrengthEl,
        validateMinLengthOnSubmit: validateMinLengthOnSubmit
    };
})(window);
