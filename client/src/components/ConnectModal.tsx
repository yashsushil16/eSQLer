import React, { useState } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';
import { sqliteEngine } from '../services/sqliteEngine';
import { Dialect } from '../types/schema';
import { SpriteDbIcon, SpriteCheckIcon, SpriteWarningIcon } from './icons/Sprites';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ isOpen, onClose }) => {
  const syncGraphFromIntrospection = useSchemaStore((state) => state.syncGraphFromIntrospection);
  const setDialect = useSchemaStore((state) => state.setDialect);

  const [mode, setMode] = useState<'upload' | 'cloud'>('upload');
  const [selectedEngine, setSelectedEngine] = useState<Dialect>('sqlite');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('mydb');
  const [username, setUsername] = useState('postgres');
  const [password, setPassword] = useState('');
  const [useSsl, setUseSsl] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (file.name.endsWith('.sqlite') || file.name.endsWith('.db')) {
        const buffer = await file.arrayBuffer();
        await sqliteEngine.importDatabase(buffer);
        const graph = await sqliteEngine.introspectSchema();
        syncGraphFromIntrospection(graph);
        setDialect('sqlite');
        onClose();
      } else if (file.name.endsWith('.sql')) {
        const text = await file.text();
        await sqliteEngine.init();
        await sqliteEngine.applySchema(text);
        const graph = await sqliteEngine.introspectSchema();
        syncGraphFromIntrospection(graph);
        setDialect('sqlite');
        onClose();
      } else {
        setError('Please upload a valid .sqlite, .db, or .sql dump file.');
      }
    } catch (err: any) {
      setError(`Failed to parse file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloudConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/db/introspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: selectedEngine,
          host,
          port: Number(port),
          database,
          username,
          password,
          useSsl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Connection failed');
      }

      const data = await response.json();
      syncGraphFromIntrospection(data.graph);
      setDialect(selectedEngine);
      onClose();
    } catch (err: any) {
      setError(`Could not connect to live database: ${err.message}. Ensure backend is running.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="bg-white border border-slate-200 p-5 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-100 border border-slate-200">
            <SpriteDbIcon size={20} color="#334155" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Connect Existing Database</h2>
            <p className="text-xs text-slate-400 font-medium">
              Reverse-engineers your schema directly into the visual canvas
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 mb-4">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`py-1.5 font-display font-bold text-xs ${
              mode === 'upload'
                ? 'bg-white text-slate-900 border border-borderMain'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Upload SQLite / SQL File
          </button>
          <button
            type="button"
            onClick={() => setMode('cloud')}
            className={`py-1.5 font-display font-bold text-xs ${
              mode === 'cloud'
                ? 'bg-white text-slate-900 border border-borderMain'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Connect Cloud Database
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs font-semibold text-red-600 flex items-center gap-2">
            <SpriteWarningIcon size={14} color="#DC2626" />
            {error}
          </div>
        )}

        {mode === 'upload' ? (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-400 p-6 bg-slate-50 cursor-pointer group">
              <SpriteDbIcon size={32} color="#64748B" className="mb-2" />
              <span className="font-display font-bold text-xs text-slate-800 mb-0.5">
                Choose .sqlite, .db, or .sql dump file
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Runs 100% locally in your browser with SQLite WASM
              </span>
              <input
                type="file"
                accept=".sqlite,.db,.sql"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
            {isProcessing && (
              <div className="text-center font-display font-bold text-xs text-slate-500">
                Introspecting schema and generating visual canvas...
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCloudConnect} className="space-y-3">
            <div>
              <label className="block text-xs font-display font-bold text-slate-700 mb-1">
                Engine
              </label>
              <select
                value={selectedEngine}
                onChange={(e) => {
                  const eng = e.target.value as Dialect;
                  setSelectedEngine(eng);
                  if (eng === 'postgres') setPort('5432');
                  if (eng === 'mysql') setPort('3306');
                  if (eng === 'mongodb') setPort('27017');
                }}
                className="w-full bg-slate-50 border border-slate-200 p-2 font-bold text-xs outline-none"
              >
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mongodb">MongoDB</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-display font-bold text-slate-700 mb-1">Host</label>
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="e.g. localhost or neon.tech"
                  className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-display font-bold text-slate-700 mb-1">Port</label>
                <input
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-display font-bold text-slate-700 mb-1">Database</label>
                <input
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-display font-bold text-slate-700 mb-1">User</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-display font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-bold outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="ssl-check"
                checked={useSsl}
                onChange={(e) => setUseSsl(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-slate-800"
              />
              <label htmlFor="ssl-check" className="text-xs font-semibold text-slate-600 cursor-pointer">
                Enforce Encrypted TLS/SSL
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-display font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <SpriteCheckIcon size={14} color="#FFFFFF" />
                {isProcessing ? 'Connecting & Introspecting...' : 'Connect & Reverse Engineer'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 font-bold text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
