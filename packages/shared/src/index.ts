import { z } from "zod";

/* Runtime-конфиг: подкладывается при деплое как /config.json, в код не зашивается. */
const configSchema = z.object({
  apiBaseUrl: z.string().default("/api/v1"),
  useMocks: z.boolean().default(false),
  sentryDsn: z.string().optional(),
  features: z.record(z.string(), z.boolean()).default({}),
});

export type AppConfig = z.infer<typeof configSchema>;

let current: AppConfig | undefined;

export async function loadConfig(url = "/config.json"): Promise<AppConfig> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Не удалось загрузить ${url}: ${response.status}`);
  current = configSchema.parse(await response.json());
  return current;
}

export function getConfig(): AppConfig {
  if (!current)
    throw new Error("Конфиг не загружен: loadConfig() вызывается в main.tsx до рендера");
  return current;
}

export function isFeatureEnabled(flag: string): boolean {
  return getConfig().features[flag] ?? false;
}
