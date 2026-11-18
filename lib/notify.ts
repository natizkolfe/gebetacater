import { isTwilioConfigured, sendSms } from "@/lib/twilio";
import type { OrderRecord } from "@/lib/types";

/**
 * Fire-and-forget customer SMS for order status notices.
 * In-app notices always remain; Twilio failures never block kitchen or checkout.
 */
export async function dispatchCustomerSms(order: Pick<OrderRecord, "number" | "customerPhone">, body: string) {
  if (!body.trim()) return;
  if (!isTwilioConfigured()) {
    console.info(`[notify] Twilio unset — skipped SMS for ${order.number}`);
    return;
  }
  const result = await sendSms(order.customerPhone, body);
  if (!result.ok) {
    console.warn(`[notify] SMS not delivered for ${order.number}: ${result.status} ${result.error ?? ""}`.trim());
  }
}
