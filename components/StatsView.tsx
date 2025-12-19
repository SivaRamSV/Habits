import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { Habit, CompletionRecord } from '../types';
import { formatDate, cn } from '../lib/utils';
import { ArrowLeft, Trash2, Calendar as CalendarIcon, Edit2, ChevronDown } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

interface StatsViewProps {
  habit: Habit;
  completions: CompletionRecord;
  onBack: () => void;
  onDelete: (id: string) => void;
  onToggle: (date: string) => void;
  onEdit: () => void;
}

type TimeRange = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
type HistoryRange = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export const StatsView: React.FC<StatsViewProps> = ({ habit, completions, onBack, onDelete, onToggle, onEdit }) => {
  const [scoreRange, setScoreRange] = useState<TimeRange>('DAY');
  const [isScoreDropdownOpen, setIsScoreDropdownOpen] = useState(false);
  
  const [historyRange, setHistoryRange] = useState<HistoryRange>('YEARLY');
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);

  const [isEditingCalendar, setIsEditingCalendar] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<CompletionRecord>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const scoreScrollRef = useRef<HTMLDivElement>(null);
  const frequencyScrollRef = useRef<HTMLDivElement>(null);

  // Display completions includes pending edits for visual preview only
  const displayCompletions = useMemo(() => {
    if (Object.keys(pendingEdits).length === 0) return completions;
    return { ...completions, ...pendingEdits };
  }, [completions, pendingEdits]);

  // Visual completion state for calendar cells (includes pending edits)
  const getVisualCompletion = (dateStr: string): boolean => {
    if (isEditingCalendar && pendingEdits[dateStr] !== undefined) {
      return pendingEdits[dateStr] === true;
    }
    const val = completions[dateStr];
    return val === true || val === 1 || val === 2;
  };

  // Handle toggle during edit mode
  const handleToggle = (dateStr: string) => {
    if (isEditingCalendar) {
      // Store in pending edits, don't trigger parent update yet
      setPendingEdits(prev => {
        const currentVal = prev[dateStr] !== undefined ? prev[dateStr] : completions[dateStr];
        const newVal = !currentVal;
        const newEdits = { ...prev };
        if (newVal) {
          newEdits[dateStr] = true;
        } else {
          delete newEdits[dateStr];
        }
        return newEdits;
      });
    } else {
      // Not in edit mode, update immediately (for today's toggle)
      onToggle(dateStr);
    }
  };

  // Commit all pending edits when exiting edit mode
  const handleDoneEditing = () => {
    // Apply all pending edits
    Object.keys(pendingEdits).forEach(dateStr => {
      onToggle(dateStr);
    });
    setPendingEdits({});
    setIsEditingCalendar(false);
  };

  // Helper: Get local midnight for a Date object or current time
  const getMidnight = (d?: Date | string) => {
    const date = d ? new Date(d) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // --- Data Processing ---

  // Loop's habit score formula (exponential moving average)
  const computeScore = (frequency: number, previousScore: number, checkmarkValue: number): number => {
    const multiplier = Math.pow(0.5, Math.sqrt(frequency) / 13.0);
    let score = previousScore * multiplier;
    score += checkmarkValue * (1 - multiplier);
    return score;
  };

  // Calculate all scores chronologically from ACTUAL completions only
  // This is expensive, so we only recalculate when completions change, not during editing
  const allScores = useMemo(() => {
    const frequency = 1.0; // Daily habit
    const scoreMap: Record<string, number> = {};
    
    // Get all dates from first completion to today
    const today = getMidnight();
    const dateKeys = Object.keys(completions).sort();
    
    if (dateKeys.length === 0) return scoreMap;
    
    const firstDate = new Date(dateKeys[0]);
    firstDate.setHours(0, 0, 0, 0);
    
    let currentScore = 0.0;
    let current = new Date(firstDate);
    
    // Pre-calculate multiplier since it's constant
    const multiplier = Math.pow(0.5, Math.sqrt(frequency) / 13.0);
    const inverseMultiplier = 1 - multiplier;
    
    // Calculate score for each day
    while (current <= today) {
      const dateStr = formatDate(current);
      const val = completions[dateStr];
      const checkmarkValue = (val === true || val === 1 || val === 2) ? 1.0 : 0.0;
      
      // Inline computation for speed
      currentScore = currentScore * multiplier + checkmarkValue * inverseMultiplier;
      scoreMap[dateStr] = currentScore;
      
      current.setDate(current.getDate() + 1);
    }
    
    return scoreMap;
  }, [completions]);

  // 1. Overview Stats (use actual completions for count)
  const totalCompletions = Object.values(completions).filter(v => v === true || v === 1 || v === 2).length;
  
  const score = useMemo(() => {
    const now = getMidnight();
    const todayStr = formatDate(now);
    const todayScore = allScores[todayStr] || 0;
    return Math.round(todayScore * 100);
  }, [allScores]);

  // 2. Score Chart Data
  const scoreChartData = useMemo(() => {
     const data = [];
     const today = getMidnight();
     const dateKeys = Object.keys(allScores).sort();
     
     if (dateKeys.length === 0) return [];
     
     const firstDate = new Date(dateKeys[0]);
     firstDate.setHours(0, 0, 0, 0);
     
     if (scoreRange === 'DAY') {
         // Daily scores from first score to today
         let current = new Date(firstDate);
         while (current <= today) {
             const dateStr = formatDate(current);
             const scoreValue = allScores[dateStr] || 0;
             
             const monthAbbr = current.toLocaleDateString('en-US', { month: 'short' });
             const day = current.getDate();
             
             data.push({ 
                 name: `${monthAbbr} ${day}`, 
                 score: Math.round(scoreValue * 100),
                 fullDate: current.toLocaleDateString() 
             });
             
             current.setDate(current.getDate() + 1);
         }
     } else if (scoreRange === 'WEEK') {
         // Weekly average scores
         let startDate = new Date(firstDate);
         const dayOfWeek = startDate.getDay();
         const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
         startDate.setDate(startDate.getDate() - diff);
         startDate.setHours(0, 0, 0, 0);
         
         let currentDate = new Date(startDate);
         let weekNum = 1;
         let currentMonth = currentDate.getMonth();
         
         while (currentDate <= today) {
             const endOfWeek = new Date(currentDate);
             endOfWeek.setDate(currentDate.getDate() + 6);
             endOfWeek.setHours(23, 59, 59, 999);
             
             let scoreSum = 0;
             let count = 0;
             for(let k=0; k<7; k++) {
                 const wd = new Date(currentDate);
                 wd.setDate(currentDate.getDate() + k);
                 wd.setHours(0, 0, 0, 0);
                 const dateStr = formatDate(wd);
                 if(allScores[dateStr] !== undefined) {
                     scoreSum += allScores[dateStr];
                     count++;
                 }
             }
             const avgScore = count > 0 ? scoreSum / count : 0;
             
             if (currentDate.getMonth() !== currentMonth) {
                 weekNum = 1;
                 currentMonth = currentDate.getMonth();
             }
             
             const monthName = currentDate.toLocaleDateString('en-US', {month: 'short'});
             data.push({
                 name: `${monthName} W${weekNum}`, 
                 score: Math.round(avgScore * 100),
                 fullDate: `Week of ${currentDate.toLocaleDateString()}`
             });
             
             currentDate.setDate(currentDate.getDate() + 7);
             weekNum++;
         }
     } else if (scoreRange === 'MONTH') {
         // Monthly average scores
         const startYear = firstDate.getFullYear();
         let currentD = new Date(startYear, firstDate.getMonth(), 1);
         currentD.setHours(0, 0, 0, 0);
         
         while (currentD <= today) {
             const monthName = currentD.toLocaleDateString('en-US', { month: 'short' });
             const year = currentD.getFullYear();
             const daysInMonth = new Date(currentD.getFullYear(), currentD.getMonth()+1, 0).getDate();
             
             let scoreSum = 0;
             let count = 0;
             for(let day=1; day<=daysInMonth; day++) {
                 const date = new Date(currentD.getFullYear(), currentD.getMonth(), day);
                 date.setHours(0, 0, 0, 0);
                 const dateStr = formatDate(date);
                 if(allScores[dateStr] !== undefined) {
                     scoreSum += allScores[dateStr];
                     count++;
                 }
             }
             const avgScore = count > 0 ? scoreSum / count : 0;
             
             data.push({ 
                 name: `${monthName} ${year}`, 
                 score: Math.round(avgScore * 100), 
                 fullDate: `${monthName} ${year}` 
             });
             
             currentD.setMonth(currentD.getMonth() + 1);
         }
     } else {
         // Yearly average scores
         const startYear = firstDate.getFullYear();
         const endYear = today.getFullYear();
         
         for (let y = startYear; y <= endYear; y++) {
             let scoreSum = 0;
             let count = 0;
             
             const yearStart = new Date(y, 0, 1);
             const yearEnd = y === endYear ? today : new Date(y, 11, 31);
             
             let current = new Date(Math.max(yearStart.getTime(), firstDate.getTime()));
             while (current <= yearEnd) {
                 const dateStr = formatDate(current);
                 if(allScores[dateStr] !== undefined) {
                     scoreSum += allScores[dateStr];
                     count++;
                 }
                 current.setDate(current.getDate() + 1);
             }
             
             const avgScore = count > 0 ? scoreSum / count : 0;
             data.push({ 
                 name: y.toString(), 
                 score: Math.round(avgScore * 100), 
                 fullDate: y.toString() 
             });
         }
     }
     return data;
  }, [allScores, scoreRange]);

  // 3. History Chart Data (use actual completions only, not pending edits)
  const historyData = useMemo(() => {
    const data: { name: string, count: number }[] = [];
    const today = getMidnight();
    // Sort dates and filter for actual completions
    const sortedDates = Object.keys(completions)
      .filter(k => completions[k] === true || completions[k] === 1 || completions[k] === 2)
      .sort();

    // Determine range start based on data, but default to sensible lookbacks if no data
    let startYear = today.getFullYear();
    if (sortedDates.length > 0) {
       const firstYear = parseInt(sortedDates[0].split('-')[0]);
       if (!isNaN(firstYear)) startYear = firstYear;
    }

    // Safety clamp
    startYear = Math.max(startYear, 2000); 

    // Helper: bucket data first to avoid O(N*M) lookups
    const bucketCounts: Record<string, number> = {};

    if (historyRange === 'YEARLY') {
        sortedDates.forEach(d => {
            const y = d.split('-')[0];
            bucketCounts[y] = (bucketCounts[y] || 0) + 1;
        });
        
        for (let y = startYear; y <= today.getFullYear(); y++) {
            data.push({ name: y.toString(), count: bucketCounts[y.toString()] || 0 });
        }

    } else if (historyRange === 'QUARTERLY') {
        // Pre-bucket by quarter
        sortedDates.forEach(d => {
            const [yStr, mStr] = d.split('-');
            const m = parseInt(mStr); // 1-12
            if (!isNaN(m) && m >= 1 && m <= 12) {
                const q = Math.ceil(m / 3);
                const key = `${yStr}-${q}`;
                bucketCounts[key] = (bucketCounts[key] || 0) + 1;
            }
        });

        let currentY = startYear;
        let currentQ = 1;
        
        const endY = today.getFullYear();
        const endQ = Math.floor(today.getMonth() / 3) + 1;

        const quarterMonths = ['Jan', 'Apr', 'Jul', 'Oct'];

        while(currentY < endY || (currentY === endY && currentQ <= endQ)) {
             const key = `${currentY}-${currentQ}`;
             const monthName = quarterMonths[currentQ - 1];
             const label = `${monthName} ${currentY}`;
             data.push({ name: label, count: bucketCounts[key] || 0 });

             currentQ++;
             if(currentQ > 4) {
                 currentQ = 1;
                 currentY++;
             }
        }

    } else if (historyRange === 'MONTHLY') {
        // Pre-bucket
        sortedDates.forEach(d => {
            // YYYY-MM
            if (d && d.length >= 7) {
                const key = d.substring(0, 7);
                bucketCounts[key] = (bucketCounts[key] || 0) + 1;
            }
        });

        let currentD = new Date(startYear, 0, 1);
        currentD.setHours(0, 0, 0, 0);
        const endD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endD.setHours(0, 0, 0, 0);

        while (currentD <= endD) {
            const key = formatDate(currentD).substring(0, 7); 
            const monthName = currentD.toLocaleDateString('en-US', { month: 'short' });
            const year = currentD.getFullYear();
            const label = `${monthName} ${year}`;
            
            data.push({ name: label, count: bucketCounts[key] || 0 });

            currentD.setMonth(currentD.getMonth() + 1);
        }

    } else if (historyRange === 'WEEKLY') {
         // Determine start from first completion or 1 year back
         let startDate = new Date(today);
         startDate.setFullYear(startDate.getFullYear() - 1);
         
         if (sortedDates.length > 0) {
             const firstDate = new Date(sortedDates[0]);
             if (firstDate < startDate) {
                 startDate = firstDate;
             }
         }
         
         // Align to Monday
         const dayOfWeek = startDate.getDay();
         const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
         startDate.setDate(startDate.getDate() - diff);
         startDate.setHours(0, 0, 0, 0);
         
         const currentDate = new Date(startDate);
         let weekNum = 1;
         let currentMonth = currentDate.getMonth();
         
         while (currentDate <= today) {
             const endOfWeek = new Date(currentDate);
             endOfWeek.setDate(currentDate.getDate() + 6);
             endOfWeek.setHours(23, 59, 59, 999);
             
             let count = 0;
             sortedDates.forEach(dateStr => {
                 const [y, m, day] = dateStr.split('-').map(Number);
                 const date = new Date(y, m - 1, day);
                 date.setHours(0, 0, 0, 0);
                 if (date >= currentDate && date <= endOfWeek) count++;
             });
             
             // Check if we're in a new month
             if (currentDate.getMonth() !== currentMonth) {
                 weekNum = 1;
                 currentMonth = currentDate.getMonth();
             }
             
             const monthName = currentDate.toLocaleDateString('en-US', {month: 'short'});
             const label = `${monthName} W${weekNum}`;
             data.push({ name: label, count });
             
             currentDate.setDate(currentDate.getDate() + 7);
             weekNum++;
         }
    }

    return data;
  }, [completions, historyRange]);

  // 4. Calendar Data Construction (use actual completions for week calculation)
  const { weeks, monthLabels } = useMemo(() => {
      // Use purely local date math to ensure alignment
      // Parse "YYYY-MM-DD" strictly to local midnight
      const parseLocal = (dateStr: string) => {
          if(!dateStr) return getMidnight();
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, m - 1, d);
      };

      const today = getMidnight();

      const sortedDates = Object.keys(completions).sort();
      
      let start = new Date(today);
      start.setFullYear(start.getFullYear() - 1); // Default 1 year back
      
      if (sortedDates.length > 0) {
          const first = parseLocal(sortedDates[0]);
          // Safety: Clamp max lookback to 3 years
          const threeYearsAgo = new Date(today);
          threeYearsAgo.setFullYear(today.getFullYear() - 3);
          
          if (first < start) start = first;
          if (start < threeYearsAgo) start = threeYearsAgo;
      }
      
      // Align start to Monday
      const day = start.getDay(); 
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);

      const weeksArr = [];
      const current = new Date(start);
      current.setHours(0,0,0,0);
      
      // Go 2 weeks into future to ensure "Today" and near future are covered
      const end = new Date(today);
      end.setDate(end.getDate() + 14); 
      end.setHours(0,0,0,0);

      let safetyCounter = 0;
      while (current <= end && safetyCounter < 1000) { 
          const weekDays = [];
          for(let i=0; i<7; i++) {
              weekDays.push(new Date(current));
              current.setDate(current.getDate() + 1);
          }
          weeksArr.push(weekDays);
          safetyCounter++;
      }

      // Generate Month Labels
      const labels: { text: string, left: number }[] = [];
      let lastMonth = -1;
      
      weeksArr.forEach((week, idx) => {
          const firstDayOfWeek = week[0];
          const m = firstDayOfWeek.getMonth();
          if (m !== lastMonth) {
              labels.push({ 
                  text: firstDayOfWeek.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
                  left: idx * 34 
              });
              lastMonth = m;
          }
      });

      return { weeks: weeksArr, monthLabels: labels };
  }, [completions]);

  // Scroll to latest date on initial load and when exiting edit mode
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []); // Only on initial mount

  // Scroll to latest when exiting edit mode
  useLayoutEffect(() => {
    if (scrollRef.current && !isEditingCalendar) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      }, 10);
    }
  }, [isEditingCalendar]);

  useLayoutEffect(() => {
      if (historyScrollRef.current) historyScrollRef.current.scrollLeft = historyScrollRef.current.scrollWidth;
  }, [historyData]);

  useLayoutEffect(() => {
      if (scoreScrollRef.current) scoreScrollRef.current.scrollLeft = scoreScrollRef.current.scrollWidth;
  }, [scoreChartData]);


  // 5. Streaks (use actual completions only)
  const streaks = useMemo(() => {
      const sortedDates = Object.keys(completions)
        .filter(d => completions[d] === true || completions[d] === 1 || completions[d] === 2)
        .sort((a,b) => a.localeCompare(b)); 
        
      const result: {start: string, end: string, length: number}[] = [];
      if(!sortedDates.length) return [];

      let currentStreak = { start: sortedDates[0], end: sortedDates[0], length: 1 };
      
      for(let i=1; i<sortedDates.length; i++) {
          const prev = new Date(sortedDates[i-1]);
          const curr = new Date(sortedDates[i]);
          const diffTime = Math.abs(curr.getTime() - prev.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if(diffDays === 1) {
              currentStreak.end = sortedDates[i];
              currentStreak.length++;
          } else {
              result.push(currentStreak);
              currentStreak = { start: sortedDates[i], end: sortedDates[i], length: 1 };
          }
      }
      result.push(currentStreak);
      return result.sort((a,b) => b.length - a.length).slice(0, 5); 
  }, [completions]);

  // 6. Frequency
  const frequencyData = useMemo(() => {
      const data = [];
      const today = getMidnight();
      
      // Find first completion date to determine range
      const sortedDates = Object.keys(completions).sort();
      let startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 1); // Default 1 year back
      
      if (sortedDates.length > 0) {
          const firstCompletion = new Date(sortedDates[0]);
          if (firstCompletion < startDate) startDate = firstCompletion;
      }
      
      // Start from first day of the month
      const firstMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const monthsToShow = [];
      let current = new Date(firstMonth);
      
      // Generate all months from first completion to today
      while (current <= today) {
          monthsToShow.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
      }
      
      // Process each month
      monthsToShow.forEach(monthDate => {
          const monthKey = monthDate.toLocaleDateString('en-US', {month: 'short', year: '2-digit'});
          const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0).getDate();
          
          const distribution = [0,0,0,0,0,0,0]; 
          
          for(let i=1; i<=daysInMonth; i++) {
              const dayDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
              dayDate.setHours(0, 0, 0, 0);
              const dateStr = formatDate(dayDate);
              const val = completions[dateStr];
              if(val === true || val === 1 || val === 2) {
                  distribution[dayDate.getDay()]++;
              }
          }
          data.push({ month: monthKey, distribution });
      });
      
      return data;
  }, [completions]);

  // Scroll frequency chart to the end on mount and when data changes
  useLayoutEffect(() => {
    if (frequencyScrollRef.current) {
      setTimeout(() => {
        if (frequencyScrollRef.current) {
          frequencyScrollRef.current.scrollLeft = frequencyScrollRef.current.scrollWidth;
        }
      }, 100);
    }
  }, [frequencyData]);

  const weekDaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-black min-h-screen text-slate-200">
      
      {/* Navbar */}
      <div className="sticky top-0 bg-black z-30 px-4 h-14 flex items-center justify-between border-b border-[#1c1c1e]">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-white hover:bg-[#1c1c1e] p-2 rounded-full -ml-2 transition-colors">
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg font-bold text-white truncate max-w-[200px]">{habit.name}</h2>
        </div>
        <div className="flex gap-2 text-white">
            <button 
                className="p-2 hover:bg-[#1c1c1e] rounded-full transition-colors"
                onClick={onEdit}
                title="Edit habit"
            >
                <Edit2 size={20} />
            </button>
            <button 
                className="p-2 hover:bg-[#1c1c1e] rounded-full text-red-400"
                onClick={() => { if(confirm('Delete this habit?')) onDelete(habit.id) }}
            >
                <Trash2 size={20} />
            </button>
        </div>
      </div>

      <div className="p-4 space-y-10 pb-20">
        
        {/* Header Section */}
        <div className="space-y-4">
            <p className="text-[15px] leading-relaxed" style={{color: habit.color}}>{habit.question}</p>
            <div className="flex items-center gap-3 text-[#86868b] text-xs font-medium uppercase tracking-wide">
                <div className="flex items-center gap-1">
                    <CalendarIcon size={14} />
                    <span>Every day</span>
                </div>
            </div>
        </div>

        {/* Circular Overview */}
        <div>
            <h3 className="text-sm font-medium mb-6 uppercase tracking-wider" style={{color: habit.color}}>Overview</h3>
            <div className="grid grid-cols-4 gap-4 items-center">
                 <div className="col-span-1 flex flex-col items-center justify-center">
                     <div className="relative w-16 h-16">
                         <svg className="w-full h-full -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="#27272a" strokeWidth="6" fill="none" />
                            <circle 
                                cx="32" cy="32" r="28" 
                                stroke={habit.color} strokeWidth="6" fill="none" 
                                strokeDasharray="175" 
                                strokeDashoffset={175 - (175 * score / 100)} 
                                strokeLinecap="round"
                            />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-sm">
                             {score}%
                         </div>
                     </div>
                     <span className="text-[10px] text-[#86868b] mt-2 uppercase font-medium">Score</span>
                 </div>
                 
                 <div className="flex flex-col items-center">
                     <div className="text-xl font-bold" style={{color: habit.color}}>+7%</div>
                     <div className="text-[10px] text-[#86868b] uppercase font-medium">Month</div>
                 </div>
                 <div className="flex flex-col items-center">
                     <div className="text-xl font-bold" style={{color: habit.color}}>+12%</div>
                     <div className="text-[10px] text-[#86868b] uppercase font-medium">Year</div>
                 </div>
                 <div className="flex flex-col items-center">
                     <div className="text-xl font-bold text-white">{totalCompletions}</div>
                     <div className="text-[10px] text-[#86868b] uppercase font-medium">Total</div>
                 </div>
            </div>
        </div>

        {/* Score Chart */}
        <div className="relative">
            <div className="flex justify-between items-center mb-4 border-b border-[#27272a] pb-2">
                 <h3 className="text-sm font-medium uppercase tracking-wider" style={{color: habit.color}}>Score</h3>
                 <button 
                    onClick={() => setIsScoreDropdownOpen(!isScoreDropdownOpen)}
                    className="flex items-center gap-1 text-[10px] text-[#86868b] bg-[#1c1c1e] px-2 py-1 rounded hover:text-white transition-colors cursor-pointer"
                 >
                    {scoreRange.charAt(0) + scoreRange.slice(1).toLowerCase()} 
                    <ChevronDown size={12} />
                 </button>
            </div>

            {isScoreDropdownOpen && (
                <div className="absolute right-0 top-8 z-50 bg-[#2c2c2e] rounded-lg shadow-xl border border-[#3a3a3c] py-1 w-24">
                    {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#3a3a3c]"
                            onClick={() => {
                                setScoreRange(r);
                                setIsScoreDropdownOpen(false);
                            }}
                        >
                            {r.charAt(0) + r.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            )}

            <div ref={scoreScrollRef} className="h-48 w-full overflow-x-auto">
                <div style={{ 
                    width: scoreRange === 'YEAR' 
                        ? Math.max(scoreChartData.length * 80, 320)  // Wider spacing for years
                        : scoreRange === 'MONTH' 
                            ? Math.max(scoreChartData.length * 60, 320)  // Medium spacing for months
                            : Math.max(scoreChartData.length * 50, 320), // Default spacing
                    height: '100%' 
                }}>
                    <ResponsiveContainer width="100%" height="100%" key={`score-${scoreRange}`}>
                        <LineChart data={scoreChartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                            <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#86868b', fontSize: 10}} 
                                dy={10} 
                                interval={scoreRange === 'DAY' ? 'preserveStartEnd' : scoreRange === 'YEAR' ? 0 : 'preserveStartEnd'}
                            />
                            <Tooltip 
                                contentStyle={{backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px'}} 
                                itemStyle={{color: '#fff'}}
                                labelStyle={{color: '#86868b', marginBottom: '4px'}}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="score" 
                                stroke={habit.color} 
                                strokeWidth={3} 
                                dot={{fill: '#18181b', stroke: habit.color, strokeWidth: 2, r: 4}} 
                                activeDot={{r: 6, fill: habit.color}}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* History Chart */}
        <div className="relative">
            <div className="flex justify-between items-center mb-4 border-b border-[#27272a] pb-2">
                 <h3 className="text-sm font-medium uppercase tracking-wider" style={{color: habit.color}}>History</h3>
                 <button 
                    onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
                    className="flex items-center gap-1 text-[10px] text-[#86868b] bg-[#1c1c1e] px-2 py-1 rounded hover:text-white transition-colors cursor-pointer"
                 >
                    {historyRange.charAt(0) + historyRange.slice(1).toLowerCase()} 
                    <ChevronDown size={12} />
                 </button>
            </div>

            {isHistoryDropdownOpen && (
                <div className="absolute right-0 top-8 z-50 bg-[#2c2c2e] rounded-lg shadow-xl border border-[#3a3a3c] py-1 w-24">
                    {(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as HistoryRange[]).map((r) => (
                        <button
                            key={r}
                            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#3a3a3c]"
                            onClick={() => {
                                setHistoryRange(r);
                                setIsHistoryDropdownOpen(false);
                            }}
                        >
                            {r.charAt(0) + r.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            )}

            {/* Scrollable Container for History */}
            <div 
                ref={historyScrollRef} 
                className="h-48 w-full overflow-x-auto"
            >
                <div style={{ width: Math.max(historyData.length * 60, 320), height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%" key={`history-${historyRange}`}>
                        <BarChart data={historyData}>
                            <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#86868b', fontSize: 10}} 
                                dy={10} 
                            />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#18181b', border: 'none', borderRadius: '8px'}} />
                            <Bar dataKey="count" fill={habit.color} barSize={32} radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Calendar Grid */}
        <div>
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-medium uppercase tracking-wider" style={{color: habit.color}}>Calendar</h3>
                 
                 <button 
                     onClick={() => {
                         if (isEditingCalendar) {
                             handleDoneEditing();
                         } else {
                             setIsEditingCalendar(true);
                         }
                     }}
                     className={cn(
                         "text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded transition-colors",
                         isEditingCalendar ? "text-black" : "hover:bg-[#1c1c1e]"
                     )}
                     style={isEditingCalendar ? {backgroundColor: habit.color} : {color: habit.color}}
                 >
                     {isEditingCalendar ? 'DONE' : 'EDIT'}
                 </button>
            </div>
            
            <div className="flex">
                {/* Row Headers (Week Days) */}
                <div className="flex flex-col gap-[2px] pt-6 mr-2 flex-shrink-0">
                    {weekDaysShort.map((day, i) => (
                        <div key={i} className="h-8 flex items-center justify-end text-[9px] text-[#86868b] font-medium pr-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Scrollable Container */}
                <div ref={scrollRef} className="overflow-x-auto flex-1 relative">
                     <div className="absolute top-0 h-6 flex pointer-events-none">
                         {monthLabels.map((label, idx) => (
                             <div 
                                key={idx} 
                                className="absolute text-[10px] text-[#86868b] font-medium whitespace-nowrap"
                                style={{left: label.left}}
                             >
                                 {label.text}
                             </div>
                         ))}
                     </div>

                     <div className="flex gap-[2px] pt-6 pb-2 min-w-max">
                         {weeks.map((week, wIdx) => {
                             // Pre-calculate today values once per week
                             const todayMidnight = getMidnight();
                             const todayTime = todayMidnight.getTime();
                             
                             return (
                             <div key={wIdx} className="flex flex-col gap-[2px]">
                                 {week.map((date, dIdx) => {
                                     const dateStr = formatDate(date);
                                     // Use visual helper that includes pending edits
                                     const isDone = getVisualCompletion(dateStr);
                                     
                                     // Use pre-calculated today time
                                     const dateTime = date.getTime();
                                     const isToday = dateTime === todayTime;
                                     const isFuture = dateTime > todayTime;

                                     return (
                                         <button 
                                            key={dIdx}
                                            disabled={(isFuture) || (!isToday && !isEditingCalendar)} 
                                            onClick={() => handleToggle(dateStr)}
                                            className={cn(
                                                "w-8 h-8 flex items-center justify-center rounded-[3px] text-[10px] font-medium transition-all select-none",
                                                isDone 
                                                    ? "text-black" 
                                                    : "bg-[#27272a] text-[#52525b]",
                                                (isEditingCalendar || isToday) && !isFuture
                                                    ? "cursor-pointer hover:ring-1 hover:ring-white/50 active:scale-90" 
                                                    : "cursor-default opacity-50",
                                                isToday && !isDone && "ring-1 ring-inset opacity-100"
                                            )}
                                            style={isDone ? {backgroundColor: habit.color} : (isToday && !isDone ? {borderColor: habit.color} : {})}
                                         >
                                             {date.getDate()}
                                         </button>
                                     )
                                 })}
                             </div>
                             )
                         })}
                     </div>
                </div>
            </div>
        </div>

        {/* Best Streaks */}
        <div>
             <h3 className="text-sm font-medium mb-6 uppercase tracking-wider" style={{color: habit.color}}>Best streaks</h3>
             <div>
                 {streaks.length === 0 ? (
                     <p className="text-sm text-[#52525b] italic">No streaks recorded yet.</p>
                 ) : (() => {
                     const displayStreaks = streaks.slice(0, 5);
                     const maxLength = Math.max(...displayStreaks.map(s => s.length));
                     const barHeight = 28;
                     const barSpacing = 8;
                     const totalHeight = displayStreaks.length * (barHeight + barSpacing);
                     
                     return (
                         <div className="space-y-2">
                             {displayStreaks.map((streak, i) => {
                                 const percentage = streak.length / maxLength;
                                 const barWidthPercent = Math.max(percentage * 70, 25); // 70% max width, 25% min
                                 
                                 // Color intensity based on percentage
                                 const getBarOpacity = (pct: number) => {
                                     if (pct >= 1.0) return 1.0;
                                     if (pct >= 0.8) return 0.75;
                                     if (pct >= 0.5) return 0.5;
                                     return 0.3;
                                 };
                                 
                                 const opacity = getBarOpacity(percentage);
                                 
                                 return (
                                     <div key={i} className="flex items-center gap-2 text-[10px] text-[#86868b]">
                                         <div className="w-20 text-right truncate">
                                             {new Date(streak.start).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                         </div>
                                         
                                         <div className="flex-1 relative h-7 flex items-center">
                                             <div 
                                                 className="h-full rounded transition-all"
                                                 style={{
                                                     width: `${barWidthPercent}%`,
                                                     backgroundColor: habit.color || '#64b5f6',
                                                     opacity: opacity
                                                 }}
                                             />
                                             <span className="absolute left-0 right-0 text-center text-white font-semibold text-[11px] drop-shadow-sm">
                                                 {streak.length}
                                             </span>
                                         </div>
                                         
                                         <div className="w-20 text-left truncate">
                                             {new Date(streak.end).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     );
                 })()}
             </div>
        </div>

        {/* Frequency Dot Chart */}
        <div>
            <h3 className="text-sm font-medium mb-6 uppercase tracking-wider" style={{color: habit.color}}>Frequency</h3>
            <div className="flex">
                {/* Sticky Week Day Labels */}
                <div className="flex-shrink-0 pr-2">
                    <div className="grid grid-rows-7 gap-3">
                        {weekDaysShort.map((day) => (
                            <div key={day} className="h-7 flex items-center">
                                <span className="w-8 text-[10px] text-[#86868b] font-medium text-right">{day}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Scrollable Frequency Data */}
                <div ref={frequencyScrollRef} className="overflow-x-auto pb-4 flex-1">
                    <div className="min-w-max">
                        <div className="grid grid-rows-7 gap-3">
                            {weekDaysShort.map((day, dIdx) => (
                                <div key={day} className="h-7 flex items-center gap-4">
                                    <div className="flex gap-4">
                                        {frequencyData.map((monthData, mIdx) => {
                                            const count = monthData.distribution[dIdx === 6 ? 0 : dIdx + 1]; // Adjust day index if needed
                                            const size = count > 0 ? Math.min(24, Math.max(6, count * 4)) : 4;
                                            const opacity = count > 0 ? 1 : 0.2;
                                            const dotColor = count > 0 ? habit.color : '#27272a';
                                            
                                            return (
                                                <div key={mIdx} className="w-10 flex justify-center">
                                                    <div 
                                                        style={{
                                                            width: size, 
                                                            height: size, 
                                                            backgroundColor: dotColor,
                                                            opacity: opacity
                                                        }}
                                                        className="rounded-full transition-all"
                                                        title={`${monthData.month} - ${day}: ${count}`}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* X Axis Labels */}
                        <div className="flex gap-4 mt-2">
                            {frequencyData.map((m, i) => (
                                <div key={i} className="w-10 text-center text-[10px] text-[#86868b] uppercase">{m.month}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};