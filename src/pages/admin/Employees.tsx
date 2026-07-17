import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, UserPlus, Copy, Check, Loader2,
    X, Shield
} from 'lucide-react';
import { getAdminEmployees, createAdminEmployee } from '../../lib/data';

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
            setEmployees(await getAdminEmployees());
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
            await createAdminEmployee({ name: newName, email: newEmail, phone: newPhone });
            setShowAddModal(false);
            setNewName('');
            setNewEmail('');
            setNewPhone('');
            fetchEmployees();
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

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800">
            <main className="max-w-5xl mx-auto p-6 space-y-6 pt-10">

                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-light tracking-tight text-white">Team Directory</h1>
                        <p className="text-xs text-zinc-500 font-mono mt-1">{employees.length} TOTAL</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                    >
                        <UserPlus className="w-3.5 h-3.5" /> New Employee
                    </button>
                </div>

                {/* Minimalist Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map((emp, i) => (
                        <motion.div
                            key={emp._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => navigate(`/admin/employees/${emp._id}`)}
                            className="bg-black border border-zinc-800 rounded-lg p-5 hover:border-zinc-600 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${emp.isActive ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 bg-black opacity-50'
                                        }`}>
                                        <Users className={`w-3.5 h-3.5 ${emp.isActive ? 'text-zinc-300' : 'text-zinc-600'}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`font-medium text-sm ${emp.isActive ? 'text-white' : 'text-zinc-500'}`}>{emp.name}</p>
                                            {emp.role === 'admin' && (
                                                <div title="Admin">
                                                    <Shield className="w-3 h-3 text-zinc-500" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{emp.phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
                                <div
                                    onClick={(e) => { e.stopPropagation(); copyCode(emp.referralCode); }}
                                    className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                                >
                                    <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{emp.referralCode}</span>
                                    {copiedCode === emp.referralCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-600" />}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{emp.garageCount}</p>
                                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Garages</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {employees.length === 0 && (
                        <div className="col-span-full border border-dashed border-zinc-800 rounded-lg py-16 text-center text-zinc-600">
                            <p className="text-sm">Directory is empty</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Sharp Add Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="bg-white border border-gray-200 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl"
                        >
                            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                <h3 className="text-sm font-bold text-black">Add Employee</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-black transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-[10px] text-gray-600 font-extrabold uppercase tracking-widest block mb-1.5">Full Name</label>
                                    <input
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className="w-full bg-white border border-gray-300 rounded text-sm px-3 py-2 text-black placeholder-gray-400 focus:border-black focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-600 font-extrabold uppercase tracking-widest block mb-1.5">Email</label>
                                    <input
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        placeholder="jane@company.com"
                                        type="email"
                                        className="w-full bg-white border border-gray-300 rounded text-sm px-3 py-2 text-black placeholder-gray-400 focus:border-black focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-600 font-extrabold uppercase tracking-widest block mb-1.5">Phone Component</label>
                                    <input
                                        value={newPhone}
                                        onChange={e => setNewPhone(e.target.value)}
                                        placeholder="+919876543210"
                                        className="w-full bg-white border border-gray-300 rounded text-sm px-3 py-2 text-black placeholder-gray-400 focus:border-black focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-black transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddEmployee}
                                    disabled={saving || !newName || !newEmail || !newPhone}
                                    className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded text-xs font-bold disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Create Employee
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
