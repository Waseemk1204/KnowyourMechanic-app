import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Phone, FileText, IndianRupee, Send, Loader2,
    Check, AlertTriangle, QrCode, Banknote, ArrowLeft
} from 'lucide-react';

type Step = 'form' | 'otp' | 'payment' | 'success';

interface AddServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddServiceModal({ isOpen, onClose, onSuccess }: AddServiceModalProps) {
    const [step, setStep] = useState<Step>('form');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [customerPhone, setCustomerPhone] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    // Service tracking
    const [serviceId, setServiceId] = useState('');
    const [otp, setOtp] = useState('');
    const [serviceDetails, setServiceDetails] = useState<any>(null);
    const [showCashWarning, setShowCashWarning] = useState(false);

    const getApiUrl = () => {
        return (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4001/api';
    };

    const getToken = async () => {
        const { auth } = await import('../lib/firebase');
        return auth.currentUser?.getIdToken();
    };

    const handleInitiate = async () => {
        if (!customerPhone || !description || !amount) {
            setError('All fields are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/service-records/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    customerPhone: customerPhone.startsWith('+91') ? customerPhone : `+91${customerPhone}`,
                    description,
                    amount: parseFloat(amount),
                })
            });

            const data = await res.json();

            if (res.ok) {
                setServiceId(data.serviceId);
                setStep('otp');
                // For testing, show OTP visibly
                if (data._testOTP) {
                    console.log('Test OTP:', data._testOTP);
                    alert(`TEST OTP: ${data._testOTP}\n\nIn production, this will be sent via WhatsApp.`);
                }
            } else {
                console.error('Service initiate error:', data);
                setError(data.message || 'Failed to send OTP');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            setError('Please enter 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/service-records/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ serviceId, otp })
            });

            const data = await res.json();

            if (res.ok) {
                setServiceDetails(data);
                setStep('payment');
            } else {
                setError(data.message || 'Invalid OTP');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (method: 'cash' | 'razorpay') => {
        setLoading(true);
        setError('');

        try {
            const token = await getToken();

            if (method === 'razorpay') {
                // TODO: Integrate Razorpay checkout
                // For now, just mark as cash
                alert('Razorpay integration coming soon! Using cash for now.');
            }

            const res = await fetch(`${getApiUrl()}/service-records/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    serviceId,
                    paymentMethod: method,
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStep('success');
                setTimeout(() => {
                    onSuccess();
                    resetForm();
                }, 2000);
            } else {
                setError(data.message || 'Payment failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep('form');
        setCustomerPhone('');
        setDescription('');
        setAmount('');
        setOtp('');
        setServiceId('');
        setServiceDetails(null);
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        {step !== 'form' && step !== 'success' && (
                            <button onClick={() => setStep(step === 'payment' ? 'otp' : 'form')}>
                                <ArrowLeft className="w-6 h-6 text-slate-400" />
                            </button>
                        )}
                        <h3 className="text-xl font-bold text-slate-900 flex-1 text-center">
                            {step === 'form' && 'Add Service'}
                            {step === 'otp' && 'Verify OTP'}
                            {step === 'payment' && 'Select Payment'}
                            {step === 'success' && 'Success!'}
                        </h3>
                        <button onClick={handleClose}>
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Step: Form */}
                    {step === 'form' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Customer Phone
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="9876543210"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Service Description
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Oil change, brake repair, etc."
                                        rows={3}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Amount (₹)
                                </label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="500"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleInitiate}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Send OTP to Customer
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step: OTP */}
                    {step === 'otp' && (
                        <div className="space-y-4">
                            <p className="text-slate-500 text-center mb-4">
                                Ask the customer for the OTP sent to their phone.
                            </p>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 text-center">
                                    Enter 6-digit OTP
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-full text-center text-2xl tracking-widest py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength={6}
                                />
                            </div>

                            <button
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.length !== 6}
                                className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Verify OTP
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step: Payment */}
                    {step === 'payment' && serviceDetails && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                                <div className="flex justify-between mb-2">
                                    <span className="text-slate-500">Service Amount</span>
                                    <span className="text-slate-900">₹{serviceDetails.garageEarnings}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-slate-500">Platform Fee</span>
                                    <span className="text-slate-500">+₹{serviceDetails.platformFee}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200">
                                    <span className="font-bold">Total Amount</span>
                                    <span className="font-bold text-slate-900">₹{(parseFloat(serviceDetails.garageEarnings) + parseFloat(serviceDetails.platformFee)).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handlePayment('razorpay')}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <QrCode className="w-5 h-5" />
                                Pay with QR / Razorpay
                            </button>

                            <button
                                onClick={() => setShowCashWarning(true)}
                                disabled={loading}
                                className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <Banknote className="w-5 h-5" />
                                Cash Payment
                            </button>
                        </div>
                    )}

                    {/* Cash Payment Warning Modal */}
                    <AnimatePresence>
                        {showCashWarning && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-white z-10 flex flex-col"
                            >
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                                        <AlertTriangle className="w-12 h-12 text-amber-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4">Cash Payment Warning</h3>
                                    <p className="text-slate-600 mb-6 text-lg">
                                        Services recorded with cash payment will be marked as <span className="font-bold text-amber-600">"Less Reliable"</span> in your portfolio.
                                    </p>
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-left">
                                        <p className="text-amber-800 text-sm">
                                            <strong>This affects:</strong>
                                        </p>
                                        <ul className="text-amber-700 text-sm mt-2 space-y-1">
                                            <li>• Your services will show a "Less Reliable" badge</li>
                                            <li>• Customers may trust online payments more</li>
                                            <li>• Your reliability score could be affected</li>
                                        </ul>
                                    </div>
                                    <p className="text-slate-500 text-sm mb-8">
                                        We recommend using QR/Razorpay for better credibility.
                                    </p>
                                </div>
                                <div className="p-6 space-y-3 border-t border-slate-100">
                                    <button
                                        onClick={() => setShowCashWarning(false)}
                                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold"
                                    >
                                        Use QR / Razorpay Instead
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCashWarning(false);
                                            handlePayment('cash');
                                        }}
                                        disabled={loading}
                                        className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                        ) : (
                                            'Continue with Cash Anyway'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step: Success */}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Service Recorded!</h3>
                            <p className="text-slate-500">Added to your portfolio</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
