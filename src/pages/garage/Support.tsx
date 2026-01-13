import { motion } from 'framer-motion';
import { MessageSquare, Phone, Mail, ArrowRight, ShieldCheck, Briefcase } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

export default function GarageSupport() {
    const options = [
        { icon: MessageSquare, label: 'Partner Hotline', description: 'Business support 24/7', color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: Phone, label: 'Account Manager', description: 'Dedicated assistance', color: 'text-green-600', bg: 'bg-green-50' },
        { icon: Mail, label: 'Portal Issues', description: 'tech@knowyourmechanic.com', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pt-safe pb-28 px-6">
            <header className="py-8 mb-4">
                <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-500/20 flex items-center justify-center text-white mb-6">
                    <Briefcase className="w-9 h-9" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Partner Support</h1>
                <p className="text-slate-500 font-medium">Growing your business together</p>
            </header>

            <div className="space-y-4">
                {options.map((option, i) => (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={option.label}
                        className="w-full premium-card p-6 flex items-center gap-6 group hover:border-blue-300"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${option.bg} ${option.color} flex items-center justify-center`}>
                            <option.icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-black text-slate-900">{option.label}</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{option.description}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600" />
                    </motion.button>
                ))}
            </div>

            <div className="mt-12 p-8 bg-blue-600 rounded-[2.5rem] text-white shadow-2xl shadow-blue-900/10">
                <div className="flex items-center gap-4 mb-4">
                    <ShieldCheck className="w-8 h-8 opacity-80" />
                    <h4 className="text-xl font-black">Safe Earnings</h4>
                </div>
                <p className="text-blue-100 text-sm font-medium leading-relaxed">
                    Your business data and earnings are protected with bank-grade security.
                </p>
            </div>

            <BottomNav role="garage" />
        </div>
    );
}
