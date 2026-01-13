import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, Star, Users, TrendingUp, LogOut, Wrench, ArrowRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../../components/BottomNav';

type View = 'stats' | 'add_service' | 'edit_profile';

export default function GarageDashboard() {
    const [view, setView] = useState<View>('stats');
    const [stats] = useState({ services: 48, rating: 4.8, earnings: '₹12,450' });

    const navigate = useNavigate();
    const { userData, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-safe pb-28 px-6 text-slate-900">
            {/* Header */}
            <header className="flex items-center justify-between py-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 shadow-xl shadow-blue-500/20 flex items-center justify-center text-white">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">
                            {(userData as any)?.name || 'My Garage'}
                        </h1>
                        <p className="text-blue-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Premium Partner
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-slate-100 text-slate-400 active:bg-slate-50"
                >
                    <LogOut className="w-5.5 h-5.5" />
                </button>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="premium-card p-6 bg-white flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                        <Users className="w-6 h-6" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Customers</p>
                    <p className="text-2xl font-black text-slate-900">{stats.services}</p>
                </div>
                <div className="premium-card p-6 bg-white flex flex-col items-center">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
                        <Star className="w-6 h-6 fill-amber-500" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Rating</p>
                    <p className="text-2xl font-black text-slate-900">{stats.rating}</p>
                </div>
            </div>

            {/* Main Action Card */}
            <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-900/10 mb-10 relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-2 leading-tight">Weekly Earnings</h3>
                    <p className="text-blue-100 text-lg opacity-80 mb-6 font-medium">Performance summary</p>
                    <div className="flex items-center justify-between">
                        <span className="text-4xl font-black">{stats.earnings}</span>
                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold">
                            <TrendingUp className="w-4 h-4" />
                            +12%
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Management</h4>

                <button
                    onClick={() => setView('edit_profile')}
                    className="w-full premium-card p-6 flex items-center gap-6 group hover:border-blue-300"
                >
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                        <Settings className="w-7 h-7" />
                    </div>
                    <div className="flex-1 text-left">
                        <h5 className="font-black text-slate-900">Garage Profile</h5>
                        <p className="text-slate-400 text-xs font-bold">Manage services & details</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-blue-600" />
                </button>

                <button
                    onClick={() => setView('add_service')}
                    className="w-full premium-card p-6 flex items-center gap-6 group hover:border-blue-300"
                >
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                        <Plus className="w-7 h-7" />
                    </div>
                    <div className="flex-1 text-left">
                        <h5 className="font-black text-slate-900">Add Service</h5>
                        <p className="text-slate-400 text-xs font-bold">Offer new repair options</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-blue-600" />
                </button>
            </div>

            <BottomNav role="garage" />

            {/* Simple View Overlays */}
            <AnimatePresence>
                {view !== 'stats' && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="fixed inset-0 bg-white z-[70] pt-safe flex flex-col px-6"
                    >
                        <header className="flex items-center gap-6 py-8">
                            <button
                                onClick={() => setView('stats')}
                                className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-400"
                            >
                                <ArrowRight className="w-5 h-5 rotate-180" />
                            </button>
                            <h2 className="text-2xl font-black text-slate-900">
                                {view === 'add_service' ? 'New Service' : 'Edit Profile'}
                            </h2>
                        </header>

                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8">
                                <Wrench className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400 mb-2">Section Coming Soon</h3>
                            <p className="text-slate-300 font-medium">We are polishing this feature</p>
                            <button
                                onClick={() => setView('stats')}
                                className="mt-12 h-14 px-8 btn-premium rounded-2xl font-black"
                            >
                                Take me back
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
