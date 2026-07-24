import { Car, Wrench, Shield, UserCog, Headset, type LucideIcon } from 'lucide-react';
import { getMyGarage, type AppRole } from './data';

// Presentation for each role — shared by the login picker and the in-app switcher.
export const ROLE_META: Record<AppRole, { label: string; sub: string; Icon: LucideIcon }> = {
    customer: { label: 'Customer', sub: 'Find local experts', Icon: Car },
    garage: { label: 'Garage Owner', sub: 'Manage your business', Icon: Wrench },
    admin: { label: 'Admin', sub: 'Platform administration', Icon: Shield },
    employee: { label: 'Employee', sub: 'Field operations', Icon: UserCog },
    support: { label: 'Support', sub: 'Help customers & garages', Icon: Headset },
};

// The home route for a role. Garage resolves to onboarding when no garage exists.
export async function routeForRole(role: AppRole, profileId: string): Promise<string> {
    if (role === 'admin') return '/admin';
    if (role === 'support') return '/support';
    if (role === 'employee') return '/employee';
    if (role === 'garage') {
        const garage = await getMyGarage(profileId);
        if (garage) {
            localStorage.setItem('garageOnboarded', 'true');
            return '/garage';
        }
        localStorage.removeItem('garageOnboarded');
        return '/garage/onboarding';
    }
    return '/customer';
}
