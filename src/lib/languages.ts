export const LANGUAGES = [
  { code: "en", native: "English", name: "English" },
  { code: "es", native: "Español", name: "Spanish" },
  { code: "fr", native: "Français", name: "French" },
  { code: "de", native: "Deutsch", name: "German" },
  { code: "it", native: "Italiano", name: "Italian" },
  { code: "pt", native: "Português", name: "Portuguese" },
  { code: "ar", native: "العربية", name: "Arabic" },
  { code: "da", native: "Dansk", name: "Danish" },
  { code: "nl", native: "Nederlands", name: "Dutch" },
  { code: "fi", native: "Suomi", name: "Finnish" },
  { code: "he", native: "עברית", name: "Hebrew" },
  { code: "hi", native: "हिन्दी", name: "Hindi" },
  { code: "ja", native: "日本語", name: "Japanese" },
  { code: "zh", native: "中文", name: "Mandarin Chinese" },
  { code: "no", native: "Norsk", name: "Norwegian" },
  { code: "sv", native: "Svenska", name: "Swedish" },
  { code: "tr", native: "Türkçe", name: "Turkish" },
  { code: "vi", native: "Tiếng Việt", name: "Vietnamese" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export function languageName(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.name ?? "English";
}

export function isLanguageCode(code: string): code is LanguageCode {
  return LANGUAGES.some((language) => language.code === code);
}
