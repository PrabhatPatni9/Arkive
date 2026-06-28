import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  gu: 'ગુજરાતી',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  zh: '中文 (简体)',
  ja: '日本語',
  id: 'Bahasa Indonesia',
} as const

export type SupportedLocale = keyof typeof SUPPORTED_LANGUAGES

// Keys that MUST be reviewed by a native human translator before shipping.
// Machine-translated medical terms in emergency contexts can be dangerous.
export const REVIEW_REQUIRED_LOCALES: SupportedLocale[] = [
  'hi', 'mr', 'kn', 'bn', 'ta', 'te', 'gu', 'zh', 'ja',
]

export const REVIEW_REQUIRED_KEYS = [
  'emergency.blood_group',
  'emergency.allergies',
  'emergency.conditions',
  'emergency.medications',
  'emergency.emergency_contacts',
]

const LANG_KEY = 'arkive_locale'

export function getStoredLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored && stored in SUPPORTED_LANGUAGES) return stored as SupportedLocale
  } catch { /* ignore */ }
  return 'en'
}

export function saveLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem(LANG_KEY, locale)
  } catch { /* ignore */ }
}

export function needsReview(locale: SupportedLocale): boolean {
  return REVIEW_REQUIRED_LOCALES.includes(locale)
}

void i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: getStoredLocale(),
    fallbackLng: 'en',
    defaultNS: 'translation',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
