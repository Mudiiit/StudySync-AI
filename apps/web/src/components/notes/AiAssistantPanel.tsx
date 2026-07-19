'use client';

import React, { useState } from 'react';
import { Sparkles, Brain, FileText, CornerDownLeft, Copy, Check, Loader2, ArrowRight } from 'lucide-react';

interface AiAssistantPanelProps {
  noteId: string;
  onAppendContent: (content: string) => void;
}

export default function AiAssistantPanel({ noteId, onAppendContent }: AiAssistantPanelProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState('Spanish');

  const triggerStream = async (action: string) => {
    setLoading(true);
    setResponse('');
    try {
      const token = localStorage.getItem('accessToken');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      
      const res = await fetch(`${apiBase}/notes/${noteId}/ai/stream?action=${action}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Streaming connection failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE chunk format: data: chunk_content\n\n
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const text = line.substring(6);
              setResponse((prev) => prev + text);
            } catch (e) {
              // ignore malformed chunks
            }
          }
        }
      }
    } catch (err) {
      setResponse('Failed to generate AI response. Make sure GEMINI_API_KEY is configured on the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 border-l border-border/40 bg-card/5 flex flex-col h-full font-sans text-sm p-4 select-none">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="font-bold text-base">AI Note Assistant</h3>
      </div>

      {/* AI Trigger Actions List */}
      <div className="space-y-2 mb-6">
        <button
          onClick={() => triggerStream('summarize')}
          disabled={loading}
          className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/20 hover:bg-card/40 text-left font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Summarize Note
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => triggerStream('explain')}
          disabled={loading}
          className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/20 hover:bg-card/40 text-left font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            Explain Key Terms
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => triggerStream('rewrite')}
          disabled={loading}
          className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/20 hover:bg-card/40 text-left font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Rewrite & Polish
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* AI Response Display Card */}
      <div className="flex-1 flex flex-col min-h-0 bg-secondary/15 rounded-xl border border-border/30 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed text-muted-foreground text-left whitespace-pre-wrap select-text">
          {loading && !response && (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Streaming Gemini insights...</span>
            </div>
          )}
          {response ? response : !loading && <span className="italic text-muted-foreground/50">Select an AI action from above to analyze notes.</span>}
        </div>

        {/* Action Options bottom bar */}
        {response && !loading && (
          <div className="h-10 border-t border-border/30 bg-card/40 px-3 flex items-center justify-end gap-2">
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => onAppendContent(`\n\n### AI Summary\n${response}`)}
              className="px-2.5 py-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
            >
              <CornerDownLeft className="h-3 w-3" />
              Append
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
