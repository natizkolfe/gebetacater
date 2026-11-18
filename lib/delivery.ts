import type { DeliveryQuote, Settings } from "@/lib/types";

const USER_AGENT = "Gebeta/1.0 (delivery distance quote)";

export class DeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryError";
  }
}

interface GeocodeHit {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: { road?: string; house_number?: string; postcode?: string };
}

interface LocatedAddress {
  lat: number;
  lon: number;
  label: string;
  zip: string | null;
}

const originCache = new Map<string, { lat: number; lon: number; at: number }>();

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundMiles(meters: number): number {
  return Math.round((meters / 1609.344) * 10) / 10;
}

function zipOf(postcode: string | undefined, label: string): string | null {
  const fromPost = postcode?.match(/\d{5}/)?.[0];
  if (fromPost) return fromPost;
  return label.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null;
}

async function geocode(query: string, limit: number): Promise<GeocodeHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new DeliveryError("We couldn't look up that address. Check it and try again.");
  const data = (await response.json()) as GeocodeHit[];
  return Array.isArray(data) ? data : [];
}

function usable(hit: GeocodeHit): hit is GeocodeHit & { lat: string; lon: string; display_name: string } {
  return Boolean(hit.lat && hit.lon && hit.display_name && (hit.address?.road || hit.address?.house_number));
}

async function censusLocate(query: string): Promise<LocatedAddress | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", query);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    result?: {
      addressMatches?: {
        matchedAddress?: string;
        coordinates?: { x?: number; y?: number };
        addressComponents?: { zip?: string };
      }[];
    };
  };
  const match = data.result?.addressMatches?.find(
    (item) => typeof item.coordinates?.x === "number" && typeof item.coordinates?.y === "number" && item.matchedAddress,
  );
  if (!match?.matchedAddress || match.coordinates?.x == null || match.coordinates.y == null) return null;
  return {
    lat: match.coordinates.y,
    lon: match.coordinates.x,
    label: match.matchedAddress,
    zip: zipOf(match.addressComponents?.zip, match.matchedAddress),
  };
}

async function locateAddress(query: string): Promise<LocatedAddress | null> {
  const census = await censusLocate(query);
  if (census) return census;
  const hits = await geocode(query, 5);
  const hit = hits.find(usable);
  if (!hit) return null;
  return {
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    label: hit.display_name,
    zip: zipOf(hit.address?.postcode, hit.display_name),
  };
}

async function originPoint(origin: string): Promise<{ lat: number; lon: number }> {
  const cached = originCache.get(origin);
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached;
  const located = await locateAddress(origin);
  if (!located || !Number.isFinite(located.lat) || !Number.isFinite(located.lon)) {
    throw new DeliveryError("The kitchen's delivery location could not be found. Update it in settings.");
  }
  const point = { lat: located.lat, lon: located.lon, at: Date.now() };
  originCache.set(origin, point);
  return point;
}

async function drivingMeters(from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<number> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new DeliveryError("We couldn't calculate the driving distance. Check the address and try again.");
  }
  const data = (await response.json()) as { code?: string; routes?: { distance?: number }[] };
  const meters = data.code === "Ok" ? data.routes?.[0]?.distance : undefined;
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0) {
    throw new DeliveryError("We couldn't calculate the driving distance. Check the address and try again.");
  }
  return meters;
}

export function priceDelivery(miles: number, settings: Pick<Settings, "deliveryRatePerMile" | "minDeliveryFee" | "freeDelivery">): number {
  if (settings.freeDelivery) return 0;
  const calculated = roundMoney(miles * settings.deliveryRatePerMile);
  return roundMoney(Math.max(calculated, settings.minDeliveryFee));
}

function houseNumberFromQuery(query: string): string | null {
  return query.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1] ?? null;
}

function photonLabel(
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    locality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  },
  typedHouse?: string | null,
): string | null {
  const place = properties.city || properties.town || properties.village || properties.locality || properties.county;
  const road = properties.street || properties.name;
  if (!road && !properties.name) return null;
  const house = properties.housenumber || typedHouse || null;
  const street = house && road ? `${house} ${road}` : road || properties.name;
  const parts = [street, place, properties.state, properties.postcode].filter(Boolean);
  const label = parts.join(", ").replace(/\s+/g, " ").trim();
  return label.length >= 5 ? label : null;
}

async function photonSuggest(
  query: string,
  bias: { lat: number; lon: number } | null,
): Promise<string[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  if (bias) {
    url.searchParams.set("lat", String(bias.lat));
    url.searchParams.set("lon", String(bias.lon));
  }
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as {
    features?: {
      properties?: {
        name?: string;
        housenumber?: string;
        street?: string;
        city?: string;
        town?: string;
        village?: string;
        locality?: string;
        county?: string;
        state?: string;
        postcode?: string;
        country?: string;
        countrycode?: string;
      };
    }[];
  };
  const typedHouse = houseNumberFromQuery(query);
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const feature of data.features ?? []) {
    const properties = feature.properties;
    if (!properties) continue;
    if (properties.countrycode && properties.countrycode.toLowerCase() !== "us") continue;
    const label = photonLabel(properties, typedHouse);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length >= 5) break;
  }
  return labels;
}

async function nominatimSuggest(query: string, bias: { lat: number; lon: number } | null): Promise<string[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", query);
  if (bias) {
    const pad = 0.45;
    url.searchParams.set(
      "viewbox",
      `${bias.lon - pad},${bias.lat + pad},${bias.lon + pad},${bias.lat - pad}`,
    );
    url.searchParams.set("bounded", "0");
  }
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as GeocodeHit[];
  if (!Array.isArray(data)) return [];
  return data
    .filter((hit) => Boolean(hit.display_name && hit.lat && hit.lon))
    .map((hit) => hit.display_name as string)
    .slice(0, 5);
}

/** Typeahead suggestions biased toward the kitchen — Photon first, Nominatim fallback. */
export async function suggestAddresses(
  query: string,
  settings?: Pick<Settings, "deliveryOrigin">,
): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  let bias: { lat: number; lon: number } | null = null;
  if (settings?.deliveryOrigin) {
    try {
      bias = await originPoint(settings.deliveryOrigin);
    } catch {
      bias = null;
    }
  }

  // Photon is built for typeahead; keep the typed query and bias by kitchen coords.
  const photon = await photonSuggest(trimmed, bias);
  if (photon.length > 0) return photon;

  // Nominatim often needs a city/state hint for partial US streets.
  const localized =
    /\b(ga|georgia|stone mountain|atlanta|decatur|lithonia|clarkston)\b/i.test(trimmed)
      ? trimmed
      : `${trimmed}, Stone Mountain, GA`;
  const near = await nominatimSuggest(localized, bias);
  if (near.length > 0) return near;
  return nominatimSuggest(trimmed, bias);
}

/** Driving distance from the configured kitchen location. Does not add anything to an order. */
export async function quoteDelivery(settings: Settings, rawAddress: string): Promise<DeliveryQuote> {
  if (!settings.deliveryEnabled) throw new DeliveryError("Delivery is not available right now. Pickup has no delivery fee.");
  const address = rawAddress.trim();
  if (address.length < 8) throw new DeliveryError("Enter a street address, city, and ZIP code.");
  const located = await locateAddress(address);
  if (!located) {
    throw new DeliveryError("We couldn't verify that address. Check the street, city, and ZIP, then calculate again.");
  }
  if (settings.deliveryZipCodes.length > 0 && (!located.zip || !settings.deliveryZipCodes.includes(located.zip))) {
    throw new DeliveryError("That address is outside the ZIP codes we deliver to.");
  }
  const start = await originPoint(settings.deliveryOrigin);
  const meters = await drivingMeters(start, located);
  const miles = roundMiles(meters);
  if (settings.maxDeliveryMiles > 0 && miles > settings.maxDeliveryMiles) {
    throw new DeliveryError(
      `We deliver up to ${settings.maxDeliveryMiles} miles. This address is ${miles} miles away by road.`,
    );
  }
  return {
    address: located.label,
    miles,
    ratePerMile: settings.deliveryRatePerMile,
    fee: priceDelivery(miles, settings),
  };
}
