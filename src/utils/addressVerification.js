export async function verifyAddress(address) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const addressLines = [
    address.street,
    [address.city, address.state, address.zip].filter(Boolean).join(", "),
  ].filter(Boolean);

  const resp = await fetch(
    `https://addressvalidation.googleapis.com/v1:validateAddress?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: { regionCode: address.country || "US", addressLines },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const verdict = data.result?.verdict || {};
  const postal = data.result?.address?.postalAddress || {};
  const formattedAddress = data.result?.address?.formattedAddress || "";
  const granularity = verdict.validationGranularity || "GRANULARITY_UNSPECIFIED";

  let status;
  if (["PREMISE", "SUB_PREMISE"].includes(granularity) && verdict.addressComplete) {
    status = "valid";
  } else if (["PREMISE", "SUB_PREMISE", "PREMISE_PROXIMITY", "BLOCK"].includes(granularity)) {
    status = "warning";
  } else {
    status = "invalid";
  }

  const corrected = {
    street: (postal.addressLines || [])[0] || "",
    city: postal.locality || "",
    state: postal.administrativeArea || "",
    zip: postal.postalCode || "",
    country: postal.regionCode || "",
  };

  return { status, formattedAddress, corrected };
}
