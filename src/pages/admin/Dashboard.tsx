import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3, Users, Wrench, IndianRupee, TrendingUp, Building2,
    LogOut, Loader2, UserPlus, MapPin, ChevronRight, Activity
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
    assignedEmployeeId?: { name: string; referralCode: string };
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [garages, setGarages] = useState<GarageItem[]>([]);
    const [loading, setLoading] = useState(true);

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

    // Simple sparkline using CSS
    const maxCount = stats ? Math.max(...stats.dailyBreakdown.map(d => d.count), 1) : 1;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">KnowyourMechanic</h1>
                    <p className="text-slate-400 text-sm">Admin Dashboard</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin/reports')}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <BarChart3 className="w-4 h-4" />
                        Reports
                    </button>
                    <button
                        onClick={() => navigate('/admin/employees')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <Users className="w-4 h-4" />
                        Employees
                    </button>
                    <button
                        onClick={async () => { await logout(); navigate('/auth'); }}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Garages', value: stats?.totalGarages || 0, icon: Building2, color: 'from-violet-600 to-purple-700' },
                        { label: 'Total Services', value: stats?.totalServices || 0, icon: Wrench, color: 'from-blue-600 to-cyan-700' },
                        { label: 'Platform Revenue', value: `₹${stats?.totalRevenue?.toFixed(0) || 0}`, icon: IndianRupee, color: 'from-emerald-600 to-green-700' },
                        { label: 'Avg Services/Day', value: stats?.avgServicesPerDay || '0', icon: TrendingUp, color: 'from-amber-600 to-orange-700' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 shadow-lg`}
                        >
                            <stat.icon className="w-6 h-6 text-white/60 mb-3" />
                            <p className="text-2xl font-black">{stat.value}</p>
                            <p className="text-white/60 text-sm mt-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Secondary Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                        <p className="text-slate-400 text-xs uppercase tracking-wide">Customers</p>
                        <p className="text-2xl font-black mt-1">{stats?.totalCustomers || 0}</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                        <p className="text-slate-400 text-xs uppercase tracking-wide">Field Employees</p>
                        <p className="text-2xl font-black mt-1">{stats?.totalEmployees || 0}</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                        <p className="text-slate-400 text-xs uppercase tracking-wide">Referred Garages</p>
                        <p className="text-2xl font-black mt-1">{stats?.referredGarages || 0}</p>
                    </div>
                </div>

                {/* Map */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden"
                >
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-500" />
                            <h2 className="font-bold text-lg">Garage Network</h2>
                        </div>
                        <span className="text-slate-400 text-sm">{garages.length} garages</span>
                    </div>
                    <div className="h-[400px]">
                        {mapGarages.length > 0 && (
                            <GarageMap
                                garages={mapGarages}
                                userLocation={{ lat: 18.5204, lng: 73.8567 }}
                            />
                        )}
                    </div>
                </motion.div>

                {/* Activity Chart (last 30 days) */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-slate-900 rounded-2xl border border-slate-800 p-5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-green-500" />
                            <h2 className="font-bold text-lg">Services — Last 30 Days</h2>
                        </div>
                        <div className="flex items-end gap-1 h-32">
                            {stats.dailyBreakdown.map((day, i) => (
                                <div
                                    key={day.date}
                                    className="flex-1 group relative"
                                    title={`${day.date}: ${day.count} services, ₹${day.revenue.toFixed(2)} revenue`}
                                >
                                    <div
                                        className="bg-blue-500/20 hover:bg-blue-500/40 rounded-t transition-colors"
                                        style={{ height: `${Math.max(2, (day.count / maxCount) * 100)}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>{stats.dailyBreakdown[0]?.date}</span>
                            <span>Today</span>
                        </div>
                    </motion.div>
                )}

                {/* Garage List */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="p-4 border-b border-slate-800">
                        <h2 className="font-bold text-lg">All Garages</h2>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {garages.map(garage => (
                            <div key={garage._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold">{garage.name}</p>
                                        {garage.assignedEmployeeId && (
                                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                                                {(garage.assignedEmployeeId as any).referralCode}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-400 mt-0.5">{garage.location?.address || 'No address'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">{garage.serviceCount} services</p>
                                    <p className="text-xs text-slate-400">₹{garage.totalEarnings.toFixed(0)} earned</p>
                                </div>
                            </div>
                        ))}
                        {garages.length === 0 && (
                            <div className="p-8 text-center text-slate-500">No garages yet</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
