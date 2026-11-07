import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, SERVICES_CONFIG } from '../context/AppContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useApp();

  const [isRegistering, setIsRegistering] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('admin@demo.com');
  const [contrasena, setContrasena] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!correo.trim() || !contrasena.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos');
      return;
    }

    if (isRegistering && !nombre.trim()) {
      setErrorMsg('El nombre es obligatorio para registrarse');
      return;
    }

    setLoading(true);
    const authPath = isRegistering ? 'register' : 'login';
    const payload = isRegistering ? { nombre, correo, contrasena } : { correo, contrasena };

    try {
      // Intentar primero a través del Gateway, con fallback al Auth Service directo de Render
      let response: Response | null = await fetch(`${SERVICES_CONFIG.GATEWAY_URL}/auth/${authPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${SERVICES_CONFIG.AUTH_URL}/${authPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error en la solicitud');
      }

      login(data.user, data.token);
      router.replace('/products');
    } catch (err: any) {
      console.warn('Fallo de red o microservicio:', err);
      // Notificar al usuario con claridad
      const msg = err.message || 'No se pudo conectar al microservicio de autenticación';
      setErrorMsg(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Atención', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.badge}>Microservicio Auth</Text>
            <Text style={styles.title}>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</Text>
            <Text style={styles.subtitle}>
              {isRegistering
                ? 'Regístrate para comprar y gestionar productos'
                : 'Ingresa con tu correo y contraseña'}
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {isRegistering && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Juan Pérez"
                placeholderTextColor="#9ca3af"
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="ejemplo@correo.com"
              placeholderTextColor="#9ca3af"
              value={correo}
              onChangeText={setCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9ca3af"
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegistering ? 'Registrarse' : 'Ingresar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
            }}
          >
            <Text style={styles.switchText}>
              {isRegistering
                ? '¿Ya tienes una cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate aquí'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827'
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600'
  },
  switchButton: {
    marginTop: 18,
    alignItems: 'center'
  },
  switchText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '500'
  }
});
