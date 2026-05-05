import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, UserProfile, OrderStatus } from '../types';
import { Clock, Package, Truck, CheckCircle2, ChevronRight, ShoppingBag, MapPin, XCircle, AlertCircle, Timer, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { toast } from 'sonner';

interface OrderHistoryProps {
  userProfile: UserProfile;
}

export default function OrderHistory({ userProfile }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userProfile.uid)
    );

    let previousOrders: Record<string, OrderStatus> = {};
    let firstLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort in-memory to avoid mandatory composite index setup while project matches user/createdAt
      const newOrders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });
      
      if (!firstLoad) {
        newOrders.forEach(order => {
          if (previousOrders[order.id!] && previousOrders[order.id!] !== order.status) {
            const statusLabel = order.status.replace('_', ' ');
            toast.success(`Order #${order.id?.slice(-6).toUpperCase()}`, {
              description: `Status updated to: ${statusLabel}`,
              duration: 5000,
            });
            
            // Standard browser notification as well
            if (Notification.permission === "granted") {
              new Notification(`Order Update: ${statusLabel}`, {
                body: `Order #${order.id?.slice(-6).toUpperCase()} is now ${statusLabel}.`,
                icon: '/favicon.ico'
              });
            }
          }
          previousOrders[order.id!] = order.status;
        });
      } else {
        newOrders.forEach(order => {
          previousOrders[order.id!] = order.status;
        });
        firstLoad = false;
      }

      setOrders(newOrders);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrder || !cancelReason) return;
    
    try {
      const orderRef = doc(db, 'orders', cancellingOrder);
      await updateDoc(orderRef, {
        status: 'cancelled',
        cancellationReason: cancelReason,
        updatedAt: serverTimestamp()
      });
      setCancellingOrder(null);
      setCancelReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${cancellingOrder}`);
    }
  };

  const getStatusStep = (status: OrderStatus) => {
    switch (status) {
      case 'cancelled': return -1;
      case 'placed': return 0;
      case 'preparing': return 1;
      case 'out_for_delivery': return 2;
      case 'delivered': return 3;
    }
  };

  const steps = [
    { status: 'placed', label: 'Order Placed', icon: Clock, description: 'We have received your order' },
    { status: 'preparing', label: 'Kitchen Prep', icon: Package, description: 'Chef is preparing your meal' },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, description: 'Your food is on the way' },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Enjoy your meal!' }
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Your <span className="text-primary-600">Journeys</span></h1>
          <p className="text-sm font-medium text-slate-400">Track and relive your culinary experiences</p>
        </div>
        <div className="px-4 py-2 bg-white border border-slate-100 shadow-sm rounded-2xl text-[10px] font-bold uppercase tracking-widest text-primary-600">
          {orders.length} Deliveries
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-6">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
             <ShoppingBag className="w-12 h-12 text-gray-200" />
           </div>
           <div className="space-y-1">
             <h2 className="text-2xl font-black text-gray-900 tracking-tight">No hunger history yet</h2>
             <p className="text-gray-400 font-medium max-w-xs mx-auto">Your delicious journeys will appear here for you to track and relive.</p>
           </div>
           <Link to="/" className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-primary-200 hover:scale-105 active:scale-100 transition-all">
             Start Ordering
           </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {orders.map(order => {
              const currentStep = getStatusStep(order.status);
              const isCancelled = order.status === 'cancelled';
              
              return (
                <motion.div 
                  layout
                  key={order.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden",
                    isCancelled && "opacity-60 grayscale shadow-none"
                  )}
                >
                  {/* Order Header */}
                  <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 bg-gray-50 rounded-[1.25rem] flex items-center justify-center",
                        isCancelled && "bg-red-50"
                      )}>
                        {isCancelled ? <XCircle className="w-7 h-7 text-red-500" /> : <Package className="w-7 h-7 text-gray-300" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900 tracking-tight text-lg">Order #{order.id?.slice(-6).toUpperCase()}</h3>
                          {order.status === 'placed' && (
                             <button
                              onClick={() => setCancellingOrder(order.id!)}
                              className="px-3 py-1 bg-red-50 text-red-500 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                             >
                               Cancel Order
                             </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs font-bold text-gray-400">Placed on {order.createdAt?.toDate().toLocaleString()}</p>
                          {!isCancelled && order.estimatedDeliveryTime && order.status !== 'delivered' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 rounded-lg border border-primary-100">
                              <Timer className="w-3.5 h-3.5 text-primary-600" />
                              <span className="text-[10px] font-black text-primary-700 uppercase tracking-tight">Est. {order.estimatedDeliveryTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center md:flex-col md:items-end gap-4 md:gap-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Payable</p>
                      <h3 className={cn(
                        "font-black text-2xl tracking-tighter",
                        isCancelled ? "text-gray-400 line-through" : "text-primary-600"
                      )}>₹{order.totalAmount}</h3>
                    </div>
                  </div>

                  {/* Tracking Stepper */}
                  {!isCancelled && (
                    <div className="px-8 pb-12 bg-white">
                      <div className="relative pt-12 pb-4">
                        {/* Track Line Background */}
                        <div className="absolute top-[3.25rem] left-0 right-0 h-1 bg-slate-100 rounded-full" />
                        
                        {/* Progress Line */}
                        <motion.div 
                          className="absolute top-[3.25rem] left-0 h-1 bg-primary-600 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                          initial={{ width: '0%' }}
                          animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                          transition={{ duration: 1, ease: "circOut" }}
                        />

                        <div className="relative flex justify-between">
                          {steps.map((step, idx) => {
                            const Icon = step.icon;
                            const isCompleted = currentStep > idx;
                            const isActive = currentStep === idx;
                            
                            return (
                              <div key={idx} className="flex flex-col items-center gap-3 relative z-10 w-24">
                                <motion.div 
                                  initial={false}
                                  animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                                  className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                    isCompleted ? "bg-primary-600 text-white shadow-lg shadow-primary-200" :
                                    isActive ? "bg-white border-2 border-primary-600 text-primary-600 shadow-2xl ring-8 ring-primary-50" :
                                    "bg-white border border-slate-200 text-slate-300"
                                  )}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-6 h-6" />
                                  ) : (
                                    <Icon className={cn("w-6 h-6", isActive && "animate-pulse")} />
                                  )}
                                </motion.div>
                                <div className="text-center">
                                  <p className={cn(
                                    "text-[10px] font-black uppercase tracking-widest transition-colors mb-0.5",
                                    isActive || isCompleted ? "text-slate-900" : "text-slate-300"
                                  )}>
                                    {step.label}
                                  </p>
                                  {isActive && (
                                    <motion.p 
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="text-[9px] font-bold text-primary-500 uppercase tracking-tight whitespace-nowrap"
                                    >
                                      {step.description}
                                    </motion.p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="p-8 space-y-4 bg-red-50/50">
                      <div className="flex items-center justify-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-black text-red-600 uppercase tracking-widest">Order Cancelled</span>
                      </div>
                      {order.cancellationReason && (
                        <div className="flex items-start gap-3 bg-white/50 p-4 rounded-2xl border border-red-100">
                          <MessageSquare className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Reason for Cancellation</p>
                            <p className="text-sm font-medium text-gray-600 italic">"{order.cancellationReason}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items Summary */}
                  <div className="px-8 pb-8 space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Items</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                          <div className="w-10 h-10 bg-white rounded-xl overflow-hidden shrink-0 border border-gray-100">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                            <p className="text-[10px] font-black text-primary-600">₹{item.price} × {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="px-8 py-5 bg-gray-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-white/60">
                       <MapPin className="w-4 h-4 text-primary-500" />
                       <span className="text-xs font-bold truncate max-w-[200px]">{order.deliveryAddress}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</span>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          order.paymentStatus === 'paid' ? "text-emerald-400" : "text-amber-400"
                        )}>
                          {order.paymentMethod.toUpperCase()} • {order.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {/* Cancellation Modal */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setCancellingOrder(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-2">Cancel Order?</h2>
              <p className="text-gray-500 text-sm font-medium mb-6">Please let us know why you're cancelling so we can improve our service.</p>
              
              <form onSubmit={handleCancelOrder} className="space-y-6">
                <div>
                  <textarea 
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none transition-all h-32 resize-none"
                    placeholder="E.g., Ordered by mistake, wrong address, decided to eat elsewhere..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setCancellingOrder(null)}
                    className="flex-1 py-4 font-black text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Go Back
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-red-200 hover:bg-red-700 transition-all"
                  >
                    Confirm Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
