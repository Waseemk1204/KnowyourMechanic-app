import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, Wrench, IndianRupee, TrendingUp, Building2,
    LogOut, Loader2, MapPin, Activity, Flag,
    ChevronRight, Star, CheckCircle, Clock, Search
} from 'lucide-react';
import GarageMap from '../../components/GarageMap';
import { useAuth } from '../../contexts/AuthContext';

const getApiUrl = () => (import.meta as any).env?.VITE_API_URL || 'http://localhost:4001/api';
const getToken = async () => {
    const { auth } = await import('../../lib/firebase');
    return auth.currentUser?.getIdToken();
};

interface Stats {
    totalGarages: number;
    totalCustomers: number;
    totalEmployees: number;
    totalServices: number;
    totalRevenue: number;
    totalGMV: number;
    avgServicesPerDay: string;
    referredGarages: number;
    dailyBreakdown: { date: string; count: number; revenue: number }[];
}

interface GarageItem {
    _id: string;
    name: string;
    location: { address: string; coordinates: [number, number] };
    phone: string;
    rating: number;
    totalReviews: number;
    serviceCount: number;
    totalEarnings: number;
    onboardingStatus: string;
    isVerified: boolean;
    assignedEmployeeId?: { name: string; referralCode: string };
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [garages, setGarages] = useState<GarageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statsRes, garagesRes] = await Promise.all([
                fetch(`${getApiUrl()}/admin/stats`, { headers }),
                fetch(`${getApiUrl()}/admin/garages`, { headers }),
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (garagesRes.ok) setGarages(await garagesRes.json());
        } catch (err) {
            console.error('Admin fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const mapGarages = garages.map(g => ({
        id: g._id,
        name: g.name,
        lat: g.location?.coordinates?.[1] || 18.52,
        lng: g.location?.coordinates?.[0] || 73.86,
        rating: g.rating,
        reviews: g.totalReviews,
        address: g.location?.address,
        phone: g.phone,
    }));

    const filteredGarages = garages.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.location?.address?.toLowerCase().includes(search.toLowerCase())
    );

    const maxCount = stats ? Math.max(...stats.dailyBreakdown.map(d => d.count), 1) : 1;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    <p className="text-slate-500 text-sm mt-3">Loading dashboard…</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (val: number) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${val.toFixed(0)}`;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/60">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            KnowyourMechanic
                        </h1>
                        <p className="text-slate-500 text-xs font-medium mt-0.5">Admin Console</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/admin/reports')}
                            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors border border-red-500/20"
                        >
                            <Flag className="w-3.5 h-3.5" />
                            Reports
                        </button>
                        <button
                            onClick={() => navigate('/admin/employees')}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                            <Users className="w-3.5 h-3.5" />
                            Employees
                        </button>
                        <button
                            onClick={async () => { await logout(); navigate('/auth'); }}
                            className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Primary Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        {
                            label: 'Total Garages',
                            value: stats?.totalGarages || 0,
                            icon: Building2,
                            gradient: 'from-violet-600 to-indigo-700',
                            glow: 'shadow-violet-500/20',
                        },
                        {
                            label: 'Services Done',
                            value: stats?.totalServices || 0,
                            icon: Wrench,
                            gradient: 'from-blue-600 to-cyan-600',
                            glow: 'shadow-blue-500/20',
                        },
                        {
                            label: 'Platform Revenue',
                            value: formatCurrency(stats?.totalRevenue || 0),
                            icon: IndianRupee,
                            gradient: 'from-emerald-600 to-teal-600',
                            glow: 'shadow-emerald-500/20',
                        },
                        {
                            label: 'Avg / Day',
                            value: stats?.avgServicesPerDay || '0',
                            icon: TrendingUp,
                            gradient: 'from-amber-500 to-orange-600',
                            glow: 'shadow-amber-500/20',
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`relative bg-gradient-to-br ${stat.gradient} rounded-2xl p-5 shadow-xl ${stat.glow} overflow-hidden`}
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <stat.icon className="w-5 h-5 text-white/50 mb-3" />
                            <p className="text-2xl font-black tracking-tight">{stat.value}</p>
                            <p className="text-white/50 text-xs font-medium mt-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'text-blue-400' },
                        { label: 'Employees', value: stats?.totalEmployees || 0, icon: Users, color: 'text-purple-400' },
                        { label: 'Referred', value: stats?.referredGarages || 0, icon: Star, color: 'text-amber-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/60">
                            <div className="flex items-center gap-2 mb-2">
                                <s.icon className={`w-4 h-4 ${s.color}`} />
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{s.label}</p>
                            </div>
                            <p className="text-2xl font-black">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Map */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-900/80 rounded-2xl border border-slate-800/60 overflow-hidden"
                >
                    <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <h2 className="font-bold text-sm">Garage Network</h2>
                        </div>
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-bold">
                            {garages.length} garages
                        </span>
                    </div>
                    <div className="h-[350px]">
                        {mapGarages.length > 0 && (
                            <GarageMap
                                garages={mapGarages}
                                userLocation={{ lat: 18.5204, lng: 73.8567 }}
                            />
                        )}
                    </div>
                </motion.div>

                {/* Activity Chart */}
                {stats && stats.dailyBreakdown.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-slate-900/80 rounded-2xl border border-slate-800/60 p-5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-400" />
                                <h2 className="font-bold text-sm">Service Activity</h2>
                            </div>
                            <span className="text-xs text-slate-500">Last 30 days</span>
                        </div>
                        <div className="flex items-end gap-[3px] h-28">
                            {stats.dailyBreakdown.map((day) => {
                                const height = Math.max(4, (day.count / maxCount) * 100);
                                return (
                                    <div
                                        key={day.date}
                                        className="flex-1 group relative cursor-pointer"
                                        title={`${day.date}\n${day.count} services\n₹${day.revenue.toFixed(0)} revenue`}
                                    >
                                        <div
                                            className="bg-gradient-to-t from-blue-600/30 to-blue-400/50 hover:from-blue-600/50 hover:to-blue-400/70 rounded-t-sm transition-colors"
                                            style={{ height: `${height}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 mt-2 font-mono">
                            <span>{stats.dailyBreakdown[0]?.date}</span>
                            <span>Today</span>
                        </div>
                    </motion.div>
                )}

                {/* Garage List */}
                <div className="bg-slate-900/80 rounded-2xl border border-slate-800/60">
                    <div className="p-4 border-b border-slate-800/60 flex items-center justify-between gap-4">
                        <h2 className="font-bold text-sm flex-shrink-0">All Garages</h2>
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search garages..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="divide-y divide-slate-800/40">
                        {filteredGarages.map(garage => (
                            <div key={garage._id} className="p-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                                {/* Garage info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-sm truncate">{garage.name}</p>
                                        {/* Status pill */}
                                        {garage.onboardingStatus === 'completed' ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold">
                                                <CheckCircle className="w-3 h-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                                                <Clock className="w-3 h-3" /> {garage.onboardingStatus}
                                            </span>
                                        )}
                                        {/* Referral tag */}
                                        {garage.assignedEmployeeId && (
                                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold font-mono">
                                                {(garage.assignedEmployeeId as any).referralCode}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 truncate">{garage.location?.address || 'No address'}</p>
                                </div>

                                {/* Stats */}
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold">{garage.serviceCount || 0}</p>
                                    <p className="text-[10px] text-slate-500">services</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold">{formatCurrency(garage.totalEarnings || 0)}</p>
                                    <p className="text-[10px] text-slate-500">earned</p>
                                </div>

                                {/* Rating */}
                                {garage.rating > 0 && (
                                    <div className="flex items-center gap-1 text-amber-400 flex-shrink-0">
                                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                                        <span className="text-xs font-bold">{garage.rating.toFixed(1)}</span>
                                    </div>
                                )}

                                <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                            </div>
                        ))}
                        {filteredGarages.length === 0 && (
                            <div className="p-10 text-center">
                                <Building2 className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">
                                    {search ? 'No garages match your search' : 'No garages registered yet'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* GMV Card */}
                {stats && stats.totalGMV > 0 && (
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800/80 rounded-2xl border border-slate-700/40 p-5 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Total GMV (Gross Merchandise Value)</p>
                            <p className="text-3xl font-black mt-1">{formatCurrency(stats.totalGMV)}</p>
                        </div>
                        <IndianRupee className="w-8 h-8 text-slate-700" />
                    </div>
                )}
            </div>
        </div>
    );
}
