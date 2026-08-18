import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { extractEmails, extractPhoneNumbers, formatIndianPhone, telHref } from "./advertisementCopy";
import { normalizeAdvertisementUrl } from "./advertisementUi";

export type AdvertisementClickAction = "open" | "cta" | "call" | "whatsapp" | "website" | "email" | "directions";

function digitsOnly(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function nationalMobile(value: string | null | undefined): string | null {
  const digits = digitsOnly(value || "");
  if (!digits) return null;
  const national =
    digits.length >= 12 && digits.startsWith("91") ? digits.slice(-10) : digits.slice(-10);
  return /^[6-9]\d{9}$/.test(national) ? national : null;
}

export function whatsappHref(phone: string, message?: string): string | null {
  const national = nationalMobile(phone);
  if (!national) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/91${national}${text}`;
}

export function mapsHref(params: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): string | null {
  const lat = params.latitude == null ? NaN : Number(params.latitude);
  const lng = params.longitude == null ? NaN : Number(params.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  const address = String(params.address || "").trim();
  if (!address) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function mailtoHref(email: string): string | null {
  const value = String(email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return `mailto:${value}`;
}

async function openHttp(url: string): Promise<boolean> {
  const safe = normalizeAdvertisementUrl(url);
  if (!safe) return false;
  try {
    await WebBrowser.openBrowserAsync(safe, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN
    });
    return true;
  } catch {
    try {
      await Linking.openURL(safe);
      return true;
    } catch {
      return false;
    }
  }
}

async function openExternal(url: string): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      await Linking.openURL(url);
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function openAdvertisementAction(
  kind: AdvertisementClickAction,
  payload: {
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
  }
): Promise<{ ok: boolean; message?: string }> {
  try {
    if (kind === "call") {
      const href = payload.phone ? telHref(payload.phone) : null;
      if (!href) return { ok: false, message: "Phone number is not available." };
      const ok = await openExternal(href);
      return ok ? { ok: true } : { ok: false, message: "Could not start the call." };
    }
    if (kind === "whatsapp") {
      const href = payload.whatsapp ? whatsappHref(payload.whatsapp) : null;
      if (!href) return { ok: false, message: "WhatsApp number is not available." };
      const ok = await openHttp(href);
      return ok ? { ok: true } : { ok: false, message: "Could not open WhatsApp." };
    }
    if (kind === "website" || kind === "cta") {
      if (!payload.website) return { ok: false, message: "Website is not available." };
      const ok = await openHttp(payload.website);
      return ok ? { ok: true } : { ok: false, message: "Could not open the website." };
    }
    if (kind === "email") {
      const href = payload.email ? mailtoHref(payload.email) : null;
      if (!href) return { ok: false, message: "Email is not available." };
      const ok = await openExternal(href);
      return ok ? { ok: true } : { ok: false, message: "Could not open email." };
    }
    if (kind === "directions") {
      const href = mapsHref({
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address
      });
      if (!href) return { ok: false, message: "Location is not available." };
      const ok = await openHttp(href);
      return ok ? { ok: true } : { ok: false, message: "Could not open maps." };
    }
    return { ok: false, message: "This action is not available." };
  } catch {
    return { ok: false, message: "Could not complete that action." };
  }
}

export type AdvertisementActionDef = {
  id: AdvertisementClickAction;
  label: string;
  icon: "call" | "logo-whatsapp" | "globe-outline" | "navigate-outline" | "mail";
};

export type AdvertisementContactBundle = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  locationText: string | null;
  cityText: string | null;
  latitude: number | null;
  longitude: number | null;
};

type AdvertisementActionSource = {
  description?: string | null;
  ctaLabel?: string | null;
  cta?: { type?: string | null; label?: string | null; target?: string | null } | null;
  destinationUrl?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  contactEmail?: string | null;
  contact?: {
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
  } | null;
  location?: {
    address?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

const GENERIC_CTA = new Set(["learn more", "view details", "view advertisement", "contact us", "tap to view"]);

function isGenericCtaLabel(label: string | null | undefined): boolean {
  return GENERIC_CTA.has(String(label || "").trim().toLowerCase());
}

export function locationLine(location: {
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
} | null | undefined): string | null {
  if (!location) return null;
  const parts = [location.address, location.city || location.district, location.state, location.pincode]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function compactLocation(location: AdvertisementActionSource["location"]): string | null {
  if (!location) return null;
  const city = String(location.city || location.district || "").trim();
  if (city) return city;
  const address = String(location.address || "").trim();
  if (address) return address.split(",")[0]?.trim() || address;
  return locationLine(location);
}

export function resolveAdvertisementContacts(
  ad: AdvertisementActionSource,
  websiteOverride?: string | null
): AdvertisementContactBundle {
  const phone = ad.contact?.phone || ad.contactPhone || extractPhoneNumbers(ad.description || "")[0] || null;
  const whatsapp = ad.contact?.whatsapp || ad.whatsappNumber || null;
  const email = ad.contact?.email || ad.contactEmail || extractEmails(ad.description || "")[0] || null;
  const ctaType = String(ad.cta?.type || "").toUpperCase();
  const ctaWebsite =
    ctaType === "WEBSITE" || ctaType === "CUSTOM_URL" ? ad.cta?.target : null;
  const website = normalizeAdvertisementUrl(
    websiteOverride || ad.contact?.website || ad.destinationUrl || ctaWebsite || null
  );
  const loc = locationLine(ad.location);
  const lat = ad.location?.latitude == null ? null : Number(ad.location.latitude);
  const lng = ad.location?.longitude == null ? null : Number(ad.location.longitude);
  return {
    phone: phone?.trim() || null,
    whatsapp: whatsapp?.trim() || null,
    email: email?.trim() || null,
    website,
    locationText: loc,
    cityText: compactLocation(ad.location),
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null
  };
}

function canCall(phone: string | null): boolean {
  if (!phone) return false;
  if (nationalMobile(phone)) return true;
  const digits = digitsOnly(phone);
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Only actions that have a real target. Never returns Learn more / empty CTAs.
 * Priority: Call → WhatsApp → Website → Directions → Email → custom CTA (URL).
 */
export function getAdvertisementActions(
  ad: AdvertisementActionSource,
  websiteOverride?: string | null
): AdvertisementActionDef[] {
  const contacts = resolveAdvertisementContacts(ad, websiteOverride);
  const actions: AdvertisementActionDef[] = [];
  if (canCall(contacts.phone)) actions.push({ id: "call", label: "Call", icon: "call" });
  if (contacts.whatsapp && whatsappHref(contacts.whatsapp)) {
    actions.push({ id: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" });
  }
  if (contacts.website) {
    const ctaType = String(ad.cta?.type || "").toUpperCase();
    const rawLabel = (ad.cta?.label || ad.ctaLabel || "").trim();
    const websiteLabel =
      (ctaType === "WEBSITE" || ctaType === "CUSTOM_URL") && rawLabel && !isGenericCtaLabel(rawLabel)
        ? rawLabel
        : "Website";
    actions.push({ id: "website", label: websiteLabel, icon: "globe-outline" });
  }
  if (
    mapsHref({
      latitude: contacts.latitude,
      longitude: contacts.longitude,
      address: contacts.locationText
    })
  ) {
    actions.push({ id: "directions", label: "Directions", icon: "navigate-outline" });
  }
  if (contacts.email && mailtoHref(contacts.email)) {
    actions.push({ id: "email", label: "Email", icon: "mail" });
  }
  return actions;
}

export function formatAdValidUntil(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export { formatIndianPhone };
