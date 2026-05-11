import React, { useState, useEffect, type FormEvent } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Order, OrderStatus } from '../types';
import { Plus, Trash2, Edit2, Package, CheckCircle2, Clock, Truck, ChevronRight, XCircle, User, MapPin, Filter, ShoppingBag, BarChart3, Settings, Zap, Search, Calendar, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { StoreSettings } from '../types';
import { toast } from 'sonner';

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings' | 'customers'>('orders');
  const [settings, setSettings] = useState<StoreSettings>({
    isAcceptingOrders: true,
    announcement: '',
    estimatedPrepTime: '20-30 mins'
  });
  
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('pending');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'online' | 'cod'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Product Form State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: 'Breakfast',
    imageUrl: '',
    isAvailable: true
  });

  useEffect(() => {
    const productsQ = collection(db, 'products');
    const ordersQ = collection(db, 'orders');

    const unsubProducts = onSnapshot(productsQ, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    const unsubOrders = onSnapshot(ordersQ, (snapshot) => {
      // Sort in-memory to avoid index requirements
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      fetchedOrders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setOrders(fetchedOrders);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as StoreSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/store');
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubSettings();
    };
  }, []);

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingOrdersCount = orders.filter(o => ['placed', 'preparing', 'out_for_delivery'].includes(o.status)).length;
  
  // Unique customers calculation
  const customers = Array.from(new Set(orders.map(o => o.userId))).map((uid: string) => {
    const userOrders = orders.filter(o => o.userId === uid);
    return {
      uid,
      totalSpent: userOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      orderCount: userOrders.length,
      lastOrder: userOrders[0]?.createdAt
    };
  });

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        ...newSettings,
        updatedAt: serverTimestamp()
      });
      toast.success("Settings updated");
    } catch (error: any) {
      if (error.code === 'not-found') {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'settings', 'store'), {
          ...settings,
          ...newSettings,
          updatedAt: serverTimestamp()
        });
        toast.success("Settings initialized");
      } else {
        handleFirestoreError(error, OperationType.UPDATE, 'settings/store');
      }
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addProduct = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!newProduct.name || !newProduct.price || !newProduct.imageUrl || !newProduct.description) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        isAvailable: true,
        updatedAt: serverTimestamp()
      });
      setNewProduct({ name: '', description: '', price: 0, category: 'Breakfast', imageUrl: '', isAvailable: true });
      setIsAddingProduct(false);
      toast.success("New culinary masterpiece added!");
    } catch (error) {
      console.error("Add product error:", error);
      toast.error("Failed to add product. Check console for details.");
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id!), {
        isAvailable: !product.isAvailable,
        updatedAt: serverTimestamp()
      });
      toast.success(`Product ${product.isAvailable ? 'hidden' : 'visible'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.error("Product deleted");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp()
      });
      toast.success(`Order status updated to ${status.replace('_', ' ')}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'placed': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'preparing': return <Package className="w-5 h-5 text-primary-600" />;
      case 'out_for_delivery': return <Truck className="w-5 h-5 text-purple-500" />;
      case 'delivered': return <CheckCircle2 className="w-5 h-5 text-primary-600" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    // Status Filter
    let matchesStatus = true;
    if (orderFilter === 'pending') {
      matchesStatus = ['placed', 'preparing', 'out_for_delivery'].includes(order.status);
    } else if (orderFilter === 'completed') {
      matchesStatus = order.status === 'delivered';
    } else if (orderFilter === 'cancelled') {
      matchesStatus = order.status === 'cancelled';
    }

    // Payment Filter
    let matchesPayment = paymentFilter === 'all' || order.paymentMethod === paymentFilter;

    // Date Filter
    let matchesDate = true;
    if (dateFilter !== 'all' && order.createdAt) {
      const orderDate = order.createdAt.toDate();
      const now = new Date();
      if (dateFilter === 'today') {
        matchesDate = orderDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        matchesDate = orderDate >= oneWeekAgo;
      } else if (dateFilter === 'custom') {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) {
          start.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && orderDate >= start;
        }
        if (end) {
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && orderDate <= end;
        }
      }
    }

    // Search Filter
    let matchesSearch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const orderId = order.id?.toLowerCase() || '';
      const address = order.deliveryAddress.toLowerCase();
      const userId = order.userId.toLowerCase();
      const itemsMatch = order.items.some(item => item.name.toLowerCase().includes(query));
      
      matchesSearch = orderId.includes(query) || address.includes(query) || userId.includes(query) || itemsMatch;
    }

    return matchesStatus && matchesPayment && matchesDate && matchesSearch;
  });

  const seedMenu = async () => {
    const sampleItems: Partial<Product>[] = [
      { name: 'Spicy Veg Burger', category: 'Snacks', price: 89, description: 'Crispy veg patty with tangy mayo and fresh veggies.', imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Cold Coffee Classic', category: 'Drinks', price: 65, description: 'Hand-beaten creamy cold coffee with chocolate drizzle.', imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Paneer Butter Masala', category: 'Lunch', price: 180, description: 'Rich creamy paneer curry served with 2 butter naan.', imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Grilled Sandwich', category: 'Snacks', price: 75, description: 'Cheese and capsicum stuffed jumbo sandwich.', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Lemon Iced Tea', category: 'Drinks', price: 45, description: 'Refreshing brewed iced tea with real lemon juice.', imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Chocolate Brownie', category: 'Snacks', price: 95, description: 'Hot chocolate brownie with fudge sauce.', imageUrl: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=500&auto=format&fit=crop&q=60', isAvailable: true },
    ];

    try {
      for (const item of sampleItems) {
        await addDoc(collection(db, 'products'), {
          ...item,
          updatedAt: serverTimestamp()
        });
      }
      toast.success("Menu seeded successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const deleteOrder = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'orders', id));
      toast.info("Order deleted permanently");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Admin Sidebar */}
      <div className="w-full lg:w-80 border-r border-slate-200 glass p-8 space-y-12">
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Control Hub</p>
          <div className="space-y-2">
            {[
              { id: 'orders', label: 'Order Stream', icon: Package, count: pendingOrdersCount },
              { id: 'products', label: 'Menu Factory', icon: ShoppingBag, count: products.length },
              { id: 'customers', label: 'Dining Base', icon: User, count: customers.length },
              { id: 'settings', label: 'Core Config', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm transition-all group",
                  activeTab === tab.id 
                    ? "bg-primary-600 text-white shadow-xl shadow-primary-200 glow-primary" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-white" : "text-slate-400 group-hover:text-primary-600")} />
                  {tab.label}
                </div>
                {tab.count !== undefined && (
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-lg",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-primary-900 rounded-3xl space-y-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary-400/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
           <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                 <BarChart3 className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Gross Revenue</p>
                 <p className="text-3xl font-display font-black text-white">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                 <TrendingUp className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Stable Growth</span>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-12 overflow-y-auto max-h-screen no-scrollbar">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
             <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tighter">
               {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} <span className="text-primary-600">Overview</span>
             </h1>
             <p className="text-slate-500 font-medium">Managing the pulse of your culinary operations.</p>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'products' && (
              <>
                <button 
                  onClick={seedMenu}
                  className="bg-white border border-slate-200 text-slate-500 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3"
                >
                  <Zap className="w-4 h-4" />
                  Seed Menu
                </button>
                <button 
                  onClick={() => setIsAddingProduct(true)}
                  className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-primary-600 hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add New Dish
                </button>
              </>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Order Filters */}
              <div className="glass p-6 rounded-[2.5rem] flex flex-wrap items-center gap-6">
                <div className="flex-1 relative group min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by ID, Address, Item..."
                    className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl">
                  {(['pending', 'completed', 'cancelled', 'all'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderFilter(f as any)}
                      className={cn(
                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        orderFilter === f ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <select 
                    className="h-12 px-6 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                  >
                    <option value="all">All Payments</option>
                    <option value="online">Online</option>
                    <option value="cod">COD</option>
                  </select>

                  <select 
                    className="h-12 px-6 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Past Week</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {filteredOrders.length === 0 ? (
                  <div className="col-span-full h-96 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-slate-900">No signals matching filters</p>
                      <p className="text-slate-400 font-medium">Try adjusting your search or filters.</p>
                    </div>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <motion.div
                      layout
                      key={order.id}
                      className="bg-white border border-slate-100 rounded-[3rem] p-8 space-y-8 relative group hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-500"
                    >
                      <button 
                        onClick={(e) => deleteOrder(order.id!, e)}
                        className="absolute top-8 right-8 p-3 bg-red-50 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Sequence</p>
                            <h3 className="text-2xl font-display font-black text-slate-900 tracking-tighter">#{order.id?.slice(-8).toUpperCase()}</h3>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="text-right">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
                               <p className="text-2xl font-display font-black text-primary-600">₹{order.totalAmount}</p>
                            </div>
                            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                               {getStatusIcon(order.status)}
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-50">
                         <div className="space-y-4">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                  <User className="w-5 h-5" />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Identity</span>
                                  <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{order.userId}</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                  <MapPin className="w-5 h-5" />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Deployment Point</span>
                                  <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{order.deliveryAddress}</span>
                               </div>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                  <Clock className="w-5 h-5" />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Logged At</span>
                                  <span className="text-xs font-bold text-slate-900">
                                     {order.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                  <CheckCircle2 className="w-5 h-5" />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Settlement</span>
                                  <span className={cn(
                                    "text-xs font-bold uppercase tracking-widest",
                                    order.paymentStatus === 'paid' ? "text-emerald-500" : "text-amber-500"
                                  )}>{order.paymentMethod} • {order.paymentStatus}</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordered Entities</p>
                         <div className="flex flex-wrap gap-3">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-2xl border border-slate-100">
                                 <img src={item.imageUrl} className="w-10 h-10 rounded-xl object-cover" />
                                 <div>
                                    <p className="text-xs font-bold text-slate-900">{item.name}</p>
                                    <p className="text-[10px] font-medium text-slate-400">Qty: {item.quantity}</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-4">
                         {[
                           { label: 'Prepare', status: 'preparing' },
                           { label: 'Dispatch', status: 'out_for_delivery' },
                           { label: 'Complete', status: 'delivered' },
                           { label: 'Void', status: 'cancelled' }
                         ].map((s) => (
                           <button
                             key={s.status}
                             onClick={() => updateOrderStatus(order.id!, s.status as OrderStatus)}
                             className={cn(
                               "px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                               order.status === s.status 
                                ? "bg-primary-600 text-white shadow-lg shadow-primary-200" 
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                             )}
                           >
                             {s.label}
                           </button>
                         ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
            >
              {products.map((product) => (
                <div key={product.id} className="bg-white border border-slate-100 rounded-[3rem] p-6 space-y-6 group hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-500 flex flex-col">
                  <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-slate-50">
                    <img 
                      src={product.imageUrl} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                       <button 
                        onClick={() => deleteProduct(product.id!)}
                        className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all transform md:translate-y-12 group-hover:translate-y-0 duration-300"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  <div className="space-y-4 px-2 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">{product.category}</span>
                       <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", product.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{product.isAvailable ? 'Active' : 'Hidden'}</span>
                       </div>
                    </div>
                    
                    <div className="space-y-1">
                       <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">{product.name}</h3>
                       <p className="text-xs font-medium text-slate-500 line-clamp-2">{product.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                       <p className="text-2xl font-display font-black text-slate-900">₹{product.price}</p>
                       <button
                         onClick={() => toggleAvailability(product)}
                         className={cn(
                           "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                           product.isAvailable ? "bg-white text-slate-500 border-slate-200 hover:bg-slate-50" : "bg-primary-600 text-white border-primary-600 shadow-xl shadow-primary-200"
                         )}
                       >
                         {product.isAvailable ? 'Hide' : 'Authorize'}
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'customers' && (
             <motion.div
                key="customers"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
             >
                <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Customer Reference</th>
                              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Transactions</th>
                              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Yield</th>
                              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Last Sync</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {customers.map((c) => (
                             <tr key={c.uid} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-10 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 font-black text-sm">
                                         {c.uid.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                         <p className="text-sm font-black text-slate-900 truncate max-w-[150px]">{c.uid}</p>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID Verified</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-right font-black text-slate-700">{c.orderCount} Orders</td>
                                <td className="px-10 py-6 text-right font-display font-black text-primary-600 text-lg">₹{c.totalSpent}</td>
                                <td className="px-10 py-6 text-right text-xs font-bold text-slate-400 italic">
                                   {c.lastOrder?.toDate().toLocaleDateString() || 'N/A'}
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                   </div>
                </div>
             </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white border border-slate-100 rounded-[3rem] p-10 space-y-8 shadow-sm">
                    <div>
                       <h3 className="text-2xl font-display font-black text-slate-900 tracking-tighter">Kitchen Protocol</h3>
                       <p className="text-slate-400 text-xs font-medium mt-1">Operational toggle for order intake.</p>
                    </div>

                    <div className="space-y-4">
                       <button
                         onClick={() => updateSettings({ isAcceptingOrders: !settings.isAcceptingOrders })}
                         className={cn(
                           "w-full h-20 rounded-2xl flex items-center justify-between px-8 border transition-all",
                           settings.isAcceptingOrders 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                            : "bg-red-50 border-red-100 text-red-700"
                         )}
                       >
                         <div className="flex items-center gap-4">
                            <div className={cn("w-3 h-3 rounded-full", settings.isAcceptingOrders ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                            <span className="font-black text-[10px] uppercase tracking-[0.2em]">{settings.isAcceptingOrders ? 'Accepting' : 'Paused'}</span>
                         </div>
                         <div className={cn("w-12 h-6 rounded-full relative p-1 transition-colors", settings.isAcceptingOrders ? "bg-emerald-500" : "bg-red-200")}>
                            <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", settings.isAcceptingOrders ? "translate-x-6" : "translate-x-0")} />
                         </div>
                       </button>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Prep Time Estimate</label>
                       <input 
                         type="text" 
                         value={settings.estimatedPrepTime}
                         onChange={(e) => updateSettings({ estimatedPrepTime: e.target.value })}
                         className="w-full h-16 bg-slate-50 border-transparent rounded-2xl px-6 font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all outline-none border border-slate-100"
                         placeholder="e.g. 20-30 mins"
                       />
                    </div>
                 </div>

                 <div className="bg-white border border-slate-100 rounded-[3rem] p-10 space-y-8 shadow-sm">
                    <div>
                       <h3 className="text-2xl font-display font-black text-slate-900 tracking-tighter">Communications</h3>
                       <p className="text-slate-400 text-xs font-medium mt-1">Global announcement for dining users.</p>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Banner Announcement</label>
                       <textarea 
                         rows={4}
                         value={settings.announcement}
                         onChange={(e) => updateSettings({ announcement: e.target.value })}
                         className="w-full bg-slate-50 border-transparent rounded-3xl p-6 font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all outline-none border border-slate-100 resize-none"
                         placeholder="Enter broadcast message..."
                       />
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                          <Settings className="w-5 h-5 text-slate-400" />
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-[200px]">Changes are synced automatically in real-time with the production database.</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingProduct(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[150]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-2xl bg-white rounded-[3.5rem] shadow-3xl z-[160] overflow-hidden"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-display font-black text-slate-900 tracking-tighter">Add New Dish</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Define the culinary experience</p>
                </div>
                <button 
                  onClick={() => setIsAddingProduct(false)}
                  className="w-14 h-14 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center transition-colors"
                >
                  <XCircle className="w-6 h-6 text-slate-300" />
                </button>
              </div>

              <form onSubmit={addProduct} className="p-10 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Dish Identity</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Gourmet Burger..."
                      className="w-full h-16 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none shadow-sm"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Price Point (INR)</label>
                    <input 
                      required
                      type="number" 
                      placeholder="299"
                      className="w-full h-16 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none shadow-sm"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Collection</label>
                  <div className="flex flex-wrap gap-3">
                    {['Breakfast', 'Lunch', 'Snacks', 'Drinks'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewProduct({...newProduct, category: cat})}
                        className={cn(
                          "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          newProduct.category === cat ? "bg-slate-950 text-white border-slate-950 shadow-xl" : "bg-white text-slate-400 border-slate-100"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Visual Asset URL</label>
                  <input 
                    required
                    type="url" 
                    placeholder="https://images.unsplash.com/..."
                    className="w-full h-16 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none shadow-sm"
                    value={newProduct.imageUrl}
                    onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Flavor Profile</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Describe the layers of taste..."
                    className="w-full bg-slate-50 border-none rounded-[2rem] p-6 font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none shadow-sm resize-none"
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full h-20 bg-primary-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary-200 hover:bg-primary-700 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3",
                    isSubmitting && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add New Dish'
                  )}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
