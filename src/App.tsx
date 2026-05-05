import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection, addDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile, Product, CartItem } from './types';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Admin from './pages/Admin';
import OrderHistory from './pages/OrderHistory';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import { Toaster } from 'sonner';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
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

        // Seeding logic - Only run if admin or matching email and menu is empty
        if (currentProfile.role === 'admin' || user.email === 'vivek5656sharma@gmail.com') {
          try {
            const productsRef = collection(db, 'products');
            const snap = await getDocs(productsRef);
            if (snap.empty) {
              console.log("Empty products collection found. Seeding initial data...");
              const initialProducts = [
                { name: 'Spicy Veg Burger', price: 89, category: 'Snacks', description: 'Crispy veg patty with tangy mayo and fresh veggies.', isAvailable: true, imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=60' },
                { name: 'Cold Coffee Classic', price: 65, category: 'Drinks', description: 'Hand-beaten creamy cold coffee with chocolate drizzle.', isAvailable: true, imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60' },
                { name: 'Paneer Butter Masala', price: 180, category: 'Lunch', description: 'Rich creamy paneer curry served with 2 butter naan.', isAvailable: true, imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60' },
                { name: 'Grilled Sandwich', price: 75, category: 'Snacks', description: 'Cheese and capsicum stuffed jumbo sandwich.', isAvailable: true, imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60' },
                { name: 'Lemon Iced Tea', price: 45, category: 'Drinks', description: 'Refreshing brewed iced tea with real lemon juice.', isAvailable: true, imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60' },
                { name: 'South Indian Thali', price: 150, category: 'Lunch', description: 'Traditional thali with sambhar, rice and crispy papad.', isAvailable: true, imageUrl: 'https://images.unsplash.com/photo-1589301760014-a929f3979dbc?w=500&auto=format&fit=crop&q=60' }
              ];

              for (const p of initialProducts) {
                await addDoc(collection(db, 'products'), { ...p, updatedAt: serverTimestamp() });
              }
            }

            // Seed settings if missing
            const settingsRef = doc(db, 'settings', 'store');
            const settingsSnap = await getDoc(settingsRef);
            if (!settingsSnap.exists()) {
              await setDoc(settingsRef, {
                isAcceptingOrders: true,
                announcement: 'Welcome to the new BB Bite Experience!',
                estimatedPrepTime: '20-30 mins',
                updatedAt: serverTimestamp()
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'products');
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" expand={true} richColors />
      <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
        <Sidebar 
          userProfile={userProfile} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Navbar 
            userProfile={userProfile} 
            onOpenSidebar={() => setIsSidebarOpen(true)}
            cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
            onOpenCart={() => setIsCartOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden container-content">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
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
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}
