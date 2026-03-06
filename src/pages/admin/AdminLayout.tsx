import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserCog, Activity, Flag, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLayout() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Auto-scroll to top and close sidebar on route change (for mobile)
    useEffect(() => {
        window.scrollTo(0, 0);
        setSidebarOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate('/auth');
    };

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/employees', label: 'Employees', icon: Users },
        { path: '/admin/performance', label: 'Performance', icon: UserCog },
        { path: '/admin/reports', label: 'Reports', icon: Flag },
        { path: '/admin/advanced', label: 'Advanced Metrics', icon: Activity },
    ];

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800 flex flex-col md:flex-row">

            {/* Mobile Header (Hamburger Menu) */}
            <div className="md:hidden flex items-center justify-between h-16 px-4 bg-black border-b border-zinc-900 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded object-cover" />
                    <span className="font-bold text-sm tracking-tight text-white">Admin Console</span>
                </div>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors"
                >
                    {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-40 w-64 bg-black border-r border-zinc-900 flex flex-col
                    transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:w-64 md:flex-shrink-0
                    ${sidebarOpen ? 'translate-x-0 top-16 md:top-0' : '-translate-x-full'}
                `}
            >
                {/* Desktop Logo Area (Hidden on mobile inside sidebar) */}
                <div className="hidden md:flex h-16 items-center px-6 border-b border-zinc-900 shrink-0">
                    <div className="flex items-center gap-3">
                        <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded object-cover" />
                        <span className="font-bold text-sm tracking-tight text-white">KnowyourMechanic</span>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto w-full">
                    <p className="px-3 text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-3">Admin Console</p>

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path ||
                            (item.path !== '/admin' && location.pathname.startsWith(`${item.path}/`));

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-zinc-900 text-white'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Bottom Action */}
                <div className="p-4 border-t border-zinc-900 max-w-full">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <LogOut className="w-4 h-4 text-zinc-500" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 bg-black min-h-[calc(100vh-4rem)] md:min-h-screen">
                <Outlet />
            </main>
        </div>
    );
}
