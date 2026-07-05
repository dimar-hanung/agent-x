export function normalizePhoneE164(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Nomor HP wajib diisi.");
  }

  let digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  }

  if (digits.length < 10) {
    throw new Error("Format nomor HP tidak valid.");
  }

  return `+${digits}`;
}

export function phoneDigitsForLookup(phoneE164: string): string {
  return phoneE164.replace(/\D/g, "");
}
