import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { AIHabitSuggestion } from '../types';
import { generateHabitSuggestions } from '../services/geminiService';

interface AIModalProps {
  onClose: () => void;
  onAdd: (suggestion: AIHabitSuggestion) => void;
}

export const AIModal: React.FC<AIModalProps> = ({ onClose, onAdd }) => {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<AIHabitSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter your goals or interests');
      return;
    }

    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      const results = await generateHabitSuggestions(prompt);
      setSuggestions(results);
    } catch (e: any) {
      setError(e.message || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#38383a] bg-[#1c1c1e]">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">AI Habit Suggestions</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-[#2c2c2e] rounded-full text-[#98989d] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Input */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#86868b] font-medium ml-1 mb-2 block">
              What are your goals?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. I want to be healthier, learn new skills..."
              className="w-full px-4 py-3 bg-[#2c2c2e] text-white rounded-xl border border-[#38383a] focus:border-purple-500 focus:outline-none transition-colors resize-none"
              rows={3}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate Suggestions'}
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <div 
                  key={idx}
                  className="p-4 bg-[#2c2c2e] rounded-xl border border-[#38383a] hover:border-purple-500/50 transition-colors"
                >
                  <h3 className="text-white font-medium mb-1">{suggestion.name}</h3>
                  <p className="text-[#86868b] text-sm mb-2">{suggestion.question}</p>
                  <p className="text-xs text-[#52525b] italic mb-3">{suggestion.reasoning}</p>
                  <button
                    onClick={() => {
                      onAdd(suggestion);
                      onClose();
                    }}
                    className="w-full py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm font-medium"
                  >
                    Add This Habit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
