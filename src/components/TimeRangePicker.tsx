import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimeRangePickerProps {
    value: string; // "9:00 AM - 8:00 PM"
    onChange: (value: string) => void;
}

const timeOptions = [
    '12:00 AM', '12:30 AM',
    '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
    '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM',
    '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
    '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
    '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
];

export default function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
    const [openTime, setOpenTime] = useState('9:00 AM');
    const [closeTime, setCloseTime] = useState('8:00 PM');

    useEffect(() => {
        // Parse initial value like "9:00 AM - 8:00 PM"
        if (value && value.includes(' - ')) {
            const [open, close] = value.split(' - ');
            if (open) setOpenTime(open.trim());
            if (close) setCloseTime(close.trim());
        }
    }, []);

    const handleChange = (type: 'open' | 'close', time: string) => {
        if (type === 'open') {
            setOpenTime(time);
            onChange(`${time} - ${closeTime}`);
        } else {
            setCloseTime(time);
            onChange(`${openTime} - ${time}`);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Clock className="w-4 h-4" />
                <span>Service Hours</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Opens at</label>
                    <select
                        value={openTime}
                        onChange={(e) => handleChange('open', e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-slate-100 border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white text-sm font-medium"
                    >
                        {timeOptions.map((time) => (
                            <option key={time} value={time}>{time}</option>
                        ))}
                    </select>
                </div>
                <div className="text-slate-300 font-bold pt-5">—</div>
                <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Closes at</label>
                    <select
                        value={closeTime}
                        onChange={(e) => handleChange('close', e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-slate-100 border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white text-sm font-medium"
                    >
                        {timeOptions.map((time) => (
                            <option key={time} value={time}>{time}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
