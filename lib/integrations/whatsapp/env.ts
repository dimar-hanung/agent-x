export function getWhatsAppProviderKind(): "unofficial" | "official" {
  const value = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();

  if (value === "official") {
    return "official";
  }

  return "unofficial";
}

export function getEvolutionConfig() {
  const baseUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const instanceName =
    process.env.EVOLUTION_INSTANCE_NAME?.trim() || "agentx-channel";
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET?.trim();
  const agentxPublicUrl = process.env.AGENTX_PUBLIC_URL?.trim().replace(
    /\/$/,
    ""
  );
  const explicitWebhookUrl = process.env.AGENTX_WEBHOOK_URL?.trim();

  const evolutionOnSameHost =
    baseUrl?.includes("127.0.0.1") || baseUrl?.includes("localhost");

  const webhookUrl =
    explicitWebhookUrl ||
    (evolutionOnSameHost
      ? "http://host.docker.internal:3000/api/integrations/whatsapp/webhook"
      : agentxPublicUrl
        ? `${agentxPublicUrl}/api/integrations/whatsapp/webhook`
        : undefined);

  return {
    baseUrl,
    apiKey,
    instanceName,
    webhookSecret,
    agentxPublicUrl,
    webhookUrl,
  };
}

export function isEvolutionConfigured(): boolean {
  const { baseUrl, apiKey } = getEvolutionConfig();
  return Boolean(baseUrl && apiKey);
}
