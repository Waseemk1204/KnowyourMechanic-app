import { supabase } from './supabase';

const API_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4001/api';

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

async function getAuthToken(): Promise<string | null> {
    try {
        const { auth } = await import('./firebase');
        const user = auth.currentUser;
        if (user) {
            return await user.getIdToken();
        }
    } catch (e) {
        console.error('Error getting auth token:', e);
    }
    return null;
}

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const token = await getAuthToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.message || 'Request failed' };
        }

        return { data };
    } catch (error: any) {
        return { error: error.message || 'Network error' };
    }
}

export interface UserData {
    _id: string;
    firebaseUid: string;
    phoneNumber: string;
    role: 'customer' | 'garage' | 'admin' | 'employee';
    createdAt: string;
}

export interface GarageProfile {
    _id: string;
    name: string;
    location: {
        address: string;
        coordinates: [number, number];
    };
    serviceHours: string;
    workingDays: string;
    photoUrl?: string;
    rating?: number;
    totalReviews?: number;
}

export async function syncUser(role: 'customer' | 'garage'): Promise<ApiResponse<UserData>> {
    return apiRequest<UserData>('/auth/sync', {
        method: 'POST',
        body: JSON.stringify({ role }),
    });
}

export async function getCurrentUserData(): Promise<ApiResponse<UserData>> {
    return apiRequest<UserData>('/auth/me');
}

export async function updateGarageProfile(profile: any): Promise<ApiResponse<GarageProfile>> {
    return apiRequest<GarageProfile>('/garages/profile', {
        method: 'POST',
        body: JSON.stringify(profile),
    });
}

export async function discoverGarages(
    _lat: number,
    _lng: number,
    _radius: number = 5000
): Promise<ApiResponse<GarageProfile[]>> {
    // Supabase: verified, active garages. (Distance sorting can be added later
    // with PostGIS; for now we return the visible set.)
    const { data, error } = await supabase
        .from('garages')
        .select('id,name,address,latitude,longitude,service_hours,working_days,photo_url,rating,total_reviews')
        .eq('is_verified', true)
        .eq('is_offboarded', false)
        .limit(50);
    if (error) return { error: error.message };
    const garages: GarageProfile[] = (data ?? []).map((g: any) => ({
        _id: g.id,
        name: g.name,
        location: { address: g.address || '', coordinates: [g.longitude || 0, g.latitude || 0] },
        serviceHours: g.service_hours || '',
        workingDays: Array.isArray(g.working_days) ? g.working_days.join(',') : '',
        photoUrl: g.photo_url || undefined,
        rating: Number(g.rating) || 0,
        totalReviews: g.total_reviews || 0,
    }));
    return { data: garages };
}
