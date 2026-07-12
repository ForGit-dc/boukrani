export type AppConfig = {
  HERO_IMAGE_URL?: string;
  PORTRAIT_IMAGE_URL?: string;
  PROFILE_PHOTO_ALT_EN?: string;
  HERO_ALT_EN?: string;
  SHOW_POWERED?: boolean;
};

const KEY = "boukrani_app_config";
const defaults: AppConfig = {
  SHOW_POWERED: false,
  PROFILE_PHOTO_ALT_EN: "Portrait of Mohamed Boukrani, Data Scientist / AI Engineer",
  HERO_ALT_EN: "Data-science themed illustration for Mohamed Boukrani",
  // Base-path aware: the site may be served under a sub-path (GitHub project page),
  // so never hardcode root-relative asset URLs.
  HERO_IMAGE_URL: import.meta.env.BASE_URL + "portrait.jpg",
  PORTRAIT_IMAGE_URL: import.meta.env.BASE_URL + "portrait.jpg",
};

export function getConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as AppConfig;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export function saveConfig(update: Partial<AppConfig>) {
  const current = getConfig();
  const next = { ...current, ...update };
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function getSetting<K extends keyof AppConfig>(key: K, fallback?: NonNullable<AppConfig[K]>) {
  const cfg = getConfig();
  return (cfg[key] ?? fallback) as NonNullable<AppConfig[K]>;
}

export const getHeroUrl = () => getSetting("HERO_IMAGE_URL", "") || defaults.HERO_IMAGE_URL || "";
export const getPortraitUrl = () => getSetting("PORTRAIT_IMAGE_URL", "") || defaults.PORTRAIT_IMAGE_URL || "";
export const getHeroAlt = () => getSetting("HERO_ALT_EN", defaults.HERO_ALT_EN!);
export const getPortraitAlt = () => getSetting("PROFILE_PHOTO_ALT_EN", defaults.PROFILE_PHOTO_ALT_EN!);
export const getShowPowered = () => Boolean(getSetting("SHOW_POWERED", defaults.SHOW_POWERED!));
