import { AppData, Habit, CompletionRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getRandomColor, formatDate } from '../lib/utils';
import JSZip from 'jszip';

// Declare sql.js global from the script tag
declare const initSqlJs: any;

export const importFile = async (file: File, currentData: AppData): Promise<{ data: AppData, stats: string }> => {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.json')) {
    return importJSON(file, currentData);
  } else if (fileName.endsWith('.db') || fileName.endsWith('.sqlite')) {
    return importSQLite(file, currentData);
  } else if (fileName.endsWith('.zip')) {
    return importZip(file, currentData);
  } else if (fileName.endsWith('.csv')) {
     const text = await file.text();
     const res = parseLoopCSV(text, currentData);
     return { 
       data: res.data, 
       stats: `Added ${res.stats.habitsAdded} habits, ${res.stats.recordsAdded} records from CSV.` 
     };
  } else {
    throw new Error('Unsupported file type. Please upload a .json, .db, .zip, or .csv file.');
  }
};

// Helper to find column index case-insensitive
const getColIdx = (columns: string[], ...candidates: string[]) => {
    const lowerCols = columns.map(c => c.toLowerCase());
    for (const cand of candidates) {
        const idx = lowerCols.indexOf(cand.toLowerCase());
        if (idx !== -1) return idx;
    }
    return -1;
};

const importJSON = async (file: File, currentData: AppData): Promise<{ data: AppData, stats: string }> => {
  try {
    const text = await file.text();
    const importedData: AppData = JSON.parse(text);
    
    // Validate the structure
    if (!importedData.habits || !Array.isArray(importedData.habits)) {
      throw new Error('Invalid JSON format. Missing habits array.');
    }
    
    if (!importedData.completions || typeof importedData.completions !== 'object') {
      throw new Error('Invalid JSON format. Missing completions object.');
    }
    
    // Merge with current data
    const newHabits = [...currentData.habits];
    const newCompletions = { ...currentData.completions };
    let habitsAdded = 0;
    let recordsAdded = 0;
    
    importedData.habits.forEach(importedHabit => {
      // Check if habit already exists by name
      const existing = newHabits.find(h => h.name.toLowerCase() === importedHabit.name.toLowerCase());
      
      if (existing) {
        // Merge completions for existing habit
        const existingCompletions = newCompletions[existing.id] || {};
        const importedCompletions = importedData.completions[importedHabit.id] || {};
        
        Object.keys(importedCompletions).forEach(date => {
          if (!existingCompletions[date]) {
            existingCompletions[date] = importedCompletions[date];
            recordsAdded++;
          }
        });
        
        newCompletions[existing.id] = existingCompletions;
      } else {
        // Add new habit with new ID
        const newId = uuidv4();
        newHabits.push({
          ...importedHabit,
          id: newId
        });
        
        // Copy completions with new ID
        const importedCompletions = importedData.completions[importedHabit.id] || {};
        newCompletions[newId] = { ...importedCompletions };
        recordsAdded += Object.keys(importedCompletions).length;
        habitsAdded++;
      }
    });
    
    return {
      data: { habits: newHabits, completions: newCompletions },
      stats: `Added ${habitsAdded} habits, ${recordsAdded} records from JSON backup.`
    };
  } catch (e: any) {
    throw new Error(`Failed to import JSON: ${e.message}`);
  }
};

const importSQLite = async (file: File, currentData: AppData): Promise<{ data: AppData, stats: string }> => {
  try {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    
    const buffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buffer));

    // --- Read Habits ---
    let habitsResult;
    try {
        habitsResult = db.exec("SELECT * FROM habits");
    } catch (e) {
        db.close();
        throw new Error("Could not read 'habits' table. Is this a valid Loop backup?");
    }

    if (!habitsResult.length) {
        db.close();
        throw new Error("No habits found in database.");
    }

    const habitsColumns = habitsResult[0].columns;
    const habitsRows = habitsResult[0].values;
    
    const newHabits: Habit[] = [...currentData.habits];
    const newCompletions: Record<string, CompletionRecord> = { ...currentData.completions };
    const habitIdMap: Record<string, string> = {}; // DB _id -> UUID

    // Detect Habit Columns
    const hNameIdx = getColIdx(habitsColumns, "name");
    const hIdIdx = getColIdx(habitsColumns, "_id", "id");
    const hColorIdx = getColIdx(habitsColumns, "color");
    const hQIdx = getColIdx(habitsColumns, "question");

    if (hNameIdx === -1) {
        db.close();
        throw new Error("Could not find 'name' column in habits table.");
    }

    let habitsAdded = 0;

    habitsRows.forEach((row: any[]) => {
      const name = row[hNameIdx];
      const dbId = hIdIdx !== -1 ? row[hIdIdx] : null;
      const colorInt = hColorIdx !== -1 ? row[hColorIdx] : null;
      const question = hQIdx !== -1 ? row[hQIdx] : null;
      
      if (!name) return;

      let colorHex = getRandomColor();
      if (colorInt !== null) {
          try {
             // Handle signed java int color
             const hex = (Number(colorInt) >>> 0).toString(16).slice(2);
             if (hex.length === 8) colorHex = '#' + hex.slice(2);
             else if (hex.length === 6) colorHex = '#' + hex;
          } catch(e) {}
      }

      // Check duplicate by name (case-insensitive to avoid duplicates)
      let existing = newHabits.find(h => h.name.toLowerCase() === String(name).toLowerCase());
      let habitId = existing?.id;

      if (!existing) {
        habitId = uuidv4();
        const newHabit: Habit = {
          id: habitId,
          name: String(name),
          question: question ? String(question) : `Did you ${name}?`,
          color: colorHex,
          createdAt: new Date().toISOString(),
          targetDaysPerWeek: 7,
          type: 'YES_NO'
        };
        newHabits.push(newHabit);
        newCompletions[habitId] = {};
        habitsAdded++;
      }
      
      if (habitId && dbId !== null) {
          habitIdMap[String(dbId)] = habitId;
      }
    });

    // --- Read Repetitions ---
    let recordsAdded = 0;
    // Loop uses 'repetitions' mostly, 'checkmarks' in very old versions.
    const tables = ["repetitions", "checkmarks"];
    
    for (const tableName of tables) {
        try {
            const repsResult = db.exec(`SELECT * FROM ${tableName}`);
            
            // Safety check: ensure we have results AND values
            if (repsResult.length > 0 && repsResult[0].values) {
                const repsColumns = repsResult[0].columns;
                const repsRows = repsResult[0].values;
                
                // Detect Repetition Columns
                const rHabitIdx = getColIdx(repsColumns, "habit", "habit_id", "habitid");
                const rTimeIdx = getColIdx(repsColumns, "timestamp", "date", "ts");
                const rValIdx = getColIdx(repsColumns, "value", "val", "score");

                if (rHabitIdx === -1 || rTimeIdx === -1) {
                    continue; 
                }

                repsRows.forEach((row: any[]) => {
                    const dbHabitId = row[rHabitIdx];
                    const timestamp = row[rTimeIdx];
                    // If value column missing, assume 2 (completed). 
                    const value = rValIdx !== -1 ? row[rValIdx] : 2;

                    const appHabitId = habitIdMap[String(dbHabitId)];
                    
                    if (appHabitId && timestamp) {
                         let tsNum = Number(timestamp);
                         
                         // Fix for Seconds vs Milliseconds
                         // If timestamp is small (e.g. < 2 billion), it's likely seconds (created before 2033)
                         // 1000000000000 is year 2001 in millis.
                         if (tsNum < 1000000000000) {
                             tsNum *= 1000;
                         }

                         const date = new Date(tsNum);
                         
                         // Check validity
                         if (!isNaN(date.getTime())) {
                             const dateStr = formatDate(date);
                             
                             if (!newCompletions[appHabitId]) newCompletions[appHabitId] = {};
                             
                             // We accept > 0 as completion (1 or 2).
                             if (Number(value) > 0) {
                                 if (!newCompletions[appHabitId][dateStr]) {
                                     newCompletions[appHabitId][dateStr] = true;
                                     recordsAdded++;
                                 }
                             }
                         }
                    }
                });
                
                if (recordsAdded > 0) break;
            }
        } catch (e) {
            // Table might not exist, ignore and try next
        }
    }

    db.close();
    return { 
        data: { habits: newHabits, completions: newCompletions }, 
        stats: `Imported ${habitsAdded} habits and ${recordsAdded} history records from DB.` 
    };

  } catch (e: any) {
    console.error(e);
    throw new Error("Failed to read SQLite database. " + e.message);
  }
};

const importZip = async (file: File, currentData: AppData): Promise<{ data: AppData, stats: string }> => {
  const zip = await JSZip.loadAsync(file);
  const files = Object.keys(zip.files);
  
  const habitsPath = files.find(f => f.toLowerCase().endsWith('habits.csv') && !f.startsWith('__MACOSX'));
  const checkmarksPath = files.find(f => (f.toLowerCase().endsWith('checkmarks.csv') || f.toLowerCase().endsWith('repetitions.csv')) && !f.startsWith('__MACOSX'));

  if (habitsPath) {
      const habitsCsv = await zip.file(habitsPath)?.async("string") || "";
      const checkmarksCsv = checkmarksPath ? await zip.file(checkmarksPath)?.async("string") : "";
      return parseLoopCsvPair(habitsCsv, checkmarksCsv || "", currentData);
  }

  // Fallback to wide CSV (legacy export)
  const wideCsv = files.find(f => f.endsWith('.csv') && !f.toLowerCase().includes('checkmarks') && !f.toLowerCase().includes('habits') && !f.startsWith('__MACOSX'));
  
  if (wideCsv) {
      const content = await zip.file(wideCsv)?.async("string");
      if (content) {
          const res = parseLoopCSV(content, currentData);
          return { data: res.data, stats: res.stats.habitsAdded + ' habits added from wide CSV.' };
      }
  }
  
  throw new Error("Could not find valid Loop data (Habits.csv/Checkmarks.csv) in the ZIP file.");
};

const parseLoopCsvPair = (habitsCsv: string, checkmarksCsv: string, currentData: AppData) => {
    const newHabits = [...currentData.habits];
    const newCompletions = { ...currentData.completions };
    const idMap: Record<string, string> = {}; 

    let habitsAdded = 0;
    let recordsAdded = 0;

    const splitCsvLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
    };

    const hLines = habitsCsv.replace(/\r/g, '').trim().split('\n');
    const hHeaders = splitCsvLine(hLines[0]);
    
    const getHeaderIdx = (headers: string[], ...candidates: string[]) => {
        const lower = headers.map(h => h.toLowerCase().trim());
        for(const cand of candidates) {
            const idx = lower.indexOf(cand.toLowerCase());
            if(idx !== -1) return idx;
        }
        return -1;
    };

    const hNameIdx = getHeaderIdx(hHeaders, 'name');
    const hIdIdx = getHeaderIdx(hHeaders, '_id', 'id');
    const hQIdx = getHeaderIdx(hHeaders, 'question');
    
    for(let i=1; i<hLines.length; i++) {
        const row = splitCsvLine(hLines[i]);
        if (row.length < 2) continue;

        const name = hNameIdx > -1 ? row[hNameIdx] : null;
        const oldId = hIdIdx > -1 ? row[hIdIdx] : null;
        
        if (name && oldId) {
            let habit = newHabits.find(h => h.name.toLowerCase() === name.toLowerCase());
            if (!habit) {
                habit = {
                    id: uuidv4(),
                    name: name,
                    question: (hQIdx > -1 ? row[hQIdx] : null) || `Did you ${name}?`,
                    color: getRandomColor(),
                    createdAt: new Date().toISOString(),
                    targetDaysPerWeek: 7,
                    type: 'YES_NO'
                };
                newHabits.push(habit);
                newCompletions[habit.id] = {};
                habitsAdded++;
            }
            idMap[oldId] = habit.id;
        }
    }

    if (checkmarksCsv) {
        const cLines = checkmarksCsv.replace(/\r/g, '').trim().split('\n');
        const cHeaders = splitCsvLine(cLines[0]);
        
        const cHabitIdIdx = getHeaderIdx(cHeaders, 'habit_id', 'habit', 'habitid');
        const cTimeIdx = getHeaderIdx(cHeaders, 'timestamp', 'date', 'ts');
        const cValIdx = getHeaderIdx(cHeaders, 'value', 'val');

        for(let i=1; i<cLines.length; i++) {
            const row = splitCsvLine(cLines[i]);
            if (row.length < 2) continue;

            const oldHabitId = cHabitIdIdx > -1 ? row[cHabitIdIdx] : null;
            const timestamp = cTimeIdx > -1 ? row[cTimeIdx] : null;
            const value = cValIdx > -1 ? row[cValIdx] : null;

            if (oldHabitId && timestamp) {
                const newId = idMap[oldHabitId];
                if (newId) {
                    // Try parsing as number first
                    let tsNum = Number(timestamp);
                    let date: Date;

                    if (!isNaN(tsNum)) {
                         // Fix Seconds vs Millis here too
                         if (tsNum < 1000000000000) tsNum *= 1000;
                         date = new Date(tsNum);
                    } else {
                        // Fallback to string parsing
                        date = new Date(timestamp);
                    }
                    
                    const isDone = value === null || value === '2' || value === '1' || value === '' || Number(value) > 0;
                    
                    if (!isNaN(date.getTime()) && isDone) {
                        const dateStr = formatDate(date);
                        if (!newCompletions[newId]) newCompletions[newId] = {};
                        newCompletions[newId][dateStr] = true;
                        recordsAdded++;
                    }
                }
            }
        }
    }

    return { 
        data: { habits: newHabits, completions: newCompletions }, 
        stats: `Imported ${habitsAdded} habits and ${recordsAdded} records from backup files.` 
    };
};

export const parseLoopCSV = (csvText: string, currentData: AppData): { data: AppData, stats: { habitsAdded: number, recordsAdded: number } } => {
  const lines = csvText.replace(/\r/g, '').trim().split('\n');
  if (lines.length < 2) throw new Error("Invalid CSV format.");

  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  if (headers[0].toLowerCase() !== 'date') {
      throw new Error("First column must be 'Date'.");
  }

  const habitNames = headers.slice(1);
  const newHabits: Habit[] = [...currentData.habits];
  const newCompletions: Record<string, CompletionRecord> = { ...currentData.completions };
  
  let habitsAdded = 0;
  let recordsAdded = 0;
  const habitIdMap: Record<string, string> = {};

  habitNames.forEach(name => {
    let habit = newHabits.find(h => h.name.toLowerCase() === name.toLowerCase());
    if (!habit) {
      habit = {
        id: uuidv4(),
        name: name,
        question: `Did you ${name}?`,
        color: getRandomColor(),
        createdAt: new Date().toISOString(),
        targetDaysPerWeek: 7,
        type: 'YES_NO'
      };
      newHabits.push(habit);
      newCompletions[habit.id] = {};
      habitsAdded++;
    }
    habitIdMap[name] = habit.id;
  });

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const dateStr = row[0]?.trim();
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

    for (let j = 1; j < row.length; j++) {
       const rawVal = row[j];
       if (rawVal === undefined) continue;
       const val = rawVal.trim();
       const habitName = habitNames[j-1];
       const habitId = habitIdMap[habitName];
       
       if (habitId) {
          const isCompleted = val === '2' || val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';
          if (isCompleted) {
             if (!newCompletions[habitId]) newCompletions[habitId] = {};
             if (!newCompletions[habitId][dateStr]) {
                 newCompletions[habitId][dateStr] = true;
                 recordsAdded++;
             }
          }
       }
    }
  }

  return {
    data: { habits: newHabits, completions: newCompletions },
    stats: { habitsAdded, recordsAdded }
  };
};