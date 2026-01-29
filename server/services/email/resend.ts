const RESEND_API_URL = "https://api.resend.com/emails";

export type ResendEmailPayload = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export type ResendSendResult = {
  id?: string;
  skipped?: boolean;
  reason?: string;
};

export async function sendResendEmail(
  payload: ResendEmailPayload,
): Promise<ResendSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    return { skipped: true, reason: "missing_config" };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      ...payload,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend error ${response.status}: ${text}`);
  }

  return response.json();
}
