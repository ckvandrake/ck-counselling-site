// Payment page – dynamic content from URL plan parameter

(function () {
    var params = new URLSearchParams(window.location.search);
    var plan = params.get("plan");

    var title = "";
    var price = "";
    var wiseLink = "#";
    var paypalLink = "#";

    if (plan === "single") {
        title = "Single Session";
        price = "$120";
        wiseLink = "PASTE_WISE_LINK_SINGLE";
        paypalLink = "PASTE_PAYPAL_LINK_SINGLE";
    }

    if (plan === "bundle") {
        title = "Discount Bundle";
        price = "$960";
        wiseLink = "PASTE_WISE_LINK_BUNDLE";
        paypalLink = "PASTE_PAYPAL_LINK_BUNDLE";
    }

    if (plan === "couples") {
        title = "Couples Package";
        price = "$500";
        wiseLink = "PASTE_WISE_LINK_COUPLES";
        paypalLink = "PASTE_PAYPAL_LINK_COUPLES";
    }

    if (plan === "4pack") {
        title = "4 Session Package";
        price = "$400";
        wiseLink = "PASTE_WISE_LINK_4PACK";
        paypalLink = "PASTE_PAYPAL_LINK_4PACK";
    }

    var container = document.getElementById("payment-options");
    if (!container) return;

    if (!title || !price) {
        container.innerHTML = "<p class=\"payment-fallback\">Please choose a plan from the <a href=\"work-with-me.html\">Fees</a> page.</p>";
        return;
    }

    container.innerHTML =
        "<div class=\"payment-options-card\">" +
        "  <h3 class=\"payment-plan-title\">" + escapeHtml(title) + "</h3>" +
        "  <div class=\"payment-plan-price\">" + escapeHtml(price) + "</div>" +
        "  <div class=\"payment-buttons\">" +
        "    <a href=\"" + escapeAttr(wiseLink) + "\" class=\"btn btn-primary\" target=\"_blank\" rel=\"noopener noreferrer\">Pay with Wise</a>" +
        "    <a href=\"" + escapeAttr(paypalLink) + "\" class=\"btn btn-secondary payment-btn-secondary\" target=\"_blank\" rel=\"noopener noreferrer\">Pay with PayPal</a>" +
        "  </div>" +
        "  <p class=\"payment-notice\">Your booking is secured once payment is completed.</p>" +
        "</div>";

    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeAttr(text) {
        return escapeHtml(text).replace(/"/g, "&quot;");
    }
})();

// Mobile menu
var mobileMenuToggle = document.getElementById("mobileMenuToggle");
var navMenu = document.getElementById("navMenu");
if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", function () {
        navMenu.classList.toggle("active");
    });
}
document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
        if (navMenu) navMenu.classList.remove("active");
    });
});

// Update nav Login/Profile from auth state
function updateLoginLink() {
    var loginLink = document.getElementById("loginLink");
    if (!loginLink) return;
    var user = localStorage.getItem("user");
    if (user) {
        loginLink.textContent = "Profile";
        loginLink.href = "profile.html";
    } else {
        loginLink.textContent = "Login";
        loginLink.href = "index.html#login";
    }
}
window.addEventListener("DOMContentLoaded", function () {
    updateLoginLink();
    window.addEventListener("supabase-session-synced", updateLoginLink);
});
