import { useState } from 'react';
import { MapPin, Loader2, Navigation, Check, AlertTriangle } from 'lucide-react';

interface LocationPickerProps {
    address: string;
    coordinates: [number, number];
    hasValidLocation: boolean;
    onLocationDetected: (address: string, coordinates: [number, number]) => void;
}

export default function LocationPicker({ address, coordinates, hasValidLocation, onLocationDetected }: LocationPickerProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAutoDetect = async () => {
        setLoading(true);
        setError('');

        if (!('geolocation' in navigator)) {
            setError('Geolocation is not supported by this browser.');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en' } }
                    );

                    if (res.ok) {
                        const data = await res.json();
                        const addr = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        onLocationDetected(addr, [longitude, latitude]);
                    } else {
                        onLocationDetected(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, [longitude, latitude]);
                    }
                } catch {
                    onLocationDetected(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, [longitude, latitude]);
                }

                setLoading(false);
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setError('Location access denied. Please enable it in your browser settings.');
                } else if (err.code === err.TIMEOUT) {
                    setError('Location detection timed out. Please try again.');
                } else {
                    setError('Could not detect your location. Please try again.');
                }
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Location *</label>

            {hasValidLocation ? (
                /* Show detected location */
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-green-800">Location Verified</p>
                            <p className="text-xs text-green-600 mt-1 line-clamp-2">{address}</p>
                            <p className="text-[10px] text-green-500 mt-1 font-mono">
                                {coordinates[1].toFixed(5)}°N, {coordinates[0].toFixed(5)}°E
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAutoDetect}
                            disabled={loading}
                            className="text-xs text-green-700 font-bold underline flex-shrink-0"
                        >
                            {loading ? 'Detecting...' : 'Re-detect'}
                        </button>
                    </div>
                </div>
            ) : (
                /* Show detect button */
                <button
                    type="button"
                    onClick={handleAutoDetect}
                    disabled={loading}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 transition-colors disabled:opacity-60"
                >
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {loading ? (
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        ) : (
                            <Navigation className="w-6 h-6 text-blue-600" />
                        )}
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-blue-900 text-sm">
                            {loading ? 'Detecting your location...' : 'Detect My Location'}
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                            Uses your device GPS for exact coordinates
                        </p>
                    </div>
                </button>
            )}

            {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                </div>
            )}
        </div>
    );
}
