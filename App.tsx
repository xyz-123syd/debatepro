
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Minus, 
  MessageSquare, 
  FileText, 
  Search, 
  Sparkles, 
  Trash2,
  ChevronRight,
  Loader2,
  Copy,
  Clock,
  BookOpen,
  Scale,
  FileUp,
  Settings,
  Zap,
  SendHorizontal
} from 'lucide-react';
import { CaseData, FeedbackData, LearnedIdea, DebateSide, Substantive } from './types';
import { generateDebateCase, getCaseFeedback, reviseDebateCase } from './services/geminiService';

const SubstantiveBlock = ({ 
  title, 
  substantive, 
  onUpdateThesis, 
  onAddMechanism, 
  onRemoveMechanism, 
  onUpdateMech,
  index
}: { 
  title: string;
  substantive: Substantive;
  onUpdateThesis: (val: string) => void;
  onAddMechanism: () => void;
  onRemoveMechanism: (idx: number) => void;
  onUpdateMech: (idx: number, val: string) => void;
  index: number;
}) => {
  const bgTints = ['bg-blue-50/50', 'bg-red-50/50', 'bg-amber-50/50'];
  const borderTints = ['border-blue-100', 'border-red-100', 'border-amber-100'];
  const textColors = ['text-blue-700', 'text-red-700', 'text-amber-700'];

  return (
    <div className={`space-y-4 p-5 rounded-2xl border-2 ${bgTints[index % 3]} ${borderTints[index % 3]} animate-in slide-in-from-top-2 duration-300 shadow-sm`}>
      <div className="flex justify-between items-center border-b border-white/60 pb-2">
        <h4 className={`text-sm font-black ${textColors[index % 3]} uppercase tracking-tighter`}>{title}</h4>
        <button 
          type="button" 
          onClick={onAddMechanism}
          className="text-[10px] font-bold flex items-center gap-1 text-blue-600 bg-white border border-blue-100 px-2 py-1 rounded-lg hover:bg-blue-50 shadow-sm transition-all"
        >
          <Plus size={12} /> Add Mech
        </button>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-500">Thesis</label>
        <input 
          type="text" 
          value={substantive.thesis}
          onChange={(e) => onUpdateThesis(e.target.value)}
          placeholder="Main claim of this substantive..."
          className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-white/80"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Mechanisms</label>
        {substantive.mechanisms.map((mech, idx) => (
          <div key={idx} className="flex gap-2 animate-in slide-in-from-left-1 duration-200">
            <input 
              type="text"
              value={mech}
              onChange={(e) => onUpdateMech(idx, e.target.value)}
              placeholder={`Mech ${idx + 1}`}
              className="flex-1 p-2 rounded-lg border border-slate-200 focus:border-red-400 outline-none text-xs bg-white/80"
            />
            {substantive.mechanisms.length > 1 && (
              <button 
                type="button" 
                onClick={() => onRemoveMechanism(idx)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Minus size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'feedback' | 'history'>('create');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [learnedMemory, setLearnedMemory] = useState<LearnedIdea[]>([]);
  const [fixComment, setFixComment] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialSubstantive = (): Substantive => ({ thesis: '', mechanisms: [''] });

  const [caseData, setCaseData] = useState<CaseData>({
    topic: '',
    side: 'Affirmative',
    includeFramework: true,
    numSubstantives: 3,
    rhetoricFramework: '',
    definitions: '',
    clarifications: '',
    stakeholders: '',
    burden: '',
    substantive1: initialSubstantive(),
    substantive2: initialSubstantive(),
    substantive3: initialSubstantive(),
    topicAnalysis: '',
    sources: ''
  });

  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    existingCase: '',
    focusArea: 'General Logic'
  });

  useEffect(() => {
    const saved = localStorage.getItem('debate_memory');
    if (saved) setLearnedMemory(JSON.parse(saved));
  }, []);

  const saveMemory = (type: LearnedIdea['type'], content: string) => {
    if (!content.trim()) return;
    const newItem: LearnedIdea = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: Date.now()
    };
    
    setLearnedMemory(prev => {
      if (type !== 'source' && prev.some(m => m.content.toLowerCase() === content.toLowerCase())) return prev;
      const updated = [newItem, ...prev].slice(0, 100);
      localStorage.setItem('debate_memory', JSON.stringify(updated));
      return updated;
    });
  };

  const clearMemory = () => {
    if (window.confirm("Are you sure you want to wipe the intelligence library?")) {
      setLearnedMemory([]);
      localStorage.removeItem('debate_memory');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          saveMemory('source', `FILE (${file.name}): ${text.slice(0, 2000)}...`);
        }
      };
      reader.readAsText(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      if (caseData.numSubstantives >= 1) caseData.substantive1.mechanisms.forEach(m => saveMemory('mechanism', m));
      if (caseData.numSubstantives >= 2) caseData.substantive2.mechanisms.forEach(m => saveMemory('mechanism', m));
      if (caseData.numSubstantives >= 3) caseData.substantive3.mechanisms.forEach(m => saveMemory('mechanism', m));
      if (caseData.rhetoricFramework) saveMemory('rhetoric', caseData.rhetoricFramework);

      const res = await generateDebateCase(caseData, learnedMemory);
      setResult(res || '');
    } catch (err) {
      console.error(err);
      setResult('Failed to reach AI architect. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFixRequest = async () => {
    if (!fixComment.trim() || !result) return;
    setLoading(true);
    try {
      const res = await reviseDebateCase(result, fixComment, caseData.side === 'Affirmative');
      setResult(res || result);
      setFixComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const res = await getCaseFeedback(feedbackData);
      setResult(res || '');
    } catch (err) {
      console.error(err);
      setResult('Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const updateSubstantiveField = (key: 'substantive1' | 'substantive2' | 'substantive3', field: keyof Substantive, value: any) => {
    setCaseData(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const addMechanism = (key: 'substantive1' | 'substantive2' | 'substantive3') => {
    updateSubstantiveField(key, 'mechanisms', [...caseData[key].mechanisms, '']);
  };

  const removeMechanism = (key: 'substantive1' | 'substantive2' | 'substantive3', index: number) => {
    updateSubstantiveField(key, 'mechanisms', caseData[key].mechanisms.filter((_, i) => i !== index));
  };

  const updateMech = (key: 'substantive1' | 'substantive2' | 'substantive3', index: number, val: string) => {
    const next = [...caseData[key].mechanisms];
    next[index] = val;
    updateSubstantiveField(key, 'mechanisms', next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-amber-50 flex flex-col items-center pb-20 text-slate-900">
      <header className="w-full glass sticky top-0 z-50 border-b border-blue-100/50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-red-600 rounded-lg text-white shadow-lg shadow-blue-200">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-blue-900">DebatePro Architect</h1>
        </div>
        <nav className="flex items-center gap-1 bg-white/50 border border-slate-200 p-1 rounded-xl">
          <button onClick={() => { setActiveTab('create'); setResult(''); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-red-600'}`}>Construct</button>
          <button onClick={() => { setActiveTab('feedback'); setResult(''); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'feedback' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-blue-600'}`}>Feedback</button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-amber-400 text-amber-950 shadow-md' : 'text-slate-600 hover:text-amber-600'}`}>Memory</button>
        </nav>
      </header>

      <main className="w-full max-w-7xl mt-8 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-blue-50/40 rounded-3xl shadow-xl shadow-blue-900/5 border border-white p-8">
          {activeTab === 'create' && (
            <form onSubmit={handleGenerate} className="space-y-8">
              <div className="space-y-6 bg-white/60 p-6 rounded-2xl border-t-4 border-t-red-500 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Scale size={20} className="text-red-600" /> Resolution</h3>
                  
                  <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                    <button 
                      type="button"
                      onClick={() => setCaseData({...caseData, side: 'Affirmative'})}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${caseData.side === 'Affirmative' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-slate-400 hover:text-blue-400'}`}
                    >
                      <Zap size={14} className={caseData.side === 'Affirmative' ? 'animate-pulse' : ''} />
                      PROP
                    </button>
                    <button 
                      type="button"
                      onClick={() => setCaseData({...caseData, side: 'Negative'})}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${caseData.side === 'Negative' ? 'bg-red-600 text-white shadow-md scale-105' : 'text-slate-400 hover:text-red-400'}`}
                    >
                      OPP
                      <Zap size={14} className={caseData.side === 'Negative' ? 'animate-pulse' : ''} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input type="text" value={caseData.topic} onChange={(e) => setCaseData({...caseData, topic: e.target.value})} placeholder="Topic (e.g., THBT hacktivism is a legitimate tool...)" className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-red-500 outline-none transition-all font-medium text-slate-800 bg-white" required />
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" value={caseData.rhetoricFramework} onChange={(e) => setCaseData({...caseData, rhetoricFramework: e.target.value})} placeholder="Rhetoric Theme" className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-red-500 outline-none bg-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-amber-100/40 p-6 rounded-2xl border-t-4 border-t-amber-400 shadow-sm">
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-tighter flex items-center gap-2">
                  <Settings size={16} /> Architect Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={caseData.includeFramework} onChange={(e) => setCaseData({...caseData, includeFramework: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                    <span className="text-sm font-bold text-amber-900">Generate Framework Section</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-amber-900">Substantives:</span>
                    <div className="flex bg-white/80 rounded-lg border border-amber-200 p-0.5 shadow-sm">
                      {[1, 2, 3].map(n => (
                        <button key={n} type="button" onClick={() => setCaseData({...caseData, numSubstantives: n})} className={`px-4 py-1.5 rounded-md text-sm font-black transition-all ${caseData.numSubstantives === n ? 'bg-amber-400 text-amber-950 shadow-sm' : 'text-amber-700/50 hover:text-amber-700'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {caseData.includeFramework && (
                <div className="space-y-4 bg-white/60 p-6 rounded-2xl border-t-4 border-t-blue-500 shadow-sm animate-in fade-in slide-in-from-top-2 duration-400">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText size={20} className="text-blue-600" /> Framework Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {['definitions', 'clarifications', 'stakeholders', 'burden'].map((field) => (
                      <div key={field}>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-500">{field}</label>
                        <textarea placeholder={field + "..."} value={(caseData as any)[field]} onChange={(e) => setCaseData({...caseData, [field]: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 min-h-[70px] text-xs focus:ring-1 focus:ring-blue-500 bg-white" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-1"><Search size={20} className="text-blue-600" /> Case Substantives</h3>
                <div className="space-y-6">
                  {caseData.numSubstantives >= 1 && <SubstantiveBlock title="Substantive 1" index={0} substantive={caseData.substantive1} onUpdateThesis={(val) => updateSubstantiveField('substantive1', 'thesis', val)} onAddMechanism={() => addMechanism('substantive1')} onRemoveMechanism={(idx) => removeMechanism('substantive1', idx)} onUpdateMech={(idx, val) => updateMech('substantive1', idx, val)} />}
                  {caseData.numSubstantives >= 2 && <SubstantiveBlock title="Substantive 2" index={1} substantive={caseData.substantive2} onUpdateThesis={(val) => updateSubstantiveField('substantive2', 'thesis', val)} onAddMechanism={() => addMechanism('substantive2')} onRemoveMechanism={(idx) => removeMechanism('substantive2', idx)} onUpdateMech={(idx, val) => updateMech('substantive2', idx, val)} />}
                  {caseData.numSubstantives >= 3 && <SubstantiveBlock title="Substantive 3" index={2} substantive={caseData.substantive3} onUpdateThesis={(val) => updateSubstantiveField('substantive3', 'thesis', val)} onAddMechanism={() => addMechanism('substantive3')} onRemoveMechanism={(idx) => removeMechanism('substantive3', idx)} onUpdateMech={(idx, val) => updateMech('substantive3', idx, val)} />}
                </div>
              </div>

              <div className="space-y-4 bg-white/40 p-6 rounded-2xl border-2 border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Sparkles size={20} className="text-blue-600" /> Additional Context</h3>
                <div className="grid grid-cols-2 gap-4">
                  <textarea placeholder="Topic Analysis..." value={caseData.topicAnalysis} onChange={(e) => setCaseData({...caseData, topicAnalysis: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 min-h-[80px] text-xs bg-white" />
                  <textarea placeholder="Sources/Statistics..." value={caseData.sources} onChange={(e) => setCaseData({...caseData, sources: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 min-h-[80px] text-xs bg-white" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-5 rounded-2xl font-black hover:from-red-700 hover:to-red-800 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-red-200 transition-all active:scale-[0.99] text-xl tracking-tight">
                {loading ? <Loader2 className="animate-spin" /> : <BookOpen size={24} />} Architect Complete Case
              </button>
            </form>
          )}

          {activeTab === 'feedback' && (
            <form onSubmit={handleFeedback} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-2xl font-black text-blue-900">Review Case</h2>
              <textarea value={feedbackData.existingCase} onChange={(e) => setFeedbackData({...feedbackData, existingCase: e.target.value})} className="w-full p-6 rounded-3xl border-2 border-white bg-white/60 min-h-[450px] outline-none focus:border-blue-500 text-sm leading-relaxed shadow-inner" placeholder="Paste case here..." required />
              <div className="grid grid-cols-2 gap-4">
                <select value={feedbackData.focusArea} onChange={(e) => setFeedbackData({...feedbackData, focusArea: e.target.value})} className="p-4 rounded-xl border-2 border-white bg-white/60 font-bold text-blue-900">
                  <option value="General Logic">General Logic</option>
                  <option value="Mechanisms">Mechanism Strength</option>
                  <option value="Opponent Strategy">Predicted Rebuttals</option>
                </select>
                <button type="submit" disabled={loading} className="bg-blue-600 text-white p-4 rounded-xl font-black hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : <MessageSquare size={20} />} Analyze
                </button>
              </div>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-amber-900">Intelligence Library</h2>
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.md,.json" className="hidden" multiple />
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-black flex items-center gap-1 text-blue-700 bg-blue-100 px-4 py-2 rounded-full transition-all hover:bg-blue-200 shadow-sm">
                    <FileUp size={14} /> Upload Sources
                  </button>
                  <button onClick={clearMemory} className="text-xs font-black text-red-600 hover:bg-red-50 px-4 py-2 rounded-full transition-all border border-red-100" title="Wipe Library">
                    <Trash2 size={14} /> Wipe Library
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {learnedMemory.length === 0 ? <div className="text-center py-24 text-amber-200"><Clock size={64} className="mx-auto opacity-20" /><p className="font-bold">Library empty.</p></div> : 
                  learnedMemory.map((item) => (
                    <div key={item.id} className="p-5 bg-white/60 border border-white rounded-3xl group transition-all hover:border-amber-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${item.type === 'source' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-2 line-clamp-3 group-hover:line-clamp-none transition-all duration-300 whitespace-pre-wrap font-medium">{item.content}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-blue-900 flex items-center gap-2"><ChevronRight size={24} className="text-red-600" /> Output</h2>
              <div className="flex gap-2">
                {result && <button onClick={() => navigator.clipboard.writeText(result)} className="px-4 py-2 text-xs font-black text-blue-600 bg-white rounded-xl hover:bg-blue-50 border-2 border-blue-50 shadow-sm transition-all" title="Copy Case"><Copy size={16} /></button>}
              </div>
            </div>
            
            <div className="bg-amber-50/40 rounded-[2.5rem] shadow-2xl border-4 border-white h-[650px] overflow-hidden flex flex-col relative backdrop-blur-sm">
              <div className="flex-1 overflow-y-auto p-12 relative">
                {!result && !loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-200 opacity-30 select-none">
                    <BookOpen size={100} strokeWidth={1} />
                    <p className="mt-4 font-black text-xl tracking-widest uppercase">Awaiting Script</p>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md z-10 animate-in fade-in duration-300">
                    <div className="relative">
                      <Loader2 className="animate-spin text-red-500" size={64} strokeWidth={3} />
                      <Sparkles className="absolute -top-2 -right-2 text-amber-500 animate-pulse" size={24} />
                    </div>
                    <p className="text-2xl font-black mt-6 text-red-600 tracking-tighter">Architecting Case...</p>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Logic engines engaged</p>
                  </div>
                )}
                {result && (
                  <div className="case-output animate-in fade-in slide-in-from-bottom-4 duration-1000 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900 font-medium selection:bg-amber-200">
                    {result}
                  </div>
                )}
              </div>

              {/* Revision Comment Box */}
              {result && !loading && (
                <div className="p-4 bg-white/80 border-t-2 border-amber-100/50 flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-500">
                   <div className="relative">
                      <textarea
                        value={fixComment}
                        onChange={(e) => setFixComment(e.target.value)}
                        placeholder="Request a fix (e.g., 'Make Sub 1 more aggressive' or 'Add stats about healthcare')..."
                        className="w-full p-4 pr-12 rounded-2xl border border-amber-200 focus:border-red-500 focus:ring-1 focus:ring-red-100 outline-none text-sm font-medium bg-white/50 min-h-[80px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleFixRequest();
                          }
                        }}
                      />
                      <button 
                        onClick={handleFixRequest}
                        disabled={!fixComment.trim()}
                        className="absolute bottom-3 right-3 p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-slate-300 transition-all shadow-lg shadow-red-100"
                        title="Send fix request"
                      >
                        <SendHorizontal size={20} />
                      </button>
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">AI-powered Re-Architecting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
