import React, { useState } from 'react';
import { X } from 'lucide-react';
import { HabitType } from '../types';

interface AddHabitModalProps {
  onClose: () => void;
  onSave: (name: string, question: string, type: HabitType) => void;
}

export const AddHabitModal: React.FC<AddHabitModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<HabitType>('YES_NO');

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Please enter a habit name');
      return;
    }
    onSave(name.trim(), question.trim(), type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#38383a] bg-[#1c1c1e]">
          <h2 className="text-lg font-semibold text-white">Create Habit</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-[#2c2c2e] rounded-full text-[#98989d] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          
          {/* Name Input */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#86868b] font-medium ml-1 mb-2 block">
              Habit Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Exercise"
              className="w-full px-4 py-3 bg-[#2c2c2e] text-white rounded-xl border border-[#38383a] focus:border-blue-500 focus:outline-none transition-colors"
              maxLength={100}
            />
          </div>

          {/* Question Input */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#86868b] font-medium ml-1 mb-2 block">
              Question (Optional)
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Did you exercise today?"
              className="w-full px-4 py-3 bg-[#2c2c2e] text-white rounded-xl border border-[#38383a] focus:border-blue-500 focus:outline-none transition-colors"
              maxLength={200}
            />
          </div>

          {/* Type Selection */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#86868b] font-medium ml-1 mb-2 block">
              Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setType('YES_NO')}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  type === 'YES_NO' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-[#2c2c2e] text-[#86868b] hover:bg-[#3a3a3c]'
                }`}
              >
                Yes / No
              </button>
              <button
                onClick={() => setType('MEASURABLE')}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  type === 'MEASURABLE' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-[#2c2c2e] text-[#86868b] hover:bg-[#3a3a3c]'
                }`}
              >
                Measurable
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[#2c2c2e] text-white rounded-xl font-medium hover:bg-[#3a3a3c] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
