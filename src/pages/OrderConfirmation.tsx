import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  ShoppingBag, 
  MapPin, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  Truck,
  CreditCard
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { cn } from '../lib/utils';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      try {
        const docSnap = await getDoc(doc(db, 'orders', orderId));
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-black text-slate-900">Order Not Found</h2>
          <p className="text-slate-500 max-w-xs mx-auto">We couldn't retrieve the details for this order.</p>
        </div>
        <Link to="/" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {/* Header Container */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Order Status</span>
            <span className="text-sm font-black text-slate-900 mt-1">Confirmed</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-12 space-y-8">
        {/* Success Animation Area */}
        <div className="text-center space-y-6">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tighter">Order Confirmed!</h1>
            <p className="text-slate-500 font-medium">Your culinary journey has officially begun.</p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Order ID:</span>
            <span className="text-[10px] font-black text-slate-900 uppercase">#{order.id?.slice(-8).toUpperCase()}</span>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
             <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary-600" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Arrival</p>
                <p className="text-lg font-black text-slate-900 mt-1">
                   {order.estimatedDeliveryTime ? 
                     (order.estimatedDeliveryTime as any).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                     : 'Preparing...'}
                </p>
             </div>
          </div>
          <div className="p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
             <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-emerald-600" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Location</p>
                <p className="text-lg font-black text-slate-900 mt-1 truncate">{order.deliveryAddress}</p>
             </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Order Summary</h3>
          <div className="space-y-6">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Quantity: {item.quantity}</p>
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 font-display">₹{item.price * item.quantity}</p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-3">
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium tracking-tight">Payment Status</span>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                  order.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                )}>
                  {order.paymentStatus === 'paid' ? 'Completed' : 'Pay on Delivery'}
                </span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium tracking-tight">Total Payment</span>
                <span className="text-2xl font-black text-primary-600 font-display">₹{order.totalAmount}</span>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-4">
          <Link 
            to="/orders"
            className="w-full bg-slate-950 text-white h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 group"
          >
            <Truck className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Track Live Progress
          </Link>
          <Link 
            to="/"
            className="w-full bg-white text-slate-900 h-16 rounded-[1.5rem] border border-slate-100 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3"
          >
            <ShoppingBag className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>

        <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest max-w-xs mx-auto">
          Need help? Contact our support line at bbbite@gmail.com
        </p>
      </div>
    </div>
  );
}
