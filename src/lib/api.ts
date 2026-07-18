import { supabase } from './supabase';

interface ApiResponse<T> {
    data?: T;
    error?: string;
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
