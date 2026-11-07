import React from 'react';
import { Stack } from 'expo-router';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#111827',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#f9fafb' }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="products" options={{ title: 'Catálogo de Productos' }} />
        <Stack.Screen name="cart" options={{ title: 'Mi Carrito' }} />
        <Stack.Screen name="add-product" options={{ title: 'Nuevo Producto' }} />
      </Stack>
    </AppProvider>
  );
}
