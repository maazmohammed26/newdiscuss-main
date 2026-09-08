import { getAuthenticatedIdToken } from './authenticatedRequest';

const sentWelcomeEmails = new Set();

const sendEmail = async (payload) => {
  try {
    const token = await getAuthenticatedIdToken();
    const response = await fetch('/api/send-email', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.warn('[Email] Server delivery failed:', error?.message);
    return false;
  }
};

export const sendWelcomeEmailDirectly = async (email, username) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || sentWelcomeEmails.has(normalized)) return false;
  sentWelcomeEmails.add(normalized);
  const sent = await sendEmail({ type: 'welcome', email: normalized, username });
  if (!sent) sentWelcomeEmails.delete(normalized);
  return sent;
};

export const sendVerificationOTPDirectly = (email, username, otp) => sendEmail({
  type: 'verification_otp',
  email: String(email || '').trim().toLowerCase(),
  username,
  otp: String(otp || ''),
});
