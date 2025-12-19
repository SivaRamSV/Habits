import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Settings, Search, Menu } from 'lucide-react';
import { AppData, Habit, ViewState, AIHabitSuggestion, HabitType } from './types';
import { HabitCard } from './components/HabitCard';
import { StatsView } from './components/StatsView';
import { AIModal } from './components/AIModal';
import { SettingsModal } from './components/SettingsModal';
import { AddHabitModal } from './components/AddHabitModal';
import { EditHabitModal } from './components/EditHabitModal';
import { getRandomColor, getPastDays, getDayName } from './lib/utils';
import { importFile } from './services/importService';

const STORAGE_KEY = 'loop_clone_data_v2';

const INITIAL_DATA: AppData = {
  habits: [],
  completions: {},
};

export default function App() {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Load data on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  // Save data on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addHabit = (name: string, question: string, type: HabitType) => {
    const newHabit: Habit = {
      id: uuidv4(),
      name,
      question: question || `Did you ${name}?`,
      color: getRandomColor(),
      createdAt: new Date().toISOString(),
      targetDaysPerWeek: 7,
      type
    };

    setData(prev => ({
      ...prev,
      habits: [...prev.habits, newHabit],
      completions: { ...prev.completions, [newHabit.id]: {} }
    }));
  };

  const toggleCompletion = (habitId: string, date: string) => {
    setData(prev => {
      const habitCompletions = prev.completions[habitId] || {};
      const currentVal = habitCompletions[date];
      // For YES_NO, toggle. For Measurable, we might need a dialog, but simplified for now to boolean.
      const newStatus = !currentVal;
      
      const newCompletions = {
          ...prev.completions,
          [habitId]: {
            ...habitCompletions,
            [date]: newStatus
          }
      };

      // Cleanup false values to save space/keep clean
      if (!newStatus) {
          delete newCompletions[habitId][date];
      }

      return {
        ...prev,
        completions: newCompletions
      };
    });
  };

  const deleteHabit = (id: string) => {
    setData(prev => {
      const { [id]: deleted, ...remainingCompletions } = prev.completions;
      return {
        habits: prev.habits.filter(h => h.id !== id),
        completions: remainingCompletions
      };
    });
    setView('LIST');
    setSelectedHabitId(null);
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setData(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, ...updates } : h)
    }));
  };

  const handleImport = (newData: AppData) => {
      // The import service already merged current data with new data, so we replace state entirely.
      setData(newData);
  };

  // Derived state
  const selectedHabit = data.habits.find(h => h.id === selectedHabitId);
  const selectedCompletions = selectedHabitId ? (data.completions[selectedHabitId] || {}) : {};
  const recentDays = getPastDays(5);

  return (
    <div className="min-h-screen bg-black text-slate-200">
      
      <div className="max-w-md mx-auto min-h-screen bg-black relative shadow-2xl">
        
        {view === 'LIST' && (
          <>
            {/* Loop Header */}
            <header className="sticky top-0 z-10 bg-black pt-safe pb-2 px-4 border-b border-[#1c1c1e]">
              <div className="flex justify-between items-center h-14">
                <h1 className="text-xl font-bold text-white">Habits</h1>
                <div className="flex gap-4 text-white">
                   <button onClick={() => setShowAddModal(true)}><Plus size={24} /></button>
                   <button><Search size={24} /></button>
                   <button onClick={() => setShowSettings(true)}><Menu size={24} /></button>
                </div>
              </div>
              
              {/* Date Header Row */}
              <div className="flex justify-end gap-4 sm:gap-6 pb-2 pr-4 mt-2">
                  {recentDays.map(d => (
                      <div key={d.toISOString()} className="w-6 text-center">
                          <div className="text-[10px] text-[#86868b] uppercase font-bold">{getDayName(d)}</div>
                          <div className="text-xs text-white">{d.getDate()}</div>
                      </div>
                  ))}
              </div>
            </header>

            {/* List */}
            <main>
              {data.habits.length === 0 ? (
                <div className="text-center py-20 px-6">
                   <p className="text-[#86868b]">No habits found. Tap + to add one or import your backup.</p>
                </div>
              ) : (
                data.habits.map(habit => (
                  <HabitCard 
                    key={habit.id}
                    habit={habit}
                    completions={data.completions[habit.id] || {}}
                    onToggle={(date) => toggleCompletion(habit.id, date)}
                    onSelect={() => {
                      setSelectedHabitId(habit.id);
                      setView('STATS');
                    }}
                  />
                ))
              )}
            </main>
          </>
        )}

        {view === 'STATS' && selectedHabit && (
          <StatsView 
            habit={selectedHabit}
            completions={selectedCompletions}
            onBack={() => setView('LIST')}
            onDelete={deleteHabit}
            onToggle={(date) => toggleCompletion(selectedHabit.id, date)}
            onEdit={() => setShowEditModal(true)}
          />
        )}
      </div>

      {showSettings && (
        <SettingsModal 
           data={data}
           onClose={() => setShowSettings(false)}
           onImport={handleImport}
           onClear={() => setData(INITIAL_DATA)}
        />
      )}

      {showEditModal && selectedHabit && (
        <EditHabitModal 
          habit={selectedHabit}
          onClose={() => setShowEditModal(false)}
          onSave={(updates) => updateHabit(selectedHabit.id, updates)}
        />
      )}

      {showAddModal && (
        <AddHabitModal 
            onClose={() => setShowAddModal(false)}
            onSave={addHabit}
        />
      )}

      {showAIModal && (
        <AIModal 
           onClose={() => setShowAIModal(false)}
           onAdd={(s) => {
               addHabit(s.name, s.question, 'YES_NO');
               setShowAIModal(false);
           }}
        />
      )}

    </div>
  );
}