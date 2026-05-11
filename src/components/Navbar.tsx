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
    <nav className="glass sticky top-0 z-[100] border-b border-primary-100/50 px-4 md:px-8">
      <div className="container mx-auto h-20 md:h-24 flex items-center gap-4 md:gap-8">
        {/* Mobile Menu */}
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-3 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-2xl transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-12 h-12 bg-primary-600 rounded-[1.25rem] flex items-center justify-center glow-primary group-hover:scale-110 transition-all duration-500">
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block text-slate-900 font-display font-black text-2xl md:text-3xl tracking-tighter leading-none">
            BB<span className="text-primary-600"> Bite</span>
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
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder='Search delicacies...'
            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-100 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {userProfile ? (
            <Link to={userProfile.role === 'admin' ? '/admin' : '/orders'} className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-all group relative">
              <User className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {userProfile.role === 'admin' && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary-600 rounded-full" />
              )}
            </Link>
          ) : (
            <Link to="/login" className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 shadow-xl shadow-slate-200 transition-all active:scale-95">
              Login
            </Link>
          )}
          
          <button 
            onClick={onOpenCart}
            className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-all group"
          >
            <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition-transform" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-primary-600 text-white text-[10px] font-black rounded-lg flex items-center justify-center border-4 border-white shadow-lg">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
