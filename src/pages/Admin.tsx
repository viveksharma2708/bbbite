import React, { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Product, Order, OrderStatus } from '../types';
import { Plus, Trash2, Edit2, Package, CheckCircle2, Clock, Truck, ChevronRight, XCircle, User, MapPin, Filter, ShoppingBag, BarChart3, Settings, Zap, Search, Calendar, TrendingUp, LogOut, MessageSquare, Utensils } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Dark Modern Header */}
      <header className="bg-slate-900 px-4 md:px-6 py-3 md:py-6 border-b border-slate-800 flex items-center justify-between sticky top-0 z-[100] shadow-2xl">
        <div className="flex items-center gap-2 md:gap-6">
           <Link to="/" className="w-8 h-8 md:w-12 md:h-12 bg-primary-600 rounded-lg md:rounded-2xl flex items-center justify-center glow-primary hover:scale-110 transition-all">
              <Utensils className="w-4 h-4 md:w-7 md:h-7 text-white" />
           </Link>
           <h1 className="text-lg md:text-3xl font-display font-black text-white tracking-tighter">
             BB Bite <span className="hidden sm:inline text-primary-400">Admin Dashboard</span>
             <span className="sm:hidden text-primary-400">Admin</span>
           </h1>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 md:gap-2 border border-red-500/20 shadow-xl shadow-red-500/5 group"
        >
          <LogOut className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:scale-110" />
          <span className="hidden xs:inline">Logout</span>
        </button>
      </header>

      {/* Navigation Sub-header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between sticky top-[61px] md:top-[89px] z-50 gap-4">
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'products', label: 'Menu', icon: ShoppingBag },
            { id: 'customers', label: 'Dining', icon: User },
            { id: 'settings', label: 'Config', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-xl" 
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <tab.icon className="w-3 h-3 md:w-4 md:h-4" />
              <span className="inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 md:gap-6 divide-x divide-slate-200 justify-between sm:justify-start">
           <div className="flex items-center gap-2 md:gap-3 sm:pl-6">
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Gross Revenue</p>
              <p className="text-sm md:text-2xl font-display font-black text-slate-900 leading-none">₹{totalRevenue.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <main className="flex-1 p-3 md:p-8 max-w-[1600px] w-full mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 md:space-y-6"
            >
              {/* Order Filtering & Search */}
              <div className="bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 md:gap-4 shadow-sm">
                <div className="flex-1 min-w-0 md:min-w-[300px] relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500" />
                  <input 
                    type="text" 
                    placeholder="Search by ID, User, Phone..."
                    className="w-full h-10 md:h-12 pl-12 pr-4 bg-slate-50 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-1 md:gap-2 bg-slate-50 p-1 rounded-lg md:rounded-xl overflow-x-auto no-scrollbar">
                  {(['pending', 'completed', 'cancelled', 'all'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderFilter(f as any)}
                      className={cn(
                        "px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all min-w-max",
                        orderFilter === f ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <select 
                    className="flex-1 lg:flex-none h-10 md:h-12 px-3 md:px-4 bg-slate-50 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:bg-white transition-all outline-none border-none"
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                  >
                    <option value="all">Payments</option>
                    <option value="online">Online</option>
                    <option value="cod">COD</option>
                  </select>
                </div>
              </div>

              {/* Main Orders Table */}
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#56a756] text-white">
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">ID</th>
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Client</th>
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Name</th>
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Details</th>
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Address</th>
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Order Hash</th>
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Total</th>
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                        <th className="px-4 md:px-5 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 md:px-5 py-4 font-mono text-[9px] md:text-[10px] font-bold text-slate-400">
                             #{order.id?.slice(-6).toUpperCase()}
                          </td>
                          <td className="px-4 md:px-5 py-4 text-[10px] md:text-xs font-bold text-slate-500">
                             {order.userId.split('@')[0]}
                          </td>
                          <td className="px-4 md:px-5 py-4">
                             <p className="text-[10px] md:text-xs font-black text-slate-900 leading-tight">{order.customerName || 'Guest'}</p>
                             <p className="text-[8px] md:text-[9px] font-bold text-slate-400 mt-0.5">{order.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-4 md:px-5 py-4">
                             <div className="flex flex-col">
                               <p className="text-[10px] md:text-xs font-black text-primary-600 leading-tight underline decoration-primary-200 underline-offset-2">{order.customerPhone}</p>
                               <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{order.course || 'Regular'}</p>
                             </div>
                          </td>
                          <td className="px-4 md:px-5 py-4">
                             <div className="flex items-center gap-1.5 min-w-[120px]">
                                <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                                <p className="text-[10px] md:text-xs font-medium text-slate-500 line-clamp-1">{order.deliveryAddress}</p>
                             </div>
                          </td>
                          <td className="px-4 md:px-5 py-4">
                             <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {order.items.map((item, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[8px] md:text-[9px] font-black text-slate-600">
                                    {item.name} ×{item.quantity}
                                  </span>
                                ))}
                             </div>
                          </td>
                          <td className="px-4 md:px-5 py-4 text-sm font-black text-slate-900 font-display whitespace-nowrap">
                             ₹{order.totalAmount}
                          </td>
                          <td className="px-4 md:px-5 py-4">
                            <div className="flex flex-col gap-2 min-w-[180px]">
                              <div className="flex items-center justify-between px-1">
                                <span className={cn(
                                  "inline-block px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                                  order.status === 'placed' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                  order.status === 'preparing' ? "bg-sky-50 text-sky-600 border border-sky-100" :
                                  order.status === 'out_for_delivery' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                                  order.status === 'delivered' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                  "bg-red-50 text-red-600 border border-red-100"
                                )}>
                                  {order.status.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[8px] font-black text-slate-400">
                                  {order.status === 'delivered' ? '100%' : 
                                   order.status === 'out_for_delivery' ? '75%' :
                                   order.status === 'preparing' ? '50%' :
                                   order.status === 'placed' ? '25%' : '0%'}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                                <div className={cn("h-full rounded-full transition-all duration-500", 
                                  ['placed', 'preparing', 'out_for_delivery', 'delivered'].includes(order.status) ? "w-1/4 bg-amber-400" : "w-0")} />
                                <div className={cn("h-full rounded-full transition-all duration-500", 
                                  ['preparing', 'out_for_delivery', 'delivered'].includes(order.status) ? "w-1/4 bg-sky-400" : "w-0")} />
                                <div className={cn("h-full rounded-full transition-all duration-500", 
                                  ['out_for_delivery', 'delivered'].includes(order.status) ? "w-1/4 bg-purple-400" : "w-0")} />
                                <div className={cn("h-full rounded-full transition-all duration-500", 
                                  ['delivered'].includes(order.status) ? "w-1/4 bg-emerald-400" : "w-0")} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <select 
                                className="bg-white border border-slate-200 rounded-md px-1 py-1 text-[8px] md:text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary-500 transition-colors"
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id!, e.target.value as OrderStatus)}
                              >
                                <option value="placed">Pending</option>
                                <option value="preparing">Prep</option>
                                <option value="out_for_delivery">Out</option>
                                <option value="delivered">Done</option>
                                <option value="cancelled">X</option>
                              </select>
                              <button 
                                onClick={(e) => deleteOrder(order.id!, e)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6"
            >
              {/* Add New Item Card */}
              <button
                onClick={() => setIsAddingProduct(true)}
                className="bg-white border-2 border-dashed border-slate-200 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-5 flex flex-col items-center justify-center gap-3 md:gap-4 group hover:border-primary-500 hover:bg-primary-50/30 transition-all duration-300"
              >
                <div className="w-10 h-10 md:w-16 md:h-16 bg-primary-100 rounded-xl md:rounded-3xl flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform shadow-xl shadow-primary-500/10">
                  <Plus className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-lg font-display font-black text-slate-900">Add Item</p>
                  <p className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">Expansion</p>
                </div>
              </button>

              {products.map((product) => (
                <div key={product.id} className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-5 space-y-3 md:space-y-6 group hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-500">
                  <div className="relative aspect-square md:aspect-[4/3] rounded-[1.2rem] md:rounded-[2rem] overflow-hidden bg-slate-100">
                    <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <button 
                      onClick={() => deleteProduct(product.id!)}
                      className="absolute top-2 md:top-4 right-2 md:right-4 w-7 h-7 md:w-10 md:h-10 bg-white/90 backdrop-blur-md rounded-lg md:rounded-xl flex items-center justify-center text-red-500 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 md:space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[7px] md:text-[9px] font-black text-primary-600 uppercase tracking-widest bg-primary-50 px-1.5 md:px-3 py-0.5 md:py-1 rounded md:rounded-lg">{product.category}</span>
                       <div className="flex items-center gap-1 md:gap-1.5">
                          <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", product.isAvailable ? "bg-emerald-500" : "bg-slate-300")} />
                          <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{product.isAvailable ? 'Live' : 'Hidden'}</span>
                       </div>
                    </div>
                    <div>
                       <h3 className="text-xs md:text-xl font-display font-black text-slate-900 leading-tight line-clamp-1">{product.name}</h3>
                       <p className="text-[8px] md:text-xs font-medium text-slate-500 line-clamp-1 mt-0.5 md:mt-1 hidden sm:block">{product.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-slate-50">
                       <p className="text-sm md:text-2xl font-display font-black text-slate-950 font-display">₹{product.price}</p>
                       <button
                         onClick={() => toggleAvailability(product)}
                         className={cn(
                           "px-2 md:px-5 py-1 md:py-2.5 rounded-lg md:rounded-xl text-[7px] md:text-[9px] font-black uppercase tracking-widest border transition-all",
                           product.isAvailable ? "bg-white text-slate-500 border-slate-200 hover:bg-slate-50" : "bg-primary-600 text-white border-primary-600"
                         )}
                       >
                         {product.isAvailable ? 'Hide' : 'Show'}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
             >
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-[#56a756] text-white">
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest">Customer Reference</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right">Transactions</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right">Yield</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right">Last Purchase</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {customers.map((c) => (
                           <tr key={c.uid} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 font-black text-xs">
                                       {c.uid.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                       <p className="text-xs font-black text-slate-900 truncate max-w-[200px]">{c.uid}</p>
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registered Member</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-6 text-right font-black text-slate-700 text-sm">{c.orderCount} Orders</td>
                              <td className="px-10 py-6 text-right font-display font-black text-primary-600 text-lg">₹{c.totalSpent}</td>
                              <td className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase">
                                 {c.lastOrder?.toDate().toLocaleDateString() || 'N/A'}
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8"
            >
               <div className="bg-white border border-slate-200 rounded-[3rem] p-10 space-y-8 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                       <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-black text-slate-900 tracking-tighter">Kitchen Protocol</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Real-time status control</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <button
                       onClick={() => updateSettings({ isAcceptingOrders: !settings.isAcceptingOrders })}
                       className={cn(
                         "w-full h-20 rounded-2xl flex items-center justify-between px-8 border transition-all shadow-xl group shadow-slate-200/50",
                         settings.isAcceptingOrders 
                          ? "bg-slate-900 border-slate-900 text-white" 
                          : "bg-red-50 border-red-100 text-red-700 shadow-red-200/20"
                       )}
                     >
                       <div className="flex items-center gap-4">
                          <div className={cn("w-3 h-3 rounded-full", settings.isAcceptingOrders ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                          <span className="font-black text-[10px] uppercase tracking-[0.2em]">{settings.isAcceptingOrders ? 'Accepting Orders' : 'Delivery Paused'}</span>
                       </div>
                       <div className={cn("w-12 h-6 rounded-full relative p-1 transition-colors", settings.isAcceptingOrders ? "bg-primary-600" : "bg-red-200")}>
                          <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", settings.isAcceptingOrders ? "translate-x-6" : "translate-x-0")} />
                       </div>
                     </button>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Prep Time Estimate</label>
                     <input 
                       type="text" 
                       value={settings.estimatedPrepTime}
                       onChange={(e) => setSettings({...settings, estimatedPrepTime: e.target.value})}
                       onBlur={() => updateSettings({ estimatedPrepTime: settings.estimatedPrepTime })}
                       className="w-full h-16 bg-slate-50 border-slate-200 rounded-2xl px-6 font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all outline-none border"
                     />
                  </div>
               </div>

               <div className="bg-white border border-slate-200 rounded-[3rem] p-10 space-y-8 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                       <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-black text-slate-900 tracking-tighter">Communications</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Broadcast announcements</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Banner Announcement</label>
                     <textarea 
                       rows={4}
                       value={settings.announcement}
                       onChange={(e) => setSettings({...settings, announcement: e.target.value})}
                       onBlur={() => updateSettings({ announcement: settings.announcement })}
                       className="w-full bg-slate-50 border-slate-200 rounded-[2rem] p-6 font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all outline-none border resize-none"
                       placeholder="Enter broadcast message..."
                     />
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Product Modal (Keep existing logic but styled) */}
      <AnimatePresence>
        {isAddingProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingProduct(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200]"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-xl bg-white rounded-[3rem] shadow-3xl z-[210] overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tighter">New Item Entry</h2>
                <button onClick={() => setIsAddingProduct(false)} className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center"><XCircle className="w-6 h-6 text-slate-300" /></button>
              </div>

              <form onSubmit={addProduct} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full h-14 bg-slate-50 rounded-xl px-5 font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price (₹)</label>
                    <input 
                      required
                      type="number" 
                      className="w-full h-14 bg-slate-50 rounded-xl px-5 font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                  <div className="flex gap-2">
                    {['Breakfast', 'Lunch', 'Snacks', 'Drinks'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewProduct({...newProduct, category: cat})}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          newProduct.category === cat ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image URL</label>
                  <input 
                    required
                    type="url" 
                    className="w-full h-14 bg-slate-50 rounded-xl px-5 font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={newProduct.imageUrl}
                    onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full bg-slate-50 rounded-xl p-5 font-bold outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-16 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary-200"
                >
                  {isSubmitting ? 'Adding...' : 'Launch Product'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
