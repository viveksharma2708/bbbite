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
    <nav className="glass sticky top-0 z-[100] border-b border-primary-100/50 px-3 md:px-8">
      <div className="container mx-auto h-16 md:h-24 flex items-center gap-1.5 md:gap-8">
        {/* Mobile Menu */}
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
        >
          <Menu className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        <Link to="/" className="flex items-center gap-1.5 md:gap-4 shrink-0 group">
          <div className="w-9 h-9 md:w-14 md:h-14 bg-primary-600 rounded-lg md:rounded-2xl flex items-center justify-center glow-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl shadow-primary-500/20">
            <Utensils className="w-4 h-4 md:w-7 md:h-7 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-900 font-display font-black text-lg md:text-3xl tracking-tighter leading-none group-hover:text-primary-600 transition-colors">
              BB<span className="text-primary-600"> Bite</span>
            </span>
            <span className="hidden sm:block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1">Campus Dining</span>
          </div>
        </Link>

        {/* Location Selector (Desktop Only) */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shrink-0">
          <MapPin className="w-4 h-4 text-primary-600" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest leading-none">Deliver to</p>
            <p className="text-sm font-semibold text-slate-700 max-w-[120px] truncate">Campus Main Hall</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 relative group md:max-w-xl min-w-[40px] md:min-w-[200px]">
          <div className="absolute left-2.5 md:left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
            <Search className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </div>
          <input 
            type="text" 
            placeholder='Search...'
            className="w-full h-9 md:h-14 bg-slate-50 border border-slate-100 rounded-lg md:rounded-2xl pl-8 md:pl-14 pr-2 md:pr-6 text-[10px] md:text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-100 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 md:gap-4 shrink-0">
          {userProfile ? (
            <Link to={userProfile.role === 'admin' ? '/admin' : '/orders'} className="flex flex-col items-center justify-center w-10 h-10 md:w-14 md:h-14 rounded-xl text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-all group relative">
              <User className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
              {userProfile.role === 'admin' && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full" />
              )}
            </Link>
          ) : (
            <Link to="/login" className="flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-3 bg-slate-900 text-white rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest hover:bg-primary-600 shadow-xl shadow-slate-200 transition-all active:scale-95">
              Login
            </Link>
          )}
          
          <button 
            onClick={onOpenCart}
            className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-xl text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-all group"
          >
            <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 md:w-6 md:h-6 bg-primary-600 text-white text-[8px] md:text-[10px] font-black rounded flex items-center justify-center border-2 md:border-4 border-white shadow-lg">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
