import React, { useState, useEffect, type FormEvent } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Order, OrderStatus } from '../types';
import { Plus, Trash2, Edit2, Package, CheckCircle2, Clock, Truck, ChevronRight, XCircle, User, MapPin, Filter, ShoppingBag, BarChart3, Settings, Zap, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { StoreSettings } from '../types';
import { toast } from 'sonner';

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings'>('orders');
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
  const todayOrders = orders.filter(o => {
    if (!o.createdAt) return false;
    return o.createdAt.toDate().toDateString() === new Date().toDateString();
  });

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        ...newSettings,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      if (error.code === 'not-found') {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'settings', 'store'), {
          ...settings,
          ...newSettings,
          updatedAt: serverTimestamp()
        });
      } else {
        handleFirestoreError(error, OperationType.UPDATE, 'settings/store');
      }
    }
  };

  const addProduct = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        updatedAt: serverTimestamp()
      });
      setNewProduct({ name: '', description: '', price: 0, category: 'Breakfast', imageUrl: '', isAvailable: true });
      setIsAddingProduct(false);
      toast.success("Product added successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
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
    if (window.confirm("Are you sure?")) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.error("Product deleted");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      }
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
    if (!window.confirm("This will add professional sample items to your BB Bite menu. Continue?")) return;
    
    const sampleItems: Partial<Product>[] = [
      { name: 'Spicy Veg Burger', category: 'Snacks', price: 89, description: 'Crispy veg patty with tangy mayo and fresh veggies.', imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Cold Coffee Classic', category: 'Drinks', price: 65, description: 'Hand-beaten creamy cold coffee with chocolate drizzle.', imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Paneer Butter Masala', category: 'Lunch', price: 180, description: 'Rich creamy paneer curry served with 2 butter naan.', imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Grilled Sandwich', category: 'Snacks', price: 75, description: 'Cheese and capsicum stuffed jumbo sandwich.', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'Lemon Iced Tea', category: 'Drinks', price: 45, description: 'Refreshing brewed iced tea with real lemon juice.', imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60', isAvailable: true },
      { name: 'South Indian Thali', category: 'Lunch', price: 150, description: 'Traditional mini thali with sambhar, rice and papad.', imageUrl: 'https://images.unsplash.com/photo-1589301760014-a92e538ef022?w=500&auto=format&fit=crop&q=60', isAvailable: true },
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
    if (window.confirm("Permanently remove this order from database? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'orders', id));
        toast.info("Order deleted permanently");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-slate-900 tracking-tight">Control <span className="text-primary-600">Center</span></h1>
          <p className="text-sm font-medium text-slate-400">Manage your culinary experience and logistics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 ring-1 ring-gray-200/50">
            <button 
              onClick={() => setActiveTab('orders')}
              className={cn(
                "px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                activeTab === 'orders' ? "bg-gray-950 text-white shadow-xl shadow-gray-400/20" : "text-gray-400 hover:text-gray-900"
              )}
            >
              <Zap className="w-4 h-4" />
              Live Orders ({orders.filter(o => ['placed', 'preparing', 'out_for_delivery'].includes(o.status)).length})
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={cn(
                "px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                activeTab === 'products' ? "bg-gray-950 text-white shadow-xl shadow-gray-400/20" : "text-gray-400 hover:text-gray-900"
              )}
            >
              <ShoppingBag className="w-4 h-4" />
              Inventory
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                activeTab === 'settings' ? "bg-gray-950 text-white shadow-xl shadow-gray-400/20" : "text-gray-400 hover:text-gray-900"
              )}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Revenue (Today)', value: `₹${todayOrders.reduce((s, o) => s + o.totalAmount, 0)}`, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Total Revenue', value: `₹${totalRevenue}`, icon: BarChart3, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Active Orders', value: pendingOrdersCount, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Delivered (All Time)', value: orders.filter(o => o.status === 'delivered').length, icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'orders' ? (
          <motion.div 
            key="orders"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Order Management Bar */}
            <div className="flex flex-col gap-6">
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary-600 transition-colors" />
                <input 
                  type="text"
                  placeholder="Search by Order ID, Address, User ID or Item Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm text-sm font-medium focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                />
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                  {(['pending', 'completed', 'cancelled', 'all'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setOrderFilter(filter)}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        orderFilter === filter 
                          ? "bg-primary-600 text-white shadow-xl shadow-primary-200" 
                          : "bg-white text-gray-400 hover:text-gray-900"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                  {(['all', 'online', 'cod'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setPaymentFilter(filter)}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        paymentFilter === filter 
                          ? "bg-gray-950 text-white shadow-xl shadow-gray-400/20" 
                          : "bg-white text-gray-400 hover:text-gray-900"
                      )}
                    >
                      {filter === 'all' ? 'All Payments' : filter.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                  {(['all', 'today', 'week', 'custom'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        dateFilter === filter 
                          ? "bg-gray-700 text-white shadow-xl shadow-gray-400/20" 
                          : "bg-white text-gray-400 hover:text-gray-900"
                      )}
                    >
                      {filter === 'all' ? 'All Time' : filter === 'custom' ? 'Custom Range' : filter.toUpperCase()}
                    </button>
                  ))}
                </div>

                {dateFilter === 'custom' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-center gap-2 px-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-xs font-bold text-gray-600 outline-none bg-transparent"
                      />
                    </div>
                    <span className="text-gray-300 font-bold">→</span>
                    <div className="flex items-center gap-2 px-3">
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-xs font-bold text-gray-600 outline-none bg-transparent"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold">No orders found in this category.</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="bg-white border border-gray-50 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col lg:flex-row">
                    <div className="flex-1 p-8 lg:p-10 space-y-8">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                             {getStatusIcon(order.status)}
                           </div>
                           <div>
                             <h3 className="font-black text-gray-900 text-xl">#{order.id?.slice(-6).toUpperCase()}</h3>
                             <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em]">{order.status.replace('_', ' ')}</p>
                           </div>
                         </div>
                         <div className="text-right flex flex-col items-end gap-2">
                           <div className="flex gap-2">
                             <button
                               onClick={(e) => deleteOrder(order.id!, e)}
                               className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100"
                               title="Delete Order Permanently"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Total: ₹{order.totalAmount}</p>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                              <User className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Customer Details</span>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                               <p className="text-sm font-black text-gray-900 tracking-tight">User ID: {order.userId.slice(0, 10)}...</p>
                               <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/50">
                                 <MapPin className="w-3.5 h-3.5 text-primary-600" />
                                 <span className="text-xs font-bold text-gray-600">{order.deliveryAddress}</span>
                               </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                              <ShoppingBag className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Order Summary</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {order.items.map((item, idx) => (
                                 <div key={idx} className="bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-100 flex items-center gap-2">
                                   <span className="text-[10px] font-black text-primary-700">{item.quantity}×</span>
                                   <span className="text-xs font-bold text-primary-900">{item.name}</span>
                                 </div>
                               ))}
                            </div>
                          </div>
                       </div>
                    </div>

                    <div className="lg:w-72 bg-gray-50 p-8 flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Action Flow</p>
                      {(['preparing', 'out_for_delivery', 'delivered'] as OrderStatus[]).map(status => (
                        <button 
                          key={status}
                          onClick={() => updateOrderStatus(order.id!, status)}
                          className={cn(
                            "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all",
                            order.status === status 
                              ? "bg-gray-950 text-white border-gray-950 shadow-xl shadow-gray-300" 
                              : "bg-white text-gray-500 hover:bg-white hover:text-primary-600 hover:border-primary-600 border-gray-200"
                          )}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : activeTab === 'products' ? (
          <motion.div 
            key="products"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="h-72 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 hover:border-primary-600 hover:bg-primary-50 transition-all group scale-100 hover:scale-[1.02] active:scale-100"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-primary-100 transition-colors shadow-sm">
                  <Plus className="w-8 h-8 text-gray-400 group-hover:text-primary-600" />
                </div>
                <div className="space-y-1">
                  <span className="font-black text-lg text-gray-400 group-hover:text-primary-600 block">Add New Item</span>
                  <span className="text-xs font-bold text-gray-300 group-hover:text-primary-400 block tracking-wider">Expand your menu catalog</span>
                </div>
              </button>

              {products.map(product => (
                <div key={product.id} className="bg-white rounded-[2.5rem] border border-gray-50 shadow-sm overflow-hidden group hover:shadow-2xl transition-all flex flex-col">
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 right-4 flex gap-2">
                       <button 
                         onClick={() => deleteProduct(product.id!)}
                         className="p-3 bg-white/90 backdrop-blur-md text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-white/20"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 bg-primary-100/50 text-primary-700 text-[10px] font-black rounded-full uppercase tracking-wider">{product.category}</span>
                      <span className="font-black text-gray-900 text-lg">₹{product.price}</span>
                    </div>
                    <h3 className="font-black text-gray-900 mb-6 truncate">{product.name}</h3>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full ring-4",
                          product.isAvailable ? "bg-emerald-500 ring-emerald-50" : "bg-red-500 ring-red-50"
                        )} />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{product.isAvailable ? 'Available' : 'Unavailable'}</span>
                      </div>
                      <button 
                        onClick={() => toggleAvailability(product)}
                        className="text-[10px] font-black text-gray-900 underline underline-offset-8 uppercase tracking-[0.1em] hover:text-primary-600 transition-colors"
                      >
                        Change Status
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Accepting Orders</h3>
                  <p className="text-sm font-medium text-gray-400">Control if the kitchen is open for new orders</p>
                </div>
                <button 
                  onClick={() => updateSettings({ isAcceptingOrders: !settings.isAcceptingOrders })}
                  className={cn(
                    "w-16 h-10 rounded-full transition-all relative p-1",
                    settings.isAcceptingOrders ? "bg-emerald-500" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 bg-white rounded-full transition-all shadow-md",
                    settings.isAcceptingOrders ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Announcement</label>
                <textarea 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-primary-500/10 outline-none transition-all h-24 resize-none"
                  placeholder="E.g., Special 20% off today on all sandwiches!"
                  value={settings.announcement}
                  onChange={(e) => updateSettings({ announcement: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Batch Prep Time</label>
                <input 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                  value={settings.estimatedPrepTime}
                  onChange={(e) => updateSettings({ estimatedPrepTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-primary-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-primary-200 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-bl-full -z-0 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                <div className="relative z-10 space-y-4">
                  <h3 className="text-2xl font-black tracking-tight leading-none uppercase">Quick Actions</h3>
                  <p className="text-primary-100/80 font-bold text-sm leading-relaxed mb-6">Initialize your menu with professional pre-configured items to see the app in its full glory.</p>
                  <button 
                    onClick={seedMenu}
                    className="w-full bg-white text-primary-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-primary-50 transition-all shadow-xl"
                  >
                    Seed Professional Menu
                  </button>
                </div>
              </div>

              <div className="bg-gray-950 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-gray-200 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center">
                  <Zap className="w-10 h-10 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-widest mb-2">Kitchen Health</h3>
                  <p className="text-gray-400 text-sm font-medium">All systems operational. Firestore real-time sync is active.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAddingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
          >
            <h2 className="text-2xl font-black text-gray-900 mb-6">Add New Item</h2>
            <form onSubmit={addProduct} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Item Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none"
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Price (₹)</label>
                  <input 
                    required
                    type="number" 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Category</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none"
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  >
                    <option>Breakfast</option>
                    <option>Lunch</option>
                    <option>Snacks</option>
                    <option>Drinks</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Description</label>
                <textarea 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none h-24"
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Image URL</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none"
                  value={newProduct.imageUrl}
                  onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                />
              </div>
              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary-100 hover:bg-primary-700 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  Save Item
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
