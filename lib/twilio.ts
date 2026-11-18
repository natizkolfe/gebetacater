export type TwilioSmsResult = {
  ok: boolean;
  status: "sent" | "failed" | "not_configured" | "invalid_phone";
  sid?: string | null;
  error?: string | null;
};

function credentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!accountSid || !authToken || !from) return null;
  return {
    accountSid,
    authToken,
    from,
    authHeader: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
  };
}

export function isTwilioConfigured(): boolean {
  return Boolean(credentials());
}

/** Normalize US customer phones to E.164. Returns null if unusable. */
export function normalizeUsPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) return null;
    return `+${digits}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Soft-fail Twilio Messaging send. Never throws. */
export async function sendSms(to: string, body: string): Promise<TwilioSmsResult> {
  const creds = credentials();
  if (!creds) {
    return { ok: false, status: "not_configured", error: "Twilio is not configured", sid: null };
  }

  const e164 = normalizeUsPhone(to);
  if (!e164) {
    return { ok: false, status: "invalid_phone", error: "Phone number is not a valid US number", sid: null };
  }

  try {
    const params = new URLSearchParams({
      To: e164,
      From: creds.from,
      Body: body.slice(0, 1500),
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: creds.authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(12000),
      },
    );
    const json = (await response.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
      error_message?: string;
    };
    if (!response.ok) {
      const err = json.message ?? json.error_message ?? `Twilio HTTP ${response.status}`;
      console.warn(`[twilio] SMS failed to ${e164}: ${err}`);
      return { ok: false, status: "failed", error: err, sid: null };
    }
    console.info(`[twilio] SMS sent to ${e164} sid=${json.sid ?? "-"}`);
    return { ok: true, status: "sent", sid: json.sid ?? null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twilio request failed";
    console.warn(`[twilio] exception: ${message}`);
    return { ok: false, status: "failed", error: message, sid: null };
  }
}
