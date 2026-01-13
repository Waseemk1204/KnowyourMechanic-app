import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

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
        try {
            const permission = await Geolocation.checkPermissions();

            if (permission.location === 'denied') {
                const requested = await Geolocation.requestPermissions();
                if (requested.location === 'denied') {
                    setPermissionDenied(true);
                    setLoading(false);
                    return;
                }
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
            });

            setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });
            setPermissionDenied(false);
        } catch (error) {
            console.error('Location error:', error);
            setPermissionDenied(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        requestLocation();
    }, []);

    return { location, loading, permissionDenied, requestLocation };
}
