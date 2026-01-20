import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Wrench, Loader2, Calendar, X, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Booking {
    _id: string;
    garageId: {
        _id: string;
        name: string;
        photoUrl?: string;
    };
    serviceId: {
        _id: string;
        name: string;
        price: number;
    };
    scheduledDate: string;
    scheduledTime: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
    totalPrice: number;
    createdAt: string;
}

const statusConfig = {
    pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50' },
    accepted: { label: 'Confirmed', color: 'text-green-600', bg: 'bg-green-50' },
    rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50' },
    completed: { label: 'Completed', color: 'text-blue-600', bg: 'bg-blue-50' },
    cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100' },
};

export default function CustomerActivity() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

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

            const res = await fetch(`${getApiUrl()}/bookings/my-bookings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            } else {
                setError('Failed to load bookings');
            }
        } catch (err) {
            console.error('Error fetching bookings:', err);
            setError('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`${getApiUrl()}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'cancelled' })
            });

            if (res.ok) {
                // Refresh bookings
                fetchBookings();
            } else {
                alert('Failed to cancel booking');
            }
        } catch (err) {
            console.error('Error cancelling booking:', err);
            alert('Failed to cancel booking');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pt-safe pb-6">
            {/* Header with Back Button */}
            <header className="bg-blue-600 text-white px-6 py-8 rounded-b-[2.5rem] mb-4">
                <button
                    onClick={() => navigate('/customer')}
                    className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back</span>
                </button>
                <h1 className="text-2xl font-black">Activity</h1>
                <p className="text-blue-200 text-sm">Your service history</p>
            </header>

            <div className="px-6">

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {bookings.map((booking, i) => {
                        const status = statusConfig[booking.status];
                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={booking._id}
                                className="premium-card p-5 bg-white"
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                                        <Wrench className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-slate-900">{booking.garageId?.name || 'Unknown Garage'}</h3>
                                            <span className={`text-[10px] font-black uppercase ${status.color} ${status.bg} px-2 py-1 rounded-md`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-blue-600 font-semibold text-sm">{booking.serviceId?.name || 'Service'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(booking.scheduledDate)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {booking.scheduledTime}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <span className="font-bold text-lg text-slate-900">₹{booking.totalPrice}</span>
                                    {booking.status === 'pending' && (
                                        <button
                                            onClick={() => handleCancelBooking(booking._id)}
                                            className="text-red-600 text-sm font-semibold flex items-center gap-1"
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </button>
                                    )}
                                    {booking.status === 'completed' && (
                                        <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                                            <Check className="w-4 h-4" />
                                            Done
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}

                    {bookings.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                                <Clock className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400">No activity yet</h3>
                            <p className="text-slate-300 font-medium">Your service requests will show up here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
