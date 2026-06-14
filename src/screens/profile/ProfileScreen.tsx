import { View, StyleSheet } from 'react-native';
import { Button, Card, Avatar } from 'heroui-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@hooks/useAuth';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <Card.Header>
            <Avatar size="lg" color="accent">
              <Avatar.Fallback>
                {getInitials(user?.name ?? 'User')}
              </Avatar.Fallback>
            </Avatar>
            <Card.Title>{user?.name ?? 'User'}</Card.Title>
            <Card.Description>{user?.email ?? ''}</Card.Description>
          </Card.Header>
          <Card.Footer>
            <Button variant="danger" onPress={logout} style={styles.fullWidth}>
              <Button.Label>Sign Out</Button.Label>
            </Button>
          </Card.Footer>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  fullWidth: { width: '100%' },
});
