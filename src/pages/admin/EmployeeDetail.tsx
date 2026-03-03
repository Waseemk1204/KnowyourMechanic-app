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
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
                Employee not found
            </div>
        );
    }

    const { employee, garages, aggregates } = data;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-slate-800 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/employees')} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-black">{employee.name}</h1>
                        <p className="text-slate-400 text-sm">{employee.email} · {employee.phone}</p>
                    </div>
                    <button
                        onClick={copyCode}
                        className="font-mono font-bold text-lg bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-500/20 transition-colors"
                    >
                        {employee.referralCode}
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                {/* Aggregate Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Garages', value: aggregates.totalGarages, icon: Building2, color: 'from-violet-600 to-purple-700' },
                        { label: 'Total Services', value: aggregates.totalServices, icon: Wrench, color: 'from-blue-600 to-cyan-700' },
                        { label: 'Total Earnings', value: `₹${aggregates.totalEarnings}`, icon: IndianRupee, color: 'from-emerald-600 to-green-700' },
                        { label: 'Avg/Garage', value: `${aggregates.avgServicesPerGarage} svc`, icon: TrendingUp, color: 'from-amber-600 to-orange-700' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 shadow-lg`}
                        >
                            <stat.icon className="w-5 h-5 text-white/60 mb-2" />
                            <p className="text-2xl font-black">{stat.value}</p>
                            <p className="text-white/60 text-xs mt-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Garage Performance Table */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="p-4 border-b border-slate-800">
                        <h2 className="font-bold text-lg">Garage Performance</h2>
                    </div>

                    {garages.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No garages assigned yet</p>
                            <p className="text-xs mt-1">Share referral code <span className="text-blue-400 font-mono">{employee.referralCode}</span> with garages</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {(garages as GaragePerf[]).map((garage, i) => (
                                <motion.div
                                    key={garage._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-4 hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold">{garage.name}</p>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {garage.location?.address || 'No address'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-amber-500" />
                                                    {garage.rating || 0} ({garage.totalReviews || 0})
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-right">
                                            <div>
                                                <p className="text-xs text-slate-500">Services</p>
                                                <p className="text-lg font-black">{garage.totalServices}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Avg/Day</p>
                                                <p className="text-lg font-black text-blue-400">{garage.avgServicesPerDay}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Earnings</p>
                                                <p className="text-lg font-black text-green-400">₹{garage.totalEarnings.toFixed(0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
