export function formatUserLocalTime(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

