import { Link, useLocation } from 'react-router-dom';
import { Home, History, LayoutDashboard, LogOut, User, X, ChevronRight, Utensils, Settings } from 'lucide-react';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  userProfile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ userProfile, isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Kitchen', path: '/', show: true },
    { icon: History, label: 'Order History', path: '/orders', show: !!userProfile },
    { icon: LayoutDashboard, label: 'Control Center', path: '/admin', show: userProfile?.role === 'admin' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-white z-[101] shadow-2xl flex flex-col transition-all",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Section */}
        <div className="p-8 border-b border-slate-50 flex items-center justify-between glass sticky top-0 z-10">
          <Link to="/" className="flex items-center gap-3.5 group" onClick={onClose}>
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center glow-primary group-hover:scale-110 transition-all duration-500">
              <Utensils className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-display font-bold text-slate-900 block leading-none tracking-tight">BB Bite</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1.5 block">Premium Dining</span>
            </div>
          </Link>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-xl lg:hidden transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-8">
          {userProfile ? (
            <div className="bg-slate-50 rounded-[2rem] p-6 flex flex-col gap-4 border border-slate-100/50 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 overflow-hidden shrink-0">
                  <User className="w-7 h-7 text-primary-600" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 truncate tracking-tight mb-1">{userProfile.displayName || 'Campus User'}</p>
                  <p className="text-[10px] font-medium text-slate-400 truncate tracking-wide">{userProfile.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <span className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-widest",
                  userProfile.role === 'admin' ? "bg-slate-900 text-white" : "bg-primary-100 text-primary-700"
                )}>
                  {userProfile.role}
                </span>
                <button 
                  onClick={() => auth.signOut()}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest group-hover:block hidden">Exit</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <Link 
              to="/login"
              onClick={onClose}
              className="w-full h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-primary-600 hover:shadow-primary-200 transition-all active:scale-95"
            >
              Start Experience <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-4">Navigations</p>
          {menuItems.map((item) => item.show && (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-4 rounded-2xl font-semibold transition-all text-sm group",
                location.pathname === item.path
                  ? "bg-primary-600 text-white glow-primary"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                location.pathname === item.path ? "text-white" : "text-slate-400 group-hover:text-primary-600"
              )} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer/Contact */}
        <div className="p-8 text-center bg-slate-50/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2026 BB Bite App</p>
        </div>
      </motion.aside>
    </>
  );
}
