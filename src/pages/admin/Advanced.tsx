import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, Car, Building2, TrendingUp, IndianRupee, Loader2,
    CalendarDays, Banknote, ShieldAlert
} from 'lucide-react';

const getApiUrl = () => (import.meta as any).env?.VITE_API_URL || 'http://localhost:4001/api';
const getToken = async () => {
    const { auth } = await import('../../lib/firebase');
    return auth.currentUser?.getIdToken();
};

interface AdvancedStats {
    totalUsers: number;
    totalVehicles: number;
    totalGarages: number;
    mrr: number;
    arr: number;
    allTimeGMV: number;
}

export default function AdminAdvanced() {
    const [stats, setStats] = useState<AdvancedStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/admin/advanced-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setStats(await res.json());
        } catch (err) {
            console.error('Fetch advanced stats error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number, precise = false) => {
        if (!precise) {
            if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
            if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
            if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        }
        return `₹${val.toLocaleString('en-IN')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-light text-white tracking-tight">Advanced Metrics</h1>
                    <p className="text-zinc-500 text-sm mt-1">Foundational platform and financial statistics.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                    <ShieldAlert className="w-3.5 h-3.5" /> CONFIDENTIAL
                </div>
            </div>

            {/* Core Financials - High Prominence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-black border border-zinc-800 rounded-2xl p-8 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100" />
                    <div className="flex items-start justify-between mb-8 relative z-10">
                        <div>
                            <p className="text-zinc-500 text-xs font-medium tracking-widest uppercase mb-1">Monthly Recurring Revenue</p>
                            <h2 className="text-4xl font-light text-white">{formatCurrency(stats.mrr, true)}</h2>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-emerald-500">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 relative z-10">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                            <CalendarDays className="w-3.5 h-3.5 text-zinc-600" /> Trailing 30 Days API Calculated
                        </div>
                        <p className="text-xs text-zinc-400">Sum of all platform fees collected from completed services.</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-black border border-zinc-800 rounded-2xl p-8 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100" />
                    <div className="flex items-start justify-between mb-8 relative z-10">
                        <div>
                            <p className="text-zinc-500 text-xs font-medium tracking-widest uppercase mb-1">Annual Run Rate (ARR)</p>
                            <h2 className="text-4xl font-light text-white">{formatCurrency(stats.arr, true)}</h2>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-blue-400">
                            <Banknote className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 relative z-10">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                            <Activity className="w-3.5 h-3.5 text-zinc-600" /> Projection Based (MRR x 12)
                        </div>
                        <p className="text-xs text-zinc-400">Forecasted yearly revenue assuming current run rate.</p>
                    </div>
                </motion.div>
            </div>

            {/* Platform Metrics */}
            <h3 className="text-sm font-medium text-white border-b border-zinc-900 pb-2 mt-12 mb-6">Platform Scale Matrix</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: stats.totalUsers, icon: Users, delay: 0.3 },
                    { label: 'Active Vehicles', value: stats.totalVehicles, icon: Car, delay: 0.4 },
                    { label: 'Network Garages', value: stats.totalGarages, icon: Building2, delay: 0.5 },
                    { label: 'Gross Merchandise Value', value: formatCurrency(stats.allTimeGMV), icon: IndianRupee, delay: 0.6 }
                ].map((stat) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stat.delay }}
                        className="bg-black border border-zinc-900 hover:border-zinc-700 transition-colors rounded-xl p-5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-zinc-500 text-[11px] font-medium tracking-widest uppercase">{stat.label}</p>
                            <stat.icon className="w-4 h-4 text-zinc-600" />
                        </div>
                        <p className="text-2xl font-light text-white">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="mt-16 pt-6 border-t border-zinc-900 text-center">
                <p className="text-xs text-zinc-600 font-mono">
                    CONFIDENTIAL INVESTOR DATA. DO NOT DISTRIBUTE.
                </p>
                <p className="text-[10px] text-zinc-700 font-mono mt-1">
                    Generated: {new Date().toISOString()} Server Time
                </p>
            </div>
        </div>
    );
}
