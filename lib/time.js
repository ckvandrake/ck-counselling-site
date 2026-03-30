// Reusable formatter to display UTC timestamptz values in the viewer's local timezone.
function formatUserLocalTime(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

// Expose globally for the existing non-module script setup.
window.formatUserLocalTime = formatUserLocalTime;

