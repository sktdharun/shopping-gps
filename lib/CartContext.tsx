'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  _id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  categoryName?: string;
  subcategoryName?: string;
  filterValues?: { attributeId: string; valueId: string }[];
  stockQuantity: number;
  maxQuantityPerOrder: number;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: any, quantity?: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // Clear cart when user logs out (token removed)
  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setCart([]);
      }
    };

    // Check immediately
    checkToken();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        checkToken();
      }
    };

    // Listen for logout events
    const handleLogout = () => {
      setCart([]);
    };

    // Listen for login events
    const handleLogin = () => {
      fetchCart();  
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLogout', handleLogout);
    window.addEventListener('userLogin', handleLogin);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogout', handleLogout);
      window.removeEventListener('userLogin', handleLogin);
    };
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = async (product: any, quantity: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch current cart to check existing quantity
      const cartRes = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      let currentCart = [];
      if (cartRes.ok) {
        currentCart = await cartRes.json();
      }

      const existingItem = currentCart.find((item: CartItem) => item.productId === product._id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;

      // Validate quantity against maxQuantityPerOrder
      const maxAllowed = product.maxQuantityPerOrder || 10;
      if (quantity > maxAllowed) {
        throw new Error(`Cannot add more than ${maxAllowed} items of this product per order`);
      }

      // Validate against stock availability
      if (currentQuantity + quantity > product.quantity) {
        throw new Error(`Only ${product.quantity - currentQuantity} more items available in stock`);
      }

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity,
          filterValues: product.filterValues || [],
          categoryName: product.categoryName,
          subcategoryName: product.subcategoryName
        })
      });

      if (res.ok) {
        await fetchCart();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Error adding to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error; // Re-throw to let caller handle
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cart/${cartItemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchCart();
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cart/${cartItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });

      if (res.ok) {
        await fetchCart();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const clearCart = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setCart([]);
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const refreshCart = fetchCart;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        loading
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
