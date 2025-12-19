import { AIHabitSuggestion } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export const generateHabitSuggestions = async (userGoals: string): Promise<AIHabitSuggestion[]> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env.local file.');
  }

  const prompt = `You are a habit formation expert. Based on the user's goals: "${userGoals}", suggest 3 specific, actionable habits they should build.

For each habit, provide:
1. A short habit name (2-4 words)
2. A question to track it (e.g., "Did you...?")
3. A brief reason why this habit helps achieve their goals (1 sentence)

Format your response as a JSON array with objects containing: name, question, reasoning

Example:
[
  {
    "name": "Morning Meditation",
    "question": "Did you meditate for 10 minutes?",
    "reasoning": "Daily meditation reduces stress and improves mental clarity for better decision making."
  }
]

Respond ONLY with the JSON array, no other text.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from AI');
    }

    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const suggestions: AIHabitSuggestion[] = JSON.parse(jsonMatch[0]);
    
    // Validate suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid suggestions format');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  } catch (error: any) {
    console.error('Gemini API error:', error);
    throw new Error(error.message || 'Failed to generate suggestions. Please try again.');
  }
};
