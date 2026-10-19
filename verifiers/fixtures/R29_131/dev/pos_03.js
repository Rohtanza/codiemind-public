export function deprecatedFormat(date) {
  console.warn("deprecatedFormat() is deprecated; use formatDate() instead.");
  return formatDate(date);
}

export function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    console.error("formatDate received an invalid date:", date);
    return "";
  }
  return date.toISOString().slice(0, 10);
}
