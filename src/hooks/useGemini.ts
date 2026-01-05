import { useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export const useGemini = () => {
  const [loading, setLoading] = useState(false);

  // 1. Helper to find the right model
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

  // 2. The Main Generator
  const generatePlan = async (userProfile: any, type: 'diet' | 'workout', customInstruction: string = "") => {
    setLoading(true);
    try {
      const modelName = await getAvailableModel();
      
      let promptText = "";
      
      if (type === 'workout') {
        promptText = `
          STRICT INSTRUCTION: OUTPUT ONLY RAW HTML CODE. DO NOT SPEAK. DO NOT USE MARKDOWN.
          
          ROLE: Elite Gym Trainer.
          USER: ${userProfile.age}y, ${userProfile.gender}, ${userProfile.weight}kg, ${userProfile.height}cm.
          LEVEL: ${userProfile.experience}. GOAL: ${userProfile.goal}.
          
          CONTEXTUAL DETAILS:
          - Workout Mode: ${userProfile.workoutMode} (If 'home', use ONLY Bodyweight or Dumbbells. If 'gym', use Machines/Barbells).
          - Cardio Preference: ${userProfile.cardioPref}.
          - Activity Level: ${userProfile.activity}.
          
          CUSTOM REQUEST: ${customInstruction || "None"}

          TASK: Generate a COMPLETE 7-DAY WORKOUT SPLIT (Monday to Sunday).
          ⚠️ CRITICAL: You MUST generate a card for EVERY SINGLE DAY (Day 1 to Day 7). Do not summarize. If it is a Rest Day, generate a card saying "Active Recovery".

          REQUIRED HTML STRUCTURE (Repeat this structure 7 times, for Day 1 to Day 7):
          
          <div class="space-y-6">
            <div class="p-6 bg-zinc-900/80 border border-blue-500/30 rounded-2xl shadow-lg mb-6">
               <h2 class="text-2xl font-bold text-white mb-2 flex items-center gap-2">🚀 Weekly Mission</h2>
               <p class="text-zinc-400"> [Brief summary of the split strategy] </p>
            </div>

            <div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
               <h3 class="text-xl font-bold text-blue-400 mb-4">DAY 1: [Target Muscle / Split]</h3>
               <div class="space-y-3">
                  <div class="flex justify-between items-center border-b border-white/5 pb-2">
                     <div>
                        <div class="text-white font-medium">[Exercise Name]</div>
                        <div class="text-xs text-zinc-500">[Sets] x [Reps]</div>
                     </div>
                  </div>
                  </div>
            </div>

            <div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
               <h3 class="text-xl font-bold text-blue-400 mb-4">DAY 2: [Target Muscle / Split]</h3>
               <div class="space-y-3">
                  </div>
            </div>

            <div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl mt-6">
               <h3 class="text-xl font-bold text-orange-400 mb-4">🏃 Cardio Protocol (${userProfile.cardioPref})</h3>
               <p class="text-zinc-300">[Specific instructions for the week]</p>
            </div>
          </div>
        `;
      } else {
        // 🍎 DIET PROMPT - 7 DAYS
        promptText = `
          STRICT INSTRUCTION: OUTPUT ONLY RAW HTML CODE. DO NOT SPEAK. DO NOT USE MARKDOWN.
          
          ROLE: Expert Nutritionist.
          USER: ${userProfile.age}y, ${userProfile.gender}, ${userProfile.weight}kg, ${userProfile.height}cm.
          DIET: ${userProfile.dietPref}. GOAL: ${userProfile.goal}.
          
          TASK: 
          1. Calculate Calories & Macros.
          2. Generate a 7-DAY MEAL PLAN (Day 1 to Day 7).
          ⚠️ CRITICAL: List meals for all 7 days. You can group days if the menu repeats (e.g., "Day 1-3" and "Day 4-7"), but cover the whole week.
          
          REQUIRED HTML STRUCTURE:

          <div class="space-y-6">
             <div class="p-6 bg-zinc-900/80 border border-green-500/30 rounded-2xl shadow-lg mb-6">
                <h2 class="text-2xl font-bold text-white mb-4">📊 Weekly Numbers</h2>
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="bg-black/40 p-3 rounded-xl border border-white/5">
                        <div class="text-xs text-zinc-500">Daily Target</div>
                        <div class="text-xl font-black text-white">[Target] kcal</div>
                    </div>
                    <div class="bg-green-500/10 p-3 rounded-xl border border-green-500/50">
                        <div class="text-xs text-green-400">Protein Goal</div>
                        <div class="text-xl font-bold text-white">[Protein]g</div>
                    </div>
                </div>
             </div>

             <div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <h3 class="text-xl font-bold text-green-400 mb-4">MONDAY</h3>
                <div class="space-y-4">
                    <div>
                        <span class="text-xs text-zinc-500 uppercase tracking-wider">Breakfast</span>
                        <p class="text-white font-medium">[Food Item]</p>
                    </div>
                    <div>
                        <span class="text-xs text-zinc-500 uppercase tracking-wider">Lunch</span>
                        <p class="text-white font-medium">[Food Item]</p>
                    </div>
                    <div>
                        <span class="text-xs text-zinc-500 uppercase tracking-wider">Dinner</span>
                        <p class="text-white font-medium">[Food Item]</p>
                    </div>
                </div>
             </div>

             <div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <h3 class="text-xl font-bold text-green-400 mb-4">TUESDAY</h3>
                <div class="space-y-4">
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

      if (response.status === 429) {
        setLoading(false);
        return `
          <div class="p-6 bg-red-900/20 border border-red-500/50 rounded-2xl text-center">
            <h3 class="text-xl font-bold text-red-400 mb-2">🔥 AI Overheated!</h3>
            <p class="text-zinc-300">You are testing too fast! The free AI tier needs a break.</p>
            <p class="text-sm text-zinc-500 mt-4">Please wait 30-60 seconds and try again.</p>
          </div>
        `;
      }

      const data = await response.json();
      if (!response.ok) throw new Error("Failed");

      let text = data.candidates[0].content.parts[0].text;
      text = text.replace(/```html/g, '').replace(/```/g, ''); 
      
      setLoading(false);
      return text;
    } catch (error) {
      setLoading(false);
      return `<div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center text-zinc-400">Error generating plan. Try again.</div>`;
    }
  };

  const chatWithCoach = async (message: string, history: string) => {
    setLoading(true);
    try {
      const modelName = await getAvailableModel();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `You are a fitness coach. User message: "${message}". History: ${history}. Reply briefly.` 
              }] 
            }]
          }),
        }
      );
      
      if (response.status === 429) {
         setLoading(false);
         return "🔥 I need a quick break (Rate Limit). Ask me again in 1 minute!";
      }

      const data = await response.json();
      setLoading(false);
      return data.candidates[0].content.parts[0].text;
    } catch (e: any) {
        setLoading(false);
        return "Connection error.";
    }
  }

  return { generatePlan, chatWithCoach, loading };
};