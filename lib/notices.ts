import { formatDateLong, formatTime } from "@/lib/dates";
import { FASTING_LABEL, FULFILLMENT_LABEL, SPICE_LABEL, money } from "@/lib/format";
import type { OrderNotice, OrderRecord, Settings } from "@/lib/types";

function notice(partial: Omit<OrderNotice, "id" | "at" | "acknowledgedAt">, at: string): OrderNotice {
  return {
    ...partial,
    id: `ntc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    at,
    acknowledgedAt: null,
  };
}

/** Public site origin for SMS / notice links (set PUBLIC_APP_URL on Railway). */
export function publicAppOrigin(): string {
  const explicit = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const railway = (process.env.RAILWAY_PUBLIC_DOMAIN || "").trim().replace(/\/$/, "");
  if (railway) return railway.startsWith("http") ? railway : `https://${railway}`;
  return "";
}

export function orderDetailUrl(orderId: string): string {
  const origin = publicAppOrigin();
  return origin ? `${origin}/orders/${orderId}` : `/orders/${orderId}`;
}

export function serviceName(order: OrderRecord): string {
  if (order.kind === "catering") return "Catering";
  if (order.kind === "to_go") return "To-Go";
  if (order.kind === "dabo_defo") return "Dabo / Defo";
  if (order.kind === "agelgel") return "Agelgel";
  return order.durationDays === 14 ? "Weekly Meal – 2 Weeks" : "Weekly Meal – 1 Week";
}

export function scheduledDate(order: OrderRecord): string {
  return order.kind === "weekly" ? (order.startDate ?? "") : (order.eventDate ?? "");
}

export function scheduledClock(order: OrderRecord): string {
  if (order.kind !== "weekly" && order.eventTime) return order.eventTime;
  return "12:00";
}

function placeLines(address: string): string {
  const [first, ...rest] = address.split(",").map((part) => part.trim());
  if (!rest.length) return address;
  return `${first}\n${rest.join(", ")}`;
}

export function moneyParts(order: OrderRecord): { food: number; addons: number; delivery: number } {
  const addons = Math.round(order.lines.filter((line) => line.source === "addon").reduce((sum, line) => sum + line.total, 0) * 100) / 100;
  const delivery = order.fulfillment === "delivery" ? (order.deliveryFee ?? 0) : 0;
  const food = Math.round((order.subtotal - addons) * 100) / 100;
  return { food, addons, delivery };
}

function mealLines(order: OrderRecord): string {
  const included = order.lines.filter((line) => line.source !== "addon");
  if (included.length === 0) return "None listed";
  const container = order.kind === "weekly" ? (order.durationDays === 14 ? "28 oz Square" : "24 oz Round") : "";
  return included
    .map((line) => (container ? `${line.name} — Qty ${line.quantity} — ${container}` : `${line.name} × ${line.quantity}`))
    .join("\n");
}

function addonLines(order: OrderRecord): string {
  const addons = order.lines.filter((line) => line.source === "addon");
  if (addons.length === 0) return "None";
  return addons.map((line) => `${line.name} × ${line.quantity}`).join("\n");
}

function preferenceLines(order: OrderRecord): string[] {
  const lines: string[] = [];
  for (const line of order.lines) {
    const spice = line.customization.spiceLevel ? SPICE_LABEL[line.customization.spiceLevel] : "";
    const leaveOut = line.customization.excludedIngredients.join(", ");
    const diet = line.customization.dietary.join(", ");
    const note = line.customization.notes.trim();
    const bits = [spice && `${spice} spice`, leaveOut && `No ${leaveOut.toLowerCase()}`, diet, note].filter(Boolean);
    if (bits.length) lines.push(`${line.name}: ${bits.join(" • ")}`);
  }
  return lines;
}

function scheduleLine(order: OrderRecord): string {
  const date = formatDateLong(scheduledDate(order));
  if (order.kind !== "weekly" && order.eventTime) return `${date} at ${formatTime(order.eventTime)}`;
  return date;
}

function thanksLine(): string {
  return "Thank you for choosing Gebeta Catering.";
}

export function staffNewOrderNotice(order: OrderRecord, at: string): OrderNotice {
  const body = [
    `Order: ${order.number}`,
    `Service: ${serviceName(order)}`,
    `Meal Type: ${FASTING_LABEL[order.fastingPreference]}`,
    `Fulfillment: ${FULFILLMENT_LABEL[order.fulfillment]}`,
    `Scheduled: ${scheduleLine(order)}`,
    "",
    "New paid order received. Open the Staff Portal to review the order.",
  ].join("\n");
  return notice({ kind: "staff_new_order", audience: "staff", title: "New Gebeta Order", body }, at);
}

/** Short phone-ready confirmation: details + order link + thanks (not a kitchen log dump). */
export function confirmationNotice(order: OrderRecord, at: string): OrderNotice {
  const link = orderDetailUrl(order.id);
  const lines = [
    `Hi ${order.customerName},`,
    "",
    thanksLine(),
    "Your order is confirmed and paid.",
    "",
    `Order ${order.number}`,
    `${serviceName(order)} · ${FULFILLMENT_LABEL[order.fulfillment]}`,
    `When: ${scheduleLine(order)}`,
    `Total paid: ${money(order.total)}`,
    "",
    "Your meals:",
    mealLines(order),
  ];
  const addons = addonLines(order);
  if (addons !== "None") {
    lines.push("", "Add-ons:", addons);
  }
  lines.push(
    "",
    "Order details:",
    link,
    "",
    order.fulfillment === "pickup"
      ? "We'll text you when preparation starts, and again when it's ready for pickup."
      : "We'll text you when preparation starts, and again when your driver is on the way.",
  );
  return notice(
    { kind: "customer_confirmation", audience: "customer", title: "Gebeta order confirmed", body: lines.join("\n") },
    at,
  );
}

export function preparingNotice(order: OrderRecord, at: string): OrderNotice {
  const link = orderDetailUrl(order.id);
  const body = [
    `Hi ${order.customerName},`,
    "",
    `Good news — your Gebeta order ${order.number} is now being prepared.`,
    "",
    "Track it here:",
    link,
    "",
    thanksLine(),
  ].join("\n");
  return notice({ kind: "preparing_started", audience: "customer", title: "Your order is being prepared", body }, at);
}

export function pickupReadyNotice(order: OrderRecord, settings: Settings, at: string): OrderNotice {
  const link = orderDetailUrl(order.id);
  const body = [
    `Hi ${order.customerName},`,
    "",
    `Your Gebeta order ${order.number} is ready for pickup.`,
    "",
    "Pickup:",
    placeLines(settings.pickupAddress),
    "",
    `Verification code: ${order.number}`,
    "",
    "Details:",
    link,
    "",
    thanksLine(),
  ].join("\n");
  return notice({ kind: "ready_pickup", audience: "customer", title: "Your order is ready for pickup", body }, at);
}

export function deliveryEnRouteNotice(order: OrderRecord, at: string): OrderNotice {
  const link = orderDetailUrl(order.id);
  const body = [
    `Hi ${order.customerName},`,
    "",
    `Your Gebeta order ${order.number} is out for delivery — the driver is on the way.`,
    "",
    order.address ? `Delivering to:\n${placeLines(order.address)}\n` : "",
    "Track your order:",
    link,
    "",
    thanksLine(),
  ]
    .filter((line) => line !== "")
    .join("\n");
  return notice(
    { kind: "out_for_delivery", audience: "customer", title: "Your driver is on the way", body },
    at,
  );
}

export function thankYouNotice(order: OrderRecord, at: string): OrderNotice {
  const link = orderDetailUrl(order.id);
  const body = [
    `Hi ${order.customerName},`,
    "",
    "We hope you enjoyed your Gebeta meal.",
    "",
    "When you have a moment, tell us about the food, delivery (if you had it), and the website or app:",
    `${link}#feedback`,
    "",
    thanksLine(),
  ].join("\n");
  return notice({ kind: "thank_you", audience: "customer", title: "Thanks for choosing Gebeta", body }, at);
}

export function orderUpdatedNotice(order: OrderRecord, changes: string[], at: string): OrderNotice {
  const body = ["Customer modified this order.", "", "Changed:", ...changes].join("\n");
  return notice(
    { kind: "order_updated", audience: "staff", title: `ORDER UPDATED — ${order.number}`, body },
    at,
  );
}

/** Keep preference helpers available for staff/email expansions later. */
export function preferenceSummary(order: OrderRecord): string {
  const prefs = preferenceLines(order);
  return prefs.length ? prefs.join("\n") : "None added";
}
