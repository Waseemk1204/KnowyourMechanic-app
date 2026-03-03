import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Users, UserPlus, Copy, Check, Loader2,
    Building2, Wrench, X, Phone, Mail, Shield
} from 'lucide-react';

const getApiUrl = () => (import.meta as any).env?.VITE_API_URL || 'http://localhost:4001/api';
const getToken = async () => {
    const { auth } = await import('../../lib/firebase');
    return auth.currentUser?.getIdToken();
};

interface Employee {
    _id: string;
    name: string;
    email: string;
    phone: string;
    referralCode: string;
    role: string;
    isActive: boolean;
    garageCount: number;
    createdAt: string;
}

export default function AdminEmployees() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [copiedCode, setCopiedCode] = useState('');
    const [saving, setSaving] = useState(false);

    // New employee form
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/admin/employees`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) setEmployees(await res.json());
        } catch (err) {
            console.error('Fetch employees error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmployee = async () => {
        if (!newName || !newEmail || !newPhone) return;
        setSaving(true);
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/admin/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone }),
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewName('');
                setNewEmail('');
                setNewPhone('');
                fetchEmployees();
            }
        } catch (err) {
            console.error('Add employee error:', err);
        } finally {
            setSaving(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(''), 2000);
    };

    const toggleActive = async (id: string, active: boolean) => {
        try {
            const token = await getToken();
            await fetch(`${getApiUrl()}/admin/employees/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ isActive: !active }),
            });
            fetchEmployees();
        } catch (err) {
            console.error('Toggle error:', err);
        }
    };

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
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin')} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black">Employee Management</h1>
                        <p className="text-slate-400 text-sm">{employees.length} employees</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Employee
                </button>
            </header>

            {/* Employee Grid */}
            <div className="p-6 max-w-5xl mx-auto">
                <div className="space-y-3">
                    {employees.map((emp, i) => (
                        <motion.div
                            key={emp._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-slate-900 rounded-2xl border border-slate-800 p-5 hover:border-slate-700 transition-colors cursor-pointer"
                            onClick={() => navigate(`/admin/employees/${emp._id}`)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${emp.isActive ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                                        <Users className={`w-6 h-6 ${emp.isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-lg">{emp.name}</p>
                                            {!emp.isActive && (
                                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>
                                            )}
                                            {emp.role === 'admin' && (
                                                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> Admin
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>
                                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Referral Code */}
                                    <div className="text-center" onClick={e => e.stopPropagation()}>
                                        <p className="text-xs text-slate-500">Referral Code</p>
                                        <button
                                            onClick={() => copyCode(emp.referralCode)}
                                            className="font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 flex items-center gap-2 mt-0.5 transition-colors"
                                        >
                                            {emp.referralCode}
                                            {copiedCode === emp.referralCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                    {/* Garage Count */}
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500">Garages</p>
                                        <p className="text-2xl font-black text-white">{emp.garageCount}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {employees.length === 0 && (
                        <div className="text-center py-20 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-bold">No employees yet</p>
                            <p className="text-sm mt-1">Add your first field employee to get started</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Employee Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold">Add New Employee</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-800 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 block mb-1.5">Full Name</label>
                                    <input
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 block mb-1.5">Email</label>
                                    <input
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        placeholder="john@example.com"
                                        type="email"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 block mb-1.5">Phone</label>
                                    <input
                                        value={newPhone}
                                        onChange={e => setNewPhone(e.target.value)}
                                        placeholder="+919876543210"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddEmployee}
                                    disabled={saving || !newName || !newEmail || !newPhone}
                                    className="flex-1 py-3 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    Create
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 mt-4 text-center">
                                A unique referral code will be auto-generated
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
