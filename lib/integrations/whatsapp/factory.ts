import { getWhatsAppProviderKind } from "./env";
import type { WhatsAppProvider } from "./provider";
import { OfficialMetaWhatsAppProvider } from "./providers/official-meta";
import { UnofficialEvolutionWhatsAppProvider } from "./providers/unofficial-evolution";

export function getWhatsAppProvider(): WhatsAppProvider {
  const kind = getWhatsAppProviderKind();

  return kind === "official"
    ? new OfficialMetaWhatsAppProvider()
    : new UnofficialEvolutionWhatsAppProvider();
}
