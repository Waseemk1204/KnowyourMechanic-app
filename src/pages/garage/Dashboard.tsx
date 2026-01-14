import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings, Plus, Star, Users, TrendingUp, LogOut, Wrench, ArrowRight, User,
    Calendar, Clock, Check, X, Loader2, AlertCircle, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../../components/BottomNav';

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
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pending: 0, completed: 0, rating: 4.8 });

    const navigate = useNavigate();
    const { userData, logout } = useAuth();

    useEffect(() => {
        fetchBookings();
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
                    onClick={handleLogout}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-slate-100 text-slate-400 active:bg-slate-50"
                >
                    <LogOut className="w-5.5 h-5.5" />
                </button>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="premium-card p-4 bg-white flex flex-col items-center">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-2">
                        <Clock className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{stats.pending}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Pending</p>
                </div>
                <div className="premium-card p-4 bg-white flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-2">
                        <Check className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{stats.completed}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Done</p>
                </div>
                <div className="premium-card p-4 bg-white flex flex-col items-center">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 mb-2">
                        <Star className="w-5 h-5 fill-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{stats.rating}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Rating</p>
                </div>
            </div>

            {/* Pending Requests */}
            {pendingBookings.length > 0 && (
                <div className="mb-8">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        New Requests ({pendingBookings.length})
                    </h4>
                    <div className="space-y-3">
                        {pendingBookings.map((booking) => (
                            <motion.div
                                key={booking._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="premium-card p-5 bg-white"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h5 className="font-bold text-slate-900">{booking.serviceId?.name}</h5>
                                        <p className="text-slate-400 text-sm">{formatDate(booking.scheduledDate)} • {booking.scheduledTime}</p>
                                    </div>
                                    <span className="text-lg font-bold text-blue-600">₹{booking.totalPrice}</span>
                                </div>

                                {booking.notes && (
                                    <p className="text-slate-500 text-sm mb-3 bg-slate-50 p-3 rounded-xl">{booking.notes}</p>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateStatus(booking._id, 'accepted')}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(booking._id, 'rejected')}
                                        className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Decline
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Jobs */}
            {acceptedBookings.length > 0 && (
                <div className="mb-8">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.15em] mb-4">
                        Upcoming Jobs ({acceptedBookings.length})
                    </h4>
                    <div className="space-y-3">
                        {acceptedBookings.map((booking) => (
                            <div key={booking._id} className="premium-card p-5 bg-white flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                                    <Wrench className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900">{booking.serviceId?.name}</h5>
                                    <p className="text-slate-400 text-sm">{formatDate(booking.scheduledDate)} • {booking.scheduledTime}</p>
                                </div>
                                <button
                                    onClick={() => handleUpdateStatus(booking._id, 'completed')}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
                                >
                                    Done
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-4 mb-6">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.15em]">Management</h4>

                <button
                    onClick={() => navigate('/garage/onboarding')}
                    className="w-full premium-card p-5 flex items-center gap-5 group hover:border-blue-300"
                >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                        <h5 className="font-bold text-slate-900">Add Services</h5>
                        <p className="text-slate-400 text-xs font-semibold">Offer new repair options</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600" />
                </button>
            </div>

            {loading && bookings.length === 0 && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            )}

            {!loading && bookings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
                        <Calendar className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-400">No bookings yet</h3>
                    <p className="text-slate-300 text-sm">Customer requests will appear here</p>
                </div>
            )}

            <BottomNav role="garage" />
        </div>
    );
}
