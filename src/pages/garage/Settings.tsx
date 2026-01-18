import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Building2, MapPin, Clock, Phone, Mail, CreditCard,
    Loader2, AlertTriangle, Landmark, User, Save, Eye, EyeOff, Check, Camera
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface BusinessInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
    serviceHours: string;
    workingDays: string;
    businessType: string;
    legalBusinessName: string;
}

interface BankInfo {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
}

export default function GarageSettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showBankNumber, setShowBankNumber] = useState(false);
    const [editingBank, setEditingBank] = useState(false);
    const [photoUrl, setPhotoUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [business, setBusiness] = useState<BusinessInfo>({
        name: '',
        email: '',
        phone: '',
        address: '',
        serviceHours: '9:00 AM - 8:00 PM',
        workingDays: 'Mon - Sat',
        businessType: 'individual',
        legalBusinessName: '',
    });

    const [bank, setBank] = useState<BankInfo>({
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        bankName: '',
    });

    const [newBank, setNewBank] = useState<BankInfo & { confirmAccountNumber: string }>({
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
        fetchGarageDetails();
    }, []);

    const fetchGarageDetails = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/garages/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setBusiness({
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.location?.address || '',
                    serviceHours: data.serviceHours || '9:00 AM - 8:00 PM',
                    workingDays: data.workingDays || 'Mon - Sat',
                    businessType: data.businessType || 'individual',
                    legalBusinessName: data.legalBusinessName || '',
                });
                if (data.bankDetails) {
                    setBank({
                        accountNumber: data.bankDetails.accountNumber || '',
                        ifscCode: data.bankDetails.ifscCode || '',
                        accountHolderName: data.bankDetails.accountHolderName || '',
                        bankName: data.bankDetails.bankName || '',
                    });
                }
                if (data.photoUrl) {
                    setPhotoUrl(data.photoUrl);
                }
            }
        } catch (err) {
            console.error('Error fetching garage details:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBusiness = async () => {
        if (!business.name || !business.email || !business.phone) {
            setError('Name, email, and phone are required');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/garages/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: business.name,
                    email: business.email,
                    phone: business.phone,
                    address: business.address,
                    serviceHours: business.serviceHours,
                    workingDays: business.workingDays,
                    businessType: business.businessType,
                    legalBusinessName: business.legalBusinessName || business.name,
                })
            });

            if (res.ok) {
                setSuccess('Business details saved successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to save');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveBank = async () => {
        if (newBank.accountNumber !== newBank.confirmAccountNumber) {
            setError('Account numbers do not match');
            return;
        }

        if (!newBank.accountNumber || !newBank.ifscCode || !newBank.accountHolderName) {
            setError('All bank details are required');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/garages/bank-details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    accountNumber: newBank.accountNumber,
                    ifscCode: newBank.ifscCode,
                    accountHolderName: newBank.accountHolderName,
                    bankName: newBank.bankName,
                })
            });

            if (res.ok) {
                setBank({
                    accountNumber: newBank.accountNumber,
                    ifscCode: newBank.ifscCode,
                    accountHolderName: newBank.accountHolderName,
                    bankName: newBank.bankName,
                });
                setEditingBank(false);
                setNewBank({
                    accountNumber: '',
                    confirmAccountNumber: '',
                    ifscCode: '',
                    accountHolderName: '',
                    bankName: '',
                });
                setSuccess('Bank details updated successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to save bank details');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setSaving(false);
        }
    };

    const maskAccountNumber = (num: string) => {
        if (!num || num.length < 4) return num;
        return '••••••' + num.slice(-4);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setUploadingPhoto(true);
        setError('');

        try {
            const { storage, auth } = await import('../../lib/firebase');
            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error('Not authenticated');

            // Upload to Firebase Storage
            const storageRef = ref(storage, `garages/${userId}/profile.${file.name.split('.').pop()}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            // Save URL to backend
            const token = await getToken();
            const res = await fetch(`${getApiUrl()}/garages/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ photoUrl: url })
            });

            if (res.ok) {
                setPhotoUrl(url);
                setSuccess('Photo updated successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                throw new Error('Failed to save photo URL');
            }
        } catch (err: any) {
            console.error('Photo upload error:', err);
            setError(err.message || 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 pt-safe pb-8">
                <div className="flex items-center gap-4 pt-4 mb-6">
                    <button onClick={() => navigate('/garage')} className="p-2 -ml-2">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Profile Settings</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30 overflow-hidden">
                            {photoUrl ? (
                                <img src={photoUrl} alt="Garage" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-white" />
                            )}
                            {uploadingPhoto && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
                        >
                            <Camera className="w-4 h-4 text-blue-600" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">{business.name || 'Your Garage'}</h2>
                        <p className="text-blue-200 text-sm">{business.email}</p>
                        <p className="text-blue-300 text-xs mt-1">Tap photo to change</p>
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-4 space-y-6">
                {/* Success/Error Messages */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {success}
                    </div>
                )}

                {/* Business Details Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm"
                >
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Business Details
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Garage Name *</label>
                            <input
                                type="text"
                                value={business.name}
                                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email *</label>
                                <input
                                    type="email"
                                    value={business.email}
                                    onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone *</label>
                                <input
                                    type="tel"
                                    value={business.phone}
                                    onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                            <textarea
                                value={business.address}
                                onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Service Hours</label>
                                <input
                                    type="text"
                                    value={business.serviceHours}
                                    onChange={(e) => setBusiness({ ...business, serviceHours: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Working Days</label>
                                <input
                                    type="text"
                                    value={business.workingDays}
                                    onChange={(e) => setBusiness({ ...business, workingDays: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Business Type</label>
                            <select
                                value={business.businessType}
                                onChange={(e) => setBusiness({ ...business, businessType: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="individual">Individual</option>
                                <option value="proprietorship">Proprietorship</option>
                                <option value="partnership">Partnership</option>
                                <option value="private_limited">Private Limited</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Legal Business Name</label>
                            <input
                                type="text"
                                value={business.legalBusinessName}
                                onChange={(e) => setBusiness({ ...business, legalBusinessName: e.target.value })}
                                placeholder="Same as garage name if not registered"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <button
                            onClick={handleSaveBusiness}
                            disabled={saving}
                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Save Business Details
                        </button>
                    </div>
                </motion.div>

                {/* Bank Details Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl p-6 shadow-sm"
                >
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-green-600" />
                        Bank Details
                    </h3>

                    {!editingBank ? (
                        <div className="space-y-4">
                            {bank.accountNumber ? (
                                <>
                                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm">Account Holder</span>
                                            <span className="font-semibold text-slate-900">{bank.accountHolderName}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm">Account Number</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900 font-mono">
                                                    {showBankNumber ? bank.accountNumber : maskAccountNumber(bank.accountNumber)}
                                                </span>
                                                <button onClick={() => setShowBankNumber(!showBankNumber)}>
                                                    {showBankNumber ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm">IFSC Code</span>
                                            <span className="font-semibold text-slate-900 font-mono">{bank.ifscCode}</span>
                                        </div>
                                        {bank.bankName && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-sm">Bank</span>
                                                <span className="font-semibold text-slate-900">{bank.bankName}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setEditingBank(true)}
                                        className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold"
                                    >
                                        Change Bank Details
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <CreditCard className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 mb-4">No bank details added yet</p>
                                    <button
                                        onClick={() => setEditingBank(true)}
                                        className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold"
                                    >
                                        Add Bank Details
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-amber-50 p-4 rounded-xl mb-4">
                                <p className="text-amber-800 text-sm">
                                    ⚠️ Changing bank details will affect where your earnings are deposited.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Account Holder Name *</label>
                                <input
                                    type="text"
                                    value={newBank.accountHolderName}
                                    onChange={(e) => setNewBank({ ...newBank, accountHolderName: e.target.value })}
                                    placeholder="As per bank records"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Account Number *</label>
                                <input
                                    type="text"
                                    value={newBank.accountNumber}
                                    onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                                    placeholder="Enter account number"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Account Number *</label>
                                <input
                                    type="text"
                                    value={newBank.confirmAccountNumber}
                                    onChange={(e) => setNewBank({ ...newBank, confirmAccountNumber: e.target.value })}
                                    placeholder="Re-enter account number"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code *</label>
                                <input
                                    type="text"
                                    value={newBank.ifscCode}
                                    onChange={(e) => setNewBank({ ...newBank, ifscCode: e.target.value.toUpperCase() })}
                                    placeholder="SBIN0001234"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={newBank.bankName}
                                    onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                                    placeholder="State Bank of India"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setEditingBank(false);
                                        setNewBank({
                                            accountNumber: '',
                                            confirmAccountNumber: '',
                                            ifscCode: '',
                                            accountHolderName: '',
                                            bankName: '',
                                        });
                                        setError('');
                                    }}
                                    className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveBank}
                                    disabled={saving}
                                    className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
