import { supabase } from "../lib/supabase";

export type VehicleType = "2w" | "3w" | "4w" | "other";

export type VehicleMakeOption = {
  code: string;
  label: string;
  vehicleTypes: VehicleType[];
};

export type VehicleModelOption = {
  code: string;
  makeCode: string;
  vehicleType: VehicleType;
  label: string;
};

export type TaxonomyOption = {
  code: string;
  label: string;
};

export type FailureOption = TaxonomyOption & {
  recommendedServiceCode: string | null;
};

export type ServiceTaxonomy = {
  vehicleMakes: VehicleMakeOption[];
  vehicleModels: VehicleModelOption[];
  serviceCategories: TaxonomyOption[];
  failureCategories: FailureOption[];
};

export const vehicleTypeOptions: Array<{ code: VehicleType; label: string }> = [
  { code: "2w", label: "2W" },
  { code: "3w", label: "3W" },
  { code: "4w", label: "4W" },
  { code: "other", label: "Other" }
];

export const fallbackServiceTaxonomy: ServiceTaxonomy = {
  vehicleMakes: [
    { code: "bajaj", label: "Bajaj", vehicleTypes: ["2w", "3w"] },
    { code: "hero", label: "Hero", vehicleTypes: ["2w"] },
    { code: "honda", label: "Honda", vehicleTypes: ["2w", "4w"] },
    { code: "mahindra", label: "Mahindra", vehicleTypes: ["3w", "4w"] },
    { code: "maruti-suzuki", label: "Maruti Suzuki", vehicleTypes: ["4w"] },
    { code: "hyundai", label: "Hyundai", vehicleTypes: ["4w"] },
    { code: "tata", label: "Tata", vehicleTypes: ["4w"] },
    { code: "toyota", label: "Toyota", vehicleTypes: ["4w"] },
    { code: "kia", label: "Kia", vehicleTypes: ["4w"] },
    { code: "royal-enfield", label: "Royal Enfield", vehicleTypes: ["2w"] },
    { code: "tvs", label: "TVS", vehicleTypes: ["2w", "3w"] },
    { code: "suzuki", label: "Suzuki", vehicleTypes: ["2w"] },
    { code: "piaggio", label: "Piaggio", vehicleTypes: ["3w"] },
    { code: "renault", label: "Renault", vehicleTypes: ["4w"] }
  ],
  vehicleModels: [
    { code: "bajaj-pulsar-150", makeCode: "bajaj", vehicleType: "2w", label: "Pulsar 150" },
    { code: "bajaj-re", makeCode: "bajaj", vehicleType: "3w", label: "RE" },
    { code: "hero-splendor-plus", makeCode: "hero", vehicleType: "2w", label: "Splendor Plus" },
    { code: "honda-activa-6g", makeCode: "honda", vehicleType: "2w", label: "Activa 6G" },
    { code: "honda-city", makeCode: "honda", vehicleType: "4w", label: "City" },
    { code: "mahindra-treo", makeCode: "mahindra", vehicleType: "3w", label: "Treo" },
    { code: "mahindra-scorpio-n", makeCode: "mahindra", vehicleType: "4w", label: "Scorpio-N" },
    { code: "maruti-suzuki-swift", makeCode: "maruti-suzuki", vehicleType: "4w", label: "Swift" },
    { code: "maruti-suzuki-wagon-r", makeCode: "maruti-suzuki", vehicleType: "4w", label: "Wagon R" },
    { code: "hyundai-creta", makeCode: "hyundai", vehicleType: "4w", label: "Creta" },
    { code: "hyundai-i20", makeCode: "hyundai", vehicleType: "4w", label: "i20" },
    { code: "tata-nexon", makeCode: "tata", vehicleType: "4w", label: "Nexon" },
    { code: "tata-punch", makeCode: "tata", vehicleType: "4w", label: "Punch" },
    { code: "toyota-innova-crysta", makeCode: "toyota", vehicleType: "4w", label: "Innova Crysta" },
    { code: "kia-seltos", makeCode: "kia", vehicleType: "4w", label: "Seltos" },
    { code: "royal-enfield-classic-350", makeCode: "royal-enfield", vehicleType: "2w", label: "Classic 350" },
    { code: "tvs-jupiter", makeCode: "tvs", vehicleType: "2w", label: "Jupiter" },
    { code: "tvs-king-duramax", makeCode: "tvs", vehicleType: "3w", label: "King Duramax" },
    { code: "suzuki-access-125", makeCode: "suzuki", vehicleType: "2w", label: "Access 125" },
    { code: "piaggio-ape-auto", makeCode: "piaggio", vehicleType: "3w", label: "Ape Auto" },
    { code: "renault-kwid", makeCode: "renault", vehicleType: "4w", label: "Kwid" }
  ],
  serviceCategories: [
    { code: "periodic-maintenance", label: "Periodic Maintenance" },
    { code: "engine", label: "Engine" },
    { code: "transmission-clutch", label: "Transmission & Clutch" },
    { code: "brakes", label: "Brakes" },
    { code: "electrical-battery", label: "Electrical & Battery" },
    { code: "tyres-wheels", label: "Tyres & Wheels" },
    { code: "suspension-steering", label: "Suspension & Steering" },
    { code: "ac-cooling", label: "AC & Cooling" },
    { code: "body-paint", label: "Body & Paint" },
    { code: "washing-detailing", label: "Washing & Detailing" },
    { code: "emission-exhaust", label: "Emission & Exhaust" },
    { code: "inspection-diagnostics", label: "Inspection & Diagnostics" },
    { code: "roadside-repair", label: "Roadside Repair" },
    { code: "other", label: "Other Service" }
  ],
  failureCategories: [
    { code: "routine-no-fault", label: "Routine service / no fault", recommendedServiceCode: "periodic-maintenance" },
    { code: "engine-noise", label: "Engine noise", recommendedServiceCode: "engine" },
    { code: "engine-overheating", label: "Engine overheating", recommendedServiceCode: "engine" },
    { code: "engine-oil-leak", label: "Engine oil leak", recommendedServiceCode: "engine" },
    { code: "low-power", label: "Low power / pickup", recommendedServiceCode: "engine" },
    { code: "poor-mileage", label: "Poor mileage", recommendedServiceCode: "engine" },
    { code: "starting-issue", label: "Starting issue", recommendedServiceCode: "electrical-battery" },
    { code: "clutch-slip", label: "Clutch slipping", recommendedServiceCode: "transmission-clutch" },
    { code: "gear-shift-issue", label: "Gear shifting issue", recommendedServiceCode: "transmission-clutch" },
    { code: "brake-noise", label: "Brake noise", recommendedServiceCode: "brakes" },
    { code: "weak-braking", label: "Weak braking", recommendedServiceCode: "brakes" },
    { code: "battery-discharge", label: "Battery discharge", recommendedServiceCode: "electrical-battery" },
    { code: "electrical-fault", label: "Electrical fault", recommendedServiceCode: "electrical-battery" },
    { code: "warning-light", label: "Dashboard warning light", recommendedServiceCode: "inspection-diagnostics" },
    { code: "tyre-puncture", label: "Tyre puncture", recommendedServiceCode: "tyres-wheels" },
    { code: "uneven-tyre-wear", label: "Uneven tyre wear", recommendedServiceCode: "tyres-wheels" },
    { code: "suspension-noise", label: "Suspension noise", recommendedServiceCode: "suspension-steering" },
    { code: "steering-issue", label: "Steering issue", recommendedServiceCode: "suspension-steering" },
    { code: "ac-not-cooling", label: "AC not cooling", recommendedServiceCode: "ac-cooling" },
    { code: "accident-damage", label: "Accident damage", recommendedServiceCode: "body-paint" },
    { code: "breakdown", label: "Vehicle breakdown", recommendedServiceCode: "roadside-repair" },
    { code: "other", label: "Other / not classified", recommendedServiceCode: "other" }
  ]
};

export async function loadServiceTaxonomy(): Promise<ServiceTaxonomy> {
  if (!supabase) return fallbackServiceTaxonomy;

  const [makesResult, modelsResult, servicesResult, failuresResult] = await Promise.all([
    supabase.from("vehicle_makes").select("code, display_name, vehicle_types").eq("is_active", true).order("sort_order"),
    supabase.from("vehicle_models").select("code, make_code, vehicle_type, display_name").eq("is_active", true).order("sort_order"),
    supabase.from("service_categories").select("code, display_name").eq("is_active", true).order("sort_order"),
    supabase
      .from("failure_categories")
      .select("code, display_name, recommended_service_code")
      .eq("is_active", true)
      .order("sort_order")
  ]);

  if (makesResult.error || modelsResult.error || servicesResult.error || failuresResult.error) {
    return fallbackServiceTaxonomy;
  }

  return {
    vehicleMakes: (makesResult.data ?? []).map((item) => ({
      code: item.code,
      label: item.display_name,
      vehicleTypes: item.vehicle_types
    })),
    vehicleModels: (modelsResult.data ?? []).map((item) => ({
      code: item.code,
      makeCode: item.make_code,
      vehicleType: item.vehicle_type,
      label: item.display_name
    })),
    serviceCategories: (servicesResult.data ?? []).map((item) => ({ code: item.code, label: item.display_name })),
    failureCategories: (failuresResult.data ?? []).map((item) => ({
      code: item.code,
      label: item.display_name,
      recommendedServiceCode: item.recommended_service_code
    }))
  };
}
