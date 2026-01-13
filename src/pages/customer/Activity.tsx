import { motion } from 'framer-motion';
import { Clock, Wrench, Shield, ArrowRight } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

export default function CustomerActivity() {
    const activities = [
        { id: 1, type: 'Service', garage: 'Sapphire Car Care', date: '24 Dec, 2025', status: 'Completed', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 2, type: 'Repair', garage: 'Auto Precision', date: '18 Dec, 2025', status: 'Completed', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pt-safe pb-28 px-6">
            <header className="py-8 mb-4">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Activity</h1>
                <p className="text-slate-500 font-medium">Your service history</p>
            </header>

            <div className="space-y-4">
                {activities.map((activity, i) => (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={activity.id}
                        className="premium-card p-6 flex items-center gap-5 bg-white group cursor-pointer"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${activity.bg} ${activity.color} flex items-center justify-center`}>
                            <activity.icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-black text-slate-900">{activity.garage}</h3>
                                <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                    {activity.status}
                                </span>
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                {activity.type} • {activity.date}
                            </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </motion.div>
                ))}

                {activities.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                            <Clock className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-400">No activity yet</h3>
                        <p className="text-slate-300 font-medium">Your bookings will appear here</p>
                    </div>
                )}
            </div>

            <BottomNav role="customer" />
        </div>
    );
}
