import { motion } from 'framer-motion';

export const CustomLoader = () => (
    <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
            <motion.div
                className="absolute inset-0 border-4 border-blue-200 rounded-full"
                initial={{ opacity: 0.2 }}
            />
            <motion.div
                className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                </div>
            </motion.div>
        </div>
        <motion.p
            className="text-blue-600 font-medium text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
        >
            Revving up...
        </motion.p>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-safe pb-6">
        {/* Header Skeleton */}
        <div className="h-72 w-full bg-slate-200 animate-pulse mb-6 relative">
            <div className="absolute top-4 right-6 w-10 h-10 bg-slate-300 rounded-full" />
            <div className="absolute bottom-6 left-6 right-6 space-y-3">
                <div className="h-8 w-48 bg-slate-300 rounded" />
                <div className="flex gap-3">
                    <div className="h-6 w-24 bg-slate-300 rounded-full" />
                    <div className="h-6 w-24 bg-slate-300 rounded-full" />
                </div>
            </div>
        </div>

        <div className="px-6 space-y-6">
            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 gap-4">
                <div className="h-32 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl" />
                    <div className="space-y-2">
                        <div className="h-8 w-16 bg-slate-100 rounded" />
                        <div className="h-4 w-24 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="h-32 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl" />
                    <div className="space-y-2">
                        <div className="h-8 w-16 bg-slate-100 rounded" />
                        <div className="h-4 w-24 bg-slate-100 rounded" />
                    </div>
                </div>
            </div>

            {/* List Skeleton */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="h-6 w-32 bg-slate-200 rounded" />
                    <div className="h-4 w-16 bg-slate-200 rounded" />
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                        <div className="flex justify-between">
                            <div className="h-5 w-40 bg-slate-100 rounded" />
                            <div className="h-5 w-16 bg-slate-100 rounded" />
                        </div>
                        <div className="h-4 w-64 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);
