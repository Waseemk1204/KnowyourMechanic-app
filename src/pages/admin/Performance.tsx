import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, IndianRupee, Wrench, Loader2, Trophy, ArrowUpRight, CalendarDays } from 'lucide-react';

const getApiUrl = () => (import.meta as any).env?.VITE_API_URL || 'http://localhost:4001/api';
const getToken = async () => {
    const { auth } = await import('../../lib/firebase');
    return auth.currentUser?.getIdToken();
};

interface EmployeePerformance {
    _id: string;
    name: string;
    referralCode: string;
    totalGarages: number;
    totalServices: number;
    totalRevenue: number;
    avgGaragesPerDay: string;
    avgTransactionsPerDay: string;
}

export default function AdminPerformance() {
    const navigate = useNavigate();
    const [performance, setPerformance] = useState<EmployeePerformance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPerformance();
    }, []);

    const fetchPerformance = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/admin/employees/performance/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPerformance(await res.json());
        } catch (err) {
            console.error('Fetch performance error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${val.toFixed(0)}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-light text-white tracking-tight">Performance Tracking</h1>
                <p className="text-zinc-500 text-sm mt-1">Real-time revenue attribution by field employee.</p>
            </div>

            <div className="bg-black border border-zinc-900 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
                    <h2 className="text-sm font-medium text-white">Employee Leaderboard</h2>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        Ranked by Revenue
                    </span>
                </div>

                {performance.length === 0 ? (
                    <div className="px-6 py-16 text-center text-zinc-500 text-sm">
                        No performance data available.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-zinc-950 border-b border-zinc-900 text-[11px] text-zinc-500 uppercase tracking-widest font-mono">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Rank</th>
                                    <th className="px-6 py-3 font-medium">Employee</th>
                                    <th className="px-6 py-3 font-medium text-right">Garages</th>
                                    <th className="px-6 py-3 font-medium text-right">Avg Garages/Day</th>
                                    <th className="px-6 py-3 font-medium text-right">Services</th>
                                    <th className="px-6 py-3 font-medium text-right">Avg Txn/Day</th>
                                    <th className="px-6 py-3 font-medium text-right">Revenue</th>
                                    <th className="px-6 py-3 w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {performance.map((emp, index) => (
                                    <motion.tr
                                        key={emp._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="hover:bg-zinc-900/30 transition-colors group cursor-pointer"
                                        onClick={() => navigate(`/admin/employees/${emp._id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            {index === 0 ? (
                                                <div className="flex items-center gap-2 text-amber-500">
                                                    <Trophy className="w-4 h-4" />
                                                    <span className="font-mono font-bold">#1</span>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-zinc-500">#{index + 1}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-zinc-200">{emp.name}</p>
                                                <p className="text-[10px] font-mono text-zinc-600 mt-0.5 border border-zinc-800 bg-zinc-900 inline-block px-1 rounded">
                                                    {emp.referralCode}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-zinc-300">
                                                <span className="font-mono">{emp.totalGarages}</span>
                                                <Building2 className="w-3.5 h-3.5 text-zinc-600" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-zinc-400">{emp.avgGaragesPerDay}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-zinc-300">
                                                <span className="font-mono">{emp.totalServices}</span>
                                                <Wrench className="w-3.5 h-3.5 text-zinc-600" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-zinc-400">{emp.avgTransactionsPerDay}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-white font-medium">
                                                <span className="font-mono">{formatCurrency(emp.totalRevenue)}</span>
                                                <IndianRupee className="w-3.5 h-3.5 text-emerald-500/50" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ArrowUpRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
