import { getWhatsAppProviderKind } from "./env";
import type { WhatsAppProvider } from "./provider";
import { OfficialMetaWhatsAppProvider } from "./providers/official-meta";
import { UnofficialEvolutionWhatsAppProvider } from "./providers/unofficial-evolution";

let cachedProvider: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const kind = getWhatsAppProviderKind();
  cachedProvider =
    kind === "official"
      ? new OfficialMetaWhatsAppProvider()
      : new UnofficialEvolutionWhatsAppProvider();

  return cachedProvider;
}
