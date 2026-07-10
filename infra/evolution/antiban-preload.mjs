import { createRequire } from 'node:module';
import { applyAntibanToEvolution } from 'baileys-antiban-evolution';
import { AntiBan } from 'baileys-antiban';

globalThis.require = createRequire(import.meta.url);

const DEFAULT_SERVICE_PATH = '/evolution/dist/api/integrations/channel/whatsapp/whatsapp.baileys.service.js';

const optionalInt = (value) => value ? Number.parseInt(value, 10) : undefined;

const jitterMin = optionalInt(process.env.ANTIBAN_JITTER_MIN);
const jitterMax = optionalInt(process.env.ANTIBAN_JITTER_MAX);

const antiban = new AntiBan({
  preset: process.env.ANTIBAN_PRESET || 'conservative',
  maxQPS: optionalInt(process.env.ANTIBAN_MAX_QPS),
  warmupDays: optionalInt(process.env.ANTIBAN_WARMUP_DAYS) ?? 7,
  jitterMs: jitterMin !== undefined || jitterMax !== undefined
    ? { min: jitterMin ?? 100, max: jitterMax ?? 500 }
    : undefined,
});

await applyAntibanToEvolution(antiban, {
  servicePath: process.env.ANTIBAN_SERVICE_PATH || DEFAULT_SERVICE_PATH,
  guardSendMessage: process.env.ANTIBAN_GUARD_SEND !== 'false',
  guardSendMessageWithTyping: process.env.ANTIBAN_GUARD_TYPING !== 'false',
  guardTextMessage: process.env.ANTIBAN_GUARD_TEXT !== 'false',
  logger: console,
});

console.log('[baileys-antiban-evolution] Protection active');