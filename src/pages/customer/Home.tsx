import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Star, Phone, LogOut, X, Loader2, Filter, Navigation, ChevronRight, LocateFixed, Settings, Clock, Headphones, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../hooks/useLocation';
import { useAuth } from '../../contexts/AuthContext';
import { discoverGarages, type GarageProfile } from '../../lib/api';
import GarageMap from '../../components/GarageMap';

type Garage = {
    id: string;
    name: string;
    distance: string;
    rating: number;
    reviews: number;
    photo: string;
    lat: number;
    lng: number;
};

const generateMockGarages = (userLat: number, userLng: number): Garage[] => [
    {
        id: 'mock-1',
        name: 'Sapphire Car Care (Sample)',
        distance: '1.2 km',
        rating: 4.8,
        reviews: 124,
        photo: 'https://images.unsplash.com/photo-1517524008410-b44c6059b850?q=80&w=800',
        lat: userLat + 0.005,
        lng: userLng + 0.005,
    },
    {
        id: 'mock-2',
        name: 'Auto Precision Garage',
        distance: '2.5 km',
        rating: 4.6,
        reviews: 89,
        photo: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193b?q=80&w=800',
        lat: userLat - 0.008,
        lng: userLng + 0.003,
    }
];

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
};

const transformApiGarage = (apiGarage: any, userLat: number, userLng: number): Garage => {
    const coords = apiGarage.location?.coordinates || [0, 0];
    const lat = coords[1] || userLat;
    const lng = coords[0] || userLng;

    return {
        id: apiGarage._id,
        name: apiGarage.name || 'Unnamed Garage',
        distance: calculateDistance(userLat, userLng, lat, lng),
        rating: apiGarage.rating || 4.5,
        reviews: apiGarage.totalReviews || 0,
        photo: apiGarage.photoUrl || 'https://images.unsplash.com/photo-1517524008410-b44c6059b850?q=80&w=800',
        lat,
        lng,
    };
};

export default function CustomerHome() {
    const [selectedGarage, setSelectedGarage] = useState<Garage | null>(null);
    const [search, setSearch] = useState('');
    const [garages, setGarages] = useState<Garage[]>([]);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showProfilePanel, setShowProfilePanel] = useState(false);
    const [isLoadingGarages, setIsLoadingGarages] = useState(false);

    const navigate = useNavigate();
    const { location, loading, permissionDenied, requestLocation } = useLocation();
    const { logout } = useAuth();

    console.log('CustomerHome render:', { loading, location, garagesCount: garages.length, isLoadingGarages });

    const handleLogout = async () => {
        await logout();
        navigate('/auth');
    };

    useEffect(() => {
        const fetchGarages = async () => {
            console.log('fetchGarages started', { loading });
            if (loading) return;

            setIsLoadingGarages(true);
            try {
                console.log('Calling discoverGarages...');
                const result = await discoverGarages(location.lat, location.lng, 10000);
                console.log('discoverGarages result:', result);

                if (result.data && result.data.length > 0) {
                    const transformed = result.data.map((g: GarageProfile) =>
                        transformApiGarage(g, location.lat, location.lng)
                    );
                    setGarages(transformed);
                } else {
                    setGarages(generateMockGarages(location.lat, location.lng));
                }
            } catch (error) {
                console.error('Error fetching garages:', error);
                setGarages(generateMockGarages(location.lat, location.lng));
            } finally {
                setIsLoadingGarages(false);
            }
        };

        fetchGarages();
    }, [location, loading]);

    const filteredGarages = garages.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pt-safe pb-6 px-4">
            {/* Header */}
            <header className="flex items-center justify-between py-6 mb-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Express Service</h1>
                    <p className="text-blue-600 text-sm font-semibold flex items-center gap-1.5 mt-1">
                        <Navigation className="w-3.5 h-3.5 fill-blue-600" />
                        {loading || isLoadingGarages ? 'Locating...' :
                            permissionDenied ? 'Pune City Center' :
                                `${garages.length} stations nearby`}
                    </p>
                </div>
                <button
                    onClick={() => setShowProfilePanel(true)}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 active:bg-slate-50 transition-colors"
                >
                    <Settings className="w-5.5 h-5.5" />
                </button>
            </header>

            {/* Search */}
            <div className="flex gap-3 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search mechanics or garages"
                        className="w-full h-14 bg-white rounded-2xl pl-12 pr-4 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white active:scale-95 transition-all">
                    <Filter className="w-5.5 h-5.5" />
                </button>
            </div>

            {/* Location Permission Prompt */}
            {permissionDenied && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <LocateFixed className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800 text-sm">Location Access Needed</p>
                        <p className="text-amber-600 text-xs">Enable location for accurate nearby garages</p>
                    </div>
                    <button
                        onClick={requestLocation}
                        className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl"
                    >
                        Enable
                    </button>
                </div>
            )}

            {/* Map Preview */}
            <div className="relative h-56 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl shadow-blue-900/10 border-4 border-white">
                <GarageMap
                    garages={garages.map(g => ({ id: g.id, name: g.name, lat: g.lat, lng: g.lng }))}
                    userLocation={location}
                    onGarageSelect={(g) => {
                        const full = garages.find(garage => garage.id === g.id);
                        if (full) setSelectedGarage(full);
                    }}
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-blue-600 shadow-sm border border-blue-50">
                    TAP MARKERS
                </div>
            </div>

            {/* Garage List */}
            <div className="flex-1 space-y-5">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-slate-900">Recommended for you</h2>
                    <button className="text-blue-600 text-sm font-bold">See All</button>
                </div>

                {isLoadingGarages ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                        <p className="text-slate-400 font-medium">Finding best mechanics...</p>
                    </div>
                ) : filteredGarages.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 font-medium">No results Match your search</p>
                    </div>
                ) : (
                    filteredGarages.map(garage => (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            key={garage.id}
                            onClick={() => navigate(`/customer/garage/${garage.id}`)}
                            className="w-full premium-card p-4 flex items-center gap-5 text-left"
                        >
                            <div className="relative">
                                <img
                                    src={garage.photo}
                                    alt={garage.name}
                                    className="w-20 h-20 rounded-[1.5rem] object-cover shadow-sm"
                                />
                                <div className="absolute -top-2 -right-2 bg-blue-600 text-[10px] font-bold text-white px-2 py-1 rounded-lg">
                                    {garage.distance}
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-slate-900 mb-1 leading-tight">{garage.name}</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        <span className="font-bold text-slate-700 text-sm">{garage.rating}</span>
                                    </div>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-400 text-xs font-semibold">{garage.reviews} Reviews</span>
                                </div>
                                <div className="mt-2 flex gap-1">
                                    <span className="bg-blue-50 text-blue-600 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Certified</span>
                                    <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Top Rated</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300" />
                        </motion.button>
                    ))
                )}
            </div>

            {/* Garage Detail Modal */}
            <AnimatePresence>
                {selectedGarage && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedGarage(null)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 pb-12 z-[101] shadow-2xl max-w-md mx-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedGarage.name}</h2>
                                    <p className="text-blue-600 font-bold flex items-center gap-1 bg-blue-50 w-fit px-3 py-1 rounded-full text-xs">
                                        <MapPin className="w-3 h-3" />
                                        {selectedGarage.distance} from you
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedGarage(null)}
                                    className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <img
                                src={selectedGarage.photo}
                                alt={selectedGarage.name}
                                className="w-full h-52 rounded-[2rem] object-cover mb-8 shadow-lg shadow-blue-100"
                            />

                            <div className="grid grid-cols-2 gap-4 mb-8 text-center text-sm font-bold">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-slate-400 text-xs mb-1">Open Until</p>
                                    <p className="text-slate-900">08:00 PM</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-slate-400 text-xs mb-1">Rating</p>
                                    <p className="text-slate-900 flex items-center justify-center gap-1">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        {selectedGarage.rating}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedGarage.lat},${selectedGarage.lng}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="flex-1 h-16 bg-slate-100 rounded-[1.25rem] text-slate-700 font-black flex items-center justify-center gap-3 active:scale-95 transition-transform"
                                >
                                    <Navigation className="w-5 h-5" />
                                    DIRECTIONS
                                </button>
                                <a
                                    href="tel:+919999999999"
                                    className="flex-1 h-16 bg-green-600 rounded-[1.25rem] text-white font-black flex items-center justify-center gap-3 shadow-xl shadow-green-500/30 active:scale-95 transition-transform"
                                >
                                    <Phone className="w-5 h-5" />
                                    CALL NOW
                                </a>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Logout Modal */}
            <AnimatePresence>
                {showLogoutModal && (
                    <div className="fixed inset-0 flex items-center justify-center p-6 z-[200]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
                            onClick={() => setShowLogoutModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 text-center relative z-10 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <LogOut className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Ready to Leave?</h2>
                            <p className="text-slate-500 font-medium mb-10 leading-relaxed">You will need to re-verify your phone number to login again.</p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleLogout}
                                    className="w-full h-16 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-200"
                                >
                                    Log out
                                </button>
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="w-full h-16 bg-slate-50 text-slate-500 font-bold rounded-2xl"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Profile Slider Panel */}
            <AnimatePresence>
                {showProfilePanel && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                            onClick={() => setShowProfilePanel(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col"
                        >
                            {/* Panel Header */}
                            <div className="p-6 bg-blue-600 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold">Menu</h2>
                                    <button
                                        onClick={() => setShowProfilePanel(false)}
                                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold">Customer</p>
                                        <p className="text-blue-200 text-xs">Express Service</p>
                                    </div>
                                </div>
                            </div>

                            {/* Panel Options */}
                            <div className="flex-1 p-4 space-y-2">
                                <button
                                    onClick={() => {
                                        setShowProfilePanel(false);
                                        navigate('/activity');
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-slate-900">Activity</p>
                                        <p className="text-slate-400 text-xs">View your service history</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                </button>

                                <button
                                    onClick={() => {
                                        setShowProfilePanel(false);
                                        navigate('/support');
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                        <Headphones className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-slate-900">Support</p>
                                        <p className="text-slate-400 text-xs">Get help & contact us</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-green-500" />
                                </button>
                            </div>

                            {/* Logout Button */}
                            <div className="p-4 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        setShowProfilePanel(false);
                                        setShowLogoutModal(true);
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-bold">Logout</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
