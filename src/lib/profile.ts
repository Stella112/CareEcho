import type { LanguageCode } from "./languages";

export type Profile = {
  firstName: string;
  assistantName: string;
  preferredLanguage: LanguageCode;
  readAloud: boolean;
  largeText: boolean;
  highContrast: boolean;
  voiceFirst: boolean;
  onboardingComplete: boolean;
};

export const DEFAULT_PROFILE: Profile = {
  firstName: "Stellamaris",
  assistantName: "Ada",
  preferredLanguage: "en",
  readAloud: false,
  largeText: false,
  highContrast: false,
  voiceFirst: true,
  onboardingComplete: false,
};
