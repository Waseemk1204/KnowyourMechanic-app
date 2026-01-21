import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit, Trash2, X, IndianRupee, Clock, Loader2, Check, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Service {
    _id: string;
    name: string;
    description?: string;
    price: number;
    duration: number;
    isActive: boolean;
}

export default function GarageServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        duration: '60'
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const navigate = useNavigate();

    const getApiUrl = () => {
        return (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4001/api';
    };

    const getToken = async () => {
        const { auth } = await import('../../lib/firebase');
        return auth.currentUser?.getIdToken();
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/services/my-services`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setServices(data);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.price) {
            setError('Name and price are required');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const token = await getToken();
            const url = editingService
                ? `${getApiUrl()}/services/${editingService._id}`
                : `${getApiUrl()}/services`;

            const res = await fetch(url, {
                method: editingService ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    price: parseFloat(formData.price),
                    duration: parseInt(formData.duration)
                })
            });

            if (res.ok) {
                fetchServices();
                handleCloseModal();
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to save service');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchServices();
            }
        } catch (error) {
            console.error('Error deleting service:', error);
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description || '',
            price: service.price.toString(),
            duration: service.duration.toString()
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingService(null);
        setFormData({ name: '', description: '', price: '', duration: '60' });
        setError('');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/garage/dashboard')} className="p-2 -ml-2">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-slate-900">My Services</h1>
                        <p className="text-xs text-slate-500 mt-0.5">{services.filter(s => s.isActive).length} active services</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Services List */}
            <div className="p-4 space-y-3">
                {services.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No services yet</h3>
                        <p className="text-slate-500 text-sm mb-6">Add your first service to get started</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold"
                        >
                            Add Service
                        </button>
                    </div>
                ) : (
                    services.map(service => (
                        <motion.div
                            key={service._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-4 border border-slate-100"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 mb-1">{service.name}</h3>
                                    {service.description && (
                                        <p className="text-sm text-slate-500 mb-2">{service.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <IndianRupee className="w-4 h-4" />
                                            <span className="font-semibold">₹{service.price}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <Clock className="w-4 h-4" />
                                            <span>{service.duration} min</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service._id)}
                                        className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {!service.isActive && (
                                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg inline-block">
                                    Inactive
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={handleCloseModal}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900">
                                    {editingService ? 'Edit Service' : 'Add Service'}
                                </h3>
                                <button onClick={handleCloseModal}>
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Service Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Oil Change"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description of the service"
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Price (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="500"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Duration (min)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                            placeholder="60"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            {editingService ? 'Update Service' : 'Add Service'}
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
