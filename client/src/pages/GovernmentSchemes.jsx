import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { farmService } from '../services/farmService';
import { schemeService } from '../services/schemeService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';
import {
  Landmark,
  ShieldCheck,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function GovernmentSchemes() {
  const { farmId } = useParams();
  const [farm, setFarm] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const farmData = await farmService.getFarm(farmId);
        const schemeList = await schemeService.getSchemes(farmId, farmData);
        setFarm(farmData);
        setSchemes(schemeList);
      } catch (err) {
        setError(err.message || 'Failed to load government support programs');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [farmId]);

  if (loading) {
    return <LoadingScreen message="Cross-referencing verified government support schemes..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-2 border-b border-slate-900">
        <h1 className="text-2xl font-bold font-display text-white">Government Support & Subsidies</h1>
        <p className="text-xs text-slate-400 mt-1">
          Matched against {farm?.name} ({farm?.land_area_acres} acres, {farm?.water_source}, {farm?.ownership})
        </p>
      </div>

      {/* Trust & Safety Notice */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">Government Program Verification Standards</span>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            KisanSaarthi AI only displays verified government support programs from official notifications. Eligibility is never guaranteed automatically; application procedures, document verifications, and regional quota allocations must be completed via official portals or local block agricultural offices.
          </p>
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="space-y-4">
        {schemes.map((s) => {
          const docs = Array.isArray(s.required_documents) ? s.required_documents : [];

          return (
            <Card key={s.id} className="border-emerald-500/20">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-display">{s.name}</h3>
                    <Badge variant={s.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
                      {s.verification_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{s.description}</p>
                </div>
                {s.relevanceTier && (
                  <Badge variant={s.relevanceTier === 'HIGHLY_RELEVANT' ? 'success' : 'info'}>
                    {s.relevanceTier.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              {/* Relevance Reason */}
              {s.whyRelevant && (
                <div className="my-3 p-3 rounded-xl bg-forest-950/40 border border-forest-500/20 text-xs text-emerald-200">
                  <strong className="text-emerald-400">Why Potentially Relevant:</strong> {s.whyRelevant}
                </div>
              )}

              {/* Eligibility & Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-300 uppercase tracking-wide text-[10px] block mb-1">
                    Eligibility Guidelines
                  </span>
                  <p className="text-slate-400 leading-relaxed">{s.eligibility_summary}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-300 uppercase tracking-wide text-[10px] block mb-1">
                    Required Documents Checklist
                  </span>
                  <ul className="space-y-1 text-slate-400">
                    {docs.map((doc, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Application Route & Official Source */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-slate-400">
                  <strong className="text-slate-300">How to Apply:</strong> {s.application_route}
                </div>
                {s.official_source_url && (
                  <a
                    href={s.official_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold shrink-0"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
