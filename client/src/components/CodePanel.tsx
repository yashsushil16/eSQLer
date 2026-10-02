import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useSchemaStore } from '../store/useSchemaStore';
import { Dialect } from '../types/schema';
import { compileGraph } from '../compiler';
import { sqliteEngine } from '../services/sqliteEngine';
import { SpriteCodeIcon, SpriteCheckIcon, SpriteCopyIcon, SpriteWarningIcon } from './icons/Sprites';
import confetti from 'canvas-confetti';

export const CodePanel: React.FC = () => {
  const graph = useSchemaStore((state) => state.graph);
  const dialect = useSchemaStore((state) => state.graph.dialect);
  const setDialect = useSchemaStore((state) => state.setDialect);
  const applyToLocalSqlite = useSchemaStore((state) => state.applyToLocalSqlite);
  const setLastOperationLog = useSchemaStore((state) => state.setLastOperationLog);

  const [activeDialect, setActiveDialect] = useState<Dialect>(dialect);
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [roundTripStatus, setRoundTripStatus] = useState<{
    running: boolean;
    result?: { passed: boolean; details: string; reverseEngineeredTables: number };
  }>({ running: false });

  const compilation = compileGraph(graph, activeDialect);
  const errors = compilation.errors;
  const hasErrors = errors.some((e) => e.type === 'error');

  const handleCopy = () => {
    navigator.clipboard.writeText(compilation.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = async () => {
    setIsApplying(true);
    const res = await applyToLocalSqlite();
    setIsApplying(false);

    if (res.success) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } else {
      alert(`Failed to apply schema: ${res.error}`);
    }
  };

  const runRoundTripVerification = async () => {
    setRoundTripStatus({ running: true });
    try {
      const result = await sqliteEngine.runRoundTripTest(graph);
      setRoundTripStatus({ running: false, result });
      if (result.passed) {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
        setLastOperationLog(`Verified! Round-trip SQLite compilation & reverse-engineering passed.`);
      }
    } catch (err: any) {
      setRoundTripStatus({
        running: false,
        result: {
          passed: false,
          details: `Error executing verification: ${err.message}`,
          reverseEngineeredTables: 0,
        },
      });
    }
  };

  const monacoLanguage = activeDialect === 'mongodb' ? 'javascript' : 'sql';

  return (
    <div className="h-full flex flex-col bg-canvas p-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 border border-slate-200">
            <SpriteCodeIcon size={20} color="#334155" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Compiled Schema DDL</h2>
            <p className="text-xs font-medium text-slate-400">
              Deterministic single-source-of-truth compiler output
            </p>
          </div>
        </div>

        {/* Dialect Selector Chips */}
        <div className="flex items-center gap-1 bg-slate-100 p-1">
          {(['sqlite', 'postgres', 'mysql', 'mongodb'] as Dialect[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setActiveDialect(d);
                setDialect(d);
              }}
              className={`px-3 py-1 font-display font-bold text-xs capitalize ${
                activeDialect === d
                  ? 'bg-white text-slate-900 border border-borderMain'
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              {d === 'mongodb' ? 'MongoDB (JSON Schema)' : d}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runRoundTripVerification}
            disabled={roundTripStatus.running || hasErrors}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-50 hover:bg-accent-100 text-accent-900 font-display font-bold text-xs border border-accent-200 disabled:opacity-50"
            title="Automated Self-Test: Compiles -> Executes in SQLite WASM -> Reverse-Engineers -> Asserts Equivalence"
          >
            {roundTripStatus.running ? 'Testing...' : 'Verify Round-Trip'}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 font-display font-bold text-xs text-slate-700"
          >
            {copied ? <SpriteCheckIcon size={14} color="#10B981" /> : <SpriteCopyIcon size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>

          {activeDialect === 'sqlite' && (
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || hasErrors}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-display font-bold text-xs disabled:opacity-50"
            >
              <SpriteCheckIcon size={14} color="#FFFFFF" />
              {isApplying ? 'Applying...' : 'Apply to In-Browser SQLite'}
            </button>
          )}
        </div>
      </div>

      {/* Validation Warnings / Error Banner */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200 flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2 font-display font-bold text-amber-800">
            <SpriteWarningIcon size={14} color="#D97706" />
            Continuous Schema Validation ({errors.length} notices):
          </div>
          <div className="space-y-0.5 pl-5">
            {errors.map((err, idx) => (
              <div
                key={idx}
                className={err.type === 'error' ? 'text-red-600 font-bold' : 'text-amber-700 font-medium'}
              >
                • {err.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round-Trip Self Test Result Toast */}
      {roundTripStatus.result && (
        <div
          className={`mb-4 p-3 border text-xs font-semibold flex items-center justify-between ${
            roundTripStatus.result.passed
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{roundTripStatus.result.passed ? '✓' : '✗'}</span>
            <span>
              <strong>Round-Trip Self-Test Result:</strong> {roundTripStatus.result.details}
            </span>
          </div>
          <button
            onClick={() => setRoundTripStatus({ running: false })}
            className="text-slate-400 hover:text-slate-700 underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Monaco Code Editor Container */}
      <div className="flex-1 border border-slate-200 overflow-hidden bg-white">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={compilation.code}
          theme="vs-light"
          options={{
            readOnly: true,
            fontSize: 13,
            fontFamily: 'monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
};
