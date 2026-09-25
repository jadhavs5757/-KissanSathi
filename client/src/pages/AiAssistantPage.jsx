import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';
import { farmService } from '../services/farmService';
import { cropService } from '../services/cropService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import LoadingScreen from '../components/ui/LoadingScreen';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCw,
  Tractor
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AiAssistantPage() {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [activeCycle, setActiveCycle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      answer: 'Namaste! I am KisanSaarthi AI, your evidence-aware agricultural decision assistant. Ask me anything regarding your crop operations, input expenses, irrigation schedules, or government support.',
      actions: [
        {
          priority: 'MEDIUM',
          action: 'Select your active farm profile above for tailored guidance.',
          reason: 'Ensures reasoning is grounded in your real soil chemistry and water capacity.'
        }
      ],
      confidence: 95
    }
  ]);

  const quickPrompts = [
    'What should I do today?',
    'How much have I spent so far on this farm?',
    'When should I review irrigation for my current crop?',
    'What happens if heavy rainfall increases this week?',
    'What government subsidies should I check for my land?'
  ];

  useEffect(() => {
    async function loadFarms() {
      try {
        const farmList = await farmService.getFarms();
        setFarms(farmList);
        if (farmList.length > 0) {
          const first = farmList[0];
          setSelectedFarmId(first.id);
          const cycles = await cropService.getCropCycles(first.id).catch(() => []);
          setActiveCycle(cycles.find((c) => c.status === 'ACTIVE') || cycles[0]);
        }
      } catch (err) {
        console.error('Failed to load farms for AI assistant:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFarms();
  }, []);

  const handleFarmChange = async (farmId) => {
    setSelectedFarmId(farmId);
    try {
      const cycles = await cropService.getCropCycles(farmId).catch(() => []);
      setActiveCycle(cycles.find((c) => c.status === 'ACTIVE') || cycles[0]);
    } catch (err) {
      setActiveCycle(null);
    }
  };

  const handleSend = async (queryText) => {
    const textToSend = queryText || message;
    if (!textToSend.trim()) return;

    // Append user message
    const userMsg = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setSending(true);

    try {
      const res = await aiService.askAssistant({
        farmId: selectedFarmId || null,
        cropCycleId: activeCycle?.id || null,
        message: textToSend
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          answer: res.answer,
          actions: res.actions || [],
          assumptions: res.assumptions || [],
          missingInformation: res.missingInformation || [],
          confidence: res.confidence || 80
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          answer: 'The AI service is temporarily unavailable. Please try again.',
          actions: [],
          confidence: 0
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Connecting to KisanSaarthi AI assistant..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-white">AI Farm Assistant</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grounded in your real farm profile, active crop stage, and recorded expenses
          </p>
        </div>

        <div className="flex items-center gap-3">
          {farms.length > 0 && (
            <select
              value={selectedFarmId}
              onChange={(e) => handleFarmChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  🌾 {f.name}
                </option>
              ))}
            </select>
          )}

          <Link to="/ai/history">
            <Button size="sm" variant="outline" icon={History}>
              AI History
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl glass-panel border border-slate-800">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'user' ? (
              <div className="max-w-lg bg-forest-700 text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow-md">
                {m.text}
              </div>
            ) : (
              <div className="max-w-2xl bg-slate-900/90 border border-emerald-500/20 p-4 rounded-2xl rounded-tl-none space-y-3 text-xs shadow-lg">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold font-display">
                    <Bot className="w-4 h-4" />
                    <span>KisanSaarthi AI Advisory</span>
                  </div>
                  {m.confidence > 0 && (
                    <Badge variant="success">Confidence: {m.confidence}%</Badge>
                  )}
                </div>

                <p className="text-slate-200 leading-relaxed">{m.answer}</p>

                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Recommended Practical Actions
                    </span>
                    {m.actions.map((act, aIdx) => (
                      <div
                        key={aIdx}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2"
                      >
                        <Badge variant={act.priority === 'HIGH' ? 'danger' : act.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                          {act.priority}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-slate-200 font-semibold">{act.action}</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">{act.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Analyzing authoritative farm records with Gemini...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0 no-scrollbar">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp)}
            disabled={sending}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40 whitespace-nowrap transition-colors shrink-0"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 shrink-0"
      >
        <Input
          placeholder="Ask a question about your farm, weather actions, or crop stage..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" size="md" isLoading={sending} icon={Send}>
          Send
        </Button>
      </form>
    </div>
  );
}
