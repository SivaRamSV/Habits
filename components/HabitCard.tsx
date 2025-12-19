import React from 'react';
import { Habit, CompletionRecord } from '../types';
import { formatDate, getPastDays, getDayName, cn } from '../lib/utils';
import { Check, X } from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  completions: CompletionRecord;
  onToggle: (date: string) => void;
  onSelect: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({ habit, completions, onToggle, onSelect }) => {
  // Show last 5 days
  const recentDays = getPastDays(5);

  const calculateScore = () => {
    const thirtyDays = getPastDays(30);
    const completedCount = thirtyDays.filter(d => completions[formatDate(d)]).length;
    return Math.round((completedCount / 30) * 100);
  };

  const score = calculateScore();

  return (
    <div className="flex items-center justify-between py-4 border-b border-[#1c1c1e] hover:bg-[#1c1c1e]/50 transition-colors cursor-default">
      {/* Left: Progress + Name */}
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4" onClick={onSelect}>
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg className="w-full h-full -rotate-90">
             <circle 
                cx="20" cy="20" r="16" 
                stroke="#333" strokeWidth="4" fill="none" 
             />
             <circle 
                cx="20" cy="20" r="16" 
                stroke={habit.color} strokeWidth="4" fill="none"
                strokeDasharray="100"
                strokeDashoffset={100 - score}
                className="transition-all duration-500"
             />
          </svg>
        </div>
        <div className="truncate">
           <h3 className="text-[17px] text-white font-medium truncate">{habit.name}</h3>
        </div>
      </div>

      {/* Right: 5 Day Grid */}
      <div className="flex items-center gap-4 sm:gap-6">
        {recentDays.map((date) => {
          const dateStr = formatDate(date);
          const isCompleted = !!completions[dateStr];
          
          return (
            <button
              key={dateStr}
              onClick={() => onToggle(dateStr)}
              className="flex items-center justify-center w-6 h-6 focus:outline-none"
            >
              {isCompleted ? (
                <Check size={20} style={{ color: habit.color }} strokeWidth={3} />
              ) : (
                <X size={18} className="text-[#3a3a3c]" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
