import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wrench, Loader2, Calendar, AlertCircle, ArrowLeft, MapPin, Star, X, Check, Edit2 } from 'lucide-react';
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

interface Review {
    _id: string;
    rating: number;
    comment?: string;
}

interface GarageReviews {
    [garageId: string]: Review | null;
}

export default function CustomerActivity() {
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [garageReviews, setGarageReviews] = useState<GarageReviews>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reviewingGarageId, setReviewingGarageId] = useState<string | null>(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
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
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setServices(data);

                // Fetch reviews for each unique garage
                const uniqueGarageIds = [...new Set(data.map((s: ServiceRecord) => s.garageId?._id).filter(Boolean))];
                for (const garageId of uniqueGarageIds) {
                    await fetchMyReview(garageId as string, token);
                }
            }
        } catch (err) {
            console.error('Error fetching service history:', err);
            setError('Failed to load service history');
        } finally {
            setLoading(false);
        }
    };

    const fetchMyReview = async (garageId: string, token: string) => {
        try {
            const res = await fetch(`${getApiUrl()}/reviews/my-review/${garageId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGarageReviews(prev => ({ ...prev, [garageId]: data.review }));
            }
        } catch (err) {
            console.error('Error fetching review:', err);
        }
    };

    const startReview = (garageId: string) => {
        const existingReview = garageReviews[garageId];
        if (existingReview) {
            setReviewRating(existingReview.rating);
            setReviewComment(existingReview.comment || '');
        } else {
            setReviewRating(0);
            setReviewComment('');
        }
        setReviewingGarageId(garageId);
    };

    const handleSubmitReview = async () => {
        if (reviewRating === 0 || !reviewingGarageId) return;

        setSubmittingReview(true);
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`${getApiUrl()}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    garageId: reviewingGarageId,
                    rating: reviewRating,
                    comment: reviewComment
                })
            });

            if (res.ok) {
                const data = await res.json();
                setGarageReviews(prev => ({ ...prev, [reviewingGarageId]: data.review }));
                setReviewingGarageId(null);
            } else {
                const errData = await res.json();
                alert(errData.message || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to submit review');
        } finally {
            setSubmittingReview(false);
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
            {/* Header */}
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
                    {services.map((service, i) => {
                        const garageId = service.garageId?._id;
                        const myReview = garageId ? garageReviews[garageId] : null;
                        const isReviewing = reviewingGarageId === garageId;

                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                key={service._id}
                                className="bg-white rounded-2xl p-5 shadow-sm"
                            >
                                {/* Service Info */}
                                <div
                                    className="flex items-start gap-4 mb-3 cursor-pointer"
                                    onClick={() => garageId && navigate(`/customer/garage/${garageId}`)}
                                >
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

                                {/* Date, Amount */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-100">
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

                                {/* Review Section */}
                                <div className="pt-3 border-t border-slate-100">
                                    {isReviewing ? (
                                        // Inline Review Form
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-700">Your Rating</span>
                                                <button onClick={() => setReviewingGarageId(null)}>
                                                    <X className="w-5 h-5 text-slate-400" />
                                                </button>
                                            </div>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setReviewRating(star)}
                                                        className="transition-transform hover:scale-110"
                                                    >
                                                        <Star
                                                            className={`w-8 h-8 ${star <= reviewRating
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-slate-300'
                                                                }`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                placeholder="Add a comment (optional)"
                                                rows={2}
                                                maxLength={500}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={handleSubmitReview}
                                                disabled={submittingReview || reviewRating === 0}
                                                className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {submittingReview ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        {myReview ? 'Update Review' : 'Submit Review'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : myReview ? (
                                        // Show Existing Review
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star
                                                            key={star}
                                                            className={`w-4 h-4 ${star <= myReview.rating
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-slate-300'
                                                                }`}
                                                        />
                                                    ))}
                                                    <span className="text-sm text-slate-500 ml-2">Your Review</span>
                                                </div>
                                                <button
                                                    onClick={() => garageId && startReview(garageId)}
                                                    className="flex items-center gap-1 text-blue-600 text-sm font-semibold"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    Edit
                                                </button>
                                            </div>
                                            {myReview.comment && (
                                                <p className="text-sm text-slate-600">{myReview.comment}</p>
                                            )}
                                        </div>
                                    ) : (
                                        // Rate Prompt
                                        <button
                                            onClick={() => garageId && startReview(garageId)}
                                            className="flex items-center gap-2 text-blue-600 text-sm font-semibold"
                                        >
                                            <Star className="w-4 h-4" />
                                            Rate this service
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}

                    {services.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                                <Clock className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400">No services yet</h3>
                            <p className="text-slate-300 font-medium mt-2">
                                Your service history will appear here
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
