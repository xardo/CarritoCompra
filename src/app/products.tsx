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
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, Product, SERVICES_CONFIG } from '../context/AppContext';

export default function ProductsScreen() {
  const router = useRouter();
  const { user, logout, addToCart, cart } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchProducts = async () => {
    try {
      setErrorMsg('');
      let response: Response | null = await fetch(`${SERVICES_CONFIG.GATEWAY_URL}/products`).catch(() => null);
      if (!response || !response.ok) {
        response = await fetch(`${SERVICES_CONFIG.PRODUCTS_URL}/products`);
      }
      if (!response.ok) {
        throw new Error('Error al consultar microservicio de productos en Render');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err: any) {
      console.warn('Error fetching products:', err);
      setErrorMsg('No se pudo conectar al microservicio de productos.');
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
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
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
  listContent: {
    padding: 12
  },
  row: {
    justifyContent: 'space-between'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    width: '48.5%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  image: {
    width: '100%',
    height: 130,
    backgroundColor: '#f3f4f6'
  },
  cardContent: {
    padding: 10
  },
  idBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4
  },
  idText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600'
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    minHeight: 34
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 4,
    marginBottom: 8
  },
  addButton: {
    backgroundColor: '#111827',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center'
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600'
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
