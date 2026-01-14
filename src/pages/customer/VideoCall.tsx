import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Video, Mic, MicOff, VideoOff, Phone } from 'lucide-react';

export default function VideoCall() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    // For a real implementation, you would create the room via Daily.co API
    // For now, we use a demo room approach
    const dailyUrl = `https://knowyourmechanic.daily.co/${roomId || 'demo'}`;

    const handleEndCall = () => {
        navigate(-1);
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[200] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold">Video Call</h2>
                        <p className="text-slate-400 text-sm">Connecting...</p>
                    </div>
                </div>
                <button
                    onClick={handleEndCall}
                    className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-300"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Video Container */}
            <div className="flex-1 relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white font-medium">Joining call...</p>
                        </div>
                    </div>
                )}

                {/* Daily.co iframe - in production, you'd use their React SDK */}
                <iframe
                    src={dailyUrl}
                    allow="camera; microphone; fullscreen; display-capture"
                    className="w-full h-full border-0"
                    onLoad={() => setIsLoading(false)}
                />
            </div>

            {/* Controls */}
            <div className="p-6 bg-slate-800/80 backdrop-blur-lg">
                <div className="flex items-center justify-center gap-6">
                    <button className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-600 transition-colors">
                        <Mic className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleEndCall}
                        className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
                    >
                        <Phone className="w-7 h-7 rotate-135" />
                    </button>
                    <button className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-600 transition-colors">
                        <Video className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
