import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings, Plus, Star, Users, TrendingUp, LogOut, Wrench, ArrowRight, User,
    Calendar, Clock, Check, X, Loader2, AlertCircle, Phone, Headphones, Edit, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../../components/BottomNav';
import AddServiceModal from '../../components/AddServiceModal';

interface Booking {
    _id: string;
    customerId: {
        phoneNumber: string;
    };
    serviceId: {
        name: string;
        price: number;
        duration: number;
    };
    scheduledDate: string;
    scheduledTime: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
    totalPrice: number;
    notes?: string;
    vehicleInfo?: {
        make: string;
        model: string;
        year: number;
    };
}

interface ServiceRecord {
    _id: string;
    customerPhone: string;
    description: string;
    amount: number;
    platformFee: number;
    garageEarnings: number;
    paymentMethod: 'cash' | 'razorpay';
    status: string;
    isReliable: boolean;
    createdAt: string;
}

type View = 'dashboard' | 'bookings' | 'services';

const statusConfig = {
    pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50' },
    accepted: { label: 'Confirmed', color: 'text-green-600', bg: 'bg-green-50' },
    rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50' },
    completed: { label: 'Completed', color: 'text-blue-600', bg: 'bg-blue-50' },
    cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100' },
};

export default function GarageDashboard() {
    const [view, setView] = useState<View>('dashboard');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [showAllServices, setShowAllServices] = useState(false);
    const [showProfilePanel, setShowProfilePanel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pending: 0, completed: 0, rating: 4.8 });
    const [showAddService, setShowAddService] = useState(false);

    const navigate = useNavigate();
    const { userData, logout } = useAuth();

    useEffect(() => {
        fetchBookings();
        fetchServices();
    }, []);

    const getApiUrl = () => {
        return (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4001/api';
    };

    const fetchBookings = async () => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`${getApiUrl()}/bookings/garage-bookings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setBookings(data);

                // Calculate stats
                const pending = data.filter((b: Booking) => b.status === 'pending').length;
                const completed = data.filter((b: Booking) => b.status === 'completed').length;
                setStats(prev => ({ ...prev, pending, completed }));
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`${getApiUrl()}/service-records/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setServices(data.services || []);
                if (data.stats) {
                    setStats(prev => ({ ...prev, completed: data.stats.totalServices }));
                }
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const handleUpdateStatus = async (bookingId: string, status: 'accepted' | 'rejected' | 'completed') => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`${getApiUrl()}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                fetchBookings();
            } else {
                alert('Failed to update booking');
            }
        } catch (error) {
            console.error('Error updating booking:', error);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/auth');
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const acceptedBookings = bookings.filter(b => b.status === 'accepted');

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-safe pb-28 px-6 text-slate-900">
            {/* Header */}
            <header className="flex items-center justify-between py-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 shadow-xl shadow-blue-500/20 flex items-center justify-center text-white">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">
                            {(userData as any)?.name || 'My Garage'}
                        </h1>
                        <p className="text-blue-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Premium Partner
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowProfilePanel(true)}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white overflow-hidden border-2 border-white"
                >
                    <User className="w-7 h-7" />
                </button>
            </header>

            {/* Profile Slider Panel */}
            <AnimatePresence>
                {showProfilePanel && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProfilePanel(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        />
                        {/* Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col"
                        >
                            {/* Panel Header */}
                            <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                                <button
                                    onClick={() => setShowProfilePanel(false)}
                                    className="absolute top-4 right-4 text-white/70 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 border-4 border-white/30">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-xl font-black">{(userData as any)?.name || 'My Garage'}</h3>
                                <p className="text-blue-200 text-sm font-medium flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-green-400" />
                                    Premium Partner
                                </p>
                            </div>

                            {/* Panel Menu */}
                            <div className="flex-1 p-4 space-y-2">
                                <button
                                    onClick={() => {
                                        setShowProfilePanel(false);
                                        // Navigate to profile settings
                                        navigate('/garage/settings');
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                        <Edit className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-slate-900">Profile Settings</p>
                                        <p className="text-slate-400 text-xs">Edit garage details & photo</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                </button>

                                <button
                                    onClick={() => {
                                        setShowProfilePanel(false);
                                        window.open('mailto:support@knowyourmechanic.com', '_blank');
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                        <Headphones className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-slate-900">Support</p>
                                        <p className="text-slate-400 text-xs">Get help & contact us</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-green-500" />
                                </button>
                            </div>

                            {/* Logout Button */}
                            <div className="p-4 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        setShowProfilePanel(false);
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-bold">Logout</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="premium-card p-4 bg-white flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-2">
                        <Check className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{stats.completed}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Total Services</p>
                </div>
                <div className="premium-card p-4 bg-white flex flex-col items-center">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 mb-2">
                        <Star className="w-5 h-5 fill-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{stats.rating}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Rating</p>
                </div>
            </div>


            {/* Add Service Button */}
            <div className="mb-6">
                <button
                    onClick={() => setShowAddService(true)}
                    className="w-full premium-card p-5 flex items-center gap-5 group hover:border-green-300 border-2 border-transparent"
                >
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                        <h5 className="font-bold text-slate-900">Record a Service</h5>
                        <p className="text-slate-400 text-xs font-semibold">Add completed work to portfolio</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-green-600" />
                </button>
            </div>

            {/* Recent Services */}
            {services.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.15em]">Recent Services</h4>
                        {services.length > 3 && (
                            <button
                                onClick={() => setShowAllServices(!showAllServices)}
                                className="text-blue-600 text-xs font-bold"
                            >
                                {showAllServices ? 'Show Less' : 'Show All'}
                            </button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {(showAllServices ? services : services.slice(0, 3)).map((service) => (
                            <div key={service._id} className="premium-card p-4 bg-white">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 text-sm">{service.description}</p>
                                        <p className="text-slate-400 text-xs">{service.customerPhone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">₹{service.garageEarnings}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${service.paymentMethod === 'razorpay' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {service.paymentMethod === 'razorpay' ? 'Online' : 'Cash'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-slate-300 text-[10px]">
                                    {new Date(service.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}



            <BottomNav role="garage" />

            {/* Add Service Modal */}
            <AddServiceModal
                isOpen={showAddService}
                onClose={() => setShowAddService(false)}
                onSuccess={() => {
                    setShowAddService(false);
                    fetchServices(); // Refresh services list
                }}
            />
        </div>
    );
}
