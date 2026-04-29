'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/lib/CartContext';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount, clearCart } = useCart();
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
        setIsAdmin(payload.role === 'admin');
      } catch (error) {
        console.error('Invalid token', error);
        setUser(null);
        setIsAdmin(false);
      }
    } else {
      setUser(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Initial auth check
    checkAuthStatus(); // eslint-disable-line react-hooks/set-state-in-effect

    // Listen for storage changes (logout from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        checkAuthStatus();  
      }
    };

    // Also listen for custom login event (triggered from login page)
    const handleLoginEvent = () => {
      checkAuthStatus();  
    };

    // Also check auth status when window gains focus
    const handleFocus = () => {
      checkAuthStatus();  
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLogin', handleLoginEvent);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogin', handleLoginEvent);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Check auth status when route changes
  useEffect(() => {
    checkAuthStatus(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    // Clear cart first while token is still available
    await clearCart();
    // Then clear authentication state
    localStorage.removeItem('token');
    setUser(null);
    setIsAdmin(false);
    setDropdownOpen(false);
    // Notify other components that user has logged out
    window.dispatchEvent(new CustomEvent('userLogout'));
    router.push('/login');
  };

  return (
    <header className="relative bg-blue-600 text-white p-4 flex justify-between items-center z-40">
      <h1
        className="text-xl font-bold cursor-pointer"
        onClick={() => router.push('/')}
      >
        Shopping Site
      </h1>
      <div className="flex items-center space-x-4">
        {user && (
          <div ref={dropdownRef} className="flex items-center space-x-2 relative z-10">
            <span>Welcome, {user.firstname} {user.lastname}</span>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white text-black rounded-md shadow-lg z-50">
                <button onClick={() => { router.push('/accounts'); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Accounts</button>
                <a href="/profile" className="block px-4 py-2 hover:bg-gray-100">User Profile</a>
                {isAdmin && (
                  <>
                    <button onClick={() => { router.push('/admin/users'); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 hover:bg-gray-100">User Management</button>
                    <a href="/stock-management" className="block px-4 py-2 hover:bg-gray-100">Stock Management</a>
                    <a href="/stock-overview" className="block px-4 py-2 hover:bg-gray-100">Stock Overview</a>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => router.push('/cart')}
          className="relative p-2 hover:bg-blue-700 rounded-full transition-colors"
          aria-label="Shopping Cart"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
