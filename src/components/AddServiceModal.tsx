import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, IndianRupee, Send, Loader2, Check } from 'lucide-react';
import {
    getTaxonomy,
    createServiceRecord,
    type Taxonomy,
} from '../lib/data';

interface AddServiceModalProps {
    isOpen: boolean;
    garageId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const VEHICLE_TYPES: Array<{ code: string; label: string }> = [
    { code: '2w', label: '2W' },
    { code: '3w', label: '3W' },
    { code: '4w', label: '4W' },
    { code: 'other', label: 'Other' },
];

export default function AddServiceModal({ isOpen, garageId, onClose, onSuccess }: AddServiceModalProps) {
    const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

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

    useEffect(() => {
        if (isOpen && !taxonomy) {
            getTaxonomy().then(setTaxonomy).catch(() => setError('Could not load service options.'));
        }
        if (!isOpen) {
            setDone(false); setError(''); setCustomerPhone(''); setVehicleType('');
            setMakeCode(''); setModelCode(''); setVehicleNumber(''); setModelYear('');
            setOdometer(''); setServiceCodes([]); setFailureCodes([]); setNotes(''); setAmount('');
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

    const handleSubmit = async () => {
        setError('');
        if (!garageId) { setError('Garage not loaded yet.'); return; }
        setLoading(true);
        try {
            await createServiceRecord({
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
            setDone(true);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Could not create the service record.');
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                            <h2 className="text-2xl font-black text-slate-900">Add Service</h2>
                            <button onClick={onClose} className="text-slate-400 active:scale-90 transition-transform">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {done ? (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">Service record created</h3>
                                <p className="text-slate-500">
                                    The customer OTP will be sent once SMS delivery is live. It now appears on your dashboard.
                                </p>
                                <button onClick={onClose} className="mt-6 w-full h-14 btn-premium rounded-2xl font-bold text-white">
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Customer phone</label>
                                    <div className="relative mt-2">
                                        <Phone className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="10-digit number"
                                            className="w-full h-14 bg-slate-50 rounded-2xl pl-12 pr-4 text-lg font-medium"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Vehicle type</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {VEHICLE_TYPES.map((t) => (
                                            <button
                                                key={t.code}
                                                onClick={() => { setVehicleType(t.code); setMakeCode(''); setModelCode(''); }}
                                                className={chip(vehicleType === t.code)}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {vehicleType && vehicleType !== 'other' && (
                                    <div>
                                        <label className="text-sm font-semibold text-slate-600">Make</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {makes.map((m) => (
                                                <button key={m.code} onClick={() => { setMakeCode(m.code); setModelCode(''); }} className={chip(makeCode === m.code)}>
                                                    {m.display_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {makeCode && (
                                    <div>
                                        <label className="text-sm font-semibold text-slate-600">Model</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {models.map((m) => (
                                                <button key={m.code} onClick={() => setModelCode(m.code)} className={chip(modelCode === m.code)}>
                                                    {m.display_name}
                                                </button>
                                            ))}
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
                                        {(taxonomy?.services ?? []).map((s) => (
                                            <button key={s.code} onClick={() => toggle(serviceCodes, s.code, setServiceCodes)} className={chip(serviceCodes.includes(s.code))}>
                                                {s.display_name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-600">Failures / symptoms</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(taxonomy?.failures ?? []).map((f) => (
                                            <button key={f.code} onClick={() => toggle(failureCodes, f.code, setFailureCodes)} className={chip(failureCodes.includes(f.code))}>
                                                {f.display_name}
                                            </button>
                                        ))}
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

                                <button
                                    onClick={handleSubmit}
                                    disabled={!canSubmit || loading}
                                    className="w-full h-16 btn-premium rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><Send className="w-5 h-5" /> Create record &amp; send OTP</>)}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
