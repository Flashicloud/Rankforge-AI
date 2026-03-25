import React, { useState, useEffect } from 'react';
import { Target, Network, AlertCircle, FileText, Check, Highlighter } from 'lucide-react';

interface StickyAssistantProps {
  content: string;
  targetKeyword: string;
  seoScore: any;
  onHighlight: () => void;
  isHighlighted: boolean;
}

export default function StickyAssistant({ content, targetKeyword, seoScore, onHighlight, isHighlighted }: StickyAssistantProps) {
  const [wordCount, setWordCount] = useState(0);
  const [keywordDensity, setKeywordDensity] = useState(0);
  const [usedEntities, setUsedEntities] = useState<string[]>([]);
  const [missingEntities, setMissingEntities] = useState<string[]>([]);

  useEffect(() => {
    // Strip HTML tags for word count and analysis
    const textContent = content.replace(/<[^>]*>?/gm, ' ').toLowerCase();
    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);

    // Calculate keyword density
    if (targetKeyword && words.length > 0) {
      const keywordLower = targetKeyword.toLowerCase();
      const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
      const matches = textContent.match(regex);
      const count = matches ? matches.length : 0;
      setKeywordDensity(Number(((count / words.length) * 100).toFixed(2)));
    }

    // Check NLP entities
    if (seoScore?.nlp_entities) {
      const used: string[] = [];
      const missing: string[] = [];
      seoScore.nlp_entities.forEach((entity: string) => {
        if (textContent.includes(entity.toLowerCase())) {
          used.push(entity);
        } else {
          missing.push(entity);
        }
      });
      setUsedEntities(used);
      setMissingEntities(missing);
    }
  }, [content, targetKeyword, seoScore]);

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-indigo-400" /> Live SEO Assistant
      </h3>

      <div className="space-y-6">
        {/* Basic Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Words</div>
            <div className="text-xl font-bold text-white">{wordCount}</div>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Density</div>
            <div className={`text-xl font-bold ${keywordDensity > 1 && keywordDensity < 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {keywordDensity}%
            </div>
          </div>
        </div>

        {/* Target Keyword */}
        <div>
          <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2 font-bold">Target Keyword</div>
          <div className={`p-2 rounded-lg text-sm flex items-center justify-between border ${keywordDensity > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            <span>{targetKeyword}</span>
            {keywordDensity > 0 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
        </div>

        {/* NLP Entities */}
        {seoScore?.nlp_entities && (
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2 font-bold flex items-center justify-between">
              <span>NLP Entities</span>
              <span className="text-emerald-400">{usedEntities.length}/{seoScore.nlp_entities.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {usedEntities.map((entity, idx) => (
                <span key={`used-${idx}`} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-md border border-emerald-500/20 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {entity}
                </span>
              ))}
              {missingEntities.map((entity, idx) => (
                <span key={`missing-${idx}`} className="px-2 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-md border border-rose-500/20 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {entity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Readability Warning */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
          <div className="text-xs text-amber-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
            <FileText className="w-4 h-4" /> Pro Tip
          </div>
          <p className="text-xs text-amber-200/70 leading-relaxed mb-4">
            Keep sentences short and paragraphs under 3-4 lines. Use the editor's formatting tools to break up large walls of text for better readability.
          </p>
          <button 
            onClick={onHighlight}
            className={`w-full py-2 text-xs font-bold rounded-lg border transition-colors flex items-center justify-center gap-2 ${
              isHighlighted 
                ? 'bg-amber-500 text-black border-amber-500 hover:bg-amber-400' 
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30'
            }`}
          >
            <Highlighter className="w-4 h-4" />
            {isHighlighted ? 'Remove Highlights' : 'Highlight Long Sentences'}
          </button>
        </div>
      </div>
    </div>
  );
}
