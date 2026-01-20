import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Car, Save, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CustomerProfile() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [profile, setProfile] = useState({
        name: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleNumber: '',
    });

    useEffect(() => {
        // Load from localStorage
        const savedProfile = localStorage.getItem('customerProfile');
        if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
        }
    }, []);

    const handleSave = () => {
        setSaving(true);
        // Save to localStorage
        localStorage.setItem('customerProfile', JSON.stringify(profile));
        setTimeout(() => {
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }, 500);
    };

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pt-safe pb-6">
            {/* Header with Back Button */}
            <header className="bg-blue-600 text-white px-6 py-8 rounded-b-[2.5rem] mb-6">
                <button
                    onClick={() => navigate('/customer')}
                    className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back</span>
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black">My Profile</h1>
                        <p className="text-blue-200 text-sm">Personalize your experience</p>
                    </div>
                </div>
            </header>

            <div className="px-6 space-y-6">
                {/* Personal Info */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        Personal Info
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Your Name</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            placeholder="Enter your name"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Vehicle Info */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Car className="w-4 h-4 text-blue-600" />
                        Vehicle Info
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Make</label>
                                <input
                                    type="text"
                                    value={profile.vehicleMake}
                                    onChange={(e) => setProfile({ ...profile, vehicleMake: e.target.value })}
                                    placeholder="e.g. Honda"
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
                                <input
                                    type="text"
                                    value={profile.vehicleModel}
                                    onChange={(e) => setProfile({ ...profile, vehicleModel: e.target.value })}
                                    placeholder="e.g. City"
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                                <input
                                    type="text"
                                    value={profile.vehicleYear}
                                    onChange={(e) => setProfile({ ...profile, vehicleYear: e.target.value })}
                                    placeholder="e.g. 2022"
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Number Plate</label>
                                <input
                                    type="text"
                                    value={profile.vehicleNumber}
                                    onChange={(e) => setProfile({ ...profile, vehicleNumber: e.target.value.toUpperCase() })}
                                    placeholder="MH 12 AB 1234"
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm uppercase"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <motion.button
                    onClick={handleSave}
                    disabled={saving}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${saved
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        }`}
                >
                    {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : saved ? (
                        <>
                            <Check className="w-5 h-5" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Save Profile
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
