import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, Flag, AlertTriangle, Shield, CheckCircle,
    XCircle, Clock, ChevronDown, Building2, User
} from 'lucide-react';

const getApiUrl = () => (import.meta as any).env?.VITE_API_URL || 'http://localhost:4001/api';
const getToken = async () => {
    const { auth } = await import('../../lib/firebase');
    return auth.currentUser?.getIdToken();
};

const REASON_LABELS: Record<string, string> = {
    fraud: 'Fraud / Scam',
    overcharging: 'Overcharging',
    poor_service: 'Poor Service',
    harassment: 'Harassment',
    other: 'Other',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
    reviewing: { label: 'Reviewing', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Shield },
    resolved: { label: 'Resolved', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
    dismissed: { label: 'Dismissed', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: XCircle },
};

interface ReportItem {
    _id: string;
    reporterId: { name?: string; phoneNumber: string };
    garageId: { _id: string; name: string };
    reason: string;
    description: string;
    status: string;
    createdAt: string;
}

export default function AdminReports() {
    const navigate = useNavigate();
    const [reports, setReports] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [updating, setUpdating] = useState('');

    useEffect(() => {
        fetchReports();
    }, [filter]);

    const fetchReports = async () => {
        try {
            const token = await getToken();
            const url = filter === 'all'
                ? `${getApiUrl()}/admin/reports`
                : `${getApiUrl()}/admin/reports?status=${filter}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) setReports(await res.json());
        } catch (err) {
            console.error('Fetch reports error:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        setUpdating(id);
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/admin/reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            if (res.ok) fetchReports();
        } catch (err) {
            console.error('Update status error:', err);
        } finally {
            setUpdating('');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const pendingCount = reports.filter(r => r.status === 'pending').length;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin')} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black">Customer Reports</h1>
                        <p className="text-slate-400 text-sm">
                            {reports.length} reports · {pendingCount} pending
                        </p>
                    </div>
                </div>

                {/* Filter */}
                <div className="relative">
                    <select
                        value={filter}
                        onChange={e => { setFilter(e.target.value); setLoading(true); }}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white appearance-none pr-8 focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </header>

            <div className="p-6 max-w-5xl mx-auto">
                {reports.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <Flag className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-bold">No reports found</p>
                        <p className="text-sm mt-1">{filter !== 'all' ? 'Try a different filter' : 'No reports have been submitted yet'}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map((report, i) => {
                            const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
                            const StatusIcon = statusConf.icon;

                            return (
                                <motion.div
                                    key={report._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="bg-slate-900 rounded-2xl border border-slate-800 p-5"
                                >
                                    {/* Top row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                            </div>
                                            <div>
                                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 mb-1">
                                                    {REASON_LABELS[report.reason] || report.reason}
                                                </span>
                                                <p className="text-sm text-slate-300">{report.description}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConf.bg} ${statusConf.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusConf.label}
                                        </div>
                                    </div>

                                    {/* Info row */}
                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {report.reporterId?.name || report.reporterId?.phoneNumber || 'Unknown'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {report.garageId?.name || 'Unknown garage'}
                                        </span>
                                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                                    </div>

                                    {/* Actions */}
                                    {report.status !== 'resolved' && report.status !== 'dismissed' && (
                                        <div className="flex gap-2">
                                            {report.status === 'pending' && (
                                                <button
                                                    onClick={() => updateStatus(report._id, 'reviewing')}
                                                    disabled={updating === report._id}
                                                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                                >
                                                    Start Review
                                                </button>
                                            )}
                                            <button
                                                onClick={() => updateStatus(report._id, 'resolved')}
                                                disabled={updating === report._id}
                                                className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                            >
                                                Resolve
                                            </button>
                                            <button
                                                onClick={() => updateStatus(report._id, 'dismissed')}
                                                disabled={updating === report._id}
                                                className="px-3 py-1.5 bg-slate-500/10 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-500/20 transition-colors disabled:opacity-50"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
