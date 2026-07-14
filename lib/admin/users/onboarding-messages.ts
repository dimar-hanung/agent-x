import type { AppRole } from "@/lib/ai/roles/types";

export function getLoginUrl(): string {
  const publicUrl = process.env.AGENTX_PUBLIC_URL?.trim().replace(/\/$/, "");

  if (publicUrl) {
    return publicUrl;
  }

  return "agentx.com";
}

interface BuildCreateUserWhatsAppMessageInput {
  role: Extract<AppRole, "admin" | "client" | "guest">;
  email: string;
  password: string;
  loginUrl?: string;
}

export function buildCreateUserWhatsAppMessage({
  role,
  email,
  password,
  loginUrl = getLoginUrl(),
}: BuildCreateUserWhatsAppMessageInput): string {
  if (role === "client") {
    return [
      "Izin pak, saya adalah asistant AI yang akan bapak gunakan, kunjungi halaman",
      loginUrl,
      "dan masuk menggunakan",
      `username: ${email}`,
      `password: ${password}`,
    ].join("\n");
  }

  return [
    "Akun AgentX Anda telah dibuat. Kunjungi",
    loginUrl,
    "dan masuk menggunakan",
    `username: ${email}`,
    `password: ${password}`,
  ].join("\n");
}
