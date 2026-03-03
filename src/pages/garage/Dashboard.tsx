import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings, Plus, Star, LogOut, Wrench, User,
    X, Headphones, Edit, ChevronRight, Timer, Trash2, Save, Package, Loader2, Calendar, Check, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import AddServiceModal from '../../components/AddServiceModal';
import { DashboardSkeleton } from '../../components/Loaders';

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

interface OfferedService {
    _id: string;
    name: string;
    description?: string;
    price: number;
    duration: number;
}

export default function GarageDashboard() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [showAllServices, setShowAllServices] = useState(false);
    const [showProfilePanel, setShowProfilePanel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pending: 0, completed: 0, rating: 0, totalReviews: 0 });
    const [showAddService, setShowAddService] = useState(false);
    const [garagePhotoUrl, setGaragePhotoUrl] = useState('');
    const [garageName, setGarageName] = useState('');
    const [serviceHours, setServiceHours] = useState('9:00 AM - 8:00 PM');
    const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Service portfolio
    const [portfolioServices, setPortfolioServices] = useState<OfferedService[]>([]);
    const [showAddPortfolio, setShowAddPortfolio] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [portfolioForm, setPortfolioForm] = useState({ name: '', description: '', price: '', duration: '60' });
    const [savingPortfolio, setSavingPortfolio] = useState(false);

    const navigate = useNavigate();
    const { userData, logout } = useAuth();

    useEffect(() => {
        fetchBookings();
        fetchServices();
        fetchGarageProfile();
        fetchPortfolioServices();
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
                const servicesList = data.services || [];
                setServices(servicesList);
                // Update stats from API or use array length as fallback
                const totalCount = data.stats?.totalServices ?? servicesList.length;
                setStats(prev => ({ ...prev, completed: totalCount }));
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const fetchPortfolioServices = async () => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${getApiUrl()}/services/my-services`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPortfolioServices(data);
            }
        } catch (err) {
            console.error('Error fetching portfolio services:', err);
        }
    };

    const handleSavePortfolioService = async () => {
        if (!portfolioForm.name || !portfolioForm.price) return;
        setSavingPortfolio(true);
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();
            const url = editingServiceId
                ? `${getApiUrl()}/services/${editingServiceId}`
                : `${getApiUrl()}/services`;
            const method = editingServiceId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: portfolioForm.name,
                    description: portfolioForm.description,
                    price: parseFloat(portfolioForm.price),
                    duration: parseInt(portfolioForm.duration) || 60,
                }),
            });
            if (res.ok) {
                setShowAddPortfolio(false);
                setEditingServiceId(null);
                setPortfolioForm({ name: '', description: '', price: '', duration: '60' });
                fetchPortfolioServices();
            }
        } catch (err) {
            console.error('Error saving service:', err);
        } finally {
            setSavingPortfolio(false);
        }
    };

    const handleDeletePortfolioService = async (serviceId: string) => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();
            await fetch(`${getApiUrl()}/services/${serviceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            fetchPortfolioServices();
        } catch (err) {
            console.error('Error deleting service:', err);
        }
    };



    const handleLogout = async () => {
        await logout();
        navigate('/auth');
    };

    const fetchGarageProfile = async () => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`${getApiUrl()}/garages/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.photoUrl) setGaragePhotoUrl(data.photoUrl);
                if (data.name) setGarageName(data.name);
                if (data.serviceHours) setServiceHours(data.serviceHours);
                if (data.workingDays) setWorkingDays(Array.isArray(data.workingDays) ? data.workingDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
                // Update rating and reviews from garage profile
                setStats(prev => ({
                    ...prev,
                    rating: data.rating || 0,
                    totalReviews: data.totalReviews || 0
                }));
            }
        } catch (err) {
            console.error('Error fetching garage profile:', err);
        }
    };

    // Check if garage is currently open
    const isGarageOpen = () => {
        const now = new Date();
        const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];

        if (!workingDays.includes(currentDay)) return false;

        try {
            const [openStr, closeStr] = serviceHours.split(' - ');
            const parseTime = (str: string) => {
                const [time, period] = str.trim().split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                return hours * 60 + minutes;
            };

            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const openMinutes = parseTime(openStr);
            const closeMinutes = parseTime(closeStr);

            return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
        } catch {
            return true; // Default to open if parsing fails
        }
    };

    const handleBookingStatus = async (bookingId: string, status: 'accepted' | 'rejected') => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();
            await fetch(`${getApiUrl()}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            fetchBookings();
        } catch (err) {
            console.error('Booking status error:', err);
        }
    };

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-safe pb-6 text-slate-900">
            {/* Hero Header with Full Width Photo */}
            <div className="relative h-72 w-full bg-slate-900 overflow-hidden mb-6">
                {garagePhotoUrl ? (
                    <img src={garagePhotoUrl} alt="Cover" className="w-full h-full object-cover opacity-70" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800" />
                )}

                {/* Gradient-to-top overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/20" />

                {/* Top Settings Button */}
                <div className="absolute top-4 right-6 z-10">
                    <button
                        onClick={() => setShowProfilePanel(true)}
                        className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/30 transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                {/* Bottom Text Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <h1 className="text-3xl font-black text-white mb-2 leading-tight">
                        {garageName || (userData as any)?.name || 'Your Garage'}
                    </h1>
                    <div className="flex items-center gap-3">
                        {isGarageOpen() ? (
                            <div className="px-3 py-1 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Open Now
                            </div>
                        ) : (
                            <div className="px-3 py-1 rounded-full bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                Closed
                            </div>
                        )}
                        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 text-xs font-bold flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {stats.rating > 0 ? `${stats.rating.toFixed(1)} Rating` : 'No Ratings'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6">

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
                                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 border-4 border-white/30 overflow-hidden">
                                        {garagePhotoUrl ? (
                                            <img src={garagePhotoUrl} alt="Garage" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-white" />
                                        )}
                                    </div>
                                    <h3 className="text-xl font-black">{garageName || (userData as any)?.name || 'Your Garage'}</h3>
                                    <p className="text-blue-200 text-sm font-medium flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-green-400" />
                                        Active
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
                                            navigate('/garage/support');
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
                                        onClick={() => setShowLogoutConfirm(true)}
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
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col items-center">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-2">
                            <Wrench className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stats.completed}</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase">Total Services</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col items-center">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 mb-2">
                            <Star className="w-5 h-5 fill-amber-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stats.rating > 0 ? stats.rating.toFixed(1) : '-'}</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase">Rating ({stats.totalReviews})</p>
                    </div>
                </div>

                {/* Service Portfolio (Menu) */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.15em]">Service Menu</h4>
                        <button
                            onClick={() => {
                                setShowAddPortfolio(true);
                                setEditingServiceId(null);
                                setPortfolioForm({ name: '', description: '', price: '', duration: '60' });
                            }}
                            className="text-sm text-blue-600 font-semibold flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </div>

                    {/* Add/Edit Form */}
                    {showAddPortfolio && (
                        <div className="bg-white rounded-2xl border border-blue-200 p-4 mb-3 space-y-3">
                            <input
                                type="text"
                                value={portfolioForm.name}
                                onChange={(e) => setPortfolioForm({ ...portfolioForm, name: e.target.value })}
                                placeholder="Service name (e.g. Oil Change)"
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <input
                                type="text"
                                value={portfolioForm.description}
                                onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                                placeholder="Description (optional)"
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Price (Rs.)</label>
                                    <input
                                        type="number"
                                        value={portfolioForm.price}
                                        onChange={(e) => setPortfolioForm({ ...portfolioForm, price: e.target.value })}
                                        placeholder="500"
                                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Duration (min)</label>
                                    <input
                                        type="number"
                                        value={portfolioForm.duration}
                                        onChange={(e) => setPortfolioForm({ ...portfolioForm, duration: e.target.value })}
                                        placeholder="60"
                                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSavePortfolioService}
                                    disabled={!portfolioForm.name || !portfolioForm.price || savingPortfolio}
                                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {savingPortfolio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {editingServiceId ? 'Update' : 'Save'}
                                </button>
                                <button
                                    onClick={() => { setShowAddPortfolio(false); setEditingServiceId(null); }}
                                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {portfolioServices.filter(s => (s as any).isActive !== false).length === 0 && !showAddPortfolio ? (
                        <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No services in your menu yet</p>
                            <p className="text-slate-300 text-xs mt-1">Add services so customers know what you offer</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {portfolioServices.filter(s => (s as any).isActive !== false).map((svc) => (
                                <div key={svc._id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 text-sm">{svc.name}</p>
                                        {svc.description && <p className="text-xs text-slate-400 mt-0.5">{svc.description}</p>}
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm font-bold text-blue-600">Rs.{svc.price}</span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Timer className="w-3 h-3" />{svc.duration} min
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingServiceId(svc._id);
                                                setPortfolioForm({
                                                    name: svc.name,
                                                    description: svc.description || '',
                                                    price: svc.price.toString(),
                                                    duration: svc.duration.toString(),
                                                });
                                                setShowAddPortfolio(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePortfolioService(svc._id)}
                                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Service Record Button */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowAddService(true)}
                        className="w-full bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-6 h-6" />
                        <span className="font-bold text-lg">Add Service</span>
                    </button>
                </div>

                {/* Pending Bookings */}
                {bookings.filter(b => b.status === 'pending').length > 0 && (
                    <div className="mb-6">
                        <div className="mb-3">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.15em]">Pending Bookings</h4>
                        </div>
                        <div className="space-y-3">
                            {bookings.filter(b => b.status === 'pending').map((booking) => (
                                <motion.div
                                    key={booking._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="premium-card p-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar className="w-4 h-4 text-blue-600" />
                                                <span className="font-bold text-sm">
                                                    {booking.serviceId?.name || 'Service'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {booking.customerId?.phoneNumber || 'Customer'} ·
                                                {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
                                            </p>
                                            {booking.notes && (
                                                <p className="text-xs text-slate-400 mt-1 italic">"{booking.notes}"</p>
                                            )}
                                            <p className="text-sm font-bold text-blue-600 mt-1">₹{booking.totalPrice}</p>
                                        </div>
                                        <div className="flex gap-2 ml-3">
                                            <button
                                                onClick={() => handleBookingStatus(booking._id, 'accepted')}
                                                className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                                                title="Accept"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleBookingStatus(booking._id, 'rejected')}
                                                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                                title="Reject"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Services */}
                {services.length > 0 && (
                    <div className="mb-6">
                        <div className="mb-3">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.15em]">Recent Services</h4>
                        </div>
                        <div className="space-y-3">
                            {(showAllServices ? services : services.slice(0, 2)).map((service) => (
                                <div key={service._id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 text-sm">{service.description}</p>
                                            <p className="text-slate-400 text-xs">{service.customerPhone}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-900">₹{service.garageEarnings}</p>
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
                        {services.length > 2 && (
                            <p
                                onClick={() => setShowAllServices(!showAllServices)}
                                className="text-blue-600 text-sm font-medium underline text-center mt-4 cursor-pointer"
                            >
                                {showAllServices ? 'Show Less' : 'See More'}
                            </p>
                        )}
                    </div>
                )}

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

            {/* Logout Confirmation Modal - Full Screen Overlay */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <LogOut className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">Logout?</h3>
                                <p className="text-slate-500 text-sm">Are you sure you want to logout?</p>
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        setShowLogoutConfirm(false);
                                        setShowProfilePanel(false);
                                        handleLogout();
                                    }}
                                    className="w-full bg-red-600 text-white py-3 rounded-xl font-bold"
                                >
                                    Yes, Logout
                                </button>
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
