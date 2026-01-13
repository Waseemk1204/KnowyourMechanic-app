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
            // Add a timeout race condition for permissions
            const checkPermissionPromise = Geolocation.checkPermissions();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Permission check timeout')), 2000)
            );

            const permission = await Promise.race([checkPermissionPromise, timeoutPromise]) as any;

            if (permission.location === 'denied') {
                const requested = await Geolocation.requestPermissions();
                if (requested.location === 'denied') {
                    setPermissionDenied(true);
                    setLoading(false);
                    return;
                }
            }

            // Get position with timeout
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 5000, // 5 second timeout
            });

            setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });
            setPermissionDenied(false);
        } catch (error) {
            console.error('Location error (fallback to default):', error);
            // Don't set permission denied on timeout, just use default location
            // setPermissionDenied(true); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        requestLocation();
    }, []);

    return { location, loading, permissionDenied, requestLocation };
}
