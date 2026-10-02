import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useSchemaStore } from '../store/useSchemaStore';
import { sqliteEngine, QueryResult } from '../services/sqliteEngine';
import { SpritePlayIcon, SpriteCodeIcon, SpriteFilterIcon, SpritePlusIcon, SpriteTrashIcon } from './icons/Sprites';

interface JoinClause {
  id: string;
  type: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN';
  table: string;
  onLeftCol: string;
  onRightCol: string;
}

interface FilterClause {
  id: string;
  column: string;
  operator: '=' | '!=' | '>' | '<' | 'LIKE';
  value: string;
}

export const QueryStudio: React.FC = () => {
  const tables = useSchemaStore((state) => state.graph.tables);
  const relationships = useSchemaStore((state) => state.graph.relationships);
  const dialect = useSchemaStore((state) => state.graph.dialect);
  const setLastOperationLog = useSchemaStore((state) => state.setLastOperationLog);

  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [primaryTable, setPrimaryTable] = useState<string>(tables[0]?.name || '');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['*']);
  const [joins, setJoins] = useState<JoinClause[]>([]);
  const [filters, setFilters] = useState<FilterClause[]>([]);
  const [orderByCol, setOrderByCol] = useState<string>('');
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [limitCount, setLimitCount] = useState<number>(50);

  const [rawQuery, setRawQuery] = useState<string>('SELECT * FROM users LIMIT 10;');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Sync default table
  useEffect(() => {
    if (!primaryTable && tables.length > 0) {
      setPrimaryTable(tables[0].name);
    }
  }, [tables, primaryTable]);

  // Construct Visual Query
  const generatedVisualSql = React.useMemo(() => {
    if (!primaryTable) return '';
    let sql = `SELECT ${selectedColumns.join(', ')}\nFROM "${primaryTable}"`;

    joins.forEach((j) => {
      sql += `\n${j.type} "${j.table}" ON "${primaryTable}"."${j.onLeftCol}" = "${j.table}"."${j.onRightCol}"`;
    });

    if (filters.length > 0) {
      const whereClauses = filters.map((f) => {
        const val = isNaN(Number(f.value)) ? `'${f.value}'` : f.value;
        return `"${f.column}" ${f.operator} ${val}`;
      });
      sql += `\nWHERE ${whereClauses.join(' AND ')}`;
    }

    if (orderByCol) {
      sql += `\nORDER BY "${orderByCol}" ${orderDirection}`;
    }

    if (limitCount > 0) {
      sql += `\nLIMIT ${limitCount};`;
    } else {
      sql += ';';
    }

    return sql;
  }, [primaryTable, selectedColumns, joins, filters, orderByCol, orderDirection, limitCount]);

  const handleAddJoin = (targetTableName: string) => {
    // Auto-detect foreign key relationship if available
    const rel = relationships.find(
      (r) =>
        (r.sourceTableId.includes(primaryTable) && r.targetTableId.includes(targetTableName)) ||
        (r.targetTableId.includes(primaryTable) && r.sourceTableId.includes(targetTableName))
    );

    const sourceColName = rel ? 'id' : 'id';
    const targetColName = rel ? `${primaryTable}_id` : 'id';

    const newJoin: JoinClause = {
      id: `join_${Date.now()}`,
      type: 'INNER JOIN',
      table: targetTableName,
      onLeftCol: sourceColName,
      onRightCol: targetColName,
    };
    setJoins([...joins, newJoin]);
  };

  const handleAddFilter = () => {
    const tableObj = tables.find((t) => t.name === primaryTable);
    const colName = tableObj?.columns[0]?.name || 'id';

    const newFilter: FilterClause = {
      id: `filter_${Date.now()}`,
      column: colName,
      operator: '=',
      value: '1',
    };
    setFilters([...filters, newFilter]);
  };

  const runCurrentQuery = async (overrideSql?: string) => {
    const sqlToRun = overrideSql || (mode === 'visual' ? generatedVisualSql : rawQuery);
    if (!sqlToRun.trim()) return;

    setIsRunning(true);
    setQueryError(null);

    try {
      // Make sure SQLite WASM DB has schema applied
      await useSchemaStore.getState().applyToLocalSqlite();

      const result = await sqliteEngine.runQuery(sqlToRun);
      setQueryResult(result);
      setLastOperationLog(`Executed query in ${result.executionTimeMs}ms (${result.values.length} rows returned)`);
    } catch (err: any) {
      setQueryError(err.message || String(err));
      setQueryResult(null);
    } finally {
      setIsRunning(false);
    }
  };

  const currentTableObj = tables.find((t) => t.name === primaryTable);

  return (
    <div className="h-full flex flex-col bg-canvas p-6 overflow-hidden">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl">
            <SpritePlayIcon size={20} color="#334155" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Query Studio</h2>
            <p className="text-xs text-slate-400 font-medium">
              Visual join builder & live raw SQL editor against in-browser SQLite
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setMode('visual')}
            className={`px-3 py-1 font-display font-bold text-xs ${
              mode === 'visual'
                ? 'bg-white text-slate-900 border border-borderMain'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Visual Builder
          </button>
          <button
            onClick={() => {
              setMode('raw');
              if (!rawQuery) setRawQuery(generatedVisualSql);
            }}
            className={`px-3 py-1 font-display font-bold text-xs ${
              mode === 'raw'
                ? 'bg-white text-slate-900 border border-borderMain'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Raw Query Editor
          </button>
        </div>

        {/* Run Query Button */}
        <button
          type="button"
          onClick={() => runCurrentQuery()}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-display font-bold text-xs disabled:opacity-50"
        >
          <SpritePlayIcon size={14} color="#FFFFFF" />
          {isRunning ? 'Running...' : 'Execute Query'}
        </button>
      </div>

      {/* Main Workspace (Split Builder / Results) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Side: Builder or Monaco */}
        <div className="lg:col-span-6 flex flex-col bg-white border border-slate-200 overflow-hidden p-4">
          {mode === 'visual' ? (
            <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
              {/* Primary Table Selector */}
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-textMain mb-1.5">
                  Primary Table (FROM)
                </label>
                <select
                  value={primaryTable}
                  onChange={(e) => {
                    setPrimaryTable(e.target.value);
                    setJoins([]);
                    setFilters([]);
                  }}
                  className="w-full bg-canvas border-2 border-textMain rounded-2xl p-2.5 font-display font-bold text-xs outline-none"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.columns.length} columns)
                    </option>
                  ))}
                </select>
              </div>

              {/* Joins Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-display font-bold uppercase tracking-wider text-textMain">
                    Visual Joins ({joins.length})
                  </label>
                  <div className="flex items-center gap-1">
                    {tables
                      .filter((t) => t.name !== primaryTable && !joins.some((j) => j.table === t.name))
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleAddJoin(t.name)}
                          className="text-[10px] font-bold px-2 py-1 bg-secondary-500/20 hover:bg-secondary-500 hover:text-white border border-secondary-600 text-secondary-700"
                        >
                          + Join {t.name}
                        </button>
                      ))}
                  </div>
                </div>

                {joins.length === 0 ? (
                  <div className="p-3 bg-canvas border-2 border-dashed border-borderMain rounded-2xl text-[11px] font-semibold text-textMuted text-center">
                    No join tables added. Click a button above to link related tables.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {joins.map((j) => {
                      const joinTableObj = tables.find((t) => t.name === j.table);
                      return (
                        <div key={j.id} className="p-2.5 bg-canvas border-2 border-borderMain rounded-2xl flex flex-wrap items-center gap-2 text-xs">
                          <select
                            value={j.type}
                            onChange={(e) =>
                              setJoins(joins.map((item) => (item.id === j.id ? { ...item, type: e.target.value as any } : item)))
                            }
                            className="bg-white border-2 border-borderMain rounded-xl px-2 py-1 font-bold text-[11px]"
                          >
                            <option value="INNER JOIN">INNER JOIN</option>
                            <option value="LEFT JOIN">LEFT JOIN</option>
                            <option value="RIGHT JOIN">RIGHT JOIN</option>
                          </select>
                          <span className="font-bold text-textMain">{j.table}</span>
                          <span className="text-textMuted font-bold">ON</span>
                          <select
                            value={j.onLeftCol}
                            onChange={(e) =>
                              setJoins(joins.map((item) => (item.id === j.id ? { ...item, onLeftCol: e.target.value } : item)))
                            }
                            className="bg-white border-2 border-borderMain rounded-xl px-2 py-1 font-bold text-[11px]"
                          >
                            {currentTableObj?.columns.map((c) => (
                              <option key={c.id} value={c.name}>
                                {primaryTable}.{c.name}
                              </option>
                            ))}
                          </select>
                          <span>=</span>
                          <select
                            value={j.onRightCol}
                            onChange={(e) =>
                              setJoins(joins.map((item) => (item.id === j.id ? { ...item, onRightCol: e.target.value } : item)))
                            }
                            className="bg-white border-2 border-borderMain rounded-xl px-2 py-1 font-bold text-[11px]"
                          >
                            {joinTableObj?.columns.map((c) => (
                              <option key={c.id} value={c.name}>
                                {j.table}.{c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setJoins(joins.filter((item) => item.id !== j.id))}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg ml-auto"
                          >
                            <SpriteTrashIcon size={14} color="#EF4444" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Filters Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-display font-bold uppercase tracking-wider text-textMain">
                    Filters / Conditions
                  </label>
                  <button
                    type="button"
                    onClick={handleAddFilter}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-accent-500 hover:bg-accent-600 border border-textMain text-textMain"
                  >
                    + Add Filter
                  </button>
                </div>

                {filters.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 mb-2">
                    <select
                      value={f.column}
                      onChange={(e) =>
                        setFilters(filters.map((item) => (item.id === f.id ? { ...item, column: e.target.value } : item)))
                      }
                      className="bg-canvas border-2 border-borderMain rounded-xl px-2 py-1 text-xs font-bold"
                    >
                      {currentTableObj?.columns.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={f.operator}
                      onChange={(e) =>
                        setFilters(filters.map((item) => (item.id === f.id ? { ...item, operator: e.target.value as any } : item)))
                      }
                      className="bg-canvas border-2 border-borderMain rounded-xl px-2 py-1 text-xs font-bold"
                    >
                      <option value="=">=</option>
                      <option value="!=">!=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value="LIKE">LIKE</option>
                    </select>
                    <input
                      value={f.value}
                      onChange={(e) =>
                        setFilters(filters.map((item) => (item.id === f.id ? { ...item, value: e.target.value } : item)))
                      }
                      placeholder="value"
                      className="flex-1 bg-canvas border-2 border-borderMain rounded-xl px-2.5 py-1 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setFilters(filters.filter((item) => item.id !== f.id))}
                      className="p-1 text-red-500"
                    >
                      <SpriteTrashIcon size={14} color="#EF4444" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Generated Query Preview */}
              <div className="mt-auto pt-3 border-t-2 border-borderMain">
                <div className="text-[10px] font-display font-bold uppercase tracking-wider text-textMuted mb-1">
                  Generated Underlying SQL:
                </div>
                <pre className="p-2.5 bg-canvas border-2 border-borderMain rounded-2xl text-[11px] font-mono text-textMain overflow-x-auto">
                  {generatedVisualSql}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="text-xs font-display font-bold uppercase tracking-wider text-textMain mb-2">
                Raw Query Editor ({dialect.toUpperCase()})
              </div>
              <div className="flex-1 border-2 border-borderMain rounded-2xl overflow-hidden">
                <Editor
                  height="100%"
                  language={dialect === 'mongodb' ? 'javascript' : 'sql'}
                  value={rawQuery}
                  onChange={(val) => setRawQuery(val || '')}
                  theme="vs-light"
                  options={{
                    fontSize: 13,
                    fontFamily: 'monospace',
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Query Results Table */}
        <div className="lg:col-span-6 flex flex-col bg-white border border-slate-200 overflow-hidden p-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-borderMain mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-textMain">Query Results</h3>
              {queryResult && (
                <span className="px-2 py-0.5 rounded-full bg-secondary-500/20 text-secondary-800 text-[11px] font-bold">
                  {queryResult.values.length} rows ({queryResult.executionTimeMs} ms)
                </span>
              )}
            </div>
          </div>

          {queryError ? (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-xs font-bold text-red-600">
              Query Error: {queryError}
            </div>
          ) : !queryResult ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-textMuted">
              <SpriteCodeIcon size={36} color="#94A3B8" />
              <p className="font-display font-bold text-sm mt-3 text-textMain">No Query Executed Yet</p>
              <p className="text-xs font-semibold max-w-xs mt-1">
                Configure your query on the left and click "Execute Query" to see live results.
              </p>
            </div>
          ) : queryResult.values.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-textMuted text-xs font-semibold">
              Query executed successfully, but returned 0 rows.
            </div>
          ) : (
            <div className="flex-1 overflow-auto border-2 border-borderMain rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-canvas border-b-2 border-borderMain">
                    {queryResult.columns.map((col) => (
                      <th key={col} className="p-2.5 font-display font-bold text-textMain border-r border-borderMain">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderMain">
                  {queryResult.values.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-canvas/40">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 font-semibold text-textMain border-r border-borderMain">
                          {cell === null ? <span className="text-gray-400 italic">NULL</span> : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
