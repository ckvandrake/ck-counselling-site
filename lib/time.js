// Reusable formatter to display UTC timestamptz values in the viewer's local timezone.
function formatUserLocalTime(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  // Use the viewer's own locale + timezone (browser settings).
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

// Simple helper to show which timezone the browser is using.
function getUserTimeZoneLabel() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "local time";
  } catch {
    return "local time";
  }
}

// Expose globally for the existing non-module script setup.
window.formatUserLocalTime = formatUserLocalTime;
window.getUserTimeZoneLabel = getUserTimeZoneLabel;

