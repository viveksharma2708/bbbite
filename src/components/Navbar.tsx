import { Search, MapPin, User, ShoppingBag, Menu, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserProfile } from '../types';

interface NavbarProps {
  onOpenSidebar: () => void;
  userProfile: UserProfile | null;
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Navbar({ 
  onOpenSidebar, 
  userProfile, 
  cartCount, 
  onOpenCart,
  searchQuery,
  setSearchQuery 
}: NavbarProps) {
  return (
    <nav className="bg-white sticky top-0 z-[100] border-b border-slate-100 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center gap-4 md:gap-8">
        {/* Mobile Menu */}
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-primary-600 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center glow-primary">
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block text-primary-600 font-display font-black text-2xl md:text-3xl tracking-tighter">
            BB<span className="text-slate-900"> Bite</span>
          </div>
        </Link>

        {/* Location Selector (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shrink-0">
          <MapPin className="w-4 h-4 text-primary-600" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest leading-none">Deliver to</p>
            <p className="text-sm font-semibold text-slate-700 max-w-[120px] truncate">Campus Main Hall</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 relative group max-w-2xl">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder='Search for "burger" or "cold coffee"'
            className="w-full h-12 bg-slate-100 border-none rounded-xl pl-12 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 ring-primary-600/20 focus:ring-4 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-4 shrink-0">
          {userProfile ? (
            <Link to={userProfile.role === 'admin' ? '/admin' : '/orders'} className="flex flex-col items-center p-2 text-slate-600 hover:text-primary-600 transition-colors group">
              <User className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold hidden md:block">Account</span>
            </Link>
          ) : (
            <Link to="/login" className="flex flex-col items-center p-2 text-slate-600 hover:text-primary-600 transition-colors group">
              <User className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold hidden md:block">Login</span>
            </Link>
          )}
          
          <button 
            onClick={onOpenCart}
            className="relative p-2 text-slate-600 hover:text-primary-600 transition-colors group"
          >
            <ShoppingBag className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold hidden md:block">Cart</span>
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
