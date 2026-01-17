import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings, Plus, Star, Users, TrendingUp, LogOut, Wrench, ArrowRight, User,
    Calendar, Clock, Check, X, Loader2, AlertCircle, Phone
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
    const [showAddService, setShowAddService] = useState(false);

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

            {/* Weekly Performance */}
            <div className="premium-card p-5 bg-white mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-900">Weekly Performance</h4>
                    <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-slate-900">{stats.rating}</span>
                        <span className="text-slate-400">rating</span>
                    </div>
                </div>

                {/* Services per Day Chart */}
                <div className="flex items-end justify-between gap-2 h-24 mb-3">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                        // Mock data for now - will be replaced with real data
                        const heights = [40, 65, 30, 80, 50, 90, 25];
                        const services = [2, 4, 1, 5, 3, 6, 1];
                        const isToday = new Date().getDay() === (i + 1) % 7;
                        return (
                            <div key={day} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className={`w-full rounded-lg ${isToday ? 'bg-blue-500' : 'bg-blue-100'}`}
                                    style={{ height: `${heights[i]}%` }}
                                />
                                <span className={`text-[10px] font-bold ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {day}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="text-center">
                        <p className="text-2xl font-black text-slate-900">{stats.completed}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Services</p>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="text-center">
                        <p className="text-2xl font-black text-green-600">₹{(stats.completed * 450).toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Earnings</p>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="text-center">
                        <p className="text-2xl font-black text-slate-900">{Math.round(stats.completed / 7)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Avg/Day</p>
                    </div>
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

            {/* Add Service Modal */}
            <AddServiceModal
                isOpen={showAddService}
                onClose={() => setShowAddService(false)}
                onSuccess={() => {
                    setShowAddService(false);
                    fetchBookings(); // Refresh stats
                }}
            />
        </div>
    );
}
