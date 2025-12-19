import React, { useRef, useState } from 'react';
import { X, Upload, Download, Trash2, Smartphone } from 'lucide-react';
import { importFile } from '../services/importService';
import { AppData } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  data: AppData;
  onImport: (newData: AppData) => void;
  onClear: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, data, onImport, onClear }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImportStatus('Reading file...');
    
    try {
        const { data: newData, stats } = await importFile(file, data);
        onImport(newData);
        setImportStatus(`Success! ${stats}`);
    } catch (e: any) {
        setImportStatus(`Error: ${e.message}`);
    } finally {
        setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      // Load sql.js
      const SQL = await (window as any).initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });
      
      // Create new database
      const db = new SQL.Database();
      
      // Create habits table (matching Loop's schema)
      db.run(`
        CREATE TABLE habits (
          _id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          question TEXT,
          color INTEGER,
          position INTEGER,
          type INTEGER DEFAULT 0,
          target_type INTEGER DEFAULT 0,
          target_value REAL DEFAULT 0,
          unit TEXT,
          archived INTEGER DEFAULT 0,
          freq_num INTEGER DEFAULT 1,
          freq_den INTEGER DEFAULT 1
        )
      `);
      
      // Create repetitions table
      db.run(`
        CREATE TABLE repetitions (
          _id INTEGER PRIMARY KEY,
          habit INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          value INTEGER DEFAULT 2
        )
      `);
      
      // Insert habits
      const insertHabit = db.prepare(`
        INSERT INTO habits (_id, name, question, color, position, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      data.habits.forEach((habit, idx) => {
        // Convert hex color to signed integer (Loop format)
        const colorHex = habit.color.replace('#', '');
        const colorInt = parseInt('ff' + colorHex, 16) | 0; // Signed 32-bit int
        
        insertHabit.run([
          idx + 1,
          habit.name,
          habit.question,
          colorInt,
          idx,
          habit.type === 'YES_NO' ? 0 : 1
        ]);
      });
      insertHabit.free();
      
      // Insert repetitions
      const insertRep = db.prepare(`
        INSERT INTO repetitions (habit, timestamp, value)
        VALUES (?, ?, ?)
      `);
      
      data.habits.forEach((habit, idx) => {
        const completions = data.completions[habit.id] || {};
        Object.entries(completions).forEach(([dateStr, value]) => {
          // Convert date string to Unix timestamp in milliseconds
          const timestamp = new Date(dateStr).getTime();
          // value: 2 = YES, 1 = SKIP, 0 = NO (Loop convention)
          const loopValue = value === true || value === 2 ? 2 : value === 1 ? 1 : 0;
          
          insertRep.run([idx + 1, timestamp, loopValue]);
        });
      });
      insertRep.free();
      
      // Export database
      const dbData = db.export();
      const blob = new Blob([dbData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Loop_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      db.close();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export database. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        
        {/* iOS Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#38383a] bg-[#1c1c1e]">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-[#2c2c2e] rounded-full text-[#98989d] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          
          <div className="space-y-2">
             <h3 className="text-xs uppercase tracking-wider text-[#86868b] font-medium ml-1">Data Management</h3>
             <div className="bg-[#2c2c2e] rounded-xl overflow-hidden">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#3a3a3c] transition-colors border-b border-[#38383a]"
                  disabled={loading}
                >
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                         <Upload size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium text-sm">Import Data</div>
                        <div className="text-[#86868b] text-xs">Supports .json, .db, .zip, .csv from Loop</div>
                      </div>
                   </div>
                   <span className="text-blue-400 text-sm">{loading ? '...' : 'Import'}</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.db,.sqlite,.zip,.json"
                  className="hidden" 
                />

                <button 
                  onClick={exportData}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#3a3a3c] transition-colors"
                >
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                         <Download size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium text-sm">Export to Loop</div>
                        <div className="text-[#86868b] text-xs">Download .db file for Loop app</div>
                      </div>
                   </div>
                   <span className="text-blue-400 text-sm">Export</span>
                </button>
             </div>
             {importStatus && (
                <p className={`text-xs ml-2 ${importStatus.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                   {importStatus}
                </p>
             )}
          </div>

          <div className="space-y-2 pt-4">
             <button 
                onClick={() => {
                    if (confirm("Are you sure? This will delete all habits and history.")) {
                        onClear();
                        onClose();
                    }
                }}
                className="w-full bg-[#2c2c2e] text-red-400 p-4 rounded-xl font-medium text-sm hover:bg-[#3a3a3c] transition-colors flex items-center justify-center gap-2"
             >
                <Trash2 size={18} />
                Reset All Data
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};
