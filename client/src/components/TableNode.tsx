import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps, Node, NodeResizer } from '@xyflow/react';
import { TableDefinition, UniversalType, Dialect } from '../types/schema';
import { useSchemaStore } from '../store/useSchemaStore';
import { SpriteTrashIcon, SpritePlusIcon, SpriteKeyIcon } from './icons/Sprites';

const DIALECT_TYPES: Record<Dialect, UniversalType[]> = {
  sqlite: ['int', 'float', 'varchar', 'text', 'boolean', 'blob', 'timestamp'],
  postgres: ['int', 'bigint', 'float', 'decimal', 'varchar', 'text', 'boolean', 'date', 'timestamp', 'uuid', 'json', 'blob'],
  mysql: ['int', 'bigint', 'float', 'decimal', 'varchar', 'text', 'boolean', 'date', 'timestamp', 'uuid', 'json', 'blob'],
  mongodb: ['int', 'bigint', 'float', 'decimal', 'varchar', 'text', 'boolean', 'date', 'timestamp', 'json', 'blob'],
};

const TableNode: React.FC<NodeProps<Node<TableDefinition>>> = ({ id, data, selected }) => {
  const tableData = data as TableDefinition;
  const updateTable = useSchemaStore((state) => state.updateTable);
  const deleteTable = useSchemaStore((state) => state.deleteTable);
  const addColumn = useSchemaStore((state) => state.addColumn);
  const updateColumn = useSchemaStore((state) => state.updateColumn);
  const deleteColumn = useSchemaStore((state) => state.deleteColumn);
  const dialect = useSchemaStore((state) => state.graph.dialect);
  const validationErrors = useSchemaStore((state) => state.validationErrors);

  const tableErrors = validationErrors.filter((e) => e.nodeId === id);

  const hasErrors = tableErrors.some((e) => e.type === 'error');
  const hasWarnings = tableErrors.some((e) => e.type === 'warning');

  const allowedTypes = DIALECT_TYPES[dialect] || DIALECT_TYPES.sqlite;

  return (
    <div
      className={`border-2 relative flex flex-col animate-in fade-in zoom-in-95 duration-300 transition-all ${
        selected
          ? 'border-slate-900 ring-2 ring-slate-900 scale-[1.01]'
          : hasErrors
          ? 'border-red-500'
          : 'border-slate-800 hover:-translate-y-0.5 hover:border-slate-900'
      }`}
      style={{
        backgroundColor: '#FAFAFA', // Off-white to avoid pure white
        minWidth: 350,
        width: '100%',
        height: '100%',
      }}
    >
      {/* Interactive Node Resizer */}
      <NodeResizer
        minWidth={320}
        minHeight={140}
        isVisible={selected}
        lineClassName="border-slate-500"
        handleClassName="!w-2.5 !h-2.5 !bg-white !border-2 !border-slate-700"
      />

      {/* Header Bar */}
      <div 
        className="px-3.5 py-2.5 border-b-2 border-slate-800 flex items-center justify-between transition-colors"
        style={{ backgroundColor: `${tableData.color || '#94a3b8'}20` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Flat Table Badge */}
          <div
            className={`w-7 h-7 flex items-center justify-center font-display font-bold text-xs text-white flex-shrink-0`}
            style={{ backgroundColor: tableData.color || '#4ECDC4' }}
            title="Table sprite badge"
          >
            {tableData.name.slice(0, 2).toUpperCase()}
          </div>

          <input
            value={tableData.name}
            onChange={(e) => {
              updateTable(id, { name: e.target.value.replace(/\s+/g, '_') });
            }}
            placeholder="table_name"
            className="font-display font-bold text-sm bg-transparent border-none outline-none focus:bg-white/50 focus:ring-1 focus:ring-slate-400 px-1.5 py-0.5 w-full text-slate-800 tracking-wide transition-all"
          />
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => addColumn(id)}
            className="w-6 h-6 bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700"
            title="Add Column"
          >
            <SpritePlusIcon size={12} />
          </button>

          <button
            type="button"
            onClick={() => deleteTable(id)}
            className="w-6 h-6 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center"
            title="Delete Table"
          >
            <SpriteTrashIcon size={12} color="currentColor" />
          </button>
        </div>
      </div>

      {/* Validation Banner */}
      {(hasErrors || hasWarnings) && (
        <div
          className={`px-3 py-1 text-[11px] font-semibold border-b ${
            hasErrors
              ? 'bg-red-50/80 border-red-100 text-red-600'
              : 'bg-amber-50/80 border-amber-100 text-amber-700'
          }`}
        >
          {tableErrors[0]?.message}
        </div>
      )}

      {/* Columns List - Auto-sized with no horizontal scrollbars */}
      <div className="py-2 flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {tableData.columns.map((col) => {
          const isPk = col.isPrimary;

          return (
            <div
              key={col.id}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 border-b transition-colors ${
                isPk
                  ? 'bg-amber-50/60 border-amber-200/60'
                  : 'bg-transparent border-slate-200 hover:bg-slate-100/50'
              }`}
            >
              {/* Left Handle: Incoming Foreign Key */}
              <Handle
                type="target"
                position={Position.Left}
                id={`target-${col.id}`}
                className="!w-2.5 !h-2.5 !border-2 !border-slate-600 !bg-white"
                style={{ left: 4, transform: 'translate(0, -50%)' }}
                title={`Target Handle for ${col.name}`}
              />

              {/* PK Toggle Icon */}
              <button
                type="button"
                onClick={() => {
                  updateColumn(id, col.id, {
                    isPrimary: !isPk,
                    isNullable: !isPk ? false : col.isNullable,
                  });
                }}
                className={`p-1 text-[10px] font-bold ${
                  isPk
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-slate-300 hover:text-slate-600'
                }`}
                title={isPk ? 'Primary Key (Click to remove)' : 'Set as Primary Key'}
              >
                <SpriteKeyIcon size={12} color={isPk ? '#B45309' : '#CBD5E1'} />
              </button>

              {/* Column Name Input */}
              <input
                value={col.name}
                onChange={(e) => {
                  updateColumn(id, col.id, { name: e.target.value.replace(/\s+/g, '_') });
                }}
                placeholder="col_name"
                className="flex-1 min-w-[80px] text-xs font-semibold text-slate-800 bg-transparent border-none outline-none focus:bg-white/60 focus:ring-1 focus:ring-slate-400 px-1 transition-all"
              />

              {/* Type Dropdown */}
              <select
                value={col.type}
                onChange={(e) => {
                  updateColumn(id, col.id, { type: e.target.value as UniversalType });
                }}
                className="text-[10px] font-bold bg-transparent hover:bg-white/50 border border-slate-200 hover:border-slate-400 px-1.5 py-0.5 text-slate-700 outline-none cursor-pointer transition-colors"
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Nullable Toggle Badge */}
              <button
                type="button"
                onClick={() => updateColumn(id, col.id, { isNullable: !col.isNullable })}
                className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                  col.isNullable
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                }`}
                title={col.isNullable ? 'Nullable (Click to set NOT NULL)' : 'NOT NULL (Click to allow NULL)'}
              >
                NULL
              </button>

              {/* Delete Column Button */}
              <button
                type="button"
                onClick={() => deleteColumn(id, col.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500"
                title="Delete Column"
              >
                <SpriteTrashIcon size={11} color="currentColor" />
              </button>

              {/* Right Handle: Outgoing Foreign Key */}
              <Handle
                type="source"
                position={Position.Right}
                id={`source-${col.id}`}
                className="!w-2.5 !h-2.5 !border-2 !border-slate-600 !bg-slate-700"
                style={{ right: 4, transform: 'translate(0, -50%)' }}
                title={`Source Handle for ${col.name}`}
              />
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 border-t-2 border-slate-800 flex items-center justify-between text-[10px] font-medium text-slate-500 bg-slate-50/40">
        <span>{tableData.columns.length} columns</span>
        <span className="capitalize">{dialect}</span>
      </div>
    </div>
  );
};

export default memo(TableNode);
