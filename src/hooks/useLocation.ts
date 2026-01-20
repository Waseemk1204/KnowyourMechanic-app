import { useState, useEffect, useCallback } from 'react';

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

    const requestLocation = useCallback(() => {
        setLoading(true);

        console.log('Requesting location...');

        // Use native browser Geolocation API for web
        if (!('geolocation' in navigator)) {
            console.log('Geolocation not supported, using default');
            setLoading(false);
            return;
        }

        // Check permission state first (if available)
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                console.log('Permission state:', result.state);

                if (result.state === 'denied') {
                    setPermissionDenied(true);
                    setLoading(false);
                    return;
                }

                // Permission is 'granted' or 'prompt' - request location
                getPosition();
            }).catch(() => {
                // Permissions API not fully supported, try anyway
                getPosition();
            });
        } else {
            // Fallback for browsers without Permissions API
            getPosition();
        }
    }, []);

    const getPosition = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Location obtained:', position.coords.latitude, position.coords.longitude);
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setPermissionDenied(false);
                setLoading(false);
            },
            (error) => {
                console.error('Geolocation error:', error.code, error.message);
                if (error.code === error.PERMISSION_DENIED) {
                    setPermissionDenied(true);
                    // Show alert to guide user
                    alert('Location access is blocked. Please enable it in your browser settings and refresh the page.');
                }
                // Keep default location on error
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0, // Always get fresh location
            }
        );
    };

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    return { location, loading, permissionDenied, requestLocation };
}
