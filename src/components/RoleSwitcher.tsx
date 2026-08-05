import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, X, Check, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_META, routeForRole } from '../lib/roles';
import type { AppRole } from '../lib/data';

// Lets a user who holds more than one role switch dashboards without logging
// out. Renders nothing for single-role users. Drop it into any settings screen.
// variant 'card' suits light settings screens; 'nav' suits the dark staff
// consoles (admin/support sidebars). Both open the same picker sheet.
export default function RoleSwitcher({ variant = 'card' }: { variant?: 'card' | 'nav' }) {
    const { userData, availableRoles, switchRole } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<AppRole | null>(null);

    if (!userData || availableRoles.length <= 1) return null;
    const current = userData.role;

    const choose = async (role: AppRole) => {
        if (role === current) { setOpen(false); return; }
        setBusy(role);
        try {
            switchRole(role);
            const path = await routeForRole(role, userData._id);
            setOpen(false);
            navigate(path);
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            {variant === 'nav' ? (
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-colors"
                >
                    <Repeat className="w-4 h-4 text-zinc-500" />
                    Switch role
                </button>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className="w-full bg-white dark:bg-[var(--app-surface)] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-[var(--app-border)] flex items-center gap-3 active:scale-[0.99] transition-transform"
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Repeat className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="font-bold text-slate-900 dark:text-[var(--app-text)]">Switch role</p>
                        <p className="text-slate-500 dark:text-[var(--app-muted)] text-sm">Currently: {ROLE_META[current]?.label ?? current}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
            )}

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
                        onClick={() => setOpen(false)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="bg-white dark:bg-[var(--app-surface)] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-black text-slate-900 dark:text-[var(--app-text)]">Switch role</h2>
                                <button onClick={() => setOpen(false)} className="text-slate-400 dark:text-[var(--app-muted)] active:scale-90 transition-transform">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {availableRoles.map((role) => {
                                    const meta = ROLE_META[role];
                                    if (!meta) return null;
                                    const Icon = meta.Icon;
                                    const isCurrent = role === current;
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => choose(role)}
                                            disabled={busy !== null}
                                            className={`w-full rounded-2xl p-4 flex items-center gap-4 border transition-all text-left ${isCurrent ? 'border-blue-300 bg-blue-50' : 'border-slate-100 dark:border-[var(--app-border)] bg-white dark:bg-[var(--app-surface)] hover:border-blue-200'}`}
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 dark:text-[var(--app-text)]">{meta.label}</h3>
                                                <p className="text-slate-500 dark:text-[var(--app-muted)] text-sm">{meta.sub}</p>
                                            </div>
                                            {busy === role ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                            ) : isCurrent ? (
                                                <Check className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-slate-300" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
