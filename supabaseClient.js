const SUPABASE_URL = "https://sdwmlbcsyyaankocfbaz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_t_wpzumzLwUsk0CbL-yH7A_fySyahA8";

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("Supabase connected");

function syncSessionToLocalStorage(session) {
  const user = session && session.user ? session.user : null;

  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("user");
  }

  // Existing pages listen for this to update the navbar.
  window.dispatchEvent(new Event("supabase-session-synced"));
}

async function syncSessionOnLoad() {
  try {
    const { data } = await window.supabaseClient.auth.getSession();
    syncSessionToLocalStorage(data && data.session ? data.session : null);
  } catch (e) {
    // If session fetch fails, clear localStorage so nav falls back correctly.
    syncSessionToLocalStorage(null);
  }
}

syncSessionOnLoad();
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
  const minutesSpan = document.getElementById("credit-minutes");
  const messageEl = document.getElementById("credit-message");
  const actionEl = document.getElementById("credit-action");

  if (minutesSpan) {
    minutesSpan.innerText = minutes;
  }

  if (banner) {
    banner.classList.remove("credit-normal","credit-warning","credit-critical","credit-pulse");
    if (actionEl) {
      actionEl.innerHTML = "";
    }

    // Derive a friendly name for the user if possible
    var userName =
      (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
      user.email ||
      "there";

    if (minutes < 30) {
      banner.classList.add("credit-critical");
      if (messageEl) {
        messageEl.innerHTML =
          'Hey ' + userName + ', your available session time is ' + minutes + ' minutes.<br>' +
          'You may need additional credits soon.';
      }
      if (actionEl) {
        actionEl.innerHTML =
          '<a href="work-with-me.html" class="credit-btn">View Session Options</a>';
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
      if (messageEl) {
        messageEl.innerHTML =
          'Available session time: <span id="credit-minutes">' + minutes + '</span> minutes';
      }
      if (window.__creditPulseInterval) {
        clearInterval(window.__creditPulseInterval);
        window.__creditPulseInterval = null;
      }
    } else {
      banner.classList.add("credit-normal");
      if (messageEl) {
        messageEl.innerHTML =
          'Available session time: <span id="credit-minutes">' + minutes + '</span> minutes';
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