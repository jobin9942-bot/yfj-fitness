"use client";
import { useState, useEffect } from 'react';
import { useGemini } from '@/hooks/useGemini';
import { saveToCloud, loadFromCloud } from './actions';
// 👇 ADDED 'Zap' to the imports here
import { Apple, Dumbbell, User as UserIcon, Send, Bot, Sparkles, Zap, Trash2, TrendingUp, Calendar, Plus, LogIn, Settings, Activity, MessageSquare, Cloud, Utensils, Share2, Camera, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { SignInButton, UserButton, useUser, SignedIn, SignedOut } from "@clerk/nextjs";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COUNTRIES = ["United States", "India", "United Kingdom", "Canada", "Germany", "France", "Japan", "China", "UAE", "Saudi Arabia"].sort();

interface UserProfile {
  name: string; age: string; weight: string; height: string; 
  gender: string; activity: string; goal: string; dietPref: string; location: string;
  experience: string; workoutMode: string; cardioPref: string;
}

interface ProgressEntry { date: string; weight: string; note: string; }
interface DietLog { id: number; food: string; calories: string; date: string; }
interface PhotoLog { id: number; date: string; url: string; note: string; }

export default function FitBuddyWebsite() {
  const [view, setView] = useState<'landing' | 'app'>('landing');
  const { isSignedIn } = useUser();
  useEffect(() => { if (isSignedIn) setView('app'); }, [isSignedIn]);
  if (view === 'landing') return <LandingPage onStart={() => setView('app')} />;
  return <FitnessApp />;
}

// 🌍 LANDING PAGE
const LandingPage = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter"><div className="bg-green-500 p-1.5 rounded text-black"><Bot size={20} /></div><span>FitBuddy<span className="text-green-500">.</span></span></div>
          <div className="flex gap-4 items-center">
            <SignedIn><button onClick={onStart} className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-green-400">Open Dashboard</button><UserButton /></SignedIn>
            <SignedOut><SignInButton mode="modal"><button className="flex items-center gap-2 bg-zinc-800 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-zinc-700 border border-zinc-700"><LogIn size={16}/> Sign In</button></SignInButton></SignedOut>
          </div>
        </div>
      </nav>
      <section className="relative pt-40 pb-20 px-6 text-center z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-6">Your Body. <br /> <span className="text-gradient">AI Engineered.</span></h1>
          <SignedIn><button onClick={onStart} className="bg-green-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-green-500 shadow-lg mt-8">Resume Transformation 🚀</button></SignedIn>
          <SignedOut><SignInButton mode="modal"><button className="bg-white text-black px-8 py-4 rounded-full text-lg font-bold hover:bg-zinc-200 shadow-lg mt-8">Get Started (Free)</button></SignInButton></SignedOut>
        </motion.div>
      </section>
    </div>
  );
};

// 📱 APP DASHBOARD
function FitnessApp() {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet' | 'progress' | 'account' | 'chat'>('workout');
  const { user } = useUser();
  const [step, setStep] = useState<'onboarding' | 'dashboard'>('onboarding');
  const [isSyncing, setIsSyncing] = useState(false);
  const { generatePlan, chatWithCoach, estimateCalories, loading } = useGemini();

  // STATE
  const [profile, setProfile] = useState<UserProfile>({ name: '', age: '', weight: '', height: '', gender: '', activity: '', goal: '', dietPref: '', location: '', experience: '', workoutMode: '', cardioPref: '' });
  const [plans, setPlans] = useState({ workout: '', diet: '' });
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [streak, setStreak] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoLog[]>([]);

  // INPUTS
  const [chatInput, setChatInput] = useState('');
  const [tweak, setTweak] = useState('');
  const [newLog, setNewLog] = useState({ weight: '', note: '' });
  const [newDiet, setNewDiet] = useState({ food: '', calories: '' });
  const [newPhoto, setNewPhoto] = useState('');

  // ☁️ LOAD DATA & UPDATE STREAK
  useEffect(() => {
    const loadData = async () => {
        if (!user?.id) return;
        setIsSyncing(true);
        const cloudData: any = await loadFromCloud(user.id);
        
        if (cloudData) {
            if (cloudData.profile) { setProfile(cloudData.profile); setStep('dashboard'); }
            if (cloudData.plans) setPlans(cloudData.plans);
            if (cloudData.progress) setProgress(cloudData.progress);
            if (cloudData.chatHistory) setChatHistory(cloudData.chatHistory);
            if (cloudData.dietLogs) setDietLogs(cloudData.dietLogs);
            if (cloudData.photos) setPhotos(cloudData.photos);
            if (cloudData.streak) setStreak(cloudData.streak);
        }

        // 🔥 Update Streak
        const today = new Date().toLocaleDateString();
        const currentStreak = cloudData?.streak || [];
        if (!currentStreak.includes(today)) {
             const newStreak = [...currentStreak, today];
             setStreak(newStreak);
             await saveToCloud(user.id, { ...cloudData, streak: newStreak });
        }
        
        setIsSyncing(false);
    };
    loadData();
  }, [user]);

  // ☁️ SYNC HELPER
  const syncToCloud = async (newData: any) => {
      if(!user?.id) return;
      const fullData = {
          profile: newData.profile || profile,
          plans: newData.plans || plans,
          progress: newData.progress || progress,
          chatHistory: newData.chatHistory || chatHistory,
          dietLogs: newData.dietLogs || dietLogs,
          streak: newData.streak || streak,
          photos: newData.photos || photos
      };
      
      if(newData.profile) setProfile(newData.profile);
      if(newData.plans) setPlans(newData.plans);
      if(newData.progress) setProgress(newData.progress);
      if(newData.chatHistory) setChatHistory(newData.chatHistory);
      if(newData.dietLogs) setDietLogs(newData.dietLogs);
      if(newData.streak) setStreak(newData.streak);
      if(newData.photos) setPhotos(newData.photos);

      await saveToCloud(user.id, fullData);
  };

  const handleFinishOnboarding = async () => { setStep('dashboard'); await syncToCloud({ profile }); };
  const handleGenerate = async (type: 'workout' | 'diet', isTweak = false) => {
    if(!profile.gender) { alert("Fill profile first!"); return; }
    const instruction = isTweak ? tweak : "";
    const result = await generatePlan(profile, type, instruction);
    const newPlans = { ...plans, [type]: result };
    await syncToCloud({ plans: newPlans });
    if(isTweak) setTweak(''); 
  };
  const handleUpdateProfile = async () => { await syncToCloud({ profile }); alert("Updated!"); };
  const handleLogProgress = async () => {
    if (!newLog.weight) return;
    const entry = { date: new Date().toLocaleDateString(), weight: newLog.weight, note: newLog.note };
    setNewLog({ weight: '', note: '' });
    await syncToCloud({ progress: [entry, ...progress] });
  };
  
  const handleLogDiet = async () => {
      if(!newDiet.food) return;
      let finalCalories = newDiet.calories;
      if (!finalCalories) finalCalories = await estimateCalories(newDiet.food);
      const entry = { id: Date.now(), food: newDiet.food, calories: finalCalories, date: new Date().toLocaleDateString() };
      setNewDiet({ food: '', calories: '' });
      await syncToCloud({ dietLogs: [entry, ...dietLogs] });
  };
  const handleRemoveDiet = async (id: number) => {
      const updated = dietLogs.filter(d => d.id !== id);
      await syncToCloud({ dietLogs: updated });
  }

  const handleAddPhoto = async () => {
      if(!newPhoto) return;
      const entry: PhotoLog = { id: Date.now(), date: new Date().toLocaleDateString(), url: newPhoto, note: "Progress Pic" };
      setNewPhoto('');
      await syncToCloud({ photos: [entry, ...photos] });
  };
  const handleRemovePhoto = async (id: number) => {
      if(confirm("Delete photo?")) await syncToCloud({ photos: photos.filter(p => p.id !== id) });
  };

  const handleSharePlan = (type: 'workout' | 'diet') => {
      const planText = plans[type];
      if(!planText) { alert("Generate a plan first!"); return; }
      const cleanText = planText.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();
      const shareUrl = `https://wa.me/?text=${encodeURIComponent(`🔥 My FitBuddy ${type.toUpperCase()} Plan:\n\n${cleanText}\n\n🚀 Built with FitBuddy AI`)}`;
      window.open(shareUrl, '_blank');
  };

  const handleClearChat = async () => { if(confirm("Clear chat?")) await syncToCloud({ chatHistory: [] }); }
  const handleClearData = async () => { if(confirm("DELETE ALL DATA?")) { await saveToCloud(user?.id || '', null); window.location.reload(); } }

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory); setChatInput('');
    const response = await chatWithCoach(userMsg.text, JSON.stringify(updatedHistory));
    await syncToCloud({ chatHistory: [...updatedHistory, { role: 'assistant', text: response }] });
  };

  const calculateBMI = () => { const h = Number(profile.height)/100; const w=Number(profile.weight); return (h&&w) ? (w/(h*h)).toFixed(1) : 0; };
  const getGraphData = () => [...progress].reverse().map(p => ({ date: p.date.split('/')[0]+'/'+p.date.split('/')[1], weight: Number(p.weight) }));
  
  const today = new Date().toLocaleDateString();
  const todayLogs = dietLogs.filter(log => log.date === today);
  const totalCalories = todayLogs.reduce((acc, curr) => acc + Number(curr.calories), 0);
  
  const selectClass = (val: string) => `w-full bg-zinc-900/50 p-4 rounded-xl border border-white/10 outline-none text-white appearance-none cursor-pointer`;
  const optionClass = "bg-zinc-900 text-white";

  // --- UI ---
  if (step === 'onboarding') return (<div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 text-white"><p>Loading Profile...</p></div>);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row font-sans">
      <aside className="hidden md:flex w-72 bg-black/40 backdrop-blur-xl border-r border-white/5 p-6 flex-col gap-6 fixed h-full z-20">
        <div className="flex items-center gap-2 mb-6"><h2 className="text-2xl font-bold flex items-center gap-2"><Bot className="text-green-500" /> FitBuddy</h2></div>
        <div className="bg-zinc-900/80 p-4 rounded-xl mb-6 border border-zinc-800 flex items-center gap-3"><UserButton /> <div className="flex flex-col"><span className="text-xs text-zinc-500">User</span><span className="font-bold text-sm truncate w-32">{user?.firstName || 'Guest'}</span>{isSyncing && <span className="text-xs text-green-400 animate-pulse">Synced</span>}</div></div>
        <nav className="flex flex-col gap-2">
          {['workout', 'diet', 'progress', 'account', 'chat'].map((tab: any) => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`p-4 rounded-xl text-left font-medium capitalize flex items-center gap-3 ${activeTab === tab ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-white'}`}>
                {tab === 'workout' && <Dumbbell size={20} />} {tab === 'diet' && <Apple size={20} />} {tab === 'progress' && <TrendingUp size={20} />} {tab === 'account' && <Settings size={20} />} {tab === 'chat' && <MessageSquare size={20} />} {tab}
             </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-10 md:ml-72 mb-20 md:mb-0">
        <header className="mb-8 flex justify-between items-center"><div><h1 className="text-3xl font-bold">Hello, <span className="text-green-400 capitalize">{user?.firstName || 'Hero'}</span></h1></div><div className="md:hidden"><UserButton /></div></header>

        {activeTab === 'workout' && (
           <div className="glass-card p-6 md:p-8 rounded-3xl min-h-[50vh]">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-green-400">Workout Plan</h2>
                 <div className="flex gap-2">
                    <button onClick={() => handleSharePlan('workout')} className="bg-zinc-800 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-green-600 transition-all flex items-center gap-2"><Share2 size={16}/> Share</button>
                    <button onClick={() => handleGenerate('workout')} disabled={loading} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-zinc-200">{loading ? '...' : 'New'}</button>
                 </div>
              </div>
              {plans.workout ? (<div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: plans.workout }} />) : (<div className="text-center py-20 text-zinc-600"><Zap size={48} className="mx-auto mb-4 opacity-20" /><p>No plan yet.</p></div>)}
           </div>
        )}

        {activeTab === 'diet' && (
           <div className="space-y-8">
              <div className="glass-card p-6 rounded-3xl border border-orange-500/20">
                 <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold flex items-center gap-2 text-orange-400"><Utensils size={20}/> Daily Calories</h2><div className="text-2xl font-black text-white">{totalCalories} <span className="text-sm text-zinc-500 font-normal">kcal</span></div></div>
                 <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <input placeholder="Food (e.g. '2 Eggs')" value={newDiet.food} onChange={e => setNewDiet({...newDiet, food: e.target.value})} className="w-full md:flex-[2] bg-zinc-900 p-3 rounded-xl border border-white/10 text-white outline-none"/>
                    <div className="flex gap-2 w-full md:flex-1"><input type="number" placeholder={loading ? "..." : "Cals"} value={newDiet.calories} onChange={e => setNewDiet({...newDiet, calories: e.target.value})} className="flex-1 bg-zinc-900 p-3 rounded-xl border border-white/10 text-white outline-none" disabled={loading}/><button onClick={handleLogDiet} disabled={loading} className="bg-orange-600 px-6 rounded-xl text-white hover:bg-orange-500 transition-all flex items-center justify-center">{loading ? <span className="animate-spin">⏳</span> : <Plus/>}</button></div>
                 </div>
                 <div className="space-y-2 max-h-40 overflow-y-auto">{todayLogs.map(log => (<div key={log.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-white/5"><span className="text-zinc-300 capitalize">{log.food}</span><div className="flex items-center gap-4"><span className="font-bold text-white">{log.calories} cal</span><button onClick={() => handleRemoveDiet(log.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={14}/></button></div></div>))}</div>
              </div>
              <div className="glass-card p-6 md:p-8 rounded-3xl min-h-[40vh]"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-green-400">AI Diet Plan</h2><div className="flex gap-2"><button onClick={() => handleSharePlan('diet')} className="bg-zinc-800 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-green-600 transition-all flex items-center gap-2"><Share2 size={16}/> Share</button><button onClick={() => handleGenerate('diet')} disabled={loading} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-zinc-200">{loading ? '...' : 'New'}</button></div></div>{plans.diet ? (<div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: plans.diet }} />) : (<div className="text-center py-20 text-zinc-600"><p>No AI plan active.</p></div>)}</div>
           </div>
        )}

        {activeTab === 'progress' && (
           <div className="max-w-4xl mx-auto space-y-8">
             <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 h-[300px]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={18} className="text-green-500"/> Weight Trend</h3>
                {progress.length > 1 ? (<ResponsiveContainer width="100%" height="100%"><AreaChart data={getGraphData()}><defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} /><Tooltip contentStyle={{backgroundColor:'#18181b',border:'none',borderRadius:'8px'}} itemStyle={{color:'#22c55e'}}/><Area type="monotone" dataKey="weight" stroke="#22c55e" fillOpacity={1} fill="url(#c)" strokeWidth={3} /></AreaChart></ResponsiveContainer>) : (<div className="h-full flex items-center justify-center text-zinc-500">Log 2+ entries for graph</div>)}
             </div>

             <div className="glass-card p-6 rounded-3xl flex gap-4 items-end">
                <div className="flex-1"><label className="text-xs text-zinc-500 mb-2 block">Weight (kg)</label><input type="number" value={newLog.weight} onChange={(e) => setNewLog({...newLog, weight: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-xl border border-white/10 text-white outline-none" /></div>
                <div className="flex-[2]"><label className="text-xs text-zinc-500 mb-2 block">Note</label><input value={newLog.note} onChange={(e) => setNewLog({...newLog, note: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-xl border border-white/10 text-white outline-none" /></div>
                <button onClick={handleLogProgress} className="bg-green-600 h-[50px] px-6 rounded-xl text-white"><Plus/></button>
             </div>

             <div className="glass-card p-6 rounded-3xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Camera size={18} className="text-blue-500"/> Body Transformation</h3>
                <div className="flex gap-2 mb-6">
                    <input placeholder="Paste Image Link (e.g. Imgur / Discord URL)" value={newPhoto} onChange={e => setNewPhoto(e.target.value)} className="flex-1 bg-zinc-900 p-3 rounded-xl border border-white/10 text-white outline-none text-sm"/>
                    <button onClick={handleAddPhoto} className="bg-blue-600 px-6 rounded-xl text-white font-bold hover:bg-blue-500">Add</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {photos.length === 0 && <div className="col-span-4 text-center text-zinc-600 py-10 text-sm">No photos yet. Add a link to track progress!</div>}
                    {photos.map(p => (
                        <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square bg-zinc-900 border border-zinc-800">
                             <img src={p.url} alt="Progress" className="w-full h-full object-cover"/>
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-xs">
                                 <span className="font-bold">{p.date}</span>
                                 <button onClick={() => handleRemovePhoto(p.id)} className="text-red-400 hover:text-red-300 mt-2 flex items-center gap-1"><Trash2 size={12}/> Delete</button>
                             </div>
                        </div>
                    ))}
                </div>
             </div>
           </div>
        )}

        {activeTab === 'account' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800"><h3 className="text-zinc-500 text-sm mb-1">Your BMI</h3><div className="text-4xl font-bold text-white">{calculateBMI()}</div><div className="text-xs text-green-400 mt-1">{Number(calculateBMI()) < 18.5 ? "Underweight" : Number(calculateBMI()) < 25 ? "Healthy" : "Overweight"}</div></div>
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 col-span-2">
                        <h3 className="text-zinc-500 text-sm mb-3 flex items-center gap-2"><CalendarIcon size={14}/> Login Streak (This Month)</h3>
                        <div className="flex flex-wrap gap-2">
                             {Array.from({length: 30}, (_, i) => {
                                 const d = new Date(); d.setDate(d.getDate() - (29 - i));
                                 const dateStr = d.toLocaleDateString();
                                 const isActive = streak.includes(dateStr);
                                 return (<div key={i} title={dateStr} className={`w-3 h-3 rounded-sm ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-800'}`}></div>)
                             })}
                        </div>
                        <div className="text-xs text-zinc-500 mt-3 text-right">{streak.length} Active Days Total</div>
                    </div>
                </div>
                <div className="glass-card p-8 rounded-3xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings size={20}/> Edit Profile</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-zinc-500 mb-1">Name</label><input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-white" /></div><div><label className="text-xs text-zinc-500 mb-1">Age</label><input type="number" value={profile.age} onChange={(e) => setProfile({...profile, age: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-white" /></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-zinc-500 mb-1">Weight</label><input type="number" value={profile.weight} onChange={(e) => setProfile({...profile, weight: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-white" /></div><div><label className="text-xs text-zinc-500 mb-1">Height</label><input type="number" value={profile.height} onChange={(e) => setProfile({...profile, height: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-white" /></div></div>
                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                             <select className={selectClass(profile.gender)} value={profile.gender} onChange={(e) => setProfile({...profile, gender: e.target.value})}><option value="" className={optionClass}>Gender</option><option value="male" className={optionClass}>Male</option><option value="female" className={optionClass}>Female</option></select>
                             <select className={selectClass(profile.goal)} value={profile.goal} onChange={(e) => setProfile({...profile, goal: e.target.value})}><option value="" className={optionClass}>Goal</option><option value="weight_loss" className={optionClass}>Weight Loss</option><option value="muscle_gain" className={optionClass}>Muscle Gain</option></select>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                             <select className={selectClass(profile.activity)} value={profile.activity} onChange={(e) => setProfile({...profile, activity: e.target.value})}><option value="" className={optionClass}>Activity</option><option value="sedentary" className={optionClass}>Desk Job</option><option value="active" className={optionClass}>Active</option></select>
                             <select className={selectClass(profile.location)} value={profile.location} onChange={(e) => setProfile({...profile, location: e.target.value})}><option value="" className={optionClass}>Country</option>{COUNTRIES.map(c => <option key={c} value={c} className={optionClass}>{c}</option>)}</select>
                        </div>
                        <button onClick={handleUpdateProfile} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-all mt-4">Save & Sync Updates ☁️</button>
                    </div>
                </div>
                 <div className="text-center mt-10"><button onClick={handleClearData} className="text-red-500 text-sm hover:underline flex items-center justify-center gap-2 mx-auto"><Trash2 size={14}/> Delete Account Data</button></div>
            </div>
        )}

        {activeTab === 'chat' && (<div className="h-[70vh] flex flex-col"><div className="flex-1 overflow-y-auto p-4 space-y-4">{chatHistory.map((m,i)=><div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`p-3 rounded-xl max-w-[80%] ${m.role==='user'?'bg-green-600':'bg-zinc-800'}`}>{m.text}</div></div>)}</div><div className="flex gap-2 p-2"><input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleChat()} className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800 outline-none"/><button onClick={handleChat} className="bg-green-600 p-4 rounded-xl"><Send/></button></div></div>)}
      </main>
      
      <nav className="md:hidden fixed bottom-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 flex justify-around z-50 pb-safe">{['workout','diet','progress','account'].map(t=><button key={t} onClick={()=>setActiveTab(t as any)} className={activeTab===t?'text-green-500':'text-zinc-600'}>{t==='workout'?<Dumbbell/>:t==='diet'?<Apple/>:<UserIcon/>}</button>)}</nav>
    </div>
  );
}