import { View } from 'react-native';
import { Button, Typography } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@store/useAppStore';
import { changeLanguage } from '@i18n/index';

export function SettingsScreen() {
  const { t } = useTranslation();
  const themeMode = useAppStore(s => s.themeMode);
  const toggleTheme = useAppStore(s => s.toggleTheme);
  const language = useAppStore(s => s.language);

  return (
    <View className="p-4 gap-4">
      <Typography className="text-xl font-bold">{t('tabs.settings')}</Typography>
      <View className="gap-2">
        <Typography>{t('settings.theme')}: {themeMode}</Typography>
        <Button variant="secondary" onPress={toggleTheme}><Button.Label>{t('settings.theme')}</Button.Label></Button>
      </View>
      <View className="gap-2">
        <Typography>{t('settings.language')}: {language ?? 'auto'}</Typography>
        <Button variant={language === 'en' ? 'primary' : 'secondary'} onPress={() => changeLanguage('en')}>
          <Button.Label>{t('settings.english')}</Button.Label>
        </Button>
        <Button variant={language === 'vi' ? 'primary' : 'secondary'} onPress={() => changeLanguage('vi')}>
          <Button.Label>{t('settings.vietnamese')}</Button.Label>
        </Button>
      </View>
    </View>
  );
}
