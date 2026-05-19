const KEY = "address-tool-addresses";

export function loadAddresses() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAddresses(addresses) {
  localStorage.setItem(KEY, JSON.stringify(addresses));
}
