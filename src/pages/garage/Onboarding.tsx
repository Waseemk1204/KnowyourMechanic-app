import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Camera, Check, ChevronRight, Loader2, Wrench, Shield, ArrowLeft, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../hooks/useLocation';
import { updateGarageProfile } from '../../lib/api';

type OnboardingStep = 'welcome' | 'location' | 'services' | 'photos';

const SERVICES = [
    { id: 'general', name: 'General Service', icon: Wrench },
    { id: 'brakes', name: 'Brake Repair', icon: Shield },
    { id: 'engine', name: 'Engine Diagnostics', icon: Wrench },
    { id: 'tyres', name: 'Tyre & Alignment', icon: Wrench },
    { id: 'ac', name: 'AC Service', icon: Wrench },
    { id: 'paint', name: 'Body & Paint', icon: Wrench },
];

export default function GarageOnboarding() {
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [garageName, setGarageName] = useState('');
    const [address, setAddress] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);

    const navigate = useNavigate();
    const { location, loading: locating } = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleNext = () => {
        if (step === 'welcome') setStep('location');
        else if (step === 'location') setStep('services');
        else if (step === 'services') setStep('photos');
    };

    const handleBack = () => {
        if (step === 'location') setStep('welcome');
        else if (step === 'services') setStep('location');
        else if (step === 'photos') setStep('services');
    };

    const toggleService = (id: string) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            // Mock preview
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setPhotos(prev => [...prev, event.target!.result as string]);
                }
            };
            reader.readAsDataURL(files[0]);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const profileData = {
                name: garageName,
                location: {
                    address: address,
                    coordinates: [location.lng, location.lat] as [number, number]
                },
                services: selectedServices,
                workingDays: 'Mon-Sat',
                serviceHours: '9:00 AM - 7:00 PM'
            };

            await updateGarageProfile(profileData);
            localStorage.setItem('onboardingComplete', 'true');
            navigate('/garage');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-safe px-6 pb-20 flex flex-col text-slate-900">
            <AnimatePresence mode="wait">
                {step === 'welcome' && (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
                    >
                        <div className="w-24 h-24 rounded-[2rem] bg-white shadow-2xl shadow-blue-200/50 flex items-center justify-center mb-10 mx-auto">
                            <Star className="w-12 h-12 text-blue-600 fill-blue-600/10" />
                        </div>
                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Register Garage</h1>
                            <p className="text-slate-500 text-lg">Set up your premium garage profile in minutes</p>
                        </div>

                        <div className="space-y-6 mb-12">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 ml-1">Garage Business Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sapphire Motors"
                                    className="w-full h-16 rounded-2xl px-6 text-lg font-bold shadow-sm"
                                    value={garageName}
                                    onChange={(e) => setGarageName(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            disabled={!garageName}
                            onClick={handleNext}
                            className="w-full h-16 btn-premium rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-xl shadow-blue-500/20"
                        >
                            Get Started
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </motion.div>
                )}

                {step === 'location' && (
                    <motion.div
                        key="location"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="flex-1 flex flex-col pt-10"
                    >
                        <button onClick={handleBack} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 mb-8 active:bg-slate-100">
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-slate-900 mb-3">Shop Location</h2>
                            <p className="text-slate-500">Enable GPS to find your precise coordinate</p>
                        </div>

                        <div className="space-y-6">
                            <div className="premium-card p-6 bg-white border border-slate-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${locating ? 'bg-slate-100' : 'bg-blue-50'}`}>
                                        <MapPin className={`w-7 h-7 ${locating ? 'animate-bounce text-slate-400' : 'text-blue-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-900">GPS Coordinates</h3>
                                        <p className="text-slate-400 font-medium text-xs">
                                            {locating ? 'Searching for satellites...' : `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                                        </p>
                                    </div>
                                    {!locating && <div className="bg-green-100 p-1.5 rounded-full"><Check className="w-4 h-4 text-green-600" /></div>}
                                </div>
                                <div className="h-40 bg-slate-100 rounded-[1.5rem] flex items-center justify-center border-2 border-dashed border-slate-200">
                                    <span className="text-slate-400 font-bold text-sm">MAP VIEW LOADED</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 ml-1">Street Address</label>
                                <textarea
                                    placeholder="Enter full address..."
                                    className="w-full min-h-[120px] rounded-2xl p-6 text-lg font-bold shadow-sm"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>

                            <button
                                disabled={!address || locating}
                                onClick={handleNext}
                                className="w-full h-16 btn-premium rounded-2xl font-black text-lg flex items-center justify-center gap-2 mt-4"
                            >
                                Continue
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'services' && (
                    <motion.div
                        key="services"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="flex-1 flex flex-col pt-10"
                    >
                        <button onClick={handleBack} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 mb-8">
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-slate-900 mb-3">Service Expertise</h2>
                            <p className="text-slate-500">Pick the services your garage specializes in</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {SERVICES.map(service => (
                                <button
                                    key={service.id}
                                    onClick={() => toggleService(service.id)}
                                    className={`p-6 rounded-[2rem] border-2 transition-all text-center flex flex-col items-center gap-3 ${selectedServices.includes(service.id)
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20'
                                        : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                                        }`}
                                >
                                    <service.icon className={`w-8 h-8 ${selectedServices.includes(service.id) ? 'text-white' : 'text-blue-600'}`} />
                                    <span className="text-xs font-bold leading-tight">{service.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-12">
                            <button
                                disabled={selectedServices.length === 0}
                                onClick={handleNext}
                                className="w-full h-16 btn-premium rounded-2xl font-black text-lg flex items-center justify-center gap-2"
                            >
                                Next Step
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'photos' && (
                    <motion.div
                        key="photos"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="flex-1 flex flex-col pt-10"
                    >
                        <button onClick={handleBack} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 mb-8">
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-slate-900 mb-3">Shop Photos</h2>
                            <p className="text-slate-500">Real photos increase customer trust by 80%</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            {photos.map((photo, i) => (
                                <div key={i} className="aspect-square rounded-[2rem] overflow-hidden shadow-lg">
                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Camera className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Add Photo</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                            />
                        </div>

                        <button
                            disabled={loading || photos.length === 0}
                            onClick={handleSubmit}
                            className="w-full h-16 btn-premium rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Complete Setup'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
