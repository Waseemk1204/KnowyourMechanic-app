import { useState } from 'react';
import { MapPin, Loader2, Navigation, Check } from 'lucide-react';

interface LocationPickerProps {
    value: string;
    coordinates?: [number, number];
    onChange: (address: string, coordinates: [number, number]) => void;
    placeholder?: string;
}

export default function LocationPicker({ value, coordinates, onChange, placeholder = "Enter your address" }: LocationPickerProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasValidLocation, setHasValidLocation] = useState(!!coordinates);

    const handleAutoDetect = async () => {
        setLoading(true);
        setError('');

        if (!('geolocation' in navigator)) {
            setError('Geolocation not supported');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key)
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en' } }
                    );

                    if (res.ok) {
                        const data = await res.json();
                        const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        onChange(address, [longitude, latitude]);
                        setHasValidLocation(true);
                        setError('');
                    } else {
                        // Fallback to coordinates if geocoding fails
                        onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, [longitude, latitude]);
                        setHasValidLocation(true);
                    }
                } catch (err) {
                    console.error('Geocoding error:', err);
                    // Still use coordinates even if geocoding fails
                    onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, [longitude, latitude]);
                    setHasValidLocation(true);
                }

                setLoading(false);
            },
            (err) => {
                console.error('Geolocation error:', err);
                if (err.code === err.PERMISSION_DENIED) {
                    setError('Location access denied. Please enable it in settings.');
                } else {
                    setError('Could not detect location. Please try again.');
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

    const handleManualInput = (newAddress: string) => {
        // When manually typing, mark as not verified yet
        setHasValidLocation(false);
        // Keep existing coordinates or use default Pune coordinates
        const coords = coordinates || [73.8567, 18.5204];
        onChange(newAddress, coords);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Location</label>
            <div className="relative">
                <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <textarea
                    value={value}
                    onChange={(e) => handleManualInput(e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    className={`w-full pl-12 pr-24 py-3 rounded-xl border ${hasValidLocation ? 'border-green-300 bg-green-50/50' : 'border-slate-200'
                        } focus:ring-2 focus:ring-blue-500 resize-none transition-colors`}
                />
                {hasValidLocation && (
                    <div className="absolute right-16 top-3.5">
                        <Check className="w-5 h-5 text-green-500" />
                    </div>
                )}
                <button
                    type="button"
                    onClick={handleAutoDetect}
                    disabled={loading}
                    className="absolute right-3 top-2.5 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    title="Auto-detect location"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Navigation className="w-4 h-4" />
                    )}
                </button>
            </div>
            {error && (
                <p className="text-red-500 text-xs">{error}</p>
            )}
            {hasValidLocation && (
                <p className="text-green-600 text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Location verified
                </p>
            )}
            {!hasValidLocation && value && (
                <p className="text-amber-600 text-xs">
                    Tap the navigation button to verify your location
                </p>
            )}
        </div>
    );
}
