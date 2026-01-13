import { Home, Clock, HelpCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BottomNavProps {
    role: 'customer' | 'garage';
}

export default function BottomNav({ role }: BottomNavProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const customerTabs = [
        { icon: Home, label: 'Home', path: '/customer' },
        { icon: Clock, label: 'Activity', path: '/customer/activity' },
        { icon: HelpCircle, label: 'Support', path: '/customer/support' },
    ];

    const garageTabs = [
        { icon: Home, label: 'Dashboard', path: '/garage' },
        { icon: HelpCircle, label: 'Support', path: '/garage/support' },
    ];

    const tabs = role === 'customer' ? customerTabs : garageTabs;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-safe z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            <div className="max-w-md mx-auto flex justify-around py-2">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300 ${isActive
                                    ? 'text-blue-600 scale-105 font-semibold'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <tab.icon className={`w-6 h-6 ${isActive ? 'fill-blue-600/10' : ''}`} />
                            <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
