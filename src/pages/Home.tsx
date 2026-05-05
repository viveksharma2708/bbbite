import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  Sparkles, 
  Clock, 
  Timer,
  MessageSquare,
  Zap,
  ArrowRight,
  Utensils,
  Coffee,
  IceCream,
  Pizza,
  UtensilsCrossed,
  Star,
  ChevronRight,
  CheckCircle2,
  ShoppingCart,
  MapPin
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, serverTimestamp, query, addDoc, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Order, UserProfile, StoreSettings, CartItem } from '../types';
import { cn } from '../lib/utils';
import PaymentModal from '../components/PaymentModal';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

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
          <Zap className="w-5 h-5 text-primary-600 animate-pulse" />
          Track Live Orders
        </h2>
        <Link to="/orders" className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline">
          View All History
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
        {activeOrders.map(order => {
          const statusColors: Record<string, string> = {
            placed: 'bg-blue-500',
            preparing: 'bg-primary-600',
            out_for_delivery: 'bg-purple-500'
          };
          
          return (
            <Link 
              key={order.id} 
              to="/orders"
              className="min-w-[280px] bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all group shrink-0"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", statusColors[order.status])} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{order.id?.slice(-6).toUpperCase()}</span>
                </div>
                <div className="px-3 py-1 bg-slate-50 text-slate-900 text-[10px] font-black rounded-lg border border-slate-100 uppercase">
                  {order.status.replace('_', ' ')}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex -space-x-2">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="w-10 h-10 border-2 border-white rounded-xl overflow-hidden shadow-sm">
                      <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-10 h-10 border-2 border-white rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <div className="flex items-center gap-2">
                     <Timer className="w-4 h-4 text-primary-600" />
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Estimated Arrival</span>
                        <span className="text-sm font-black text-slate-900">
                          {order.estimatedDeliveryTime ? 
                            order.estimatedDeliveryTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : 'Pending'}
                        </span>
                     </div>
                   </div>
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all text-slate-400">
                      <ChevronRight className="w-5 h-5" />
                   </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  )
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'All': Utensils,
  'Snacks': UtensilsCrossed,
  'Meals': Pizza,
  'Drinks': Coffee,
  'Desserts': IceCream,
};

export default function Home({ 
  userProfile, 
  searchQuery,
  cart,
  setCart,
  addToCart,
  removeFromCart,
  isCartOpen,
  setIsCartOpen,
  clearCart
}: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPayment, setShowPayment] = useState(false);
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

  const handleCheckout = () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    if (!deliveryAddress) {
      alert("Please enter a delivery location!");
      return;
    }

    if (paymentMethod === 'online') {
      setShowPayment(true);
    } else {
      handlePlaceOrder();
    }
  };

  const handlePlaceOrder = async () => {
    if (!userProfile) return;
    setIsPlacingOrder(true);

    try {
      // Calculate estimated time based on settings
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
        deliveryAddress: deliveryAddress || 'Campus Center',
        paymentMethod,
        paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
        estimatedDeliveryTime: estimatedTime,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      setIsCartOpen(false);
      setShowPayment(false);
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to place order.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="pb-32">
      <PaymentModal 
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePlaceOrder}
        amount={cartTotal}
      />

      {/* Active Order Tracker Section */}
      {userProfile && (
        <ActiveOrders userProfile={userProfile} settings={settings} />
      )}

      {/* Modern Marketing Banner */}
      <div className="mb-10 lg:mb-14">
        <div className="relative h-[250px] md:h-[400px] w-full bg-[#ede9fe]/30 rounded-[3rem] overflow-hidden flex items-center px-8 md:px-20 border border-primary-100/50 group">
          <div className="relative z-10 max-w-xl space-y-4 md:space-y-6">
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white px-4 py-2 rounded-full w-fit shadow-sm flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest leading-none">svsu kitchen • 15 mins</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-7xl font-display font-black text-slate-900 tracking-tighter leading-[0.9]"
            >
              Premium Taste <br/> <span className="text-primary-600 italic">instantly</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 font-medium md:text-lg max-w-md"
            >
               Order fresh, handmade delicacies from our central kitchen delivered directly to your campus spot.
            </motion.p>
          </div>
          
          <div className="absolute right-[-15%] md:right-[-5%] top-0 bottom-0 flex items-center opacity-40 lg:opacity-100 pointer-events-none group-hover:translate-x-[-10px] transition-transform duration-1000">
             <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80" alt="Gourmet Bowl" className="h-[90%] rotate-[-5deg] drop-shadow-2xl" />
          </div>
        </div>
      </div>

      {/* Category Icons Row */}
      <div className="mb-12">
        <div className="flex gap-8 md:gap-12 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
          {categories.map((cat: any) => {
            const Icon = CATEGORY_ICONS[cat] || Utensils;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex flex-col items-center gap-3 shrink-0 group transition-all"
              >
                <div className={cn(
                  "w-16 h-16 md:w-20 md:h-20 rounded-[2rem] flex items-center justify-center border-2 transition-all duration-500",
                  isSelected 
                    ? "bg-primary-50 border-primary-500 shadow-xl shadow-primary-500/10 scale-105" 
                    : "bg-white border-slate-100 group-hover:border-primary-100"
                )}>
                  <Icon className={cn(
                    "w-7 h-7 md:w-8 md:h-8 transition-colors",
                    isSelected ? "text-primary-600" : "text-slate-400 group-hover:text-primary-400"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors",
                  isSelected ? "text-primary-700" : "text-slate-500"
                )}>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-3">
           Fresh Arrivals
           <span className="px-2 py-1 bg-primary-100 text-primary-700 text-[10px] rounded-lg">NEW</span>
        </h2>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full">
           Showing {filteredProducts.length} items
        </div>
      </div>

      {/* Product Grid - Refined Card Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, index) => (
            <motion.div 
              layout
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group flex flex-col h-full rounded-3xl"
            >
              <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-slate-50 border border-slate-100 mb-4 shadow-sm group-hover:shadow-md transition-shadow">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                />
                
                {/* Status Indicator */}
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 glass rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[9px] font-bold text-slate-900 tracking-tight">FRESH</span>
                  </div>
                </div>

                {/* ADD Button Overlay - Refined */}
                <div className="absolute bottom-4 right-4">
                  <button 
                    onClick={() => addToCart(product)}
                    className="bg-white border border-slate-200 px-5 py-3 rounded-2xl font-bold text-primary-600 text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center min-w-[80px]"
                  >
                    {cart.find(i => i.id === product.id) ? (
                      <div className="flex items-center gap-2">
                         <span className="text-primary-600">{cart.find(i => i.id === product.id)?.quantity}</span>
                         <Plus className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      'ADD'
                    )}
                  </button>
                </div>
              </div>

              <div className="px-2 flex flex-col flex-1">
                <div className="space-y-1 mb-3">
                   <div className="flex items-center gap-2 text-primary-600">
                      <span className="text-[10px] font-bold uppercase tracking-widest">{product.category}</span>
                   </div>
                   <h3 className="font-display font-bold text-lg text-slate-900 leading-tight group-hover:text-primary-600 transition-colors line-clamp-1">{product.name}</h3>
                   <div className="flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[11px] font-bold text-slate-700">4.5</span>
                      <span className="text-[11px] font-medium text-slate-400">(120+)</span>
                   </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                   <div className="flex flex-col">
                      <span className="text-xl font-bold text-slate-900 font-display">₹{product.price}</span>
                      <span className="text-[10px] text-slate-400 line-through">₹{Math.floor(product.price * 1.2)}</span>
                   </div>
                   <div className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg border border-green-100">
                      OFFER
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cart Drawer - Refined */}
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
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-3xl z-[120] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">My Basket</h2>
                  <p className="text-sm font-medium text-slate-400">Review your campus orders</p>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-3 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-20 h-20 text-slate-200" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-lg font-bold text-slate-900">Your basket is empty</p>
                       <p className="text-slate-400 font-medium max-w-[200px] mx-auto">Explore our menu and add some artisanal dishes!</p>
                    </div>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-6 items-center">
                      <div className="w-24 h-24 bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 shrink-0">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                        <p className="text-primary-600 font-bold font-display text-lg">₹{item.price * item.quantity}</p>
                        <div className="flex items-center gap-4 mt-3 bg-slate-100 w-fit p-1 rounded-xl">
                          <button onClick={() => removeFromCart(item.id!)} className="p-1.5 hover:bg-white rounded-lg transition-all">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart(item as Product)} className="p-1.5 hover:bg-white rounded-lg transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-6">
                  <div className="space-y-4">
                    <div className="relative group">
                       <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-600" />
                       <input 
                         type="text" 
                         placeholder="Delivery Location (Block/Room)"
                         className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl font-medium outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                         value={deliveryAddress}
                         onChange={(e) => setDeliveryAddress(e.target.value)}
                       />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Method</p>
                       <div className="flex gap-2">
                         <button 
                          onClick={() => setPaymentMethod('cod')}
                          className={cn(
                            "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all",
                            paymentMethod === 'cod' ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white text-slate-500 border-slate-200"
                          )}
                         >
                           COD
                         </button>
                         <button 
                          onClick={() => setPaymentMethod('online')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all",
                            paymentMethod === 'online' ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white text-slate-500 border-slate-200"
                          )}
                         >
                           Online UPI
                         </button>
                       </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Grand Total</span>
                        <span className="text-3xl font-black text-slate-900 font-display">₹{cartTotal}</span>
                      </div>
                      <button 
                        disabled={isPlacingOrder || !settings?.isAcceptingOrders}
                        onClick={handleCheckout}
                        className="w-full bg-primary-600 text-white h-16 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl glow-primary hover:bg-primary-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isPlacingOrder ? 'Processing...' : 'Confirm Order'}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-gray-950 rounded-[2rem] p-4 shadow-2xl flex items-center justify-between text-white z-[55] cursor-pointer border border-white/5 backdrop-blur-xl"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center relative shadow-lg shadow-primary-900/20">
                <ShoppingBag className="w-6 h-6 text-white" />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-gray-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">Payable Amount</p>
                <p className="text-xl font-black tracking-tight text-white line-clamp-1">₹{cartTotal}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-2xl font-black text-sm text-primary-400 hover:bg-white/20 transition-all">
              View Cart <ChevronRight className="w-4 h-4" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
