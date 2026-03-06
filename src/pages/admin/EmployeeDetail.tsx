import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, Building2, Wrench, IndianRupee, TrendingUp,
    Copy, Check, MapPin, Star
} from 'lucide-react';

const getApiUrl = () => (import.meta as any).env?.VITE_API_URL || 'http://localhost:4001/api';
const getToken = async () => {
    const { auth } = await import('../../lib/firebase');
    return auth.currentUser?.getIdToken();
};

interface GaragePerf {
    _id: string;
    name: string;
    location: { address: string };
    rating: number;
    totalReviews: number;
    totalServices: number;
    totalEarnings: number;
    avgServicesPerDay: string;
}

export default function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/admin/employees/${id}/performance`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) setData(await res.json());
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(data.employee.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 text-sm">
                Employee not found
            </div>
        );
    }

    const { employee, garages, aggregates } = data;

    const formatCurrency = (val: number) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${val.toFixed(0)}`;
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800">
            <main className="max-w-5xl mx-auto p-6 space-y-6 pt-10">
                {/* Aggregate Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Garages', value: aggregates.totalGarages, icon: Building2 },
                        { label: 'Total Services', value: aggregates.totalServices, icon: Wrench },
                        { label: 'Total Earnings', value: formatCurrency(aggregates.totalEarnings), icon: IndianRupee },
                        { label: 'Avg/Garage', value: `${aggregates.avgServicesPerGarage}`, icon: TrendingUp },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-black border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-zinc-500 text-xs">{stat.label}</p>
                                <stat.icon className="w-3.5 h-3.5 text-zinc-600" />
                            </div>
                            <p className="text-2xl font-light text-white">{stat.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Garage Portfolio Table */}
                <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden mt-8">
                    <div className="px-5 py-4 border-b border-zinc-900">
                        <h2 className="text-sm font-medium text-white">Garage Portfolio</h2>
                        <p className="text-xs text-zinc-500 mt-1">Garages onboarded by this employee</p>
                    </div>

                    {garages.length === 0 ? (
                        <div className="px-5 py-16 text-center text-zinc-600 text-sm">
                            <p>No garages assigned yet</p>
                            <p className="mt-1 text-xs">Share referral code <span className="font-mono text-zinc-400 border border-zinc-800 bg-zinc-900 px-1 rounded">{employee.referralCode}</span></p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-zinc-950 border-b border-zinc-900 text-xs text-zinc-500">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">Garage</th>
                                        <th className="px-5 py-3 font-medium">Location</th>
                                        <th className="px-5 py-3 font-medium text-right">Services</th>
                                        <th className="px-5 py-3 font-medium text-right">Avg/Day</th>
                                        <th className="px-5 py-3 font-medium text-right">Earnings</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900/50">
                                    {(garages as GaragePerf[]).map((garage, i) => (
                                        <motion.tr
                                            key={garage._id}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="hover:bg-zinc-900/30 transition-colors"
                                        >
                                            <td className="px-5 py-3 text-zinc-200">
                                                <div className="flex items-center gap-2">
                                                    {garage.name}
                                                    {garage.rating > 0 && (
                                                        <span className="flex items-center gap-0.5 text-zinc-500 text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                                                            <Star className="w-2.5 h-2.5" />
                                                            {garage.rating.toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-zinc-500 truncate max-w-[200px]">
                                                {garage.location?.address || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono text-zinc-400">
                                                {garage.totalServices}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono text-zinc-400">
                                                {garage.avgServicesPerDay}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono text-zinc-400">
                                                {formatCurrency(garage.totalEarnings)}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
