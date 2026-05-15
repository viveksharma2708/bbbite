import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile, Product, CartItem } from './types';
import { cn } from './lib/utils';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Admin from './pages/Admin';
import OrderHistory from './pages/OrderHistory';
import OrderConfirmation from './pages/OrderConfirmation';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import { Toaster } from 'sonner';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('bb-bite-cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('bb-bite-cart', JSON.stringify(cart));
  }, [cart]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing?.quantity === 1) {
        return prev.filter(item => item.id !== productId);
      }
      return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
    });
  };

  const clearCart = () => setCart([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let userSnap;
        try {
          const userRef = doc(db, 'users', user.uid);
          userSnap = await getDoc(userRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          return;
        }

        let currentProfile: UserProfile;

        if (!userSnap.exists()) {
          const isInitialAdmin = user.email === 'vivek5656sharma@gmail.com' || user.email === 'vivekbaba11@gmail.com';
          currentProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            role: isInitialAdmin ? 'admin' : 'user',
            createdAt: serverTimestamp(),
          };
          try {
            await setDoc(doc(db, 'users', user.uid), currentProfile);
            setUserProfile(currentProfile);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
          }
        } else {
          currentProfile = userSnap.data() as UserProfile;
          setUserProfile(currentProfile);
        }

        // Seeding logic removed to prevent deleted items from returning on refresh.
        // Admins can use the "Seed Menu" button in the Admin Panel instead.
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const location = useLocation();
  const showLayout = location.pathname !== '/admin';

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" expand={true} richColors />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {showLayout && (
          <Sidebar 
            userProfile={userProfile} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        )}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {showLayout && (
            <Navbar 
              userProfile={userProfile} 
              onOpenSidebar={() => setIsSidebarOpen(true)}
              cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
              onOpenCart={() => setIsCartOpen(true)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
          <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            !showLayout && "h-screen"
          )}>
            <div className={cn(
              "container mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10",
              !showLayout && "max-w-none px-0 py-0"
            )}>
              <Routes>
                <Route path="/" element={
                  <Home 
                    userProfile={userProfile} 
                    searchQuery={searchQuery}
                    cart={cart}
                    setCart={setCart}
                    addToCart={addToCart}
                    removeFromCart={removeFromCart}
                    isCartOpen={isCartOpen}
                    setIsCartOpen={setIsCartOpen}
                    clearCart={clearCart}
                  />
                } />
                <Route path="/login" element={!userProfile ? <Login /> : <Navigate to="/" />} />
                <Route 
                  path="/admin" 
                  element={userProfile?.role === 'admin' ? <Admin /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/orders" 
                  element={userProfile ? <OrderHistory userProfile={userProfile} /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="/order-confirmation/:orderId" 
                  element={userProfile ? <OrderConfirmation /> : <Navigate to="/login" />} 
                />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
