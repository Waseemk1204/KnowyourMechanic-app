import { Calendar } from 'lucide-react';

interface WorkingDaysPickerProps {
    value: string[]; // ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    onChange: (value: string[]) => void;
}

const allDays = [
    { short: 'Mon', full: 'Monday' },
    { short: 'Tue', full: 'Tuesday' },
    { short: 'Wed', full: 'Wednesday' },
    { short: 'Thu', full: 'Thursday' },
    { short: 'Fri', full: 'Friday' },
    { short: 'Sat', full: 'Saturday' },
    { short: 'Sun', full: 'Sunday' },
];

export default function WorkingDaysPicker({ value, onChange }: WorkingDaysPickerProps) {
    const toggleDay = (day: string) => {
        if (value.includes(day)) {
            onChange(value.filter(d => d !== day));
        } else {
            // Keep days in order
            const newDays = allDays
                .filter(d => value.includes(d.short) || d.short === day)
                .map(d => d.short);
            onChange(newDays);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <Calendar className="w-4 h-4" />
                <span>Working Days</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {allDays.map((day) => {
                    const isSelected = value.includes(day.short);
                    return (
                        <button
                            key={day.short}
                            type="button"
                            onClick={() => toggleDay(day.short)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isSelected
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                        >
                            {day.short}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
