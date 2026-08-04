import { getModelSettings } from "@/lib/admin/model-settings/repository";
import type { WebSearchProviderId } from "@/lib/admin/model-settings/constants";
import { isWebSearchConfiguredForProvider } from "./is-configured";

export async function getWebSearchProvider(): Promise<WebSearchProviderId> {
  const settings = await getModelSettings();
  return settings.webSearchProvider as WebSearchProviderId;
}

export async function isWebSearchConfigured(): Promise<boolean> {
  const provider = await getWebSearchProvider();
  return isWebSearchConfiguredForProvider(provider);
}
