// Suggests where the user is, fully offline: from a GPS point (bounding boxes in
// data/regions.json) or, without location permission, from the device time zone.
// The result is only a suggestion; the user can always pick another place.

/** @returns {{country, region}|null} */
export function placeFromPoint(regions, lat, lon) {
  const inBox = (b) => b && lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3];
  const area = (b) => (b[2] - b[0]) * (b[3] - b[1]);
  let best = null;
  for (const country of regions.countries) {
    for (const region of country.regions || []) {
      if (inBox(region.bbox) && (!best || area(region.bbox) < best.size)) best = { country, region, size: area(region.bbox) };
    }
    if (inBox(country.bbox) && (!best || area(country.bbox) < best.size)) best = { country, region: null, size: area(country.bbox) };
  }
  return best && { country: best.country, region: best.region };
}

export function placeFromTimeZone(regions, tz) {
  if (!tz) return null;
  for (const country of regions.countries) {
    const region = (country.regions || []).find((r) => (r.tz || []).includes(tz));
    if (region) return { country, region };
    if ((country.tz || []).includes(tz)) return { country, region: null };
  }
  return null;
}

export function findPlace(regions, countryId, regionId) {
  const country = regions.countries.find((c) => c.id === countryId);
  if (!country) return null;
  return { country, region: (country.regions || []).find((r) => r.id === regionId) || null };
}

/** Languages to offer on the card: region first, then country. */
export function languagesFor(place) {
  if (!place) return ["en"];
  return [...new Set([...(place.region?.languages || []), ...place.country.languages])];
}

export const placeLabel = (place) => (place ? (place.region ? `${place.region.name}, ${place.country.name}` : place.country.name) : "Ort wählen");
