import { sendResendEmail } from "./resend";

const getBaseUrl = () =>
  process.env.PUBLIC_BASE_URL ||
  process.env.AUTH_BASE_URL ||
  "http://localhost:5001";

const normalizeRequesterName = (value?: string | null) =>
  value?.trim() ? value : "Someone";

export type FriendRequestEmailPayload = {
  requesterName?: string | null;
  recipientEmail: string;
};

export const buildFriendRequestEmail = ({
  requesterName,
  recipientEmail,
}: FriendRequestEmailPayload) => {
  const safeName = normalizeRequesterName(requesterName);
  const baseUrl = getBaseUrl();
  const subject = `${safeName} sent you a friend request`;
  const text = [
    `You have a new friend request on DHLeague.`,
    `From: ${safeName}.`,
    `Review it here: ${baseUrl}/leaderboard`,
  ].join("\n");

  const html = `
    <div>
      <p>You have a new friend request on DHLeague.</p>
      <p><strong>From:</strong> ${safeName}</p>
      <p><a href="${baseUrl}/leaderboard">Review your friend requests</a></p>
    </div>
  `;

  return {
    to: recipientEmail,
    subject,
    text,
    html,
  };
};

export async function sendFriendRequestEmail(
  payload: FriendRequestEmailPayload,
) {
  return sendResendEmail(buildFriendRequestEmail(payload));
}
