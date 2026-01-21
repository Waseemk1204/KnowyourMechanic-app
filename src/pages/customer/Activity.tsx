import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Wrench, Loader2, Calendar, Check, AlertCircle, ArrowLeft, MapPin, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ServiceRecord {
    _id: string;
    garageId: {
        _id: string;
        name: string;
        photoUrl?: string;
        location?: {
            address: string;
        };
    };
    description: string;
    amount: number;
    paymentMethod: string;
    isReliable: boolean;
    createdAt: string;
}

export default function CustomerActivity() {
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchServiceHistory();
    }, []);

    const getApiUrl = () => {
        return (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4001/api';
    };

    const fetchServiceHistory = async () => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();

            if (!token) {
                setError('Please login to view your service history');
                setLoading(false);
                return;
            }

            const res = await fetch(`${getApiUrl()}/service-records/my-history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setServices(data);
            } else {
                const errData = await res.json();
                if (res.status === 404) {
                    // No services yet - not an error
                    setServices([]);
                } else {
                    setError(errData.message || 'Failed to load service history');
                }
            }
        } catch (err) {
            console.error('Error fetching service history:', err);
            setError('Failed to load service history');
        } finally {
            setLoading(false);
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
                    {services.map((service, i) => (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={service._id}
                            className="premium-card p-5 bg-white cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => navigate(`/customer/garage/${service.garageId?._id}`)}
                        >
                            <div className="flex items-start gap-4 mb-3">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden">
                                    {service.garageId?.photoUrl ? (
                                        <img
                                            src={service.garageId.photoUrl}
                                            alt={service.garageId.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Wrench className="w-7 h-7 text-blue-600" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-slate-900">{service.garageId?.name || 'Unknown Garage'}</h3>
                                        <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                            Completed
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm line-clamp-2">{service.description}</p>
                                </div>
                            </div>

                            {service.garageId?.location?.address && (
                                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{service.garageId.location.address}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(service.createdAt)}
                                    </div>
                                    <div className={`text-xs px-2 py-0.5 rounded-full ${service.isReliable
                                            ? 'bg-green-50 text-green-600'
                                            : 'bg-amber-50 text-amber-600'
                                        }`}>
                                        {service.isReliable ? 'Verified' : 'Cash'}
                                    </div>
                                </div>
                                <span className="font-bold text-lg text-slate-900">₹{service.amount}</span>
                            </div>

                            {/* Review prompt */}
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/customer/garage/${service.garageId?._id}`);
                                    }}
                                    className="flex items-center gap-2 text-blue-600 text-sm font-semibold"
                                >
                                    <Star className="w-4 h-4" />
                                    Leave a Review
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    {services.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                                <Clock className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400">No services yet</h3>
                            <p className="text-slate-300 font-medium mt-2">
                                Your service history will appear here when garages record your services
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
