export type Language = 'en' | 'vi'

export function detectLanguage(
  persisted: Language | null,
  deviceCode: string | undefined
): Language {
  if (persisted) return persisted
  return deviceCode === 'vi' ? 'vi' : 'en'
}

export function showLanguageSetting(
  isDev: boolean,
  deviceCode: string | undefined,
  persisted: Language | null
): boolean {
  return isDev || deviceCode === 'vi' || persisted === 'vi'
}
