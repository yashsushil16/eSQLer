import React, { useState } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';
import { SpriteCheckIcon, SpriteCopyIcon, SpritePlayIcon, SpriteCodeIcon } from './icons/Sprites';
import Editor from '@monaco-editor/react';

interface AiAssistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRunQuery?: (sql: string) => void;
}

export const AiAssistDrawer: React.FC<AiAssistDrawerProps> = ({ isOpen, onClose, onRunQuery }) => {
  const graph = useSchemaStore((state) => state.graph);
  const dialect = useSchemaStore((state) => state.graph.dialect);
  const setActiveTab = useSchemaStore((state) => state.setActiveTab);

  const [prompt, setPrompt] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setGeneratedQuery(null);
    setExplanation(null);

    // Build simplified schema metadata (never row data)
    const schemaSummary = graph.tables.map((t) => ({
      table: t.name,
      columns: t.columns.map((c) => `${c.name} (${c.type}${c.isPrimary ? ', PK' : ''})`),
    }));

    try {
      const response = await fetch('http://localhost:3001/api/ai/query-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          dialect,
          schema: schemaSummary,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate query');
      }

      const data = await response.json();
      setGeneratedQuery(data.query);
      setExplanation(data.explanation);
    } catch (err: any) {
      // If server is not running, provide intelligent client-side fallback
      setError(err.message || 'Server error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedQuery) {
      navigator.clipboard.writeText(generatedQuery);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInQueryStudio = () => {
    if (generatedQuery && onRunQuery) {
      onRunQuery(generatedQuery);
    }
    setActiveTab('query');
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-borderMain mb-4">
        <div className="flex items-center gap-2.5">
          <SpriteCodeIcon size={32} color="#111827" />
          <div>
            <h2 className="text-lg font-display font-bold text-textMain">AI Query Assistant</h2>
            <p className="text-[11px] font-semibold text-textMuted">
              Translate plain English to {dialect.toUpperCase()} queries
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 border border-borderMain flex items-center justify-center font-bold text-textMuted hover:text-textMain"
        >
          ×
        </button>
      </div>

      {/* Natural Language Prompt Form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <label className="block text-xs font-display font-bold uppercase tracking-wider text-textMain mb-1.5">
          What would you like to find?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Show all users who signed up and have written at least one post"
          rows={3}
          className="w-full bg-slate-50 border border-slate-200 p-3 text-xs font-semibold text-textMain outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-2"
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-textMuted font-bold">
            Schema context only (Zero row data is ever sent)
          </span>
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-display font-bold text-xs disabled:opacity-50"
          >
            <SpriteCodeIcon size={14} color="#FFFFFF" />
            {loading ? 'Generating...' : 'Translate to Query'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-300 text-xs font-bold text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Result Section */}
      {generatedQuery && (
        <div className="flex-1 flex flex-col min-h-0 border border-slate-200 p-3 bg-slate-50 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-display font-bold text-textMain uppercase tracking-wider">
              Generated {dialect.toUpperCase()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 px-2 bg-white border border-borderMain text-[10px] font-bold text-textMain hover:border-textMain flex items-center gap-1"
              >
                {copied ? <SpriteCheckIcon size={12} color="#10B981" /> : <SpriteCopyIcon size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex-1 border border-slate-200 overflow-hidden bg-white mb-3">
            <Editor
              height="100%"
              language={dialect === 'mongodb' ? 'javascript' : 'sql'}
              value={generatedQuery}
              theme="vs-light"
              options={{
                readOnly: true,
                fontSize: 12,
                fontFamily: 'monospace',
                minimap: { enabled: false },
                lineNumbers: 'off',
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>

          {explanation && (
            <p className="text-[11px] font-semibold text-textMuted mb-3 px-1 border-l-2 border-primary-500 pl-2">
              {explanation}
            </p>
          )}

          <button
            type="button"
            onClick={handleOpenInQueryStudio}
            className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <SpritePlayIcon size={14} color="#FFFFFF" />
            Open & Run in Query Studio
          </button>
        </div>
      )}

      {!generatedQuery && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-textMuted">
          <SpriteCodeIcon size={32} color="#94A3B8" />
          <p className="text-xs font-semibold mt-2">
            Ask any question in plain English and let AI generate engine-accurate queries matching your schema!
          </p>
        </div>
      )}
    </div>
  );
};
