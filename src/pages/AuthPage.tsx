import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Loader2, Wrench, Car, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../lib/auth';
import { syncUser } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type Step = 'phone' | 'otp' | 'role';

export default function AuthPage() {
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { setUserData, setUser } = useAuth();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await sendOtp(phone);
            setStep('otp');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length < 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const user = await verifyOtp(otp);
            setUser(user);

            // Check if user exists in backend
            try {
                // Check if user exists in backend
                const { getCurrentUserData } = await import('../lib/api');
                const response = await getCurrentUserData();

                if (response.data) {
                    const userData = response.data;
                    setUserData(userData);
                    localStorage.setItem('userRole', userData.role);
                    localStorage.setItem('userData', JSON.stringify(userData));

                    if (userData.role === 'garage') {
                        navigate('/garage');
                    } else {
                        navigate('/customer');
                    }
                    return;
                } else {
                    // User not found in backend - proceed to role selection
                    console.log('New user detected');
                    setStep('role');
                }
            } catch (e) {
                console.log('Error checking user:', e);
                setStep('role');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid OTP code');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleSelect = async (role: 'customer' | 'garage') => {
        setLoading(true);
        setError('');

        try {
            const result = await syncUser(role);
            if (result.error) {
                setError(result.error);
                return;
            }

            if (result.data) {
                setUserData(result.data);
                localStorage.setItem('userRole', role);
                localStorage.setItem('userData', JSON.stringify(result.data));

                setTimeout(() => {
                    if (role === 'garage') {
                        navigate('/garage/onboarding');
                    } else {
                        navigate('/customer');
                    }
                }, 400);
            }
        } catch (err: any) {
            setError(err.message || 'Error creating profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-safe px-6 pb-12 overflow-hidden text-slate-900">
            <div id="recaptcha-container"></div>

            <AnimatePresence mode="wait">
                {step === 'phone' && (
                    <motion.div
                        key="phone"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="flex-1 flex flex-col"
                    >
                        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                            <div className="w-28 h-28 rounded-[2rem] bg-white shadow-2xl shadow-blue-200/50 flex items-center justify-center mb-10 mx-auto overflow-hidden">
                                <img src="/logo.jpg" alt="KnowYourMechanic" className="w-full h-full object-cover" />
                            </div>

                            <div className="text-center mb-10">
                                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
                                    KnowyourMechanic
                                </h1>
                                <p className="text-slate-500 text-lg">
                                    Trusted mechanics at your fingertips
                                </p>
                            </div>

                            <form onSubmit={handleSendOtp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Phone Number</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-slate-200 pr-3">
                                            <span className="text-slate-500 font-medium">+91</span>
                                        </div>
                                        <input
                                            type="tel"
                                            placeholder="00000 00000"
                                            className="w-full h-16 bg-white rounded-2xl pl-20 pr-4 text-xl font-semibold tracking-wide placeholder:text-slate-300"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={loading || phone.length < 10}
                                    className="w-full h-16 btn-premium rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale transition-all"
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            Continue
                                            <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        <div className="mt-auto text-center py-6">
                            <p className="text-slate-400 text-xs">
                                By continuing, you agree to our Terms & Privacy Policy
                            </p>
                        </div>
                    </motion.div>
                )}

                {step === 'otp' && (
                    <motion.div
                        key="otp"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="flex-1 flex flex-col max-w-sm mx-auto w-full pt-10"
                    >
                        <button
                            onClick={() => setStep('phone')}
                            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 self-start mb-8 transition-colors active:bg-slate-100"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-slate-900 mb-3">Check your phone</h2>
                            <p className="text-slate-500 text-lg">
                                We've sent a 6-digit code to <span className="text-blue-600 font-semibold">+91 {phone}</span>
                            </p>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="space-y-8">
                            <div className="flex justify-center">
                                <input
                                    type="text"
                                    placeholder="000000"
                                    className="w-full h-20 bg-white rounded-3xl text-center text-4xl font-bold tracking-[1rem] placeholder:text-slate-200"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    maxLength={6}
                                />
                            </div>

                            {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full h-16 btn-premium rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-xl shadow-blue-500/20"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Verify Code'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('phone')}
                                className="w-full text-blue-600 font-bold hover:underline"
                            >
                                Resend code
                            </button>
                        </form>
                    </motion.div>
                )}

                {step === 'role' && (
                    <motion.div
                        key="role"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
                    >
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Join us as</h2>
                            <p className="text-slate-500">Choose your account type to get started</p>
                        </div>

                        <div className="space-y-6">
                            <button
                                onClick={() => handleRoleSelect('customer')}
                                disabled={loading}
                                className="w-full premium-card p-8 flex items-center gap-6 group hover:border-blue-300 transition-all text-left"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 text-blue-600 group-hover:text-white transition-colors shadow-inner">
                                    <Car className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-xl text-slate-900">Customer</h3>
                                    <p className="text-slate-500 text-sm">Find local experts</p>
                                </div>
                                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-blue-600 transition-colors" />
                            </button>

                            <button
                                onClick={() => handleRoleSelect('garage')}
                                disabled={loading}
                                className="w-full premium-card p-8 flex items-center gap-6 group hover:border-blue-300 transition-all text-left"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-600 text-slate-600 group-hover:text-white transition-colors shadow-inner">
                                    <Wrench className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-xl text-slate-900">Garage Owner</h3>
                                    <p className="text-slate-500 text-sm">Grow your business</p>
                                </div>
                                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-blue-600 transition-colors" />
                            </button>
                        </div>

                        {error && <p className="text-red-500 text-sm font-medium text-center mt-6 bg-red-50 py-2 rounded-lg">{error}</p>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
