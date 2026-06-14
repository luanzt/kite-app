import { View } from 'react-native';
import { Button, Text } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@store/useAppStore';
import { changeLanguage } from '@i18n/index';

export function SettingsScreen() {
  const { t } = useTranslation();
  const themeMode = useAppStore(s => s.themeMode);
  const toggleTheme = useAppStore(s => s.toggleTheme);
  const language = useAppStore(s => s.language);

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Text className="text-xl font-bold">{t('tabs.settings')}</Text>
      <View style={{ gap: 8 }}>
        <Text>{t('settings.theme')}: {themeMode}</Text>
        <Button variant="secondary" onPress={toggleTheme}><Button.Label>{t('settings.theme')}</Button.Label></Button>
      </View>
      <View style={{ gap: 8 }}>
        <Text>{t('settings.language')}: {language ?? 'auto'}</Text>
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
