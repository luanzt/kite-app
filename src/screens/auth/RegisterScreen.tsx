import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Button,
  Input,
  TextField,
  Label,
  FieldError,
  Card,
  Alert,
  Spinner,
} from 'heroui-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '@utils/validators';
import { useAuth } from '@hooks/useAuth';
import type { AuthScreenProps } from '@navigation/types';

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { register, isLoading, error } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.content}>
          <Card>
            <Card.Header>
              <Card.Title>Create Account</Card.Title>
              <Card.Description>Sign up to get started</Card.Description>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField isInvalid={!!errors.name}>
                    <Label>
                      <Label.Text>Name</Label.Text>
                    </Label>
                    <Input
                      placeholder="Your full name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                    {errors.name && (
                      <FieldError>{errors.name.message}</FieldError>
                    )}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField isInvalid={!!errors.email}>
                    <Label>
                      <Label.Text>Email</Label.Text>
                    </Label>
                    <Input
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                    {errors.email && (
                      <FieldError>{errors.email.message}</FieldError>
                    )}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField isInvalid={!!errors.password}>
                    <Label>
                      <Label.Text>Password</Label.Text>
                    </Label>
                    <Input
                      placeholder="At least 6 characters"
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                    {errors.password && (
                      <FieldError>{errors.password.message}</FieldError>
                    )}
                  </TextField>
                )}
              />
            </Card.Body>
            <Card.Footer>
              <Button
                onPress={handleSubmit(onSubmit)}
                isDisabled={isLoading}
                style={styles.fullWidth}>
                {isLoading ? (
                  <Spinner />
                ) : (
                  <Button.Label>Sign Up</Button.Label>
                )}
              </Button>
              <Button
                variant="ghost"
                onPress={() => navigation.goBack()}>
                <Button.Label>Already have an account? Sign In</Button.Label>
              </Button>
            </Card.Footer>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  fullWidth: { width: '100%' },
});
