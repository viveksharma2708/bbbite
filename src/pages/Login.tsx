import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Lock, UserPlus, ArrowRight, Chrome, ChevronLeft, Utensils } from 'lucide-react';
import { signInWithGoogle, signInWithEmailAndPassword, createUserWithEmailAndPassword, auth } from '../lib/firebase';
import { cn } from '../lib/utils';

export default function Login() {
  const [mode, setMode] = useState<'selection' | 'email-login' | 'email-signup'>('selection');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithGoogle();
      if (!result) {
        // User cancelled, do nothing
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'email-login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(249,115,22,0.05)_0%,rgba(255,255,255,0)_100%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-primary-900/5 p-6 md:p-12 border border-gray-100 relative overflow-hidden"
      >
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-primary-50 rounded-bl-[3rem] md:rounded-bl-[4rem] -z-10 opacity-50" />
        
        <AnimatePresence mode="wait">
          {mode === 'selection' ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="text-center space-y-2 md:space-y-3">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-600 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl shadow-primary-200 glow-primary">
                  <Utensils className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight leading-none">BB Bite</h1>
                <p className="text-slate-500 font-medium px-2 md:px-4 leading-relaxed text-sm md:text-base">Experience premium campus dining delivered fresh to your desk.</p>
              </div>

              <div className="space-y-3">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-4 bg-white border border-slate-200 py-4.5 px-6 rounded-2xl font-bold text-slate-700 hover:border-primary-600 hover:bg-primary-50/30 transition-all group active:scale-[0.98] disabled:opacity-70"
                >
                  <Chrome className="w-6 h-6 text-primary-600 group-hover:scale-110 transition-transform" />
                  {loading ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-slate-300">
                    <span className="bg-white px-4">Signature Email Access</span>
                  </div>
                </div>

                <button
                  onClick={() => setMode('email-login')}
                  className="w-full flex items-center justify-center gap-4 bg-slate-900 py-4.5 px-6 rounded-2xl font-bold text-white shadow-xl shadow-slate-200 hover:bg-primary-600 hover:glow-primary transition-all active:scale-[0.98]"
                >
                  <Mail className="w-5 h-5" />
                  Sign in with Email
                </button>
              </div>

              <p className="text-center text-xs text-slate-400 font-medium tracking-wide">
                New to the platform? <button onClick={() => setMode('email-signup')} className="text-primary-600 font-bold hover:underline underline-offset-4">Create Account</button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="email-auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setMode('selection')}
                className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 font-black text-xs uppercase tracking-widest transition-colors"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back
              </button>

              <div className="space-y-2">
                <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
                   {mode === 'email-login' ? 'Welcome Back' : 'Join BB Bite'}
                </h2>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {mode === 'email-login' ? 'Enter your credentials to continue the journey.' : 'Quickly set up your seat at the table.'}
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-shake">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input 
                      required
                      type="email"
                      placeholder="Email Address"
                      className="w-full bg-gray-50 border-none rounded-2xl py-4.5 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary-600/10 outline-none transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input 
                      required
                      type="password"
                      placeholder="Password"
                      className="w-full bg-gray-50 border-none rounded-2xl py-4.5 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary-600/10 outline-none transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className={cn(
                    "w-full bg-primary-600 text-white py-4.5 px-6 rounded-2xl font-black shadow-xl shadow-primary-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70",
                    loading ? "animate-pulse" : "hover:bg-primary-700"
                  )}
                >
                  {loading ? 'Authenticating...' : mode === 'email-login' ? 'Sign In' : 'Create Account'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>

              <p className="text-center text-xs text-slate-400 font-medium tracking-wide">
                {mode === 'email-login' ? (
                  <>New to BB Bite? <button onClick={() => setMode('email-signup')} className="text-primary-600 font-bold hover:underline underline-offset-4 tracking-normal">Register</button></>
                ) : (
                  <>Already have a seat? <button onClick={() => setMode('email-login')} className="text-primary-600 font-bold hover:underline underline-offset-4 tracking-normal">Log In</button></>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
