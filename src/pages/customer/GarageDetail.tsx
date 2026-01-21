import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Star, MapPin, Clock, Phone, Navigation,
    Wrench, ChevronRight, Calendar, X, Check, Loader2
} from 'lucide-react';

interface ServiceRecord {
    _id: string;
    description: string;
    amount: number;
    createdAt: string;
    customerPhone: string;
    isReliable: boolean;
}

interface GarageDetail {
    _id: string;
    name: string;
    location: {
        address: string;
        coordinates: [number, number];
    };
    serviceHours: string;
    workingDays: string;
    photoUrl?: string;
    rating: number;
    totalReviews: number;
}

export default function GarageDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [garage, setGarage] = useState<GarageDetail | null>(null);
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [visibleServices, setVisibleServices] = useState(3);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');
    const [bookingNotes, setBookingNotes] = useState('');
    const [booking, setBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    useEffect(() => {
        fetchGarageDetails();
    }, [id]);

    const fetchGarageDetails = async () => {
        try {
            // Fetch garage details
            const { apiRequest } = await import('../../lib/api');
            const garageRes = await fetch(`${getApiUrl()}/garages/${id}`);
            if (garageRes.ok) {
                const garageData = await garageRes.json();
                setGarage(garageData);
            }

            // Fetch service records (completed services)
            const servicesRes = await fetch(`${getApiUrl()}/service-records/garage/${id}`);
            if (servicesRes.ok) {
                const servicesData = await servicesRes.json();
                setServices(servicesData);
            }
        } catch (error) {
            console.error('Error fetching garage details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getApiUrl = () => {
        return (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4001/api';
    };

    const handleBookService = (service: ServiceRecord) => {
        setSelectedService(service);
        setShowBookingModal(true);
    };

    const loadMoreServices = () => {
        // First click: show 5 more (3→8), subsequent clicks: show 10 more
        const increment = visibleServices === 3 ? 5 : 10;
        setVisibleServices(prev => prev + increment);
    };

    const handleConfirmBooking = async () => {
        if (!selectedService || !bookingDate || !bookingTime) return;

        setBooking(true);
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`${getApiUrl()}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    garageId: id,
                    serviceId: selectedService._id,
                    scheduledDate: bookingDate,
                    scheduledTime: bookingTime,
                    notes: bookingNotes,
                })
            });

            if (res.ok) {
                setBookingSuccess(true);
                setTimeout(() => {
                    setShowBookingModal(false);
                    setBookingSuccess(false);
                    setSelectedService(null);
                    navigate('/customer/activity');
                }, 2000);
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to book service');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Failed to book service');
        } finally {
            setBooking(false);
        }
    };

    const handleCall = () => {
        // In a real app, this would use the garage's phone number
        window.open('tel:+919999999999');
    };

    const handleDirections = () => {
        if (garage?.location.coordinates) {
            const [lng, lat] = garage.location.coordinates;
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!garage) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Garage not found</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="text-blue-600 font-semibold"
                >
                    Go back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header Image */}
            <div className="relative h-64 bg-gradient-to-br from-blue-600 to-indigo-700">
                {garage.photoUrl && (
                    <img
                        src={garage.photoUrl}
                        alt={garage.name}
                        className="w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-12 left-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Content */}
            <div className="px-6 -mt-16 relative z-10 pb-32">
                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-xl p-6 mb-6"
                >
                    <h1 className="text-2xl font-black text-slate-900 mb-2">{garage.name}</h1>

                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-bold text-amber-700">
                                {garage.rating.toFixed(1)}
                            </span>
                        </div>
                        <span className="text-slate-400 text-sm">({garage.totalReviews} reviews)</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                            <span className="text-slate-600 text-sm">{garage.location.address}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <span className="text-slate-600 text-sm">{garage.serviceHours}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <span className="text-slate-600 text-sm">{garage.workingDays}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleCall}
                            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                        >
                            <Phone className="w-5 h-5" />
                            Call
                        </button>
                        <button
                            onClick={handleDirections}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                        >
                            <Navigation className="w-5 h-5" />
                            Directions
                        </button>
                    </div>
                </motion.div>

                {/* Services */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Services</h2>

                    {services.length === 0 ? (
                        <div className="bg-white rounded-2xl p-6 text-center">
                            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400">No services completed yet</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {services.slice(0, visibleServices).map((service, i) => (
                                    <motion.div
                                        key={service._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-900 mb-1">{service.description}</p>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(service.createdAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="font-bold text-slate-900">₹{service.amount}</p>
                                                {service.isReliable ? (
                                                    <div className="mt-1 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full inline-block">
                                                        Verified
                                                    </div>
                                                ) : (
                                                    <div className="mt-1 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full inline-block">
                                                        Cash Payment
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {visibleServices < services.length && (
                                <button
                                    onClick={loadMoreServices}
                                    className="w-full mt-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    See More
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Booking Modal */}
            <AnimatePresence>
                {showBookingModal && selectedService && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => setShowBookingModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10"
                        >
                            {bookingSuccess ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Booking Confirmed!</h3>
                                    <p className="text-slate-500">Redirecting to your bookings...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-slate-900">Book Service</h3>
                                        <button onClick={() => setShowBookingModal(false)}>
                                            <X className="w-6 h-6 text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                                        <p className="font-bold text-slate-900">{selectedService.name}</p>
                                        <p className="text-slate-500 text-sm">{selectedService.duration} mins • ₹{selectedService.price}</p>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                                            <input
                                                type="date"
                                                value={bookingDate}
                                                onChange={(e) => setBookingDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Time</label>
                                            <input
                                                type="time"
                                                value={bookingTime}
                                                onChange={(e) => setBookingTime(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (optional)</label>
                                            <textarea
                                                value={bookingNotes}
                                                onChange={(e) => setBookingNotes(e.target.value)}
                                                placeholder="Any special instructions..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleConfirmBooking}
                                        disabled={!bookingDate || !bookingTime || booking}
                                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {booking ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Confirm Booking • ₹{selectedService.price}</>
                                        )}
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
