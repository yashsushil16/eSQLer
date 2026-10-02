import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSchemaStore } from './store/useSchemaStore';
import TableNode from './components/TableNode';
import { FlowEdge } from './components/FlowEdge';
import { RelationshipModal } from './components/RelationshipModal';
import { CodePanel } from './components/CodePanel';
import { DataStudio } from './components/DataStudio';
import { QueryStudio } from './components/QueryStudio';
import { ConnectModal } from './components/ConnectModal';
import { AiAssistDrawer } from './components/AiAssistDrawer';
import { sqliteEngine } from './services/sqliteEngine';
import {
  SpriteDbIcon,
  SpriteTableIcon,
  SpriteGridIcon,
  SpritePlayIcon,
  SpriteCodeIcon,
  SpriteCheckIcon,
} from './components/icons/Sprites';

const NODE_TYPES: NodeTypes = {
  tableNode: TableNode,
};

const EDGE_TYPES: EdgeTypes = {
  flowEdge: FlowEdge,
};

function App() {
  const nodes = useSchemaStore((state) => state.nodes);
  const edges = useSchemaStore((state) => state.edges);
  const onNodesChange = useSchemaStore((state) => state.onNodesChange);
  const onEdgesChange = useSchemaStore((state) => state.onEdgesChange);
  const onConnectStart = useSchemaStore((state) => state.onConnectStart);
  const pendingConnection = useSchemaStore((state) => state.pendingConnection);
  const setPendingConnection = useSchemaStore((state) => state.setPendingConnection);
  const confirmConnection = useSchemaStore((state) => state.confirmConnection);
  const addTable = useSchemaStore((state) => state.addTable);
  const dialect = useSchemaStore((state) => state.graph.dialect);
  const activeTab = useSchemaStore((state) => state.activeTab);
  const setActiveTab = useSchemaStore((state) => state.setActiveTab);
  const lastOperationLog = useSchemaStore((state) => state.lastOperationLog);
  const setLastOperationLog = useSchemaStore((state) => state.setLastOperationLog);

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Initialize SQLite WASM engine on mount
  useEffect(() => {
    sqliteEngine.init().then(() => {
      useSchemaStore.getState().applyToLocalSqlite();
    });
  }, []);

  const handlePaneDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.className && typeof target.className === 'string' && target.className.includes('react-flow__pane')) {
        const bounds = (e.currentTarget as Element).getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        addTable(x, y);
      }
    },
    [addTable]
  );

  const handleExportSqlite = () => {
    try {
      const bytes = sqliteEngine.exportDatabase();
      const blob = new Blob([bytes as any], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `esqler_schema_${Date.now()}.sqlite`;
      a.click();
      URL.revokeObjectURL(url);
      setLastOperationLog('Exported SQLite database binary file');
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-50 font-sans text-slate-800 flex flex-col overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-borderMain px-5 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('canvas')}>
            <div className="w-8 h-8 bg-slate-800 flex items-center justify-center font-display font-bold text-white text-sm">
              eS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base text-slate-900 tracking-tight">eSQLer</span>
                <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                  {dialect}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1 font-display font-bold text-xs ${
                activeTab === 'canvas'
                  ? 'bg-white text-slate-900 border border-borderMain'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SpriteTableIcon size={14} />
              Visual Designer
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-1.5 px-3 py-1 font-display font-bold text-xs ${
                activeTab === 'data'
                  ? 'bg-white text-slate-900 border border-borderMain'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SpriteGridIcon size={14} />
              Data Studio
            </button>

            <button
              onClick={() => setActiveTab('query')}
              className={`flex items-center gap-1.5 px-3 py-1 font-display font-bold text-xs ${
                activeTab === 'query'
                  ? 'bg-white text-slate-900 border border-borderMain'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SpritePlayIcon size={14} />
              Query Studio
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1 font-display font-bold text-xs ${
                activeTab === 'code'
                  ? 'bg-white text-slate-900 border border-borderMain'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SpriteCodeIcon size={14} />
              Compiled DDL
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-100 hover:bg-accent-200 text-accent-900 font-display font-bold text-xs border border-accent-300"
          >
            <SpriteCodeIcon size={14} />
            AI Assist
          </button>

          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-display font-bold text-xs border border-borderMain"
          >
            <SpriteDbIcon size={14} />
            Connect / Import
          </button>

          <button
            type="button"
            onClick={handleExportSqlite}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-display font-bold text-xs"
            title="Download in-memory SQLite binary file"
          >
            Export .sqlite
          </button>
        </div>
      </header>

      {/* Main Body Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'canvas' && (
          <div className="w-full h-full relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnectStart}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onDoubleClick={handlePaneDoubleClick}
              fitView
              fitViewOptions={{ padding: 0.6, maxZoom: 0.6 }}
              minZoom={0.2}
              maxZoom={2}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#CBD5E1" />
              <Controls className="!bg-white !border !border-borderMain !rounded-none overflow-hidden" />
              <MiniMap
                className="!border !border-borderMain !rounded-none overflow-hidden !bg-white"
                nodeStrokeColor="#475569"
                nodeColor={(n) => (n.data as any)?.color || '#CBD5E1'}
              />

              {/* Floating Canvas Top Toolbar */}
              <Panel position="top-center" className="mt-2.5">
                <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 border border-borderMain">
                  <button
                    type="button"
                    onClick={() => addTable()}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-display font-bold text-xs"
                  >
                    + Add Table
                  </button>
                  <span className="text-[11px] font-medium text-slate-400 px-1">
                    Double-click canvas to create table | Drag handles to link FK
                  </span>
                </div>
              </Panel>
            </ReactFlow>
          </div>
        )}

        {activeTab === 'data' && <DataStudio />}
        {activeTab === 'query' && <QueryStudio />}
        {activeTab === 'code' && <CodePanel />}
      </main>

      {/* Operation Log Notification Toast */}
      {lastOperationLog && (
        <div className="absolute bottom-4 left-6 z-40 bg-white border border-borderMain px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-800">
          <SpriteCheckIcon size={14} color="#10B981" />
          <span>{lastOperationLog}</span>
          <button
            onClick={() => setLastOperationLog(null)}
            className="text-slate-400 hover:text-slate-700 ml-2 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Footer Engine Status Bar */}
      <footer className="h-7 bg-white border-t border-borderMain px-5 flex items-center justify-between text-[10px] font-medium text-slate-400 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <span className="w-1.5 h-1.5 bg-emerald-500" />
            SQLite WASM (In-Browser)
          </span>
          <span>•</span>
          <span>{nodes.length} tables</span>
          <span>•</span>
          <span>{edges.length} relationships</span>
        </div>

        <div className="flex items-center gap-3">
          <span>© 2026 eSQLer</span>
        </div>
      </footer>

      {/* Relationship Confirmation Modal */}
      {pendingConnection && (
        <RelationshipModal
          isOpen={Boolean(pendingConnection)}
          onClose={() => setPendingConnection(null)}
          sourceTableName={pendingConnection.sourceTable.name}
          sourceColumnName={pendingConnection.sourceCol.name}
          targetTableName={pendingConnection.targetTable.name}
          targetColumnName={pendingConnection.targetCol.name}
          currentDialect={dialect}
          onConfirm={confirmConnection}
        />
      )}

      {/* Connect Database Modal */}
      <ConnectModal isOpen={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} />

      {/* AI Assistant Drawer */}
      <AiAssistDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} />

    </div>
  );
}

export default App;
