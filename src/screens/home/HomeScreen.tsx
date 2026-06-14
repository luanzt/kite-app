import { View, StyleSheet } from 'react-native';
import { Button, Card } from 'heroui-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';

export function HomeScreen() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <Card.Header>
            <Card.Title>Welcome</Card.Title>
            <Card.Description>
              Your RN + HeroUI template is ready
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Button onPress={toggleTheme} variant="secondary">
              <Button.Label>
                Switch to {isDark ? 'Light' : 'Dark'} Mode
              </Button.Label>
            </Button>
          </Card.Body>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
});
