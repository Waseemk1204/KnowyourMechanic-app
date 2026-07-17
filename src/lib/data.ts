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
    garage_name: string;
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

export interface TaxonomyMake { code: string; display_name: string; vehicle_types: string[]; }
export interface TaxonomyModel { code: string; make_code: string; vehicle_type: string; display_name: string; }
export interface TaxonomyCategory { code: string; display_name: string; }

export interface Taxonomy {
    makes: TaxonomyMake[];
    models: TaxonomyModel[];
    services: TaxonomyCategory[];
    failures: TaxonomyCategory[];
}

// Loads the structured service taxonomy (public read) for the add-service form.
export async function getTaxonomy(): Promise<Taxonomy> {
    const [makes, models, services, failures] = await Promise.all([
        supabase.from('vehicle_makes').select('code,display_name,vehicle_types').eq('is_active', true).order('sort_order'),
        supabase.from('vehicle_models').select('code,make_code,vehicle_type,display_name').eq('is_active', true).order('sort_order'),
        supabase.from('service_categories').select('code,display_name').eq('is_active', true).order('sort_order'),
        supabase.from('failure_categories').select('code,display_name').eq('is_active', true).order('sort_order'),
    ]);
    return {
        makes: (makes.data ?? []) as TaxonomyMake[],
        models: (models.data ?? []) as TaxonomyModel[],
        services: (services.data ?? []) as TaxonomyCategory[],
        failures: (failures.data ?? []) as TaxonomyCategory[],
    };
}

export interface CreateServiceRecordParams {
    garageId: string;
    customerPhone: string;
    vehicleType: string;
    vehicleMakeCode: string | null;
    vehicleModelCode: string | null;
    vehicleMakeOther: string | null;
    vehicleModelOther: string | null;
    vehicleNumber: string | null;
    modelYear: number | null;
    odometerKm: number | null;
    serviceCodes: string[];
    failureCodes: string[];
    serviceNotes: string | null;
    amount: number;
    customerHasApp: boolean;
}

// Creates a service record + taxonomy join rows via the SECURITY DEFINER RPC.
// (OTP generation/delivery happens later via the service-record-create Edge
// Function once it is deployed.)
export async function createServiceRecord(p: CreateServiceRecordParams): Promise<{ service_record_id: string }> {
    const { data, error } = await supabase
        .rpc('create_service_record_with_taxonomy', {
            p_garage_id: p.garageId,
            p_customer_phone: p.customerPhone,
            p_vehicle_type: p.vehicleType,
            p_vehicle_make_code: p.vehicleMakeCode,
            p_vehicle_model_code: p.vehicleModelCode,
            p_vehicle_make_other: p.vehicleMakeOther,
            p_vehicle_model_other: p.vehicleModelOther,
            p_vehicle_number: p.vehicleNumber,
            p_model_year: p.modelYear,
            p_odometer_km: p.odometerKm,
            p_service_codes: p.serviceCodes,
            p_failure_codes: p.failureCodes,
            p_service_notes: p.serviceNotes,
            p_amount: p.amount,
            p_customer_has_app: p.customerHasApp,
        })
        .single();
    if (error) throw new Error(error.message);
    return data as { service_record_id: string };
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

// A customer's completed service history (matched by phone), newest first.
export async function getCustomerServiceHistory(phone: string): Promise<ServiceRecordRow[]> {
    const digits = phone.replace(/\D/g, '').slice(-10);
    const { data, error } = await supabase
        .from('service_records')
        .select('*')
        .eq('customer_phone', digits)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('getCustomerServiceHistory error', error);
        return [];
    }
    return (data ?? []) as ServiceRecordRow[];
}
