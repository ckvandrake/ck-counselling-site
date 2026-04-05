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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  
  // 🔥 Fetch credits from Supabase to update banner only (does not block booking)
  let minutes = 0;
  const { data, error } = await window.supabaseClient
    .from("profiles")
    .select("credits_minutes")
    .eq("id", user.id)
    .single();
  
  if (error) {
    console.error("Error fetching credits:", error);
  } else if (data && typeof data.credits_minutes === "number") {
    minutes = data.credits_minutes;
  }

  // 👉 Update credit banner appearance based on remaining minutes
  const banner = document.getElementById("credit-banner");
  const messageEl = document.getElementById("credit-message");
  const actionEl = document.getElementById("credit-action");

  if (banner) {
    banner.classList.remove("credit-normal","credit-warning","credit-critical","credit-pulse");
    if (actionEl) {
      actionEl.innerHTML = "";
    }

    var firstName = escapeHtml(getBookingFirstName(user));
    var line1 =
      "Hey " + firstName + ", your available session time is " + minutes + " minutes.";
    var line2;

    if (minutes < 30) {
      banner.classList.add("credit-critical");
      line2 = "You will need additional credits soon.";
      if (messageEl) {
        messageEl.innerHTML = line1 + "<br>" + line2;
      }
      if (actionEl) {
        actionEl.innerHTML =
          '<a href="pricing-online.html" class="credit-btn">Purchase Credits</a>';
      }
      // Trigger gentle pulse every ~8 seconds
      if (!window.__creditPulseInterval) {
        const triggerCreditPulse = () => {
          const b = document.getElementById("credit-banner");
          if (!b) return;
          b.classList.remove("credit-pulse");
          setTimeout(() => {
            b.classList.add("credit-pulse");
          }, 50);
        };
        triggerCreditPulse();
        window.__creditPulseInterval = setInterval(triggerCreditPulse, 8000);
      }
    } else if (minutes < 120) {
      banner.classList.add("credit-warning");
      line2 = "You're in a good range — just keep an eye on your usage.";
      if (messageEl) {
        messageEl.innerHTML = line1 + "<br>" + line2;
      }
      if (actionEl) {
        actionEl.innerHTML =
          '<a href="pricing-online.html" class="credit-btn-secondary">Top Up Credits</a>';
      }
      if (window.__creditPulseInterval) {
        clearInterval(window.__creditPulseInterval);
        window.__creditPulseInterval = null;
      }
    } else {
      banner.classList.add("credit-normal");
      line2 = "You're well covered!";
      if (messageEl) {
        messageEl.innerHTML = line1 + "<br>" + line2;
      }
      if (window.__creditPulseInterval) {
        clearInterval(window.__creditPulseInterval);
        window.__creditPulseInterval = null;
      }
    }
  }

  // 👉 If user is logged in, always show calendar (no credit barrier)
  unlocked.style.display = "block";
  locked.style.display = "none";
}

window.supabaseClient.auth.onAuthStateChange((event, session) => {
  syncSessionToLocalStorage(session);
  updateBookingAccess();
});
updateBookingAccess();