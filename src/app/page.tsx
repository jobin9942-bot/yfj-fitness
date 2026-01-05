"use client";
import { useState, useEffect } from 'react';
import { useGemini } from '@/hooks/useGemini';
import { Apple, Dumbbell, User, Send, Bot, Sparkles, Zap, Trash2, TrendingUp, Calendar, Plus, LogIn, Settings, Activity, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { SignInButton, UserButton, useUser, SignedIn, SignedOut } from "@clerk/nextjs";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COUNTRIES = [
  "United States", "India", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Italy", "Spain", "Netherlands",
  "Brazil", "Mexico", "Argentina", "Colombia",
  "Japan", "China", "South Korea", "Singapore", "Indonesia",
  "UAE", "Saudi Arabia", "Turkey", "Israel",
  "South Africa", "Nigeria", "Egypt", "Kenya",
  "Russia", "Poland", "Sweden", "Switzerland"
].sort();

interface UserProfile {
  name: string; age: string; weight: string; height: string; 
  gender: string; activity: string; goal: string; dietPref: string; location: string;
  experience: string; workoutMode: string; cardioPref: string;
}

interface ProgressEntry { date: string; weight: string; note: string; }

export default function FitBuddyWebsite() {
  const [view, setView] = useState<'landing' | 'app'>('landing');
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) setView('app');
  }, [isSignedIn]);

  if (view === 'landing') return <LandingPage onStart={() => setView('app')} />;
  return <FitnessApp />;
}

// 🌍 LANDING PAGE
const LandingPage = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans selection:bg-green-500 selection:text-black">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter cursor-pointer">
            <div className="bg-green-500 p-1.5 rounded text-black"><Bot size={20} /></div>
            <span>FitBuddy<span className="text-green-500">.</span></span>
          </div>
          <div className="flex gap-4 items-center">
            <SignedIn>
                <button onClick={onStart} className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-green-400 transition-all">Open Dashboard</button>
                <UserButton />
            </SignedIn>
            <SignedOut>
                <SignInButton mode="modal">
                    <button className="flex items-center gap-2 bg-zinc-800 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-zinc-700 transition-all border border-zinc-700"><LogIn size={16}/> Sign In</button>
                </SignInButton>
            </SignedOut>
          </div>
        </div>
      </nav>
      <section className="relative pt-40 pb-20 px-6 text-center z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-6 leading-tight">Your Body. <br /> <span className="text-gradient">AI Engineered.</span></h1>
          <SignedIn>
             <button onClick={onStart} className="bg-green-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-green-500 transition-all shadow-lg mt-8">Resume Transformation 🚀</button>
          </SignedIn>
          <SignedOut>
             <SignInButton mode="modal">
                <button className="bg-white text-black px-8 py-4 rounded-full text-lg font-bold hover:bg-zinc-200 transition-all shadow-lg mt-8">Get Started (Free)</button>
             </SignInButton>
          </SignedOut>
        </motion.div>
      </section>
    </div>
  );
};

// 📱 APP DASHBOARD
function FitnessApp() {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet' | 'progress' | 'account' | 'chat'>('workout');
  const { user } = useUser();

  const [profile, setProfile] = useState<UserProfile>({ 
    name: '', age: '', weight: '', height: '', gender: '', activity: '', goal: '', dietPref: '', location: '', experience: '',
    workoutMode: '', cardioPref: '' 
  });
  
  const [step, setStep] = useState<'onboarding' | 'dashboard'>('onboarding');
  const [plans, setPlans] = useState({ workout: '', diet: '' });
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [tweak, setTweak] = useState('');
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [newLog, setNewLog] = useState({ weight: '', note: '' });

  const { generatePlan, chatWithCoach, loading } = useGemini();

  useEffect(() => {
    const savedPlans = localStorage.getItem('fitbuddy_plans');
    const savedProfile = localStorage.getItem('fitbuddy_profile');
    const savedProgress = localStorage.getItem('fitbuddy_progress');
    const savedChat = localStorage.getItem('fitbuddy_chat_history');
    
    if (savedPlans) setPlans(JSON.parse(savedPlans));
    if (savedProgress) setProgress(JSON.parse(savedProgress));
    if (savedChat) setChatHistory(JSON.parse(savedChat));
    
    if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
        setStep('dashboard'); // 👈 SKIPS ONBOARDING IF DATA EXISTS
    } else if (user?.firstName) {
        setProfile(prev => ({ ...prev, name: user.firstName || '' }));
    }
  }, [user]);

  // ✅ CRITICAL FIX: Save data when finishing onboarding
  const handleFinishOnboarding = () => {
      localStorage.setItem('fitbuddy_profile', JSON.stringify(profile)); // 💾 SAVES TO MEMORY
      setStep('dashboard');
  };

  const handleGenerate = async (type: 'workout' | 'diet', isTweak = false) => {
    if(!profile.gender || !profile.goal || !profile.activity) { alert("Please fill in all details!"); return; }
    if (!isTweak && plans[type] && !confirm(`Regenerate ${type} plan?`)) return;

    const instruction = isTweak ? tweak : "";
    const result = await generatePlan(profile, type, instruction);
    
    const newPlans = { ...plans, [type]: result };
    setPlans(newPlans);
    localStorage.setItem('fitbuddy_plans', JSON.stringify(newPlans));
    localStorage.setItem('fitbuddy_profile', JSON.stringify(profile));
    if(isTweak) setTweak(''); 
  };

  const handleUpdateProfile = () => {
    localStorage.setItem('fitbuddy_profile', JSON.stringify(profile));
    alert("Profile Updated Successfully! 🟢");
  };

  const handleLogProgress = () => {
    if (!newLog.weight) return;
    const entry: ProgressEntry = { date: new Date().toLocaleDateString(), weight: newLog.weight, note: newLog.note };
    const updatedProgress = [entry, ...progress]; 
    setProgress(updatedProgress);
    localStorage.setItem('fitbuddy_progress', JSON.stringify(updatedProgress));
    setNewLog({ weight: '', note: '' });
  };

  const handleClearData = () => {
    if(confirm("Delete ALL data?")) {
        localStorage.clear();
        setPlans({ workout: '', diet: '' });
        setProgress([]);
        setChatHistory([]);
        setStep('onboarding');
        setProfile({ name: '', age: '', weight: '', height: '', gender: '', activity: '', goal: '', dietPref: '', location: '', experience: '', workoutMode: '', cardioPref: '' });
    }
  }

  const handleClearChat = () => {
      if(confirm("Clear just the chat history?")) {
          setChatHistory([]);
          localStorage.removeItem('fitbuddy_chat_history');
      }
  }

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    localStorage.setItem('fitbuddy_chat_history', JSON.stringify(updatedHistory));
    setChatInput('');

    const response = await chatWithCoach(userMsg.text, JSON.stringify(updatedHistory));
    
    const finalHistory = [...updatedHistory, { role: 'assistant', text: response }];
    setChatHistory(finalHistory);
    localStorage.setItem('fitbuddy_chat_history', JSON.stringify(finalHistory));
  };

  const calculateBMI = () => {
      const h = Number(profile.height) / 100;
      const w = Number(profile.weight);
      if(!h || !w) return 0;
      return (w / (h * h)).toFixed(1);
  };

  const getGraphData = () => {
      return [...progress].reverse().map(p => ({
          date: p.date.split('/')[0] + '/' + p.date.split('/')[1],
          weight: Number(p.weight)
      }));
  };

  const selectClass = (value: string) => `w-full bg-zinc-900/50 p-4 rounded-xl border border-white/10 outline-none cursor-pointer appearance-none ${value ? 'text-white' : 'text-zinc-500'}`;
  const optionClass = "bg-zinc-900 text-white";

  if (step === 'onboarding') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-md p-8 rounded-3xl relative z-10">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">FitBuddy Profile</h2>
              <SignedIn><UserButton /></SignedIn>
          </div>
          <p className="text-zinc-400 text-sm mb-6">{user?.firstName ? `Welcome back, ${user.firstName}!` : "Let's calculate your metabolism."}</p>
          <div className="space-y-4">
             <input placeholder="Name" value={profile.name} className="w-full bg-zinc-900/50 p-4 rounded-xl border border-white/10 text-white focus:border-green-500 outline-none placeholder:text-zinc-500" onChange={(e) => setProfile({...profile, name: e.target.value})} />
             <div className="flex gap-4">
                <input type="number" placeholder="Age" className="w-1/3 bg-zinc-900/50 p-4 rounded-xl border border-white/10 focus:border-green-500 outline-none text-white placeholder:text-zinc-500" onChange={(e) => setProfile({...profile, age: e.target.value})} />
                <input type="number" placeholder="Kg" className="w-1/3 bg-zinc-900/50 p-4 rounded-xl border border-white/10 focus:border-green-500 outline-none text-white placeholder:text-zinc-500" onChange={(e) => setProfile({...profile, weight: e.target.value})} />
                <input type="number" placeholder="Cm" className="w-1/3 bg-zinc-900/50 p-4 rounded-xl border border-white/10 focus:border-green-500 outline-none text-white placeholder:text-zinc-500" onChange={(e) => setProfile({...profile, height: e.target.value})} />
             </div>
              <div className="flex gap-4">
              <select className={selectClass(profile.gender)} value={profile.gender} onChange={(e) => setProfile({...profile, gender: e.target.value})}>
                <option value="" disabled className={optionClass}>Gender</option>
                <option value="male" className={optionClass}>Male</option>
                <option value="female" className={optionClass}>Female</option>
              </select>
              <select className={selectClass(profile.activity)} value={profile.activity} onChange={(e) => setProfile({...profile, activity: e.target.value})}>
                <option value="" disabled className={optionClass}>Activity Level</option>
                <option value="sedentary" className={optionClass}>Desk Job</option>
                <option value="lightly_active" className={optionClass}>Light Active</option>
                <option value="moderately_active" className={optionClass}>Active Gym</option>
                <option value="very_active" className={optionClass}>Athlete</option>
              </select>
            </div>
            <div className="flex gap-4">
                <select className={selectClass(profile.workoutMode)} value={profile.workoutMode} onChange={(e) => setProfile({...profile, workoutMode: e.target.value})}>
                    <option value="" disabled className={optionClass}>Workout Place</option>
                    <option value="gym" className={optionClass}>Gym</option>
                    <option value="home" className={optionClass}>Home</option>
                </select>
                <select className={selectClass(profile.cardioPref)} value={profile.cardioPref} onChange={(e) => setProfile({...profile, cardioPref: e.target.value})}>
                    <option value="" disabled className={optionClass}>Cardio</option>
                    <option value="treadmill" className={optionClass}>Treadmill</option>
                    <option value="ground" className={optionClass}>Ground</option>
                </select>
            </div>
            <div className="flex gap-4">
                <select className={selectClass(profile.experience)} value={profile.experience} onChange={(e) => setProfile({...profile, experience: e.target.value})}>
                    <option value="" disabled className={optionClass}>Experience</option>
                    <option value="beginner" className={optionClass}>Beginner</option>
                    <option value="intermediate" className={optionClass}>Intermediate</option>
                    <option value="advanced" className={optionClass}>Pro (&gt;3 yrs)</option>
                </select>
                <select className={selectClass(profile.goal)} value={profile.goal} onChange={(e) => setProfile({...profile, goal: e.target.value})}>
                    <option value="" disabled className={optionClass}>Goal</option>
                    <option value="weight_loss" className={optionClass}>Weight Loss</option>
                    <option value="muscle_gain" className={optionClass}>Muscle Gain</option>
                    <option value="posture_correction" className={optionClass}>Posture Fix</option>
                </select>
            </div>
            <div className="flex gap-4">
                <select className={selectClass(profile.dietPref)} value={profile.dietPref} onChange={(e) => setProfile({...profile, dietPref: e.target.value})}>
                    <option value="" disabled className={optionClass}>Diet</option>
                    <option value="non-veg" className={optionClass}>Non-Veg</option>
                    <option value="veg" className={optionClass}>Veg</option>
                    <option value="vegan" className={optionClass}>Vegan</option>
                </select>
                <select className={selectClass(profile.location)} value={profile.location} onChange={(e) => setProfile({...profile, location: e.target.value})}>
                    <option value="" disabled className={optionClass}>Country</option>
                    {COUNTRIES.map((c) => (<option key={c} value={c} className={optionClass}>{c}</option>))}
                    <option value="Other" className={optionClass}>Other</option>
                </select>
            </div>
            
             {/* 👇 THE FIX IS HERE: Calls handleFinishOnboarding */}
             <button onClick={handleFinishOnboarding} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl mt-2 transition-all shadow-lg shadow-green-900/20">Generate Plan 🚀</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row font-sans">
      <aside className="hidden md:flex w-72 bg-black/40 backdrop-blur-xl border-r border-white/5 p-6 flex-col gap-6 fixed h-full z-20">
        <div className="flex items-center gap-2 mb-6"><h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Bot className="text-green-500" /> FitBuddy</h2></div>
        
        <div className="bg-zinc-900/80 p-4 rounded-xl mb-6 border border-zinc-800 flex items-center gap-3">
             <UserButton /> 
             <div className="flex flex-col">
                 <span className="text-xs text-zinc-500">Logged in as</span>
                 <span className="font-bold text-sm truncate w-32">{user?.fullName || profile.name || 'Guest'}</span>
             </div>
        </div>

        <nav className="flex flex-col gap-2">
          {['workout', 'diet', 'progress', 'account', 'chat'].map((tab: any) => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`p-4 rounded-xl text-left font-medium capitalize transition-all flex items-center gap-3 ${activeTab === tab ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}>
                {tab === 'workout' && <Dumbbell size={20} />} 
                {tab === 'diet' && <Apple size={20} />} 
                {tab === 'progress' && <TrendingUp size={20} />}
                {tab === 'account' && <Settings size={20} />} 
                {tab === 'chat' && <MessageSquare size={20} />} 
                {tab}
             </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-10 md:ml-72 mb-20 md:mb-0">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Hello, <span className="text-green-400 capitalize">{user?.firstName || profile.name || 'Guest'}</span></h1>
            <p className="text-zinc-500 text-sm">Let's crush it today.</p>
          </div>
          <div className="md:hidden"><UserButton /></div>
        </header>

        {(activeTab === 'workout' || activeTab === 'diet') && (
           <div className="glass-card p-6 md:p-8 rounded-3xl min-h-[50vh]">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-green-400 capitalize">{activeTab} Plan</h2>
                 <button onClick={() => handleGenerate(activeTab)} disabled={loading} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all">
                    {loading ? 'AI Generating...' : (plans[activeTab] ? 'Regenerate Plan' : 'Create New Plan')}
                 </button>
              </div>
              {plans[activeTab] ? (
                 <>
                    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: plans[activeTab] }} /> 
                    <div className="mt-8 p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2"><Sparkles size={14} className="text-yellow-500"/> Customize this Plan</h3>
                        <div className="flex gap-2">
                            <input value={tweak} onChange={(e) => setTweak(e.target.value)} placeholder="e.g. 'I hate eggs' or 'Knee pain'" className="flex-1 bg-black p-3 rounded-lg border border-zinc-800 text-sm text-white focus:border-green-500 outline-none" />
                            <button onClick={() => handleGenerate(activeTab, true)} disabled={loading || !tweak} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-zinc-700">Update</button>
                        </div>
                    </div>
                 </>
              ) : (<div className="text-center py-20 text-zinc-600"><Zap size={48} className="mx-auto mb-4 opacity-20" /><p>No plan active.</p></div>)}
           </div>
        )}

        {activeTab === 'account' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 relative overflow-hidden">
                        <h3 className="text-zinc-500 text-sm mb-1 z-10 relative">Your BMI</h3>
                        <div className="text-4xl font-bold text-white z-10 relative">{calculateBMI()}</div>
                        <div className="text-xs text-green-400 mt-1 z-10 relative">
                            {Number(calculateBMI()) < 18.5 ? "Underweight" : Number(calculateBMI()) < 25 ? "Healthy Weight" : "Overweight"}
                        </div>
                        <Activity className="absolute right-[-10px] bottom-[-10px] text-zinc-800 size-24 opacity-50" />
                    </div>
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
                        <h3 className="text-zinc-500 text-sm mb-1">Consistency Streak</h3>
                        <div className="text-4xl font-bold text-orange-400">{progress.length} <span className="text-lg text-zinc-600">Logs</span></div>
                        <div className="text-xs text-zinc-500 mt-1">Keep logging daily!</div>
                    </div>
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-center items-center">
                        <div className="text-sm text-zinc-500 mb-2">Google Account</div>
                        <UserButton showName />
                    </div>
                </div>

                <div className="glass-card p-8 rounded-3xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings size={20}/> Edit Profile Details</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-zinc-500 mb-1">Display Name</label><input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full bg-black p-3 rounded-lg border border-zinc-800 text-white" /></div>
                            <div><label className="text-xs text-zinc-500 mb-1">Age</label><input type="number" value={profile.age} onChange={(e) => setProfile({...profile, age: e.target.value})} className="w-full bg-black p-3 rounded-lg border border-zinc-800 text-white" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-zinc-500 mb-1">Weight (kg)</label><input type="number" value={profile.weight} onChange={(e) => setProfile({...profile, weight: e.target.value})} className="w-full bg-black p-3 rounded-lg border border-zinc-800 text-white" /></div>
                            <div><label className="text-xs text-zinc-500 mb-1">Height (cm)</label><input type="number" value={profile.height} onChange={(e) => setProfile({...profile, height: e.target.value})} className="w-full bg-black p-3 rounded-lg border border-zinc-800 text-white" /></div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 pt-4">
                            <select className={selectClass(profile.activity)} value={profile.activity} onChange={(e) => setProfile({...profile, activity: e.target.value})}>
                                <option value="sedentary" className={optionClass}>Desk Job</option>
                                <option value="lightly_active" className={optionClass}>Light Active</option>
                                <option value="moderately_active" className={optionClass}>Active Gym</option>
                                <option value="very_active" className={optionClass}>Athlete</option>
                            </select>
                            <select className={selectClass(profile.goal)} value={profile.goal} onChange={(e) => setProfile({...profile, goal: e.target.value})}>
                                <option value="weight_loss" className={optionClass}>Weight Loss</option>
                                <option value="muscle_gain" className={optionClass}>Muscle Gain</option>
                                <option value="posture_correction" className={optionClass}>Posture Fix</option>
                            </select>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                             <select className={selectClass(profile.workoutMode)} value={profile.workoutMode} onChange={(e) => setProfile({...profile, workoutMode: e.target.value})}>
                                <option value="gym" className={optionClass}>Gym</option>
                                <option value="home" className={optionClass}>Home</option>
                            </select>
                             <select className={selectClass(profile.cardioPref)} value={profile.cardioPref} onChange={(e) => setProfile({...profile, cardioPref: e.target.value})}>
                                <option value="treadmill" className={optionClass}>Treadmill</option>
                                <option value="ground" className={optionClass}>Ground</option>
                            </select>
                        </div>
                        <button onClick={handleUpdateProfile} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-all mt-4">Save Profile Updates</button>
                    </div>
                </div>
                 <div className="text-center mt-10">
                    <button onClick={handleClearData} className="text-red-500 text-sm hover:underline flex items-center justify-center gap-2 mx-auto"><Trash2 size={14}/> Delete Account Data (Reset)</button>
                </div>
            </div>
        )}

        {/* ... (Progress and Chat Tabs remain the same) ... */}
        {activeTab === 'progress' && (
           <div className="max-w-4xl mx-auto">
             <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
                    <h3 className="text-zinc-500 text-sm mb-1">Starting Weight</h3>
                    <div className="text-3xl font-bold text-white">{profile.weight} kg</div>
                </div>
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
                    <h3 className="text-zinc-500 text-sm mb-1">Current Weight</h3>
                    <div className="text-3xl font-bold text-green-400">{progress.length > 0 ? progress[0].weight : profile.weight} kg</div>
                </div>
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
                    <h3 className="text-zinc-500 text-sm mb-1">Total Change</h3>
                    <div className="text-3xl font-bold text-blue-400">{progress.length > 0 ? (Number(progress[0].weight) - Number(profile.weight)).toFixed(1) : "0.0"} kg</div>
                </div>
             </div>

             <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 mb-8 h-[300px]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={18} className="text-green-500"/> Weight Trend</h3>
                {progress.length > 1 ? (
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getGraphData()}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#22c55e' }}/>
                        <Area type="monotone" dataKey="weight" stroke="#22c55e" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={3} />
                      </AreaChart>
                   </ResponsiveContainer>
                ) : (<div className="h-full flex items-center justify-center text-zinc-500 text-sm">Log at least 2 entries to see the graph!</div>)}
             </div>

             <div className="glass-card p-6 rounded-3xl mb-8 flex gap-4 items-end">
                <div className="flex-1">
                   <label className="text-xs text-zinc-500 mb-2 block">Current Weight (kg)</label>
                   <input type="number" value={newLog.weight} onChange={(e) => setNewLog({...newLog, weight: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-xl border border-white/10 text-white outline-none" placeholder="0.0" />
                </div>
                <div className="flex-[2]">
                   <label className="text-xs text-zinc-500 mb-2 block">Notes (Optional)</label>
                   <input type="text" value={newLog.note} onChange={(e) => setNewLog({...newLog, note: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-xl border border-white/10 text-white outline-none" placeholder="Feeling energetic..." />
                </div>
                <button onClick={handleLogProgress} className="bg-green-600 h-[50px] px-6 rounded-xl hover:bg-green-500 text-white font-bold flex items-center gap-2"><Plus size={18}/> Log</button>
             </div>
             <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">History</h3>
                {progress.length === 0 && <div className="text-zinc-500 text-center py-10">No logs yet. Start tracking today!</div>}
                {progress.map((entry, i) => (
                   <div key={i} className="flex justify-between items-center p-5 bg-zinc-900/50 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                         <div className="bg-zinc-800 p-3 rounded-xl text-zinc-400"><Calendar size={18}/></div>
                         <div><div className="font-bold text-white">{entry.date}</div><div className="text-xs text-zinc-500">{entry.note || "No notes"}</div></div>
                      </div>
                      <div className="text-xl font-bold text-green-400">{entry.weight} kg</div>
                   </div>
                ))}
             </div>
           </div>
        )}

        {activeTab === 'chat' && (
           <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-2 px-2">
                 <h3 className="text-sm text-zinc-500 font-bold">FitBuddy AI Coach</h3>
                 {chatHistory.length > 0 && <button onClick={handleClearChat} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"><Trash2 size={12}/> Clear History</button>}
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 glass-card rounded-3xl">
                 {chatHistory.length === 0 && <div className="text-center text-zinc-600 mt-20"><Bot size={40} className="mx-auto mb-4 opacity-50"/><p>I am FitBuddy. Ask me anything!</p></div>}
                 {chatHistory.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`px-5 py-3 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>{msg.text}</div></div>))}
                 {loading && <div className="text-zinc-500 text-sm animate-pulse ml-4">FitBuddy is typing...</div>}
              </div>
              <div className="flex gap-2">
                 <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-white focus:border-green-500 outline-none" placeholder="Ask question..." />
                 <button onClick={handleChat} className="bg-green-600 p-4 rounded-xl hover:bg-green-500 text-white"><Send /></button>
              </div>
           </div>
        )}
      </main>
      
      <nav className="md:hidden fixed bottom-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 flex justify-around z-50 pb-safe">
        {['workout', 'diet', 'progress', 'account', 'chat'].map((tab: any) => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`${activeTab === tab ? 'text-green-500' : 'text-zinc-600'}`}>
                {tab === 'workout' && <Dumbbell />} {tab === 'diet' && <Apple />} {tab === 'progress' && <TrendingUp />} {tab === 'account' && <Settings />} {tab === 'chat' && <MessageSquare />}
             </button>
        ))}
      </nav>
    </div>
  );
}