import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Building2, MapPin, Clock, Phone, Mail, CreditCard,
    CheckCircle, ArrowRight, ArrowLeft, Loader2, AlertTriangle,
    Landmark, User, FileText
} from 'lucide-react';
import TimeRangePicker from '../../components/TimeRangePicker';
import WorkingDaysPicker from '../../components/WorkingDaysPicker';
import LocationPicker from '../../components/LocationPicker';

type Step = 'business' | 'bank' | 'review' | 'success';

interface BusinessInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
    coordinates: [number, number];
    serviceHours: string;
    workingDays: string[];
    businessType: string;
    legalBusinessName: string;
}

interface BankInfo {
    accountNumber: string;
    confirmAccountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
}

export default function GarageOnboardingWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('business');
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [error, setError] = useState('');

    const [business, setBusiness] = useState<BusinessInfo>({
        name: '',
        email: '',
        phone: '',
        address: '',
        coordinates: [73.8567, 18.5204], // Default to Pune
        serviceHours: '9:00 AM - 8:00 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        businessType: 'individual',
        legalBusinessName: '',
    });

    const [bank, setBank] = useState<BankInfo>({
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        bankName: '',
    });

    const getApiUrl = () => {
        return (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4001/api';
    };

    const getToken = async () => {
        const { auth } = await import('../../lib/firebase');
        return auth.currentUser?.getIdToken();
    };

    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/onboarding/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.onboardingStatus === 'completed') {
                    navigate('/garage');
                } else if (data.onboardingStatus === 'bank_details') {
                    setStep('bank');
                }
            }
        } catch (err) {
            console.error('Error checking status:', err);
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleBusinessSubmit = async () => {
        if (!business.name || !business.email || !business.phone) {
            setError('Name, email, and phone are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/onboarding/business-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...business,
                    legalBusinessName: business.legalBusinessName || business.name,
                })
            });

            if (res.ok) {
                setStep('bank');
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to save');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleBankSubmit = async () => {
        if (bank.accountNumber !== bank.confirmAccountNumber) {
            setError('Account numbers do not match');
            return;
        }

        if (!bank.accountNumber || !bank.ifscCode || !bank.accountHolderName) {
            setError('All bank details are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/onboarding/bank-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bank)
            });

            const data = await res.json();

            if (res.ok) {
                setStep('success');
                setTimeout(() => navigate('/garage'), 2000);
            } else {
                setError(data.message || 'Failed to save');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleSkipBank = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            await fetch(`${getApiUrl()}/onboarding/complete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            navigate('/garage');
        } catch (err) {
            setError('Failed to skip');
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const stepIndicator = (
        <div className="flex items-center justify-center gap-2 mb-8">
            {['business', 'bank', 'success'].map((s, i) => (
                <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${step === s || ['business', 'bank', 'success'].indexOf(step) > i
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-500'}`}
                    >
                        {i + 1}
                    </div>
                    {i < 2 && <div className={`w-8 h-0.5 ${['business', 'bank', 'success'].indexOf(step) > i ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pt-safe pb-10 px-6">
            <div className="max-w-md mx-auto pt-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-black text-slate-900 mb-2">
                        {step === 'business' && 'Business Details'}
                        {step === 'bank' && 'Bank Account'}
                        {step === 'success' && 'All Set!'}
                    </h1>
                    <p className="text-slate-500">
                        {step === 'business' && 'Tell us about your garage'}
                        {step === 'bank' && 'For receiving payments'}
                        {step === 'success' && 'Your garage is ready'}
                    </p>
                </div>

                {stepIndicator}

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* Step: Business Info */}
                    {step === 'business' && (
                        <motion.div
                            key="business"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Garage Name *</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={business.name}
                                        onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                                        placeholder="Your Garage Name"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email *</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={business.email}
                                        onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                                        placeholder="garage@email.com"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone *</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={business.phone}
                                        onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                                        placeholder="9876543210"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <LocationPicker
                                value={business.address}
                                coordinates={business.coordinates}
                                onChange={(address, coords) => setBusiness({
                                    ...business,
                                    address,
                                    coordinates: coords
                                })}
                                placeholder="Enter your garage address"
                            />

                            <TimeRangePicker
                                value={business.serviceHours}
                                onChange={(value) => setBusiness({ ...business, serviceHours: value })}
                            />

                            <WorkingDaysPicker
                                value={business.workingDays}
                                onChange={(value) => setBusiness({ ...business, workingDays: value })}
                            />

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Business Type</label>
                                <select
                                    value={business.businessType}
                                    onChange={(e) => setBusiness({ ...business, businessType: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="individual">Individual</option>
                                    <option value="proprietorship">Proprietorship</option>
                                    <option value="partnership">Partnership</option>
                                    <option value="private_limited">Private Limited</option>
                                </select>
                            </div>

                            <button
                                onClick={handleBusinessSubmit}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-6"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>Continue <ArrowRight className="w-5 h-5" /></>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* Step: Bank Details */}
                    {step === 'bank' && (
                        <motion.div
                            key="bank"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div className="bg-blue-50 p-4 rounded-xl mb-4">
                                <p className="text-blue-800 text-sm">
                                    💰 Your earnings will be transferred to this account automatically.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Account Holder Name *</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={bank.accountHolderName}
                                        onChange={(e) => setBank({ ...bank, accountHolderName: e.target.value })}
                                        placeholder="As per bank records"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Account Number *</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={bank.accountNumber}
                                        onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
                                        placeholder="Enter account number"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Account Number *</label>
                                <input
                                    type="text"
                                    value={bank.confirmAccountNumber}
                                    onChange={(e) => setBank({ ...bank, confirmAccountNumber: e.target.value })}
                                    placeholder="Re-enter account number"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code *</label>
                                <div className="relative">
                                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={bank.ifscCode}
                                        onChange={(e) => setBank({ ...bank, ifscCode: e.target.value.toUpperCase() })}
                                        placeholder="SBIN0001234"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 uppercase"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={bank.bankName}
                                    onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                                    placeholder="State Bank of India"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setStep('business')}
                                    className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="w-5 h-5" /> Back
                                </button>
                                <button
                                    onClick={handleBankSubmit}
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>Complete <CheckCircle className="w-5 h-5" /></>
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={handleSkipBank}
                                className="w-full text-slate-400 text-sm font-semibold mt-2"
                            >
                                Skip for now (add later)
                            </button>
                        </motion.div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12"
                        >
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Welcome Aboard!</h2>
                            <p className="text-slate-500 mb-8">Your garage is all set up and ready to go.</p>
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                            <p className="text-slate-400 text-sm mt-2">Redirecting to dashboard...</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
