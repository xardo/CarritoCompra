import React, { createContext, useContext, useState, useEffect } from 'react';

// Si estás usando en emulador Android cambia localhost por 10.0.2.2 o la IP local / URL de Render
// En Render usarás la URL pública que Render te otorgue (ej. https://carrito-gateway.onrender.com/api)
export const API_BASE_URL = 'http://localhost:4000/api';

export interface User {
  id: number;
  nombre: string;
  correo: string;
}

export interface Product {
  id: number;
  nombreproducto: string;
  imagenproducto: string;
  precio: number | string;
}

export interface CartItem extends Product {
  cantidad: number;
}

export interface CartCalculation {
  subtotal: number;
  ivaRate: number;
  ivaPercentage: string;
  iva: number;
  total: number;
  totalItems: number;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, userToken: string) => void;
  logout: () => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, delta: number) => void;
  clearCart: () => void;
  calculation: CartCalculation | null;
  isCalculating: boolean;
  refreshTotals: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [calculation, setCalculation] = useState<CartCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const login = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setCart([]);
    setCalculation(null);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...product, cantidad: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === productId) {
            const newQty = item.cantidad + delta;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
    setCalculation(null);
  };

  // Recalcular mediante el microservicio de órdenes/iva cada vez que cambie el carrito
  const refreshTotals = async () => {
    if (cart.length === 0) {
      setCalculation({
        subtotal: 0,
        ivaRate: 0.19,
        ivaPercentage: '19%',
        iva: 0,
        total: 0,
        totalItems: 0
      });
      return;
    }

    setIsCalculating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart })
      });
      if (res.ok) {
        const data = await res.json();
        setCalculation(data);
      } else {
        // Fallback local si el microservicio de órdenes está desconectado temporalmente
        const sub = cart.reduce((acc, it) => acc + Number(it.precio) * it.cantidad, 0);
        const iva = +(sub * 0.19).toFixed(2);
        setCalculation({
          subtotal: +sub.toFixed(2),
          ivaRate: 0.19,
          ivaPercentage: '19%',
          iva: iva,
          total: +(sub + iva).toFixed(2),
          totalItems: cart.reduce((acc, it) => acc + it.cantidad, 0)
        });
      }
    } catch {
      const sub = cart.reduce((acc, it) => acc + Number(it.precio) * it.cantidad, 0);
      const iva = +(sub * 0.19).toFixed(2);
      setCalculation({
        subtotal: +sub.toFixed(2),
        ivaRate: 0.19,
        ivaPercentage: '19%',
        iva: iva,
        total: +(sub + iva).toFixed(2),
        totalItems: cart.reduce((acc, it) => acc + it.cantidad, 0)
      });
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    refreshTotals();
  }, [cart]);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        calculation,
        isCalculating,
        refreshTotals
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe ser usado dentro de AppProvider');
  return context;
};
