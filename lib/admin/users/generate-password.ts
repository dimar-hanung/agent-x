import { randomBytes } from "node:crypto";

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const PASSWORD_LENGTH = 12;

export function generatePassword(): string {
  const bytes = randomBytes(PASSWORD_LENGTH);
  let password = "";

  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    password += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }

  return password;
}
