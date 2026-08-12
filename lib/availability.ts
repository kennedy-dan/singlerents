export function blockedDates(availability) {
  return Array.isArray(availability?.blockedDates)
    ? availability.blockedDates
    : [];
}

export function isDateRangeAvailable(availability, startAt, endAt) {
  const blocked = new Set(blockedDates(availability));
  for (
    let date = new Date(startAt);
    date < new Date(endAt);
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    if (blocked.has(date.toISOString().slice(0, 10))) return false;
  }
  return true;
}
