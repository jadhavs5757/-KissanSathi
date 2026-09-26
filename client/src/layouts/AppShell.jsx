import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/LanguageContext';
import LanguageSelector from '../i18n/LanguageSelector';
import { farmService } from '../services/farmService';
import {
  Sprout,
  LayoutDashboard,
  Tractor,
  TrendingUp,
  RotateCw,
  Receipt,
  Landmark,
  Bot,
  History,
  LogOut,
  User,
  PlusCircle,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadFarms() {
      try {
        const farmList = await farmService.getFarms();
        setFarms(farmList);
        if (farmList.length > 0 && !selectedFarmId) {
          // If URL has /farms/:farmId, sync with it
          const match = location.pathname.match(/\/farms\/([0-9a-f-]{36})/i);
          if (match && match[1]) {
            setSelectedFarmId(match[1]);
          } else {
            setSelectedFarmId(farmList[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch farms for selector:', err.message);
      }
    }
    loadFarms();
  }, [location.pathname]);

  const activeFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  const navItems = [
    { name: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.farms'), path: '/farms', icon: Tractor },
    ...(activeFarm
      ? [
          { name: t('nav.cropPlanning'), path: `/farms/${activeFarm.id}/crops`, icon: TrendingUp },
          { name: t('nav.cropLifecycle'), path: `/farms/${activeFarm.id}/crop-cycles`, icon: RotateCw },
          { name: t('nav.expenses'), path: `/farms/${activeFarm.id}/expenses`, icon: Receipt },
          { name: t('nav.schemes'), path: `/farms/${activeFarm.id}/schemes`, icon: Landmark }
        ]
      : []),
    { name: t('nav.aiAssistant'), path: '/ai', icon: Bot },
    { name: t('nav.aiHistory'), path: '/ai/history', icon: History }
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0c130e] text-slate-100">
      {/* Desktop Sidebar — Fixed viewport height so Logout is ALWAYS visible */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-slate-950/95 border-r border-emerald-950/80 p-4 shrink-0 justify-between z-30">
        <div className="space-y-4 overflow-y-auto pr-0.5 flex-1 min-h-0">
          {/* Brand Logo */}
          <Link to="/dashboard" className="block px-1 group">
            <div className="flex items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-slate-900/95 via-emerald-950/30 to-slate-900/90 border border-emerald-500/25 shadow-lg shadow-emerald-950/50 group-hover:border-emerald-500/40 transition-all">
              <img
                src="/assets/logo.png"
                alt="KisanSaarthi AI - Your Farming Partner"
                className="w-full h-auto max-h-16 object-contain drop-shadow-md select-none"
              />
            </div>
          </Link>

          {/* Language Selector in Sidebar */}
          <div className="px-1">
            <LanguageSelector className="w-full" />
          </div>

          {/* Farm Switcher Dropdown */}
          <div className="pt-0.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
              {t('nav.activeFarm')}
            </label>
            {farms.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedFarmId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedFarmId(newId);
                    // If currently on a farm-scoped page, navigate to that page for the new farm
                    if (location.pathname.includes('/crops')) navigate(`/farms/${newId}/crops`);
                    else if (location.pathname.includes('/crop-cycles')) navigate(`/farms/${newId}/crop-cycles`);
                    else if (location.pathname.includes('/expenses')) navigate(`/farms/${newId}/expenses`);
                    else if (location.pathname.includes('/schemes')) navigate(`/farms/${newId}/schemes`);
                    else navigate(`/farms/${newId}`);
                  }}
                  className="w-full bg-slate-900/90 border border-emerald-900/60 rounded-xl px-3 py-2 text-xs font-medium text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none pr-8 cursor-pointer hover:border-emerald-700"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id} className="bg-slate-900 text-slate-100">
                      🌾 {f.name} ({f.land_area_acres} {t('common.acres')})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            ) : (
              <Link
                to="/farms/new"
                className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 rounded-xl hover:bg-emerald-900/40 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t('nav.createFirstFarm')}</span>
              </Link>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-forest-600/25 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Profile & Sticky Visible Logout Footer */}
        <div className="pt-3 border-t border-slate-800/80 mt-auto shrink-0 space-y-2">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'F'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-300">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.location || user?.email}</p>
            </div>
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 hover:border-rose-700/70 transition-all shadow-sm group cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            <span>{t('nav.logout') || t('logout') || 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-3 bg-slate-950/90 border-b border-emerald-950 sticky top-0 z-40 backdrop-blur-md">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src="/assets/logo.png"
            alt="KisanSaarthi AI"
            className="h-9 w-auto max-w-[155px] object-contain select-none"
          />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector variant="compact" />
          <Link to="/ai" className="p-2 text-emerald-400 hover:bg-slate-900 rounded-lg">
            <Bot className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[61px] z-50 bg-slate-950/95 p-4 flex flex-col justify-between">
          <nav className="space-y-1.5">
            <div className="pb-3 border-b border-slate-900 mb-2">
              <LanguageSelector className="w-full" />
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-forest-600/30 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
          <div className="pt-4 border-t border-slate-900 space-y-2">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-xl"
            >
              <User className="w-4 h-4" />
              <span>{t('nav.profile')} ({user?.name})</span>
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-slate-300 bg-slate-900 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-800 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>{t('nav.logout') || t('logout') || 'Logout'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden sticky bottom-0 z-30 bg-slate-950/95 border-t border-slate-900 py-2 px-3 flex items-center justify-around backdrop-blur-lg">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{t('nav.dashboard')}</span>
        </NavLink>
        <NavLink
          to="/farms"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`
          }
        >
          <Tractor className="w-4 h-4" />
          <span>{t('nav.farms')}</span>
        </NavLink>
        <NavLink
          to="/ai"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] -mt-3`
          }
        >
          <div className="w-10 h-10 rounded-full bg-forest-600 flex items-center justify-center text-white shadow-lg shadow-forest-900/50 border border-forest-400/40">
            <Bot className="w-5 h-5" />
          </div>
          <span className="text-emerald-300 font-semibold">{t('nav.aiAssistant')}</span>
        </NavLink>
        {activeFarm && (
          <NavLink
            to={`/farms/${activeFarm.id}/crop-cycles`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`
            }
          >
            <RotateCw className="w-4 h-4" />
            <span>{t('nav.cropLifecycle')}</span>
          </NavLink>
        )}
        {activeFarm && (
          <NavLink
            to={`/farms/${activeFarm.id}/expenses`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`
            }
          >
            <Receipt className="w-4 h-4" />
            <span>{t('nav.expenses')}</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}
