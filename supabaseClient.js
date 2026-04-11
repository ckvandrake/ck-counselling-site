const SUPABASE_URL = "https://sdwmlbcsyyaankocfbaz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_t_wpzumzLwUsk0CbL-yH7A_fySyahA8";

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("Supabase connected");

/** Auth UI must use supabase.auth.getSession() only — never localStorage for login state. */
function syncSessionToLocalStorage(session) {
  try {
    localStorage.removeItem("user");
  } catch (e) {}

  window.dispatchEvent(new Event("supabase-session-synced"));
}

async function syncSessionOnLoad() {
  try {
    const { data } = await window.supabaseClient.auth.getSession();
    syncSessionToLocalStorage(data && data.session ? data.session : null);
  } catch (e) {
    syncSessionToLocalStorage(null);
  }
}

syncSessionOnLoad();

/** First name for personalised booking copy; calm fallback if unknown. */
function getBookingFirstName(user) {
  if (!user) return "there";
  var meta = user.user_metadata || {};
  var full = (meta.full_name || meta.name || "").trim();
  if (full) {
    var first = full.split(/\s+/)[0];
    if (first) return first;
  }
  if (meta.first_name && String(meta.first_name).trim()) {
    return String(meta.first_name).trim();
  }
  var email = user.email;
  if (email && email.indexOf("@") !== -1) {
    var local = email.split("@")[0];
    var token = local.split(/[.+_-]/)[0];
    if (token) {
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    }
  }
  return "there";
}

/**
 * Booking / credit banner state (session durations: min 30m blocks, 120m = healthy band).
 * new_user takes precedence; otherwise credit tiers match 30 / 120 minute thresholds.
 */
function resolveUserBookingState(profile) {
  const credits = profile.credits_minutes || 0;
  const stage = profile.user_stage || "new";

  if (stage === "new") {
    return "new_user";
  }

  if (credits < 30) {
    return "no_credits";
  }

  if (credits >= 30 && credits < 120) {
    return "medium_credits";
  }

  if (credits >= 120) {
    return "high_credits";
  }

  return "medium_credits";
}

/** Prefer full display name so getBookingMessage can take the first word; fallback to first-name helper. */
function getBookingDisplayName(user) {
  if (!user) return "";
  const meta = user.user_metadata || {};
  const full = (meta.full_name || meta.name || "").trim();
  if (full) return full;
  return getBookingFirstName(user);
}

function getBookingMessage(state, name, credits) {
  const firstName = name ? name.split(" ")[0] : '';

  switch (state) {
    case "new_user":
      return {
        text: `Welcome ${firstName}\n\nYou’re free to book your first session — we’ll take care of the payment details together when we meet.`,
        cta: null,
        tone: "warm",
      };

    case "no_credits":
      return {
        text: `Hey ${firstName}, you currently have ${credits} minutes of session time, which is not enough for a full session.\n\nYou’re still welcome to book — just make sure to top up your credits before we meet.`,
        cta: {
          label: "Purchase Credits",
          action: "credits_page",
        },
        tone: "boundary",
      };

    case "medium_credits":
      return {
        text: `Hey ${firstName}, your available session time is ${credits} minutes.\n\nYou’re welcome to book — just keep an eye on your remaining time.`,
        cta: {
          label: "Top Up Credits",
          action: "credits_page",
        },
        tone: "neutral",
      };

    case "high_credits":
      return {
        text: `Hey ${firstName}, your available session time is ${credits} minutes.\n\nYou’re well covered.`,
        cta: null,
        tone: "positive",
      };

    default:
      return {
        text: `Hey ${firstName}, your available session time is ${credits} minutes.\n\nYou’re well covered.`,
        cta: null,
        tone: "positive",
      };
  }
}

/** Prefer `profiles.full_name`; otherwise auth metadata / email heuristic (same as booking copy). */
function displayNameForBanner(profile, user) {
  if (profile && profile.full_name && String(profile.full_name).trim()) {
    return String(profile.full_name).trim();
  }
  return getBookingDisplayName(user);
}

function updateBannerUI(message, state) {
  const banner = document.getElementById("booking-banner");
  const textEl = banner && banner.querySelector(".message-text");
  const buttonEl = banner && banner.querySelector(".cta-button");

  if (!banner || !textEl || !buttonEl) return;

  textEl.innerText = message.text;

  if (message.cta) {
    buttonEl.style.display = "inline-block";
    buttonEl.innerText = message.cta.label;
    buttonEl.onclick = function () {
      if (message.cta.action === "credits_page") {
        window.location.href = "pricing-online.html";
      }
    };
  } else {
    buttonEl.style.display = "none";
    buttonEl.innerText = "";
    buttonEl.onclick = null;
  }

  banner.classList.remove("warm", "boundary", "neutral", "positive", "credit-pulse");
  banner.classList.add(message.tone);

  // KEY UX DECISION: No blocking, no gating, no disabling iframe — ever

  if (message.tone === "boundary") {
    if (!window.__creditPulseInterval) {
      const triggerCreditPulse = () => {
        const b = document.getElementById("booking-banner");
        if (!b) return;
        b.classList.remove("credit-pulse");
        setTimeout(() => {
          b.classList.add("credit-pulse");
        }, 50);
      };
      triggerCreditPulse();
      window.__creditPulseInterval = setInterval(triggerCreditPulse, 8000);
    }
  } else if (window.__creditPulseInterval) {
    clearInterval(window.__creditPulseInterval);
    window.__creditPulseInterval = null;
  }
}

async function renderBookingBanner(user) {
  const supabase = window.supabaseClient;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error("Failed to load profile", error);
    const fallback = {
      credits_minutes: 0,
      user_stage: "returning",
      full_name: null,
    };
    const state = resolveUserBookingState(fallback);
    const message = getBookingMessage(
      state,
      displayNameForBanner(fallback, user),
      0
    );
    updateBannerUI(message, state);
    return;
  }

  const state = resolveUserBookingState(profile);
  const nameForMessage = displayNameForBanner(profile, user);
  const credits =
    typeof profile.credits_minutes === "number" ? profile.credits_minutes : 0;
  const message = getBookingMessage(state, nameForMessage, credits);

  updateBannerUI(message, state);
}

async function updateBookingAccess() {
  const { data: { user } } = await window.supabaseClient.auth.getUser();

  const locked = document.getElementById("booking-locked");
  const unlocked = document.getElementById("booking-unlocked");

  if (!locked || !unlocked) return; // prevents errors on pages without booking section

  if (!user) {
    unlocked.style.display = "none";
    locked.style.display = "block";
    // Ensure logged-out copy is correct (credits copy only applies when signed in)
    const lockedHeading = locked.querySelector("h3");
    const lockedText = locked.querySelector("p");
    if (lockedHeading) lockedHeading.innerText = "You are not currently logged in.";
    if (lockedText) lockedText.innerText = "Please log in or sign up to book a session.";
    return;
  }

  await renderBookingBanner(user);

  // 👉 If user is logged in, always show calendar (no credit barrier)
  unlocked.style.display = "block";
  locked.style.display = "none";
}

window.resolveUserBookingState = resolveUserBookingState;
window.getBookingMessage = getBookingMessage;
window.renderBookingBanner = renderBookingBanner;
window.updateBannerUI = updateBannerUI;

window.supabaseClient.auth.onAuthStateChange((event, session) => {
  syncSessionToLocalStorage(session);
  updateBookingAccess();
});
updateBookingAccess();