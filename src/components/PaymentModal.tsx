import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, QrCode, ShieldCheck, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
}

export default function PaymentModal({ isOpen, onClose, onSuccess, amount }: PaymentModalProps) {
  const [step, setStep] = useState<'qr' | 'processing' | 'success' | 'failed'>('qr');

  useEffect(() => {
    if (!isOpen) {
      setStep('qr');
    }
  }, [isOpen]);

  const handleSimulatePayment = (willSucceed: boolean = true) => {
    setStep('processing');
    setTimeout(() => {
      if (willSucceed) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setStep('failed');
      }
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 pb-0 flex justify-end">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-8 pb-10 text-center">
              {step === 'qr' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Scan & Pay</h3>
                    <p className="text-gray-500 text-sm font-medium">Use any UPI app (GPay, PhonePe, Paytm)</p>
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-4 bg-primary-100/50 rounded-3xl blur-xl group-hover:bg-primary-200/50 transition-all duration-500" />
                    <div className="relative bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xl inline-block">
                      {/* Replace src below with your actual QR code URL */}
                      <div className="w-48 h-48 bg-white rounded-xl flex flex-col items-center justify-center overflow-hidden border border-slate-50">
                        <img 
                          src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=bb-bite@upi&pn=BBBite&am=0&cu=INR" 
                          alt="Payment QR" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary-50 rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-primary-900/60 font-bold text-sm">Amount to Pay</span>
                    <span className="text-xl font-black text-primary-600">₹{amount}</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleSimulatePayment(true)}
                      className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Paid via Phone
                    </button>
                    {/* Simulation: Failed Payment (Remove in production) */}
                    <button
                      onClick={() => handleSimulatePayment(false)}
                      className="w-full bg-gray-50 text-gray-400 py-3 rounded-xl font-bold text-xs hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      Simulate Payment Failure
                    </button>
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Secure AES Encryption</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'processing' && (
                <div className="py-12 space-y-8 flex flex-col items-center">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-gray-100 rounded-full" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 w-20 h-20 border-4 border-primary-600 border-t-transparent rounded-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Verifying Payment</h3>
                    <p className="text-gray-400 text-sm font-medium animate-pulse">Waiting for gateway response...</p>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-12 space-y-6 flex flex-col items-center"
                >
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Payment Success!</h3>
                    <p className="text-gray-500 text-sm font-medium italic">Confirmed at {new Date().toLocaleTimeString()}</p>
                  </div>
                </motion.div>
              )}

              {step === 'failed' && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-12 space-y-6 flex flex-col items-center"
                >
                  <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-16 h-16 text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Payment Failed</h3>
                    <p className="text-gray-500 text-sm font-medium">Something went wrong with the transaction.</p>
                  </div>
                  <button
                    onClick={() => setStep('qr')}
                    className="flex items-center gap-2 text-primary-600 font-black text-sm uppercase tracking-widest mt-4 hover:underline"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
