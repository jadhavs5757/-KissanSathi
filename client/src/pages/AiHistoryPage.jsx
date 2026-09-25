import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingScreen from '../components/ui/LoadingScreen';
import EmptyState from '../components/ui/EmptyState';
import { History, Eye, Bot, Calendar, Sparkles, Filter } from 'lucide-react';

export default function AiHistoryPage() {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const data = await aiService.getHistory({
          featureType: selectedType || undefined
        });
        setHistoryItems(data.items || []);
      } catch (err) {
        console.error('Failed to load AI history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [selectedType]);

  if (loading) {
    return <LoadingScreen message="Loading AI reasoning audit history..." />;
  }

  const types = [
    'CROP_RECOMMENDATION',
    'BUSINESS_PLAN',
    'WEATHER_ACTION',
    'CROP_ADVISORY',
    'GENERAL_FARM_ASSISTANT'
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">AI Reasoning History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Auditable log of all structured Gemini reasoning calls and input parameters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
          >
            <option value="">All AI Features</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {historyItems.length > 0 ? (
        <div className="space-y-3">
          {historyItems.map((item) => (
            <Card key={item.id} hover className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="success">{item.feature_type.replace(/_/g, ' ')}</Badge>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Model: {item.model_name}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-semibold truncate">
                  Farm: {item.farm_name || 'General Query'} {item.crop_name ? `(${item.crop_name})` : ''}
                </p>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              <div className="shrink-0">
                <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewItem(item)}>
                  View Audit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="No AI history recorded yet"
          description="Analyze crops or ask questions in the AI Assistant to build your personalized farm history."
          actionText="Open AI Assistant"
          onAction={() => (window.location.href = '/ai')}
        />
      )}

      {/* JSON Audit Modal */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title={`Audit: ${viewItem?.feature_type}`}
        subtitle={`Recorded on ${viewItem ? new Date(viewItem.created_at).toLocaleString() : ''}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          <div>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
              Authoritative Input Context Sent to Gemini
            </h4>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto">
              {JSON.stringify(viewItem?.input_context, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
              Validated Structured Output JSON (Zod Verified)
            </h4>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto">
              {JSON.stringify(viewItem?.output_json, null, 2)}
            </pre>
          </div>
        </div>
      </Modal>
    </div>
  );
}
