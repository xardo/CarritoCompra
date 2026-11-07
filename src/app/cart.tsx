import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, CartItem, SERVICES_CONFIG } from '../context/AppContext';

export default function CartScreen() {
  const router = useRouter();
  const { user, cart, removeFromCart, updateQuantity, clearCart, calculation, isCalculating } = useApp();
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (!user) {
      const msg = 'Debes iniciar sesión para confirmar tu compra';
      if (Platform.OS !== 'web') Alert.alert('Atención', msg);
      else alert(msg);
      router.replace('/');
      return;
    }

    setProcessingOrder(true);
    try {
      const payload = JSON.stringify({
        usuario_id: user.id,
        items: cart
      });

      // Llamada al microservicio de compras en Render
      let response: Response | null = await fetch(`${SERVICES_CONFIG.GATEWAY_URL}/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${SERVICES_CONFIG.ORDERS_URL}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la compra en el servidor');
      }

      const successMsg = `¡Compra confirmada y guardada en Neon DB!\n\nNúmero de Factura: ${data.numero_factura}\nSubtotal: $${data.resumen.subtotal}\nIVA (19%): $${data.resumen.iva}\nTotal: $${data.resumen.total}`;

      if (Platform.OS !== 'web') {
        Alert.alert('¡Compra Exitosa!', successMsg, [
          {
            text: 'Aceptar',
            onPress: () => {
              clearCart();
              router.replace('/products');
            }
          }
        ]);
      } else {
        alert(successMsg);
        clearCart();
        router.replace('/products');
      }
    } catch (err: any) {
      console.error('Error al realizar checkout:', err);
      const errorMsg = err.message || 'No se pudo conectar con el microservicio de compras';
      if (Platform.OS !== 'web') {
        Alert.alert('Error', errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setProcessingOrder(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartCard}>
      <Image
        source={{ uri: item.imagenproducto || 'https://via.placeholder.com/150' }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.nombreproducto}
        </Text>
        <Text style={styles.itemPrice}>
          ${parseFloat(item.precio as any).toFixed(2)} c/u
        </Text>

        <View style={styles.controlsRow}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.id, -1)}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.cantidad}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.id, 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => removeFromCart(item.id)}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtitle}>Agrega productos desde el catálogo para visualizarlos aquí.</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.back()}
          >
            <Text style={styles.browseButtonText}>Ver Catálogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listContent}
          />

          {/* Resumen de Cálculo e IVA emitido por el microservicio */}
          <View style={styles.summaryCard}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceTag}>Microservicio de Precios & IVA</Text>
              {(isCalculating || processingOrder) && (
                <ActivityIndicator size="small" color="#4f46e5" />
              )}
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({calculation?.totalItems || 0} arts.):</Text>
              <Text style={styles.summaryValue}>${calculation?.subtotal.toFixed(2) || '0.00'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                IVA aplicado ({calculation?.ivaPercentage || '19%'}):
              </Text>
              <Text style={styles.summaryValue}>${calculation?.iva.toFixed(2) || '0.00'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total a pagar:</Text>
              <Text style={styles.totalValue}>${calculation?.total.toFixed(2) || '0.00'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, (isCalculating || processingOrder) && styles.btnDisabled]}
              onPress={handleCheckout}
              disabled={isCalculating || processingOrder}
            >
              {processingOrder ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.checkoutBtnText}>Confirmar y Guardar Compra</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  listContent: {
    padding: 16
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center'
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },
  itemPrice: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 6
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151'
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#ef4444'
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  serviceTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280'
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827'
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 10
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981'
  },
  checkoutBtn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16
  },
  btnDisabled: {
    opacity: 0.6
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20
  },
  browseButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  browseButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  }
});
