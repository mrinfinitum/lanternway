/**
 * Password rules for sign-up and password changes (NIST 800-63B style):
 * long enough, not a well-known password, not the email address. No forced
 * symbols or rotation; length matters most. Returns a problem message or null.
 */

const COMMON = new Set([
  "password", "password1", "password12", "password123", "1234567890", "12345678910", "qwertyuiop", "iloveyou12",
  "letmein123", "welcome123", "abc1234567", "qwerty1234", "1q2w3e4r5t", "passw0rd12", "lanternway", "lanternway1",
  "football12", "baseball12", "sunshine12", "princess12", "monkey1234", "dragon1234", "trustno1234", "1111111111",
]);

export const PASSWORD_MIN = 10;
export const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters. A short phrase is easy to remember and hard to guess.`;

export function passwordProblem(password: string, email = ""): string | null {
  if (password.length < PASSWORD_MIN) return `Please use at least ${PASSWORD_MIN} characters for your password.`;
  if (password.length > 128) return "That password is too long. Please use 128 characters or fewer.";
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "That password is too easy to guess. Try a short phrase instead.";
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "Please don't use your email address in your password.";
  return null;
}
