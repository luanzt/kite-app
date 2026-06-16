import Config from 'react-native-config'

export const env = {
  API_BASE_URL: Config.API_BASE_URL ?? 'http://localhost:3000',
  ENV: Config.ENV ?? 'development',
  isDev: Config.ENV === 'development',
  isStaging: Config.ENV === 'staging',
  isProd: Config.ENV === 'production'
}
