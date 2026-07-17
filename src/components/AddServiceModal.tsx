import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, IndianRupee, Send, Loader2, Check, QrCode, Banknote, ShieldCheck } from 'lucide-react';
import {
    getTaxonomy,
    createServiceRecordWithOtp,
    verifyServiceOtp,
    completeServicePayment,
    type Taxonomy,
    type PaymentSummary,
} from '../lib/data';

interface AddServiceModalProps {
    isOpen: boolean;
    garageId: string;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'form' | 'otp' | 'payment' | 'success';

const VEHICLE_TYPES: Array<{ code: string; label: string }> = [
    { code: '2w', label: '2W' },
    { code: '3w', label: '3W' },
    { code: '4w', label: '4W' },
    { code: 'other', label: 'Other' },
];

export default function AddServiceModal({ isOpen, garageId, onClose, onSuccess }: AddServiceModalProps) {
    const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
    const [step, setStep] = useState<Step>('form');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [customerPhone, setCustomerPhone] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [makeCode, setMakeCode] = useState('');
    const [modelCode, setModelCode] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [modelYear, setModelYear] = useState('');
    const [odometer, setOdometer] = useState('');
    const [serviceCodes, setServiceCodes] = useState<string[]>([]);
    const [failureCodes, setFailureCodes] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [amount, setAmount] = useState('');

    const [recordId, setRecordId] = useState('');
    const [devOtp, setDevOtp] = useState('');
    const [otp, setOtp] = useState('');
    const [summary, setSummary] = useState<PaymentSummary | null>(null);

    useEffect(() => {
        if (isOpen && !taxonomy) {
            getTaxonomy().then(setTaxonomy).catch(() => setError('Could not load service options.'));
        }
        if (!isOpen) {
            setStep('form'); setError(''); setCustomerPhone(''); setVehicleType('');
            setMakeCode(''); setModelCode(''); setVehicleNumber(''); setModelYear('');
            setOdometer(''); setServiceCodes([]); setFailureCodes([]); setNotes(''); setAmount('');
            setRecordId(''); setDevOtp(''); setOtp(''); setSummary(null);
        }
    }, [isOpen, taxonomy]);

    const makes = useMemo(
        () => (taxonomy?.makes ?? []).filter((m) => !vehicleType || m.vehicle_types.includes(vehicleType)),
        [taxonomy, vehicleType]
    );
    const models = useMemo(
        () => (taxonomy?.models ?? []).filter((m) => m.make_code === makeCode && m.vehicle_type === vehicleType),
        [taxonomy, makeCode, vehicleType]
    );

    const toggle = (list: string[], code: string, set: (v: string[]) => void) =>
        set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

    const canSubmit =
        customerPhone.replace(/\D/g, '').length === 10 &&
        !!vehicleType &&
        (!!makeCode || vehicleType === 'other') &&
        (!!modelCode || vehicleType === 'other') &&
        serviceCodes.length > 0 &&
        failureCodes.length > 0 &&
        Number(amount) > 0;

    const handleCreate = async () => {
        setError('');
        if (!garageId) { setError('Garage not loaded yet.'); return; }
        setLoading(true);
        try {
            const res = await createServiceRecordWithOtp({
                garageId,
                customerPhone,
                vehicleType,
                vehicleMakeCode: makeCode || null,
                vehicleModelCode: modelCode || null,
                vehicleMakeOther: vehicleType === 'other' ? 'Other' : null,
                vehicleModelOther: vehicleType === 'other' ? 'Other' : null,
                vehicleNumber: vehicleNumber.trim().toUpperCase() || null,
                modelYear: modelYear ? Number(modelYear) : null,
                odometerKm: odometer ? Number(odometer) : null,
                serviceCodes,
                failureCodes,
                serviceNotes: notes.trim() || null,
                amount: Number(amount),
                customerHasApp: true,
            });
            setRecordId(res.serviceRecordId);
            setDevOtp(res.devOtp || '');
            setStep('otp');
        } catch (err: any) {
            setError(err.message || 'Could not create the service record.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await verifyServiceOtp(recordId, otp.trim());
            if (res.ok) {
                setStep('payment');
            } else {
                setError(
                    res.reason === 'invalid'
                        ? `Incorrect OTP${res.remainingAttempts != null ? ` (${res.remainingAttempts} left)` : ''}.`
                        : res.reason === 'expired'
                            ? 'OTP expired.'
                            : 'Too many attempts.'
                );
            }
        } catch (err: any) {
            setError(err.message || 'OTP verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (method: 'qr' | 'cash') => {
        setError('');
        setLoading(true);
        try {
            const s = await completeServicePayment(recordId, method);
            setSummary(s);
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Payment failed.');
        } finally {
            setLoading(false);
        }
    };

    const chip = (active: boolean) =>
        `px-4 py-2 rounded-full text-sm font-semibold transition-all ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                            <h2 className="text-2xl font-black text-slate-900">
                                {step === 'form' ? 'Add Service' : step === 'otp' ? 'Verify OTP' : step === 'payment' ? 'Complete Payment' : 'Done'}
                            </h2>
                            <button onClick={onClose} className="text-slate-400 active:scale-90 transition-transform">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* ---- FORM ---- */}
                        {step === 'form' && (
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Customer phone</label>
                                    <div className="relative mt-2">
                                        <Phone className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input type="tel" value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="10-digit number"
                                            className="w-full h-14 bg-slate-50 rounded-2xl pl-12 pr-4 text-lg font-medium" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Vehicle type</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {VEHICLE_TYPES.map((t) => (
                                            <button key={t.code} onClick={() => { setVehicleType(t.code); setMakeCode(''); setModelCode(''); }} className={chip(vehicleType === t.code)}>{t.label}</button>
                                        ))}
                                    </div>
                                </div>

                                {vehicleType && vehicleType !== 'other' && (
                                    <div>
                                        <label className="text-sm font-semibold text-slate-600">Make</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {makes.map((m) => (<button key={m.code} onClick={() => { setMakeCode(m.code); setModelCode(''); }} className={chip(makeCode === m.code)}>{m.display_name}</button>))}
                                        </div>
                                    </div>
                                )}

                                {makeCode && (
                                    <div>
                                        <label className="text-sm font-semibold text-slate-600">Model</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {models.map((m) => (<button key={m.code} onClick={() => setModelCode(m.code)} className={chip(modelCode === m.code)}>{m.display_name}</button>))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-semibold text-slate-600">Vehicle no.</label>
                                        <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="MH12AB1234" className="w-full h-12 bg-slate-50 rounded-xl px-3 mt-2 font-medium" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-600">Year</label>
                                        <input value={modelYear} onChange={(e) => setModelYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2021" className="w-full h-12 bg-slate-50 rounded-xl px-3 mt-2 font-medium" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Odometer (km)</label>
                                    <input value={odometer} onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ''))} placeholder="Optional" className="w-full h-12 bg-slate-50 rounded-xl px-3 mt-2 font-medium" />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Services performed</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(taxonomy?.services ?? []).map((s) => (<button key={s.code} onClick={() => toggle(serviceCodes, s.code, setServiceCodes)} className={chip(serviceCodes.includes(s.code))}>{s.display_name}</button>))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Failures / symptoms</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(taxonomy?.failures ?? []).map((f) => (<button key={f.code} onClick={() => toggle(failureCodes, f.code, setFailureCodes)} className={chip(failureCodes.includes(f.code))}>{f.display_name}</button>))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Notes (optional)</label>
                                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full bg-slate-50 rounded-2xl px-4 py-3 mt-2 font-medium" />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Total amount</label>
                                    <div className="relative mt-2">
                                        <IndianRupee className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className="w-full h-14 bg-slate-50 rounded-2xl pl-12 pr-4 text-lg font-semibold" />
                                    </div>
                                </div>

                                {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}

                                <button onClick={handleCreate} disabled={!canSubmit || loading}
                                    className="w-full h-16 btn-premium rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 disabled:opacity-40">
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><Send className="w-5 h-5" /> Create record &amp; send OTP</>)}
                                </button>
                            </div>
                        )}

                        {/* ---- OTP ---- */}
                        {step === 'otp' && (
                            <div className="p-6 space-y-5">
                                <p className="text-slate-500">The customer shares the 6-digit OTP with you. The garage cannot skip this step.</p>
                                {devOtp && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 font-bold text-center">
                                        Dev OTP: {devOtp}
                                    </div>
                                )}
                                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000" maxLength={6}
                                    className="w-full h-20 bg-slate-50 rounded-3xl text-center text-4xl font-bold tracking-[1rem]" />
                                {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}
                                <button onClick={handleVerify} disabled={otp.length < 6 || loading}
                                    className="w-full h-16 btn-premium rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 disabled:opacity-40">
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Verify OTP'}
                                </button>
                            </div>
                        )}

                        {/* ---- PAYMENT ---- */}
                        {step === 'payment' && (
                            <div className="p-6 space-y-4">
                                <p className="text-slate-500">QR is a verified transaction (platform fee ₹1.90). Cash is unverified (no fee).</p>
                                {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}
                                <button onClick={() => handlePayment('qr')} disabled={loading}
                                    className="w-full h-16 btn-premium rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 disabled:opacity-40">
                                    <QrCode className="w-5 h-5" /> Complete with QR (verified)
                                </button>
                                <button onClick={() => handlePayment('cash')} disabled={loading}
                                    className="w-full h-16 bg-slate-900 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 disabled:opacity-40">
                                    <Banknote className="w-5 h-5" /> Complete with Cash
                                </button>
                            </div>
                        )}

                        {/* ---- SUCCESS ---- */}
                        {step === 'success' && summary && (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">Payment complete</h3>
                                <p className="text-slate-500 mb-4">Invoice <span className="font-mono font-semibold text-slate-700">{summary.invoice_number}</span></p>
                                <div className="w-full bg-slate-50 rounded-2xl p-4 space-y-2 text-left">
                                    <div className="flex justify-between"><span className="text-slate-500">Customer pays</span><span className="font-bold">₹{summary.customer_pays.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Platform fee</span><span className="font-bold">₹{summary.platform_fee.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Garage receives</span><span className="font-bold">₹{summary.garage_receives.toFixed(2)}</span></div>
                                    {summary.verified && <div className="flex items-center gap-1 text-green-600 font-semibold pt-1"><ShieldCheck className="w-4 h-4" /> Verified transaction</div>}
                                </div>
                                <button onClick={onSuccess} className="mt-6 w-full h-14 btn-premium rounded-2xl font-bold text-white">Done</button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
