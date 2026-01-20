import { useState, useEffect } from 'react';

interface LocationState {
    lat: number;
    lng: number;
}

// Default to Pune coordinates
const DEFAULT_LOCATION: LocationState = {
    lat: 18.5204,
    lng: 73.8567
};

export function useLocation() {
    const [location, setLocation] = useState<LocationState>(DEFAULT_LOCATION);
    const [loading, setLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const requestLocation = async () => {
        setLoading(true);
        setPermissionDenied(false);

        // Use native browser Geolocation API for web
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setPermissionDenied(false);
                    setLoading(false);
                    console.log('Location obtained:', position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.error('Geolocation error:', error.message);
                    if (error.code === error.PERMISSION_DENIED) {
                        setPermissionDenied(true);
                    }
                    // Keep default location on error
                    setLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000, // Cache for 1 minute
                }
            );
        } else {
            console.log('Geolocation not supported, using default');
            setLoading(false);
        }
    };

    useEffect(() => {
        requestLocation();
    }, []);

    return { location, loading, permissionDenied, requestLocation };
}
