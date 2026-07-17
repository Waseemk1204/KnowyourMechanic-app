import { supabase } from './supabase';

// Supabase-backed data access, replacing the old Node API (src/lib/api.ts).

export interface GarageRow {
    id: string;
    owner_profile_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    service_hours: string | null;
    working_days: string[] | null;
    photo_url: string | null;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    onboarding_status: string;
}

export interface ServiceRecordRow {
    id: string;
    garage_id: string;
    customer_phone: string;
    description: string;
    amount: number;
    platform_fee: number;
    garage_earnings: number;
    payment_method: string | null;
    status: string;
    is_reliable: boolean;
    invoice_number: string | null;
    created_at: string;
    vehicle_type: string | null;
    vehicle_make_code: string | null;
    vehicle_model_code: string | null;
    vehicle_make_other: string | null;
    vehicle_model_other: string | null;
    model_year: number | null;
    odometer_km: number | null;
}

// The garage owned by the given profile (or null if not onboarded yet).
export async function getMyGarage(ownerProfileId: string): Promise<GarageRow | null> {
    const { data, error } = await supabase
        .from('garages')
        .select('*')
        .eq('owner_profile_id', ownerProfileId)
        .limit(1)
        .maybeSingle();
    if (error) {
        console.error('getMyGarage error', error);
        return null;
    }
    return data as GarageRow | null;
}

// Completed/in-flight service records for a garage, newest first.
export async function getGarageServiceRecords(garageId: string): Promise<ServiceRecordRow[]> {
    const { data, error } = await supabase
        .from('service_records')
        .select('*')
        .eq('garage_id', garageId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('getGarageServiceRecords error', error);
        return [];
    }
    return (data ?? []) as ServiceRecordRow[];
}
