import React, { useState } from 'react';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'terms' | 'privacy';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, initialTab = 'privacy', onClose }) => {
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-textMain/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] shadow-xl flex flex-col animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-borderMain">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('privacy')}
              className={`px-4 py-1.5 rounded-xl font-display font-bold text-xs transition-all ${
                tab === 'privacy'
                  ? 'bg-blue-500 text-white shadow-sm border border-slate-200'
                  : 'text-textMuted hover:text-textMain'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setTab('terms')}
              className={`px-4 py-1.5 rounded-xl font-display font-bold text-xs transition-all ${
                tab === 'terms'
                  ? 'bg-blue-500 text-white shadow-sm border border-slate-200'
                  : 'text-textMuted hover:text-textMain'
              }`}
            >
              Terms of Service
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 hover:border-slate-300 flex items-center justify-center font-bold text-textMuted hover:text-textMain transition-all"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs leading-relaxed text-textMain">
          {tab === 'privacy' ? (
            <>
              <h3 className="text-base font-display font-bold text-textMain">eSQLer Privacy Policy</h3>
              <p className="text-textMuted font-semibold">Last Updated: October 2026</p>

              <div>
                <h4 className="font-bold text-textMain mb-1">1. Information We Collect</h4>
                <p>
                  <strong>Local In-Browser Mode (SQLite WASM):</strong> When using eSQLer in offline/client mode, your database schemas, tables, and records exist entirely in your browser's WebAssembly memory and IndexedDB. No schema metadata or row data is sent to our servers.
                </p>
                <p className="mt-1">
                  <strong>Cloud Connected Databases:</strong> When you connect an external PostgreSQL, MySQL, or MongoDB database, connection credentials (host, port, username, password) are immediately encrypted using AES-256-GCM before storage. We never log plaintext credentials or database row records in server logs.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-textMain mb-1">2. AI Assistance Privacy</h4>
                <p>
                  When you use the AI Query Assistant, only structural schema metadata (table names, column names, column data types) is sent to our backend LLM gateway (Groq / Google Gemini). <strong>Actual table row data is never transmitted to AI providers.</strong>
                </p>
              </div>

              <div>
                <h4 className="font-bold text-textMain mb-1">3. Credential Deletion & Revocation</h4>
                <p>
                  You may disconnect a database or delete a project at any time. Upon deletion, all associated encrypted credential secrets and project definitions are permanently purged from our databases.
                </p>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-base font-display font-bold text-textMain">eSQLer Terms of Service</h3>
              <p className="text-textMuted font-semibold">Last Updated: October 2026</p>

              <div>
                <h4 className="font-bold text-textMain mb-1">1. Acceptable Use & Security</h4>
                <p>
                  eSQLer provides visual schema design, code generation, and query execution tooling. You agree to only connect databases and execute queries against infrastructure that you own or have explicit authorization to access.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-textMain mb-1">2. Sandboxing & Safe Migrations</h4>
                <p>
                  While eSQLer provides safe migration previews and visual execution confirmations, you acknowledge that running destructive DDL statements (e.g. DROP TABLE, ALTER COLUMN) on production databases carries inherent risk. Always maintain independent backups of critical data.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-textMain mb-1">3. Limitation of Liability</h4>
                <p>
                  eSQLer is provided on an "as-is" and "as-available" basis without warranties of any kind. Under no circumstances shall eSQLer be liable for any data loss, downtime, or operational damages resulting from SQL execution.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-borderMain flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-canvas hover:bg-slate-100 font-display font-bold text-xs text-textMain border border-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
