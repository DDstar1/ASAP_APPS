// Phone numbers are stored in E.164 (e.g. +2348012345678), matching the
// app_custom_users_phone_format check: ^\+[1-9][0-9]{7,14}$

const E164 = /^\+[1-9][0-9]{7,14}$/;

// Accepts Nigerian local (08012345678, 8012345678), 234… and +… input.
// Returns null when it can't be read as a valid number.
export function normalizePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s\-().]/g, "");
  if (!cleaned) return null;

  let phone: string;
  if (cleaned.startsWith("+")) phone = cleaned;
  else if (cleaned.startsWith("00")) phone = `+${cleaned.slice(2)}`;
  else if (cleaned.startsWith("234")) phone = `+${cleaned}`;
  else if (/^0\d{10}$/.test(cleaned)) phone = `+234${cleaned.slice(1)}`;
  else if (/^[789]\d{9}$/.test(cleaned)) phone = `+234${cleaned}`;
  else return null;

  // Nigerian numbers are +234 followed by 10 digits
  if (phone.startsWith("+234") && !/^\+234[789]\d{9}$/.test(phone)) return null;

  return E164.test(phone) ? phone : null;
}
