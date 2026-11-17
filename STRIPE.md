# Gebeta × Stripe — Payment Guide

This document explains how Stripe payments should work for Gebeta, what belongs on the server vs the browser, and what security steps to take **before** real or test customers pay.

It is a reading / planning guide. Stripe is **not** wired into the app yet. Today Gebeta uses a **demo checkout** that accepts a fake card number in the browser.

---

## 1. What Stripe is

Stripe is a payment company. Your website never needs to store full credit card numbers. Stripe:

1. Shows a secure card form (or Checkout page)
2. Talks to the card networks (Visa, Mastercard, etc.)
3. Tells **your server** when money was successfully taken
4. Deposits funds to your connected bank account (after Stripe’s payout schedule)

You integrate with Stripe using:

| Item | Example | Where it lives |
|------|---------|----------------|
| Publishable key | `pk_test_…` or `pk_live_…` | Browser / client (safe to expose) |
| Secret key | `sk_test_…` or `sk_live_…` | **Server only** (never in frontend code or git) |
| Webhook signing secret | `whsec_…` | **Server only** |

**Test mode** (`pk_test_` / `sk_test_`) uses fake cards and fake money.  
**Live mode** (`pk_live_` / `sk_live_`) charges real cards.

---

## 2. What Gebeta does today (demo)

Current path (simplified):

1. Customer builds an order and reaches `/order/pay`
2. Browser collects card number, expiry, CVC, name
3. Browser posts those fields to `POST /api/orders/[id]/pay`
4. Server runs `payOrder()` which uses a **demo rule**:
   - Card starting with `4242` → approve
   - Card starting with `4000` → decline
5. On success, order becomes paid and the kitchen notice is created

That is fine for development. It is **not** safe for real cards because:

- Card data touches your server
- There is no real bank / Stripe verification
- Anyone who understands the demo rules can “pay”

Stripe replaces that demo path.

---

## 3. The golden security rule

> **The browser never sees the secret key.  
> Your server never sees the full card number.**

| Allowed on the client | Allowed only on the server |
|-----------------------|----------------------------|
| Publishable key | Secret key |
| Stripe.js / Payment Element UI | Create PaymentIntent / Checkout Session |
| Confirm payment with Stripe | Verify payment (webhook or retrieve) |
| Show success / failure UI | Mark Gebeta order as `confirmed` / paid |
| Display order total | Calculate and charge the authoritative total |

If card numbers are typed into your own `<input>` and posted to `/api/orders/.../pay`, you are on the wrong path for production Stripe.

---

## 4. Recommended payment flow for Gebeta

```
Customer reviews order
        │
        ▼
 Your server creates a Stripe PaymentIntent
 (amount = server-calculated order total)
        │
        ▼
 Browser shows Stripe Payment Element
 (card fields hosted/controlled by Stripe)
        │
        ▼
 Customer pays → Stripe processes the card
        │
        ▼
 Stripe sends webhook → your server
 event: payment_intent.succeeded
        │
        ▼
 Your server marks the Gebeta order PAID
 Kitchen notice / SMS can fire here
```

### Why the webhook matters

The browser can lie (“payment worked”).  
A webhook is Stripe telling **your** server, with a signed message, that money was taken.

**Do not** mark an order paid only because the frontend redirected to a “success” page.  
**Do** mark it paid when:

- Stripe webhook `payment_intent.succeeded` is verified, **or**
- Your server retrieves the PaymentIntent from Stripe and confirms `status === "succeeded"`

Webhook is the preferred source of truth for kitchen readiness.

---

## 5. Server-side vs client-side responsibilities

### Server must do

1. **Authenticate** the customer (already signed in)
2. **Load the order** from your database (must belong to that customer)
3. **Recompute the amount** (food + add-ons − promo + delivery) from stored order data  
   Never trust `amount` sent from the browser
4. **Create** the PaymentIntent with that amount (in cents) and currency (`usd`)
5. Attach metadata: `orderId`, `orderNumber`, `userId`
6. Return only a **client secret** (or Checkout URL) to the browser
7. On webhook: verify signature → find order → mark paid → start kitchen flow
8. Handle failures, cancels, and duplicate events safely (idempotency)

### Client must do

1. Show order summary (read-only)
2. Load Stripe.js with the **publishable** key
3. Mount Payment Element
4. Call Stripe to confirm payment using the client secret from your server
5. Show “Processing…”, success, or error
6. Optionally poll or navigate to order status after success

### Client must never do

- Store or log secret keys
- Decide the final charged price
- Mark the kitchen order as paid by itself
- Send raw card PAN/CVC to Gebeta APIs

---

## 6. Security checklist before test people use it

Use this as a gate before anyone outside the team tries payment.

### Keys & environment

- [ ] Stripe account created
- [ ] Test keys only (`pk_test_`, `sk_test_`) until go-live
- [ ] Secret key in `.env.local` / host env — **not** in git
- [ ] Publishable key can be in env as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Different keys for staging vs production when you have both

Example env names (suggested):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### HTTPS & hosting

- [ ] Public site on HTTPS (required for live Stripe; strongly preferred for test too)
- [ ] Webhook endpoint reachable by Stripe (`https://your-domain/api/stripe/webhook`)

### Amount integrity

- [ ] Charge amount comes only from server order total
- [ ] Promo discount applied with the same rules as order creation
- [ ] Delivery fee only if fulfillment is delivery and quote was accepted

### Auth & ownership

- [ ] Only the order owner can start payment
- [ ] Staff/admin routes cannot be used to fake customer payment without Stripe

### Webhooks

- [ ] Verify `Stripe-Signature` on every webhook request
- [ ] Reject unsigned / invalid payloads
- [ ] Process each `payment_intent` success only once (idempotent)

### Data retention

- [ ] Store Stripe PaymentIntent id on the order
- [ ] Optionally store last4 / brand from Stripe
- [ ] Never store full card number, CVC, or raw card payload
- [ ] Do not log request bodies that might include payment details

### Demo checkout removal

- [ ] Remove or hard-disable the demo `cardNumber` / `4242` approval path before real testers
- [ ] Keep demo mode behind an explicit `PAYMENTS_MODE=demo` flag if you need both temporarily

---

## 7. Test mode vs live mode

### Test mode (for development and test people)

- Use Stripe test cards, e.g. `4242 4242 4242 4242`
- No real money moves
- Use Stripe Dashboard → Developers → Webhooks (or Stripe CLI) to forward events to localhost
- Safe for friends/family to click through the flow

### Live mode (real customers)

- Switch to `pk_live_` / `sk_live_`
- Complete Stripe business verification / bank payout setup
- Use a production webhook endpoint with the live signing secret
- Monitor failed payments and disputes in the Stripe Dashboard

**Never mix** live secret keys with test publishable keys (or the reverse).

---

## 8. Two common Stripe UI options

### Option A — Payment Element (recommended for Gebeta’s current `/order/pay` page)

- Customer stays on your pay page
- You create a PaymentIntent on the server
- Stripe Element collects card details
- Closest replacement for your current checkout screen

### Option B — Stripe Checkout (hosted page)

- Server creates a Checkout Session
- Customer is redirected to Stripe’s page, then back to Gebeta
- Less UI work, Stripe hosts more of the experience
- Slightly less “in-brand” than Payment Element

Either option is secure if amount creation and webhooks stay server-side.

---

## 9. How this maps onto Gebeta order states

Today (conceptually):

| State | Meaning |
|-------|---------|
| `payment_pending` | Order saved; kitchen should not prepare |
| `confirmed` (and later statuses) | Paid / moving through kitchen |

With Stripe:

| Event | Gebeta action |
|-------|----------------|
| Order created | Stay `payment_pending` |
| PaymentIntent created | Save Stripe id; still unpaid |
| `payment_intent.succeeded` webhook | Mark paid → `confirmed` → staff notice |
| Payment fails / canceled | Stay `payment_pending`; allow retry |
| Refund (later feature) | Optional status / staff note |

Kitchen alerts (portal notice, future Twilio SMS) should fire **after** verified payment, same as today’s paid path.

---

## 10. PCI — why Stripe Elements matters

PCI DSS is the card-industry security standard. If your server receives raw card numbers, your compliance burden rises sharply.

Using Stripe Payment Element / Checkout means:

- Card data goes to Stripe
- Gebeta mostly stays out of “storing or transmitting cardholder data”
- You still must protect secret keys, use HTTPS, and verify webhooks

This is one of the main reasons not to keep the demo card form for production.

---

## 11. Suggested rollout plan

1. **Read this doc** and create a Stripe account (test mode)
2. Add env vars; do not commit secrets
3. Replace demo pay API with “create PaymentIntent” on the server
4. Put Payment Element on `/order/pay`
5. Add webhook route; mark orders paid only from verified events
6. Test with Stripe test cards + a few trusted testers
7. Turn off demo card acceptance
8. After menus/pricing are final and production HTTPS is stable → live keys

Do **not** start App Store packaging or SaaS multi-tenant work just to take payments. Finish web checkout first.

---

## 12. Glossary

| Term | Meaning |
|------|---------|
| PaymentIntent | Stripe object representing “an attempt to collect a specific amount” |
| Client secret | Short-lived token the browser uses with Stripe.js to complete that PaymentIntent |
| Webhook | HTTP callback Stripe sends to your server when something happens (e.g. paid) |
| Publishable key | Public identifier for your Stripe account in the browser |
| Secret key | Private API key; can create charges and read payments — server only |
| Idempotency | Making sure the same success event does not mark an order paid twice or charge twice |
| Test mode | Fake money / test cards |
| Live mode | Real money |

---

## 13. Official Stripe reading (optional deeper dive)

- [Payments 101](https://stripe.com/docs/payments)
- [Accept a payment (Payment Element)](https://stripe.com/docs/payments/accept-a-payment)
- [Webhooks best practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing cards](https://stripe.com/docs/testing)
- [Security / integration security](https://stripe.com/docs/security)

---

## 14. Bottom line for Gebeta

1. Keep **price and “order is paid”** on the **server**
2. Let Stripe own the **card form**
3. Trust **webhooks** (or server retrieve), not the browser alone
4. Start in **test mode** for test people
5. Remove the demo `4242` checkout before real cards

When you are ready to implement, the first coding step is:  
**create PaymentIntent from the existing unpaid order total, then swap `/order/pay` to Stripe Elements.**
