import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  Clock, 
  Timer,
  Zap,
  ArrowRight,
  Utensils,
  Coffee,
  IceCream,
  Pizza,
  UtensilsCrossed,
  Star,
  ChevronRight,
  ShoppingCart,
  MapPin,
  TrendingUp,
  Award
} from 'lucide-react';
import { collection, onSnapshot, doc, serverTimestamp, query, addDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Order, UserProfile, StoreSettings, CartItem } from '../types';
import { cn } from '../lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { initializeRazorpayPayment } from '../lib/razorpay';

interface HomeProps {
  userProfile: UserProfile | null;
  searchQuery: string;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
  clearCart: () => void;
}

function ActiveOrders({ userProfile, settings }: { userProfile: UserProfile, settings: StoreSettings | null }) {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userProfile.uid),
      where('status', 'in', ['placed', 'preparing', 'out_for_delivery'])
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      setActiveOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });
    
    return () => unsub();
  }, [userProfile.uid]);

  if (activeOrders.length === 0) return null;

  return (
    <div className="mb-12 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-500 animate-pulse" />
          Track Live Orders
        </h2>
        <div className="flex items-center gap-2">
          {settings?.estimatedPrepTime && (
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 rounded-full">
              {settings.estimatedPrepTime} wait
            </span>
          )}
          <Link to="/orders" className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline px-4 py-2 bg-primary-50 rounded-full">
            Full History
          </Link>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 scroll-smooth">
        {activeOrders.map(order => (
          <Link 
            key={order.id} 
            to="/orders"
            className="min-w-[280px] bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all group shrink-0 border-l-4 border-l-primary-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{order.id?.slice(-6).toUpperCase()}</span>
              </div>
              <div className="px-3 py-1 bg-primary-50 text-primary-700 text-[10px] font-black rounded-lg border border-primary-100 uppercase">
                {order.status.replace('_', ' ')}
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                   <Timer className="w-5 h-5 text-primary-600" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Est. Delivery</span>
                    <span className="text-sm font-black text-slate-900">
                      {order.estimatedDeliveryTime ? 
                        (order.estimatedDeliveryTime as any).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : 'Checking...'}
                    </span>
                 </div>
               </div>
               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all text-slate-400">
                  <ChevronRight className="w-5 h-5" />
               </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'All': Utensils,
  'Snacks': UtensilsCrossed,
  'Lunch': Pizza,
  'Drinks': Coffee,
  'Breakfast': Award,
};

export default function Home({ 
  userProfile, 
  searchQuery,
  cart,
  addToCart,
  removeFromCart,
  isCartOpen,
  setIsCartOpen,
  clearCart
}: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('cod');

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  useEffect(() => {
    const q = collection(db, 'products');
    const unsubProducts = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(items.filter(item => item.isAvailable));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as StoreSettings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings');
    });

    return () => {
      unsubProducts();
      unsubSettings();
    };
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    if (!deliveryAddress) {
      toast.error("Please provide a delivery spot!");
      return;
    }

    if (paymentMethod === 'online') {
      setIsPlacingOrder(true);
      try {
        const razorpayKey = (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_test_sample_key';
        
        console.log('Initializing Razorpay with key:', razorpayKey === 'rzp_test_sample_key' ? 'DUMMY KEY' : 'PROD KEY');
        
        if (razorpayKey === 'rzp_test_sample_key') {
          toast.info("Using demo payment gateway. No real money will be charged.");
        }

        await initializeRazorpayPayment({
          key: razorpayKey,
          amount: Math.round(cartTotal * 100), // paisa
          currency: 'INR',
          name: 'BB Bite',
          description: 'Premium Culinary Experience',
          handler: async (res: any) => {
            console.log('Payment Success:', res);
            await handlePlaceOrder();
          },
          modal: {
            ondismiss: () => {
              console.log('Razorpay modal dismissed');
              setIsPlacingOrder(false);
              toast.info("Payment cancelled.");
            }
          },
          prefill: {
            name: userProfile.displayName || 'Customer',
            email: userProfile.email || '',
            contact: ''
          },
          theme: {
            color: '#0ea5e9'
          }
        });
      } catch (err: any) {
        setIsPlacingOrder(false);
        console.error('Razorpay error:', err);
        toast.error(err.message || 'Payment initialization failed.');
      }
    } else {
      await handlePlaceOrder();
    }
  };

  const handlePlaceOrder = async () => {
    if (!userProfile) return;
    setIsPlacingOrder(true);

    try {
      console.log('Placing order in Firestore...');
      let prepMinutes = 20;
      if (settings?.estimatedPrepTime) {
        const prepTimeMatch = settings.estimatedPrepTime.match(/\d+/);
        if (prepTimeMatch) prepMinutes = parseInt(prepTimeMatch[0]);
      }
      
      const estimatedTime = new Date();
      estimatedTime.setMinutes(estimatedTime.getMinutes() + prepMinutes);

      const orderData: Omit<Order, 'id'> = {
        userId: userProfile.uid,
        items: cart,
        totalAmount: cartTotal,
        status: 'placed',
        deliveryAddress: deliveryAddress || 'Campus Spot',
        paymentMethod,
        paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
        estimatedDeliveryTime: estimatedTime,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      setIsCartOpen(false);
      toast.success('Your meal is being prepared!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="pb-32">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="relative min-h-[400px] md:h-[600px] w-full rounded-[3.5rem] overflow-hidden group shadow-2xl shadow-primary-900/10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-900/80 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=80" 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" 
            alt="Premium Food" 
          />
          
          <div className="relative z-20 h-full flex flex-col justify-center px-8 md:px-24 space-y-12 py-16 md:py-0">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-5 py-2.5 bg-white/10 backdrop-blur-xl rounded-full w-fit flex items-center gap-3 border border-white/10 shadow-2xl"
            >
              <Zap className="w-4 h-4 text-primary-400 fill-primary-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Crafted for Campus Diners</span>
            </motion.div>
            
            <div className="space-y-6">
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl md:text-[8rem] lg:text-[10rem] font-display font-black text-white leading-[0.8] tracking-tighter"
              >
                A Bite of <br/> <span className="text-primary-400">Excellence.</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/60 font-medium md:text-xl max-w-xl leading-relaxed"
              >
                Experience professional grade culinary delights delivered directly to your doorstep within 20 minutes.
              </motion.p>
            </div>
            
            <motion.button 
              whileHover={{ x: 10 }}
              onClick={() => document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-4 text-white font-black text-xs uppercase tracking-[0.3em] group w-fit bg-primary-600 px-10 py-5 rounded-2xl shadow-2xl shadow-primary-500/20 hover:bg-primary-700 transition-all font-display"
            >
              Explore Menu <ArrowRight className="w-5 h-5 text-white transition-transform group-hover:translate-x-1" />
            </motion.button>
          </div>

          <div className="hidden lg:block absolute bottom-12 right-12 z-20">
            <div className="flex items-center gap-6">
               <div className="flex flex-col items-end">
                 <span className="text-white font-black text-2xl leading-none">4.9/5</span>
                 <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1 text-right">User Rating</span>
               </div>
               <div className="w-px h-10 bg-white/20" />
               <div className="flex flex-col items-end">
                 <span className="text-white font-black text-2xl leading-none">15 min</span>
                 <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1 text-right">Avg. Delivery</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Orders Section */}
      {userProfile && (
        <ActiveOrders userProfile={userProfile} settings={settings} />
      )}

      {/* Categories Panel */}
      <div id="menu-section" className="mb-16">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 pl-1">Browse Collections</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
          {categories.map((cat: string) => {
            const Icon = CATEGORY_ICONS[cat] || Utensils;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-[2rem] border transition-all duration-500 whitespace-nowrap group",
                  isSelected 
                    ? "bg-primary-600 border-primary-600 text-white shadow-xl shadow-primary-200" 
                    : "bg-white border-slate-100 text-slate-500 hover:border-primary-200 hover:text-primary-600"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  isSelected ? "bg-white/20" : "bg-slate-50 group-hover:bg-primary-50"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-black tracking-tight">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-3xl font-display font-black text-slate-900 tracking-tighter">Chef's Recommendations</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter:</span>
            <span className="text-sm font-black text-primary-600">{selectedCategory}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, index) => (
              <motion.div 
                layout
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white border border-slate-100 rounded-[3rem] p-5 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500"
              >
                <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-slate-50 mb-6">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                  />
                  <div className="absolute top-4 right-4 h-12 w-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  </div>
                </div>

                <div className="space-y-4 px-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-primary-500 uppercase tracking-[0.2em]">{product.category}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-200" />
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-bold text-slate-500">4.8</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight line-clamp-1">{product.name}</h3>
                    <p className="text-slate-400 text-xs font-medium line-clamp-2 leading-relaxed min-h-[32px]">{product.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                       <span className="text-sm font-black text-slate-900 font-display text-2xl">₹{product.price}</span>
                       <span className="text-[10px] font-bold text-slate-400 line-through">₹{Math.floor(product.price * 1.3)}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(product)}
                      className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90",
                        cart.find(i => i.id === product.id) 
                          ? "bg-primary-600 text-white shadow-primary-300" 
                          : "bg-slate-950 text-white shadow-slate-200"
                      )}
                    >
                      {cart.find(i => i.id === product.id) ? (
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-sm font-black">{cart.find(i => i.id === product.id)?.quantity}</span>
                        </div>
                      ) : (
                        <Plus className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart Slider Section */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-3xl z-[120] flex flex-col pt-safe"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-display font-black text-slate-900 tracking-tighter">Basket</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Review your selections</p>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-14 h-14 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-10 py-6 space-y-8 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pb-20">
                    <div className="w-48 h-48 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                      <ShoppingBag className="w-20 h-20 text-slate-200" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xl font-black text-slate-900">Your basket is resting</p>
                       <p className="text-slate-400 font-medium max-w-[200px] mx-auto text-sm leading-relaxed">It seems you haven't discovered our delicacies yet.</p>
                    </div>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-6 items-center group">
                      <div className="w-24 h-24 bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 shrink-0 group-hover:scale-105 transition-transform duration-500">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-lg tracking-tight truncate">{item.name}</h4>
                        <div className="flex items-center gap-4 mt-4 bg-slate-50 w-fit p-1 rounded-2xl border border-slate-100">
                          <button onClick={() => removeFromCart(item.id!)} className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center hover:text-primary-600 transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart(item as Product)} className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center hover:text-primary-600 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-primary-600 font-black font-display text-xl leading-none">₹{item.price * item.quantity}</p>
                         <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">SUBTOTAL</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-10 bg-slate-50 border-t border-slate-100 space-y-8 rounded-t-[3rem]">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Delivery Destination</label>
                       <div className="relative group">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                          <input 
                            type="text" 
                            placeholder="Block No. / Room / Area"
                            className="w-full h-16 pl-14 pr-6 bg-white border border-transparent rounded-[1.5rem] font-bold text-slate-800 outline-none shadow-sm focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-slate-300"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                          />
                       </div>
                    </div>
                    
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Configuration</label>
                        <div className="flex gap-3">
                           <button 
                            onClick={() => setPaymentMethod('cod')}
                            className={cn(
                              "flex-1 h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                              paymentMethod === 'cod' ? "bg-slate-950 text-white border-slate-950 shadow-xl" : "bg-white text-slate-400 border-slate-100 hover:border-primary-200"
                            )}
                           >
                             <ShoppingBag className="w-4 h-4 opacity-50" />
                             Cash on delivery
                           </button>
                           <button 
                            onClick={() => setPaymentMethod('online')}
                            className={cn(
                              "flex-1 h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                              paymentMethod === 'online' ? "bg-slate-950 text-white border-slate-950 shadow-xl" : "bg-white text-slate-400 border-slate-100 hover:border-primary-200"
                            )}
                           >
                             <Zap className="w-4 h-4" />
                             Online Gateway (UPI)
                           </button>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                       <div className="flex flex-col">
                         <span className="text-3xl font-black text-slate-900 font-display leading-none">₹{cartTotal}</span>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total inclusive of taxes</span>
                       </div>
                       <button 
                        disabled={isPlacingOrder || (settings !== null && !settings.isAcceptingOrders)}
                        onClick={handleCheckout}
                        className="bg-primary-600 text-white h-16 px-10 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
                       >
                         {isPlacingOrder ? 'Processing...' : 'Finalize Order'}
                       </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Menu for Cart (Mobile/Compact) */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-4rem)] max-w-sm bg-slate-950/90 backdrop-blur-2xl rounded-[2.5rem] p-4 shadow-3xl flex items-center justify-between text-white z-[55] border border-white/5"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center relative shadow-2xl shadow-primary-500/20">
                <ShoppingCart className="w-6 h-6 text-white" />
                <span className="absolute -top-2 -right-2 bg-white text-slate-950 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-950/20">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Basket total</p>
                <p className="text-2xl font-black tracking-tight text-white font-display">₹{cartTotal}</p>
              </div>
            </div>
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors">
               <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
