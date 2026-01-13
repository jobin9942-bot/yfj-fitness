import { useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export const useGemini = () => {
  const [loading, setLoading] = useState(false);

  const getAvailableModel = async () => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
      if (response.status === 429) return "gemini-1.5-flash"; 
      const data = await response.json();
      const validModel = data.models?.find((m: any) => 
        m.name.includes('gemini') && 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      return validModel ? validModel.name.replace("models/", "") : "gemini-1.5-flash";
    } catch (error) {
      return "gemini-1.5-flash";
    }
  };

  const generatePlan = async (userProfile: any, type: 'diet' | 'workout', customInstruction: string = "") => {
    setLoading(true);
    try {
      const modelName = await getAvailableModel();
      let promptText = "";
      
      if (type === 'workout') {
        promptText = `
          STRICT INSTRUCTION: OUTPUT ONLY RAW HTML CODE. NO MARKDOWN.
          ROLE: Elite Trainer. USER: ${userProfile.age}y, ${userProfile.gender}, ${userProfile.weight}kg.
          GOAL: ${userProfile.goal}. LOC: ${userProfile.workoutMode}.
          CUSTOM: ${customInstruction || "None"}

          TASK: Generate a 7-DAY WORKOUT SPLIT.
          
          ⚠️ CRITICAL REQUIREMENT: 
          Make every Exercise Name a clickable link to YouTube Search.
          Format: <a href="https://www.youtube.com/results?search_query=[Exercise Name]" target="_blank" class="text-blue-400 hover:text-blue-300 underline decoration-dotted">[Exercise Name] ↗️</a>

          HTML STRUCTURE (Repeat for Day 1-7):
          <div class="space-y-6">
            <div class="p-6 bg-zinc-900/80 border border-blue-500/30 rounded-2xl mb-6">
               <h2 class="text-2xl font-bold text-white">🚀 Weekly Mission</h2>
               <p class="text-zinc-400">Strategy summary...</p>
            </div>
            <div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
               <h3 class="text-xl font-bold text-white mb-4">DAY 1: [Target]</h3>
               <div class="space-y-3">
                  <div class="flex justify-between border-b border-white/5 pb-2">
                     <div>
                        <div class="font-medium"><a href="https://www.youtube.com/results?search_query=[Exercise+Name]" target="_blank" class="text-blue-400 hover:text-blue-300 underline decoration-dotted">[Exercise Name] ↗️</a></div>
                        <div class="text-xs text-zinc-500">[Sets] x [Reps]</div>
                     </div>
                  </div>
               </div>
            </div>
            </div>
        `;
      } else {
        promptText = `
          STRICT INSTRUCTION: OUTPUT ONLY RAW HTML. NO MARKDOWN.
          ROLE: Nutritionist. USER: ${userProfile.weight}kg, Goal: ${userProfile.goal}.
          DIET: ${userProfile.dietPref}.
          TASK: 7-DAY MEAL PLAN with Macros.
          
          HTML STRUCTURE:
          <div class="space-y-6">
             <div class="p-6 bg-zinc-900/80 border border-green-500/30 rounded-2xl mb-6">
                <h2 class="text-2xl font-bold text-white">📊 Weekly Macros</h2>
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="bg-black/40 p-3 rounded-xl"><div class="text-xs text-zinc-500">Calories</div><div class="text-xl font-bold text-white">[Target]</div></div>
                    <div class="bg-black/40 p-3 rounded-xl"><div class="text-xs text-zinc-500">Protein</div><div class="text-xl font-bold text-green-400">[Target]g</div></div>
                </div>
             </div>
             <div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <h3 class="text-xl font-bold text-green-400 mb-4">MONDAY</h3>
                <div class="space-y-4">
                    <div><span class="text-xs text-zinc-500 uppercase">Breakfast</span><p class="text-white font-medium">[Food]</p></div>
                    <div><span class="text-xs text-zinc-500 uppercase">Lunch</span><p class="text-white font-medium">[Food]</p></div>
                    <div><span class="text-xs text-zinc-500 uppercase">Dinner</span><p class="text-white font-medium">[Food]</p></div>
                </div>
             </div>
             </div>
        `;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
        }
      );

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error";
      text = text.replace(/```html/g, '').replace(/```/g, ''); 
      setLoading(false);
      return text;
    } catch (error) {
      setLoading(false);
      return `<div class="p-4 bg-red-500/10 border border-red-500 rounded-xl text-red-500 text-center">
        <b>⚠️ AI Limit Reached or Error</b><br/>
        Please check your API Key quota or try again later.
      </div>`;
    }
  };

  const chatWithCoach = async (message: string, history: string) => {
    setLoading(true);
    try {
      const modelName = await getAvailableModel();
      
      // 👇 UPDATED PROMPT FOR "FITNESS EXPERT" PERSONA
      const prompt = `
        ROLE: You are FitBuddy, a world-class Fitness Expert and Personal Trainer. 
        TONE: Professional, Motivating, Clear, and slightly witty.
        
        STRICT RULES:
        1. NO MARKDOWN. NO ASTERISKS (*). NO BOLDING. Plain text only.
        2. Keep answers concise and easy to read.
        3. IF THE USER ASKS ABOUT NON-FITNESS TOPICS (e.g., "Write python code", "Who is the president?", "Tell me a joke"):
           - You MUST humorously reject it and pivot back to fitness.
           - Example 1: "I don't know Python, but I know how to construct a killer Cobra stretch. Let's do that instead."
           - Example 2: "I don't follow politics, I only follow split squats. Drop and give me 10."
           - Example 3: "I'm not a chef for desserts, but I can cook up a mean leg day plan."

        CONTEXT:
        User History: ${history}
        Current Question: ${message}
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await response.json();
      setLoading(false);
      
      // Clean up any accidental markdown just in case
      let cleanText = data.candidates[0].content.parts[0].text;
      cleanText = cleanText.replace(/\*/g, '').replace(/#/g, ''); 
      
      return cleanText;
    } catch (e) { 
        setLoading(false); 
        return "I'm out of breath (API Error). Ask me again in a minute!"; 
    }
  }

  const estimateCalories = async (food: string) => {
    setLoading(true);
    try {
        const modelName = await getAvailableModel();
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
            {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                contents: [{ parts: [{ 
                    text: `Identify the average calories in 1 standard serving of "${food}". Output ONLY the number (integer). Example: for 'Apple', return '95'. If unsure, estimate.` 
                }] }] 
            }),
            }
        );
        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const calories = text.replace(/[^0-9]/g, ''); 
        setLoading(false);
        return calories || "0";
    } catch (error) {
        setLoading(false);
        return "0";
    }
  }

  return { generatePlan, chatWithCoach, estimateCalories, loading };
};