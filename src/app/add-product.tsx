import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../context/AppContext';

export default function AddProductScreen() {
  const router = useRouter();
  const [nombreproducto, setNombreproducto] = useState('');
  const [imagenproducto, setImagenproducto] = useState('');
  const [precio, setPrecio] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!nombreproducto.trim() || !imagenproducto.trim() || !precio.trim()) {
      setErrorMsg('Por favor llena todas las casillas requeridas');
      return;
    }

    const numPrice = parseFloat(precio);
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Ingresa un precio numérico válido mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreproducto,
          imagenproducto,
          precio: numPrice
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el producto');
      }

      if (Platform.OS !== 'web') {
        Alert.alert('Éxito', 'Producto creado en la base de datos');
      }
      router.back();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el microservicio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Registrar Producto</Text>
        <Text style={styles.subtitle}>
          Casillas: ID (autogenerado por la BD), Nombre, Imagen (link) y Precio
        </Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del Producto</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Teclado Gamer Inalámbrico"
            placeholderTextColor="#9ca3af"
            value={nombreproducto}
            onChangeText={setNombreproducto}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Link de la Imagen (URL)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://images.unsplash.com/..."
            placeholderTextColor="#9ca3af"
            value={imagenproducto}
            onChangeText={setImagenproducto}
            autoCapitalize="none"
          />
        </View>

        {imagenproducto.trim().length > 10 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Vista previa de imagen:</Text>
            <Image
              source={{ uri: imagenproducto }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Precio ($ USD)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. 49.99"
            placeholderTextColor="#9ca3af"
            value={precio}
            onChangeText={setPrecio}
            keyboardType="decimal-pad"
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
            <Text style={styles.buttonText}>Guardar Producto</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  content: {
    padding: 20
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 20
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13
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
    fontSize: 14,
    color: '#111827'
  },
  previewContainer: {
    marginBottom: 16
  },
  previewLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
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
  }
});
