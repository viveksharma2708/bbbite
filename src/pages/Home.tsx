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
  Award,
  Instagram,
  Twitter,
  Linkedin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Smartphone,
  Banknote,
  Check,
  ShieldCheck
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
  const [customerPhone, setCustomerPhone] = useState('');
  const [course, setCourse] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('cod');
  const [onlineMethod, setOnlineMethod] = useState<'upi' | 'card' | 'netbanking' | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);

  const [showClosedModal, setShowClosedModal] = useState(false);
  const [hasScrolledForSearch, setHasScrolledForSearch] = useState(false);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    const element = document.getElementById('chef-recommendations');
    if (element) {
      const offset = 100; // Account for fixed navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setCustomerPhone(value);
    }
  };

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

  useEffect(() => {
    if (searchQuery.trim().length > 0 && !hasScrolledForSearch) {
      const element = document.getElementById('chef-recommendations');
      if (element) {
        const offset = 100; // Account for fixed navbar
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
      setHasScrolledForSearch(true);
      setSelectedCategory('All');
    } else if (searchQuery.trim().length === 0) {
      setHasScrolledForSearch(false);
    }
  }, [searchQuery, hasScrolledForSearch]);

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = cartSubtotal > 100 || cartSubtotal === 0 ? 0 : 25;
  const taxes = Math.round(cartSubtotal * 0.05);
  const cartTotal = cartSubtotal + deliveryFee + taxes;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (settings && !settings.isAcceptingOrders) {
      setShowClosedModal(true);
      return;
    }
    if (!userProfile) {
      navigate('/login');
      return;
    }
    if (!deliveryAddress) {
      toast.error("Please provide a delivery spot!");
      return;
    }
    if (!customerPhone || !course) {
      toast.error("Please provide phone and course details!");
      return;
    }

    // Instead of processing, show the payment selection modal
    setShowPaymentModal(true);
  };

  const handleProcessPaymentAndOrder = async () => {
    if (paymentMethod === 'online' && !onlineMethod) {
      toast.error("Please select an online payment method");
      return;
    }

    setShowPaymentModal(false);

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
          description: `Payment via ${onlineMethod?.toUpperCase()}`,
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
            name: userProfile?.displayName || 'Customer',
            email: userProfile?.email || '',
            contact: customerPhone || ''
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
        customerName: userProfile.displayName || 'Customer',
        customerPhone: customerPhone,
        course: course,
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

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      setIsCartOpen(false);
      toast.success('Your meal is being prepared!');
      navigate(`/order-confirmation/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="pb-4">
      <div className="mb-6 md:mb-12">
        <div className="relative min-h-[320px] md:h-[450px] lg:h-[500px] w-full rounded-3xl md:rounded-[3.5rem] overflow-hidden group shadow-2xl shadow-primary-900/10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-900/80 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=80" 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" 
            alt="Premium Food" 
          />
          
          <div className="relative z-20 h-full flex flex-col justify-center px-6 md:px-16 lg:px-24 space-y-4 md:space-y-10 py-10 md:py-0">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-white/10 backdrop-blur-xl rounded-full w-fit flex items-center gap-2 md:gap-3 border border-white/10 shadow-2xl"
            >
              <Zap className="w-3 h-3 md:w-4 md:h-4 text-primary-400 fill-primary-400" />
              <span className="text-[7px] md:text-[10px] font-black text-white uppercase tracking-[0.15em] md:tracking-[0.3em]">Crafted for Campus Diners</span>
            </motion.div>
            
            <div className="space-y-2 md:space-y-6">
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-4xl md:text-7xl lg:text-8xl font-display font-black text-white leading-[0.9] tracking-tighter"
              >
                A Bite of <br/> <span className="text-primary-400">Excellence.</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/60 font-medium text-[13px] md:text-lg max-w-[280px] sm:max-w-md md:max-w-xl leading-relaxed"
              >
                Professional grade culinary delights delivered directly to your doorstep within 20 minutes.
              </motion.p>
            </div>
            
            <motion.button 
              whileHover={{ x: 10 }}
              onClick={() => document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-3 md:gap-4 text-white font-black text-[9px] md:text-xs uppercase tracking-[0.15em] md:tracking-[0.3em] group w-fit bg-primary-600 px-5 md:px-10 py-3 md:py-5 rounded-xl md:rounded-2xl shadow-2xl shadow-primary-500/20 hover:bg-primary-700 transition-all font-display"
            >
              Explore Menu <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-white transition-transform group-hover:translate-x-1" />
            </motion.button>
          </div>

          <div className="hidden md:block absolute bottom-8 md:bottom-12 right-8 md:right-12 z-20">
            <div className="flex items-center gap-4 md:gap-6">
               <div className="flex flex-col items-end">
                 <span className="text-white font-black text-xl md:text-2xl leading-none">4.9/5</span>
                 <span className="text-white/40 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1 text-right">Rating</span>
               </div>
               <div className="w-px h-8 md:h-10 bg-white/20" />
               <div className="flex flex-col items-end">
                 <span className="text-white font-black text-xl md:text-2xl leading-none">15 min</span>
                 <span className="text-white/40 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1 text-right">Delivery</span>
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
      <div id="menu-section" className="mb-10 md:mb-16">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 pl-1">Browse Collections</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
          {categories.map((cat: string) => {
            const Icon = CATEGORY_ICONS[cat] || Utensils;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-[2rem] border transition-all duration-500 whitespace-nowrap group",
                  isSelected 
                    ? "bg-primary-600 border-primary-600 text-white shadow-xl shadow-primary-200 scale-105" 
                    : "bg-white border-slate-100 text-slate-500 hover:border-primary-200 hover:text-primary-600 hover:bg-primary-50/10"
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
      <div id="chef-recommendations" className="space-y-10 md:space-y-12 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-primary-600" />
              <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">Curated Selections</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tighter">Chef's Recommendations</h2>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 pr-3">Filter</span>
            <span className="text-sm font-black text-primary-600 uppercase tracking-tight">{selectedCategory}</span>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-display font-black text-slate-900 mb-2">No item found.</h3>
            <p className="text-slate-500 font-medium">We couldn't find anything matching your search. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => (
                <motion.div 
                layout
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[3rem] p-3 md:p-5 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500"
              >
                <div 
                  onClick={() => setSelectedProductDetails(product)}
                  className="relative aspect-square rounded-[1rem] md:rounded-[2.5rem] overflow-hidden bg-slate-50 mb-3 md:mb-6 cursor-pointer"
                >
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                  />
                  
                  {/* Modern Badges */}
                  <div className="absolute top-2 md:top-4 left-2 md:top-4 flex flex-col gap-2">
                    {index % 4 === 0 && (
                      <div className="px-2 md:px-3 py-1 bg-amber-500 font-black text-[7px] md:text-[9px] text-white uppercase tracking-widest rounded-lg shadow-xl shadow-amber-500/20 backdrop-blur-md">
                        Trending 🔥
                      </div>
                    )}
                    {index % 4 === 1 && (
                      <div className="px-2 md:px-3 py-1 bg-primary-600 font-black text-[7px] md:text-[9px] text-white uppercase tracking-widest rounded-lg shadow-xl shadow-primary-500/20 backdrop-blur-md">
                        Best Seller
                      </div>
                    )}
                    {index % 4 === 2 && (
                      <div className="px-2 md:px-3 py-1 bg-emerald-500 font-black text-[7px] md:text-[9px] text-white uppercase tracking-widest rounded-lg shadow-xl shadow-emerald-500/20 backdrop-blur-md">
                        Popular ⭐
                      </div>
                    )}
                  </div>

                  <div className="absolute top-2 md:top-4 right-2 md:right-4 h-8 w-8 md:h-12 md:w-12 bg-white/90 backdrop-blur-md rounded-lg md:rounded-2xl flex items-center justify-center shadow-lg border border-white/50 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <Star className="w-3 h-3 md:w-5 md:h-5 text-amber-500 fill-amber-500" />
                  </div>


                </div>

                <div className="space-y-2 md:space-y-4 px-1 md:px-2">
                  <div className="space-y-0.5 md:space-y-1">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="text-[7px] md:text-[9px] font-black text-primary-500 uppercase tracking-[0.1em] md:tracking-[0.2em]">{product.category}</span>
                      <div className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-slate-200" />
                      <div className="flex items-center gap-0.5 md:gap-1">
                        <Star className="w-2 h-2 md:w-3 md:h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[8px] md:text-[10px] font-bold text-slate-500">4.8</span>
                      </div>
                    </div>
                    <h3 className="text-sm md:text-xl font-display font-black text-slate-900 tracking-tight line-clamp-1">{product.name}</h3>
                    <p className="text-slate-400 text-[9px] md:text-xs font-medium line-clamp-2 leading-relaxed min-h-[24px] md:min-h-[32px] hidden sm:block">{product.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                       <span className="text-base md:text-2xl font-black text-slate-900 font-display leading-tight">₹{product.price}</span>
                       <span className="text-[7px] md:text-[10px] font-bold text-slate-400 line-through">₹{Math.floor(product.price * 1.3)}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(product)}
                      className={cn(
                        "h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90",
                        cart.find(i => i.id === product.id) 
                          ? "bg-primary-600 text-white shadow-primary-300" 
                          : "bg-slate-950 text-white shadow-slate-200"
                      )}
                    >
                      {cart.find(i => i.id === product.id) ? (
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-xs md:text-sm font-black">{cart.find(i => i.id === product.id)?.quantity}</span>
                        </div>
                      ) : (
                        <Plus className="w-5 h-5 md:w-6 md:h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}
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
              <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-4xl font-display font-black text-slate-900 tracking-tighter leading-none">Basket</h2>
                  <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5 md:mt-1">Review selections</p>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-10 h-10 md:w-14 md:h-14 bg-slate-50 hover:bg-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-1 md:px-2 scroll-smooth overscroll-contain no-scrollbar min-h-0">
                <div className="px-5 md:px-8 py-4 md:py-6 space-y-8 pb-32">
                  {cart.length === 0 ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-10">
                      <div className="relative">
                        <div className="w-48 h-48 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                          <ShoppingBag className="w-20 h-20 text-slate-200" />
                        </div>
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="absolute -bottom-4 -right-4 w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100"
                        >
                          <Utensils className="w-8 h-8 text-primary-400" />
                        </motion.div>
                      </div>
                      <div className="space-y-4">
                         <p className="text-2xl font-black text-slate-900 font-display">Your basket is waiting</p>
                         <p className="text-slate-400 font-medium max-w-[240px] mx-auto text-sm leading-relaxed">Fill it with the finest culinary delights from our campus kitchen.</p>
                         <button 
                           onClick={() => setIsCartOpen(false)}
                           className="text-primary-600 font-black text-xs uppercase tracking-widest px-8 py-4 bg-primary-50 rounded-2xl hover:bg-primary-100 transition-all mt-4"
                         >
                           Start Browsing
                         </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Your Selections ({cart.length})</h4>
                          <button onClick={() => clearCart()} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Clear All</button>
                        </div>
                        <div className="space-y-4">
                          {cart.map((item) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={item.id} 
                              className="flex gap-4 md:gap-6 items-center group p-3 md:p-4 rounded-3xl hover:bg-slate-50 transition-all"
                            >
                              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-slate-100 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500">
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-900 text-base md:text-lg tracking-tight truncate">{item.name}</h4>
                                <div className="flex items-center gap-3 mt-3">
                                  <div className="flex items-center gap-3 bg-white w-fit px-2 py-1 rounded-xl border border-slate-100 shadow-sm">
                                    <button onClick={() => removeFromCart(item.id!)} className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center hover:text-primary-600 transition-colors">
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => addToCart(item as Product)} className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center hover:text-primary-600 transition-colors">
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-primary-600 font-black font-display text-lg md:text-xl leading-none">₹{item.price * item.quantity}</p>
                                 <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">₹{item.price}/ea</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Summary Section */}
                      <div className="pt-8 border-t border-slate-100 space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Bill Details</h4>
                          {cartSubtotal > 100 && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1.5"
                            >
                              <Check className="w-3 h-3" />
                              Free Delivery 🎉
                            </motion.span>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4 border border-slate-100/50">
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-medium">Item Total</span>
                              <span className="font-black text-slate-900">₹{cartSubtotal}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-medium">Delivery Fee</span>
                              <div className="flex items-center gap-2">
                                {cartSubtotal > 100 ? (
                                  <>
                                    <span className="text-[10px] font-bold text-slate-400 line-through">₹25</span>
                                    <span className="font-black text-emerald-500 uppercase text-[10px]">Free</span>
                                  </>
                                ) : (
                                  <span className="font-black text-slate-900">₹{deliveryFee}</span>
                                )}
                              </div>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-medium">Taxes (GST 5%)</span>
                              <span className="font-black text-slate-900">₹{taxes}</span>
                           </div>
                           {cartSubtotal > 0 && cartSubtotal <= 100 && (
                             <div className="p-3 bg-primary-50/50 rounded-xl border border-primary-100/50">
                               <p className="text-[10px] font-bold text-primary-700 leading-tight">
                                 Add items worth <span className="font-black text-primary-900">₹{101 - cartSubtotal}</span> more to unlock <span className="font-black">Free Delivery</span>!
                               </p>
                             </div>
                           )}
                           <div className="h-px bg-slate-200 border-dashed border-t" />
                           <div className="flex justify-between items-center">
                              <span className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Total Amount</span>
                              <span className="text-2xl font-black text-primary-600 font-display">₹{cartTotal}</span>
                           </div>
                        </div>
                      </div>

                      {/* Delivery Info Section */}
                      <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
                        <div className="space-y-2">
                           <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] px-1">Delivery Destination</h3>
                           <p className="text-[10px] font-medium text-slate-400 px-1 italic">Where should we deliver your gourmet experience?</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Mobile</label>
                                <input 
                                  type="tel" 
                                  placeholder="10 digit number"
                                  className="w-full h-12 px-5 bg-white border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none shadow-sm focus:ring-4 focus:ring-primary-500/10 transition-all text-sm"
                                  value={customerPhone}
                                  onChange={handlePhoneChange}
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Course</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. B.Tech"
                                  className="w-full h-12 px-5 bg-white border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none shadow-sm focus:ring-4 focus:ring-primary-500/10 transition-all text-sm"
                                  value={course}
                                  onChange={(e) => setCourse(e.target.value)}
                                />
                             </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Spot Details</label>
                              <div className="relative group">
                                 <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                                 <input 
                                   type="text" 
                                   placeholder="Block / Room / Landmarker"
                                   className="w-full h-12 pl-12 pr-5 bg-white border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none shadow-sm focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-slate-300 text-sm"
                                   value={deliveryAddress}
                                   onChange={(e) => setDeliveryAddress(e.target.value)}
                                 />
                              </div>
                           </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {cart.length > 0 && (
                <div className="p-6 md:p-8 bg-white border-t border-slate-100 rounded-t-[3rem] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.08)]">
                  <button 
                    disabled={isPlacingOrder}
                    onClick={handleCheckout}
                    className="w-full bg-primary-600 text-white h-16 md:h-18 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-between px-8 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-white" />
                      </div>
                      <span>{isPlacingOrder ? 'Processing Order...' : 'Proceed to Checkout'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-display">₹{cartTotal}</span>
                       {!isPlacingOrder && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </div>
                  </button>
                  <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">Safe & Secure Transactions</p>
                </div>
              )}

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Zepto-Style Floating Bottom Cart Panel */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-3 md:p-5 z-[90] flex justify-center pointer-events-none"
          >
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCartOpen(true)}
              className="w-full max-w-lg bg-slate-950 text-white rounded-[1.8rem] md:rounded-[2.2rem] p-2.5 md:p-3.5 shadow-3xl flex items-center justify-between pointer-events-auto border border-white/10 group cursor-pointer"
            >
              <div className="flex items-center gap-3 md:gap-5">
                <div className="relative">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-primary-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-500/20 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-5 h-5 md:w-7 md:h-7" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-primary-600 text-[9px] md:text-[11px] font-black w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-xl border-2 border-slate-950">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] md:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">View Basket</span>
                    <div className="w-1 h-1 rounded-full bg-primary-500" />
                    <span className="text-[7px] md:text-[9px] font-black text-emerald-400 uppercase tracking-widest">{cart.length} Items</span>
                  </div>
                  <p className="text-lg md:text-xl font-black font-display tracking-tight">₹{cartTotal}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="hidden md:flex flex-col items-end pr-4 border-r border-white/10">
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Delivery Fee</p>
                   <p className="text-xs font-black text-emerald-400 leading-none mt-1">₹{deliveryFee}</p>
                </div>
                <div className="w-10 h-10 md:w-14 md:h-14 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                  <ChevronRight className="w-5 h-5 md:w-7 md:h-7" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Professional Footer */}
      <footer className="mt-20 md:mt-40 pt-16 md:pt-24 pb-12 border-t border-slate-100 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 md:gap-16 mb-16 md:mb-20">
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center glow-primary">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-display font-black text-slate-900 tracking-tighter">BB Bite</span>
              </div>
              <p className="text-slate-500 font-medium text-base max-w-sm leading-relaxed">
                We believe campus dining should be a premium experience. Our chefs craft every meal with precision, delivered with professional standards.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: Twitter, link: '#' },
                  { icon: Instagram, link: '#' },
                  { icon: Linkedin, link: '#' }
                ].map((social, idx) => (
                  <a key={idx} href={social.link} className="w-11 h-11 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-100 hover:shadow-xl hover:shadow-primary-500/10 transition-all">
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] relative inline-block">
                Collections
                <span className="absolute -bottom-2 left-0 w-6 h-0.5 bg-primary-600"></span>
              </h4>
              <ul className="space-y-5">
                {['Breakfast', 'Lunch', 'Snacks', 'Drinks'].map(cat => (
                  <li key={cat}>
                    <button onClick={() => handleCategoryClick(cat)} className="text-[13px] font-bold text-slate-400 hover:text-primary-600 transition-colors uppercase tracking-widest">{cat}</button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] relative inline-block">
                Company
                <span className="absolute -bottom-2 left-0 w-6 h-0.5 bg-primary-600"></span>
              </h4>
              <ul className="space-y-5">
                {['About Us', 'Quality Control', 'Sustainability', 'Campus Hub'].map(link => (
                  <li key={link}>
                    <a href="#" className="text-[13px] font-bold text-slate-400 hover:text-primary-600 transition-colors uppercase tracking-widest">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] relative inline-block">
                Support
                <span className="absolute -bottom-2 left-0 w-6 h-0.5 bg-primary-600"></span>
              </h4>
              <ul className="space-y-5">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-600">9876235789</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-600">bbbite@gmail.com</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-600">SVSU Canteen</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">© 2026 BB Bite Culinary Group. System Operational.</p>
            </div>
            <div className="flex items-center gap-10">
              <a href="#" className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-primary-600 transition-colors">Privacy Charter</a>
              <a href="#" className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-primary-600 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Professional Closed Modal */}
      <AnimatePresence>
        {showClosedModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClosedModal(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-3xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-black text-slate-900 tracking-tight">Canteen is Currently Closed</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  Orders cannot be booked right now. Please try again after some time.
                </p>
              </div>
              <button 
                onClick={() => setShowClosedModal(false)}
                className="w-full bg-slate-900 text-white h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
              >
                Understood
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Payment Selection Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-3xl flex flex-col max-h-[85vh] md:max-h-[80vh] mt-auto md:mt-0"
            >
              {/* Decorative Handle for Mobile */}
              <div className="md:hidden w-12 h-1 bg-slate-100 rounded-full mx-auto mt-3 mb-1 shrink-0" />

              {/* Modal Header */}
              <div className="p-4 md:p-6 pb-3 md:pb-4 flex items-center justify-between shrink-0">
                <div className="space-y-0.5">
                   <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight leading-none">Payment</h3>
                   <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Secure Selection Gateway</p>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-9 h-9 md:w-11 md:h-11 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-sm active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 md:p-6 pt-0 overflow-y-auto no-scrollbar space-y-4 md:space-y-6 flex-1">
                {/* Order Summary Detail */}
                <div className="bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 flex items-center justify-between shadow-xl shadow-slate-900/10 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-transparent pointer-events-none" />
                  <div className="flex flex-col relative z-10">
                    <span className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5">Payable Amount</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl md:text-3xl font-display font-black text-white leading-none">₹{cartTotal}</span>
                      <span className="text-[8px] md:text-[9px] font-bold text-white/40 uppercase">INR</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 relative z-10">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">PCI Secure</span>
                  </div>
                </div>

                {/* Main Payment Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Modes</h4>
                    <span className="text-[7px] md:text-[8px] font-bold text-slate-300 uppercase tracking-widest">Tap to select</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPaymentMethod('online')}
                      className={cn(
                        "p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all flex flex-col items-center gap-1.5 md:gap-2 relative overflow-hidden group active:scale-95",
                        paymentMethod === 'online' ? "bg-primary-600 border-primary-600 shadow-xl shadow-primary-200" : "bg-white border-slate-100 hover:border-primary-100"
                      )}
                    >
                       <div className={cn("w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center transition-all", 
                        paymentMethod === 'online' ? "bg-white/20 text-white" : "bg-primary-50 text-primary-600 group-hover:bg-primary-100")}>
                          <Zap className="w-5 h-5 md:w-8 md:h-8" />
                       </div>
                       <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-widest", 
                        paymentMethod === 'online' ? "text-white" : "text-slate-900")}>Online</span>
                       {paymentMethod === 'online' && (
                         <div className="absolute top-1.5 right-1.5 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary-600" />
                         </div>
                       )}
                    </button>
                    <button 
                      onClick={() => {
                        setPaymentMethod('cod');
                        setOnlineMethod(null);
                      }}
                      className={cn(
                        "p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all flex flex-col items-center gap-1.5 md:gap-2 relative group active:scale-95",
                        paymentMethod === 'cod' ? "bg-slate-950 border-slate-950 shadow-xl shadow-slate-200" : "bg-white border-slate-100 hover:border-slate-200"
                      )}
                    >
                       <div className={cn("w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center transition-all", 
                        paymentMethod === 'cod' ? "bg-white/20 text-white" : "bg-slate-50 text-slate-600 group-hover:bg-slate-100")}>
                          <Banknote className="w-5 h-5 md:w-8 md:h-8" />
                       </div>
                       <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-widest", 
                        paymentMethod === 'cod' ? "text-white" : "text-slate-900")}>Cash (COD)</span>
                       {paymentMethod === 'cod' && (
                         <div className="absolute top-1.5 right-1.5 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-950" />
                         </div>
                       )}
                    </button>
                  </div>
                </div>

                {/* Expanded Sub-options */}
                <div className="min-h-[140px] md:min-h-[180px]">
                  <AnimatePresence mode="wait">
                    {paymentMethod === 'online' && (
                      <motion.div 
                        key="online-methods"
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        variants={{
                          hidden: { opacity: 0 },
                          show: {
                            opacity: 1,
                            transition: {
                              staggerChildren: 0.08
                            }
                          }
                        }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Select Gateway</h4>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                             <Check className="w-2 h-2 text-emerald-500" />
                             <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Safe</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:gap-2.5">
                          {[
                            { id: 'upi', label: 'UPI (GPay, PhonePe, Paytm)', icon: Smartphone, color: 'text-primary-600', bg: 'bg-primary-50', badge: 'Flash' },
                            { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { id: 'netbanking', label: 'Net Banking', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                          ].map((m) => (
                            <motion.button 
                              variants={{
                                hidden: { opacity: 0, x: -10 },
                                show: { opacity: 1, x: 0 }
                              }}
                              key={m.id}
                              onClick={() => setOnlineMethod(m.id as any)}
                              className={cn(
                                "w-full p-3 md:p-4 rounded-[1.2rem] md:rounded-[1.5rem] border transition-all flex items-center justify-between group relative overflow-hidden active:scale-[0.98]",
                                onlineMethod === m.id 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                                  : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                              )}
                            >
                               {/* Selection Glow Effect */}
                               {onlineMethod === m.id && (
                                 <motion.div 
                                   layoutId="highlight"
                                   className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-transparent pointer-events-none" 
                                 />
                               )}

                               <div className="flex items-center gap-3 relative z-10">
                                 <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-500", 
                                   onlineMethod === m.id ? "bg-white/10 text-white rotate-6" : m.bg)}>
                                    <m.icon className={cn("w-4 h-4 md:w-5 md:h-5 transition-transform duration-500 group-hover:scale-110", 
                                      onlineMethod === m.id ? "text-white" : m.color)} />
                                 </div>
                                 <div className="flex flex-col items-start">
                                   <div className="flex items-center gap-1.5">
                                     <span className={cn("text-xs md:text-sm font-black tracking-tight", 
                                       onlineMethod === m.id ? "text-white" : "text-slate-900")}>
                                       {m.label}
                                     </span>
                                     {'badge' in m && (
                                       <span className="text-[6px] font-black bg-primary-500 text-white px-1 py-0.5 rounded uppercase tracking-widest">
                                         {m.badge}
                                       </span>
                                     )}
                                   </div>
                                 </div>
                               </div>

                               <div className={cn("w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all relative z-10", 
                                 onlineMethod === m.id ? "border-primary-500 bg-primary-500 shadow-md" : "border-slate-100 bg-white")}>
                                  {onlineMethod === m.id && <Check className="w-3 h-3 text-white" />}
                               </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {paymentMethod === 'cod' && (
                      <motion.div 
                        key="cod-info"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-amber-50/50 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 border border-amber-100 flex flex-col items-center text-center space-y-4"
                      >
                         <div className="relative">
                            <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-xl shadow-amber-200/30 relative z-10 border border-amber-50">
                               <Banknote className="w-8 h-8" />
                            </div>
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                              transition={{ duration: 3, repeat: Infinity }}
                              className="absolute -inset-2 bg-amber-400 rounded-full blur-xl z-0"
                            />
                         </div>
                         <div className="space-y-1.5">
                           <h5 className="text-[10px] md:text-[11px] font-black text-amber-900 uppercase tracking-[0.2em]">Cash on Arrival</h5>
                           <p className="text-[11px] md:text-xs font-semibold text-amber-800/80 leading-relaxed max-w-[220px]">
                             Please keep <span className="text-amber-950 font-black px-1 py-0.5 bg-amber-100 rounded-md">₹{cartTotal}</span> ready for our partner.
                           </p>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Professional Action Footer */}
              <div className="p-4 md:p-6 pt-3 bg-slate-50/80 backdrop-blur-xl border-t border-slate-100 shrink-0">
                <button 
                  disabled={isPlacingOrder || (paymentMethod === 'online' && !onlineMethod)}
                  onClick={handleProcessPaymentAndOrder}
                  className={cn(
                    "w-full h-14 md:h-16 rounded-[1.2rem] md:rounded-[1.5rem] font-black text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:grayscale active:scale-95",
                    paymentMethod === 'online' ? "bg-primary-600 shadow-primary-200 text-white" : "bg-slate-950 shadow-slate-900/20 text-white"
                  )}
                >
                   {isPlacingOrder ? (
                     <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>{paymentMethod === 'online' ? `Authorize ₹${cartTotal}` : 'Confirm Order'}</span>
                     </>
                   )}
                </button>
                <div className="mt-3 flex items-center justify-center gap-2">
                   <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] md:tracking-[0.15em]">Verified Secure Gateways • Encrypted Transaction</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Details & Reviews Modal */}
      <AnimatePresence>
        {selectedProductDetails && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductDetails(null)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-4xl bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-3xl overflow-hidden flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedProductDetails(null)}
                className="absolute top-6 right-6 z-30 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary-600 transition-all shadow-lg"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* Product Image Panel */}
              <div className="w-full md:w-1/2 relative bg-slate-50">
                <img 
                  src={selectedProductDetails.imageUrl} 
                  alt={selectedProductDetails.name}
                  className="w-full h-64 md:h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-10 left-10 hidden md:block">
                  <div className="px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl inline-flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Trending Choice</span>
                  </div>
                </div>
              </div>

              {/* Info Content Panel */}
              <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto max-h-[70vh] md:max-h-[85vh] no-scrollbar">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-primary-100">
                        {selectedProductDetails.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-black text-slate-900 tracking-tight">4.9 (42 Reviews)</span>
                      </div>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tighter leading-[0.9]">
                      {selectedProductDetails.name}
                    </h2>
                    <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
                      {selectedProductDetails.description}
                    </p>
                  </div>

                  {/* Nutritional Info Grid */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Nutritional Profile</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Calories', value: '420', unit: 'kcal', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                        { label: 'Protein', value: '18', unit: 'g', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                        { label: 'Carbs', value: '54', unit: 'g', color: 'bg-sky-50 text-sky-600 border-sky-100' },
                        { label: 'Fat', value: '12', unit: 'g', color: 'bg-rose-50 text-rose-600 border-rose-100' },
                      ].map((item, idx) => (
                        <div key={idx} className={cn("p-4 rounded-3xl border flex flex-col items-center justify-center space-y-1", item.color)}>
                          <span className="text-xl font-black font-display leading-none">{item.value}</span>
                          <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">{item.label} ({item.unit})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ingredients Section */}
                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Core Ingredients</h4>
                     <div className="flex flex-wrap gap-2">
                       {['Premium Flour', 'Local Herbs', 'Sea Salt', 'Organic Oil', 'Chef’s Blend'].map(ing => (
                         <span key={ing} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest">{ing}</span>
                       ))}
                     </div>
                  </div>

                  {/* Customer Reviews Section */}
                  <div className="space-y-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Customer Feedback</h4>
                      <button className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline">View All</button>
                    </div>
                    <div className="space-y-6">
                      {[
                        { name: 'Arjun K.', date: '2 days ago', rating: 5, comment: 'Seriously the best meal on campus. The flavor profile is incredible!', avatar: 'AK' },
                        { name: 'Sarah M.', date: '1 week ago', rating: 5, comment: 'Authentic taste and was delivered piping hot. Highly recommend!', avatar: 'SM' },
                        { name: 'Rahul V.', date: '3 days ago', rating: 4, comment: 'Great quality, though I wish there were more portion size options.', avatar: 'RV' },
                      ].map((review, idx) => (
                        <div key={idx} className="space-y-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                 <span className="text-xs font-black text-primary-600 tracking-tighter">{review.avatar}</span>
                               </div>
                               <div>
                                 <p className="text-sm font-black text-slate-900 leading-tight">{review.name}</p>
                                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{review.date}</p>
                               </div>
                             </div>
                             <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                               {[...Array(5)].map((_, i) => (
                                 <Star key={i} className={cn("w-2.5 h-2.5", i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
                               ))}
                             </div>
                          </div>
                          <p className="text-[13px] font-medium text-slate-600 leading-relaxed italic opacity-90">"{review.comment}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add to Basket Action */}
                  <div className="pt-8 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unit Price</span>
                       <span className="text-3xl font-black text-slate-900 font-display">₹{selectedProductDetails.price}</span>
                    </div>
                    <button 
                      onClick={() => {
                        addToCart(selectedProductDetails);
                        setSelectedProductDetails(null);
                        setIsCartOpen(true);
                      }}
                      className="w-full bg-primary-600 text-white h-16 md:h-18 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-4"
                    >
                      <ShoppingBag className="w-6 h-6" />
                      Add to Basket
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

