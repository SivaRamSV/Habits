import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Habit } from '../types';
import { HABIT_COLORS } from '../lib/utils';

interface EditHabitModalProps {
  habit: Habit;
  onClose: () => void;
  onSave: (updates: Partial<Habit>) => void;
}

export const EditHabitModal: React.FC<EditHabitModalProps> = ({ habit, onClose, onSave }) => {
  const [name, setName] = useState(habit.name);
  const [question, setQuestion] = useState(habit.question);
  const [selectedColor, setSelectedColor] = useState(habit.color);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Habit name cannot be empty');
      return;
    }
    
    onSave({
      name: name.trim(),
      question: question.trim() || `Did you ${name.trim()}?`,
      color: selectedColor
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#38383a] bg-[#1c1c1e]">
          <h2 className="text-lg font-semibold text-white">Edit Habit</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-[#2c2c2e] rounded-full text-[#98989d] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Name Input */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#86868b] font-medium ml-1 mb-2 block">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-[#2c2c2e] text-white rounded-xl border border-[#38383a] focus:border-[#64b5f6] focus:outline-none transition-colors"
              placeholder="e.g. Exercise"
              maxLength={100}
            />
          </div>

          {/* Question Input */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#86868b] font-medium ml-1 mb-2 block">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-3 bg-[#2c2c2e] text-white rounded-xl border border-[#38383a] focus:border-[#64b5f6] focus:outline-none transition-colors"
              placeholder="e.g. Did you exercise today?"
              maxLength={200}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#86868b] font-medium ml-1 mb-2 block">
              Color
            </label>
            <div className="grid grid-cols-6 gap-3">
              {HABIT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-full aspect-square rounded-xl transition-all ${
                    selectedColor === color 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1e] scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#38383a] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[#2c2c2e] text-white rounded-xl font-medium hover:bg-[#3a3a3c] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-white transition-colors"
            style={{ backgroundColor: selectedColor }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
