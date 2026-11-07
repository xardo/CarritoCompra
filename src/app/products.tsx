import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, Product, SERVICES_CONFIG } from '../context/AppContext';
import { cacheProductsLocally, getLocalProducts } from '../services/offlineStorage';

export default function ProductsScreen() {
  const router = useRouter();
  const { user, logout, addToCart, cart } = useApp();
  const { width } = useWindowDimensions();

  // Calcula automáticamente cuántas cards grandes caben por fila según el ancho disponible
  // Tarjetas de aprox ~320px de ancho para que se vean grandes y llenen bien el espacio
  const availableWidth = width - 48; // Restando paddings laterales
  const targetCardWidth = 320;
  const numColumns = Math.max(1, Math.min(6, Math.floor(availableWidth / targetCardWidth)));

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Proteger la vista: si no hay usuario autenticado, redirigir al login
  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      setErrorMsg('');
      let response: Response | null = await fetch(`${SERVICES_CONFIG.GATEWAY_URL}/products`).catch(() => null);
      if (!response || !response.ok) {
        response = await fetch(`${SERVICES_CONFIG.PRODUCTS_URL}/products`).catch(() => null);
      }

      if (response && response.ok) {
        const data = await response.json();
        setProducts(data);
        // Guardar copia en SQLite para cuando no haya internet
        await cacheProductsLocally(data);
      } else {
        // MODO OFFLINE: Si no hay internet, cargar desde SQLite
        console.warn('⚠️ [Offline] Sin conexión a internet. Cargando catálogo desde SQLite local...');
        const localProds = await getLocalProducts();
        if (localProds.length > 0) {
          setProducts(localProds);
        } else {
          throw new Error('No hay conexión y tampoco hay productos guardados localmente.');
        }
      }
    } catch (err: any) {
      console.warn('Error fetching products:', err);
      // Fallback a SQLite
      const localProds = await getLocalProducts();
      if (localProds.length > 0) {
        setProducts(localProds);
      } else {
        setErrorMsg('Sin conexión a internet ni productos en caché local.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.cantidad, 0);

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <Image
        source={{
          uri: item.imagenproducto || 'https://via.placeholder.com/300?text=Sin+Imagen'
        }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>ID: #{item.id}</Text>
        </View>
        <Text style={styles.productName} numberOfLines={2}>
          {item.nombreproducto}
        </Text>
        <Text style={styles.productPrice}>${parseFloat(item.precio as any).toFixed(2)}</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addToCart(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Agregar al Carrito</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Barra superior de usuario y navegación */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hola, {user ? user.nombre : 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user ? user.correo : ''}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/add-product')}
          >
            <Text style={styles.secondaryButtonText}>+ Producto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
          >
            <Text style={styles.cartButtonText}>🛒 Carrito</Text>
            {totalCartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              logout();
              router.replace('/');
            }}
          >
            <Text style={styles.logoutButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de productos */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Cargando catálogo desde Neon Database...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
            <Text style={styles.retryButtonText}>Reintentar conexión</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No hay productos registrados en la base de datos.</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/add-product')}
          >
            <Text style={styles.createButtonText}>Crear el primer producto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.containerWrapper}>
          <FlatList
            key={`grid-${numColumns}`} // Forza el re-render al cambiar columnas
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProductItem}
            numColumns={numColumns}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  greeting: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827'
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280'
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  secondaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151'
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111827',
    position: 'relative'
  },
  cartButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff'
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  logoutButtonText: {
    color: '#9ca3af',
    fontSize: 12
  },
  containerWrapper: {
    flex: 1,
    width: '100%'
  },
  listContent: {
    padding: 24,
    width: '100%'
  },
  row: {
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 20
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
  },
  image: {
    width: '100%',
    height: 210, // Imagen más grande y llamativa
    backgroundColor: '#f1f5f9'
  },
  cardContent: {
    padding: 16
  },
  idBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8
  },
  idText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700'
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    minHeight: 44,
    lineHeight: 22
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    marginTop: 6,
    marginBottom: 14
  },
  addButton: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  createButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  }
});
