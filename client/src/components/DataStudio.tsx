import React, { useState, useEffect, useCallback } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';
import { sqliteEngine, QueryResult } from '../services/sqliteEngine';
import { SpriteGridIcon, SpritePlusIcon, SpriteTrashIcon, SpriteCheckIcon } from './icons/Sprites';

export const DataStudio: React.FC = () => {
  const tables = useSchemaStore((state) => state.graph.tables);
  const selectedTable = useSchemaStore((state) => state.selectedTableForData);
  const setSelectedTable = useSchemaStore((state) => state.setSelectedTableForData);
  const setLastOperationLog = useSchemaStore((state) => state.setLastOperationLog);

  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [lastSqlStatement, setLastSqlStatement] = useState<string | null>(null);

  const activeTable = tables.find((t) => t.name === selectedTable) || tables[0];

  const loadData = useCallback(async () => {
    if (!activeTable) return;
    setLoading(true);
    try {
      // Ensure schema is applied
      const applyRes = await useSchemaStore.getState().applyToLocalSqlite();
      if (!applyRes.success) {
        setLoading(false);
        return;
      }

      const result = await sqliteEngine.fetchTableData(activeTable.name);
      setData(result);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTable]);

  useEffect(() => {
    if (activeTable) {
      loadData();
    }
  }, [activeTable, loadData]);

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTable) return;

    const res = await sqliteEngine.insertRow(activeTable.name, newRowData);
    if (res.success) {
      setLastSqlStatement(res.sql);
      setLastOperationLog(`Inserted 1 row into "${activeTable.name}" via prepared statement.`);
      setNewRowData({});
      await loadData();
    } else {
      alert(`Insert failed: ${res.error}`);
    }
  };

  const handleDeleteRow = async (row: any[]) => {
    if (!activeTable || !data) return;
    const pkCol = activeTable.columns.find((c) => c.isPrimary) || activeTable.columns[0];
    const pkColIndex = data.columns.indexOf(pkCol.name);
    if (pkColIndex === -1) return;

    const pkVal = row[pkColIndex];
    const res = await sqliteEngine.deleteRow(activeTable.name, pkCol.name, pkVal);
    if (res.success) {
      setLastSqlStatement(res.sql);
      setLastOperationLog(`Deleted row where "${pkCol.name}" = ${pkVal}`);
      await loadData();
    } else {
      alert(`Delete failed: ${res.error}`);
    }
  };

  const handleSaveCell = async (rowIndex: number, colName: string) => {
    if (!activeTable || !data) return;
    const pkCol = activeTable.columns.find((c) => c.isPrimary) || activeTable.columns[0];
    const pkColIndex = data.columns.indexOf(pkCol.name);
    const row = data.values[rowIndex];
    if (pkColIndex === -1 || !row) return;

    const pkVal = row[pkColIndex];
    const res = await sqliteEngine.updateRow(activeTable.name, pkCol.name, pkVal, {
      [colName]: editValue,
    });

    if (res.success) {
      setLastSqlStatement(res.sql);
      setLastOperationLog(`Updated "${colName}" in table "${activeTable.name}" (Row PK: ${pkVal})`);
      setEditingCell(null);
      await loadData();
    } else {
      alert(`Update failed: ${res.error}`);
    }
  };

  const handleSeedSampleData = async () => {
    if (!activeTable) return;
    if (activeTable.name === 'users') {
      await sqliteEngine.insertRow('users', { username: 'alice_sprite', email: 'alice@esqler.dev' });
      await sqliteEngine.insertRow('users', { username: 'bob_builder', email: 'bob@esqler.dev' });
      await sqliteEngine.insertRow('users', { username: 'charlie_db', email: 'charlie@esqler.dev' });
    } else if (activeTable.name === 'posts') {
      await sqliteEngine.insertRow('posts', { author_id: 1, title: 'Welcome to eSQLer!', content: 'Visual database design is fun.' });
      await sqliteEngine.insertRow('posts', { author_id: 2, title: 'WASM SQLite in Browser', content: 'Running full SQL with zero backend.' });
    } else {
      const sampleRow: Record<string, any> = {};
      activeTable.columns.forEach((col) => {
        if (!col.isAutoIncrement) {
          if (col.type === 'int' || col.type === 'bigint') sampleRow[col.name] = Math.floor(Math.random() * 100);
          else if (col.type === 'boolean') sampleRow[col.name] = 1;
          else sampleRow[col.name] = `Sample ${col.name}`;
        }
      });
      await sqliteEngine.insertRow(activeTable.name, sampleRow);
    }
    setLastOperationLog(`Seeded sample rows into "${activeTable.name}"`);
    await loadData();
  };

  if (tables.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-canvas text-center">
        <div className="p-4 bg-white border border-slate-200 mb-4">
          <SpriteGridIcon size={40} color="#1E293B" />
        </div>
        <h2 className="text-xl font-display font-bold text-textMain mb-2">No Tables in Schema</h2>
        <p className="text-xs font-semibold text-textMuted max-w-sm">
          Head over to the Visual Canvas and add your first table to start viewing and editing live data!
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-canvas p-6 overflow-hidden">
      {/* Table Selector & Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 border border-slate-200">
            <SpriteGridIcon size={20} color="#334155" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Data Studio (Live SQLite)</h2>
            <p className="text-xs text-slate-400 font-medium">
              Spreadsheet data view backed by in-browser WASM engine
            </p>
          </div>
        </div>

        {/* Table Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {tables.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTable(t.name)}
              className={`px-3 py-1.5 font-display font-bold text-xs flex items-center gap-2 ${
                activeTable?.name === t.name
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <span className="w-2 h-2" style={{ backgroundColor: t.color }} />
              {t.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSeedSampleData}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-50 hover:bg-accent-100 text-accent-900 font-display font-bold text-xs border border-accent-200"
        >
          Seed Sample Rows
        </button>
      </div>

      {/* Parameterized Operation Transparency Toast */}
      {lastSqlStatement && (
        <div className="mb-4 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <SpriteCheckIcon size={14} color="#059669" />
            <span>
              <strong>Executed:</strong>{' '}
              <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                {lastSqlStatement}
              </code>
            </span>
          </div>
          <button
            onClick={() => setLastSqlStatement(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs underline ml-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 bg-white border border-slate-200 flex flex-col overflow-hidden">
        {/* Table Container */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center p-8 text-sm font-display font-bold text-textMuted">
              Loading data from SQLite WASM...
            </div>
          ) : !data || data.values.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm font-display font-bold text-textMain mb-1">
                Table "{activeTable?.name}" is currently empty
              </p>
              <p className="text-xs font-semibold text-textMuted mb-4">
                Use the form below or click "Seed Sample Rows" to insert records.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas border-b-2 border-textMain">
                  {data.columns.map((col) => (
                    <th key={col} className="p-3 font-display font-bold text-textMain border-r border-borderMain">
                      {col}
                    </th>
                  ))}
                  <th className="p-3 font-display font-bold text-textMain w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderMain">
                {data.values.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-canvas/50">
                    {row.map((cell, cIdx) => {
                      const colName = data.columns[cIdx];
                      const isEditing = editingCell?.rowIndex === rIdx && editingCell?.colName === colName;

                      return (
                        <td
                          key={cIdx}
                          onDoubleClick={() => {
                            setEditingCell({ rowIndex: rIdx, colName });
                            setEditValue(cell !== null ? String(cell) : '');
                          }}
                          className="p-3 font-semibold text-textMain border-r border-borderMain cursor-pointer"
                          title="Double-click to edit"
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveCell(rIdx, colName)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(rIdx, colName);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full bg-white border-2 border-secondary-500 rounded px-1.5 py-0.5 font-bold outline-none"
                            />
                          ) : cell === null ? (
                            <span className="text-gray-400 italic">NULL</span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row)}
                        className="p-1.5 hover:bg-red-100 text-red-500"
                        title="Delete Row"
                      >
                        <SpriteTrashIcon size={14} color="#EF4444" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Inline Insert Row Form */}
        {activeTable && (
          <form onSubmit={handleAddRow} className="p-3 bg-canvas border-t-2 border-borderMain flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-display font-bold text-textMain px-2 whitespace-nowrap">
              + New Row:
            </span>
            {activeTable.columns.map((col) => {
              if (col.isAutoIncrement) {
                return (
                  <div key={col.id} className="min-w-[100px] text-xs font-bold text-textMuted bg-gray-200/60 px-2 py-1.5 text-center">
                    {col.name} (Auto)
                  </div>
                );
              }
              return (
                <input
                  key={col.id}
                  value={newRowData[col.name] || ''}
                  onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                  placeholder={`${col.name} (${col.type})`}
                  className="min-w-[130px] bg-white border-2 border-borderMain focus:border-textMain px-2.5 py-1.5 text-xs font-bold outline-none"
                />
              );
            })}
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-display font-bold text-xs whitespace-nowrap"
            >
              <SpritePlusIcon size={14} />
              Insert
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
