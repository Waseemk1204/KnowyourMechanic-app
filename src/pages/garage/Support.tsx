import { motion } from 'framer-motion';
import { MessageSquare, Phone, Mail, ArrowRight, ShieldCheck, Briefcase, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GarageSupport() {
    const navigate = useNavigate();

    const options = [
        { icon: MessageSquare, label: 'Partner Hotline', description: 'Business support 24/7', color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: Phone, label: 'Account Manager', description: 'Dedicated assistance', color: 'text-green-600', bg: 'bg-green-50' },
        { icon: Mail, label: 'Portal Issues', description: 'tech@knowyourmechanic.com', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pt-safe pb-6">
            {/* Header with Back Button */}
            <header className="bg-blue-600 text-white px-6 py-8 rounded-b-[2.5rem]">
                <button
                    onClick={() => navigate('/garage')}
                    className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back</span>
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Briefcase className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black">Partner Support</h1>
                        <p className="text-blue-200 text-sm">Growing your business together</p>
                    </div>
                </div>
            </header>

            <div className="px-6 py-6 space-y-4">
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

                <div className="mt-8 p-8 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/20">
                    <div className="flex items-center gap-4 mb-4">
                        <ShieldCheck className="w-8 h-8 opacity-80" />
                        <h4 className="text-xl font-black">Safe Earnings</h4>
                    </div>
                    <p className="text-blue-100 text-sm font-medium leading-relaxed">
                        Your business data and earnings are protected with bank-grade security.
                    </p>
                </div>
            </div>
        </div>
    );
}
