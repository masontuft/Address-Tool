export function norm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSameAddress(a, b) {
  const streetA = norm(a.street);
  const streetB = norm(b.street);
  if (!streetA || streetA !== streetB) return false;
  return norm(a.name) === norm(b.name) || norm(a.zip) === norm(b.zip);
}

export function findAllDuplicates(entries) {
  const conflicts = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (isSameAddress(entries[i], entries[j])) {
        conflicts.push({ existing: entries[i], incoming: entries[j] });
      }
    }
  }
  return conflicts;
}
