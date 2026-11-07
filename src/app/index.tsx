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
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
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
              autoComplete="off"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu contraseña"
              placeholderTextColor="#9ca3af"
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry
              autoComplete="off"
              autoCorrect={false}
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
    backgroundColor: '#f8fafc' // Fondo neutro, limpio y minimalista (sin azul)
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  header: {
    alignItems: 'center',
    marginBottom: 28
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    letterSpacing: 0.5
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500'
  },
  inputGroup: {
    marginBottom: 18
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a'
  },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center'
  },
  switchText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline'
  }
});
