import de from "./de";
import en from "./en";
import es from "./es";
import zh from "./zh";
import type { Locale } from "./config";
import type { Dictionary } from "./en";

export const DICT: Record<Locale, Dictionary> = { de, en, zh, es };
export type { Dictionary } from "./en";
