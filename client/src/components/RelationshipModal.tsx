import React, { useState } from 'react';
import { Cardinality, ReferentialAction, MongoEmbeddingStrategy, Dialect } from '../types/schema';
import { SpriteLinkIcon, SpriteCheckIcon } from './icons/Sprites';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTableName: string;
  sourceColumnName: string;
  targetTableName: string;
  targetColumnName: string;
  currentDialect: Dialect;
  onConfirm: (config: {
    cardinality: Cardinality;
    onDelete: ReferentialAction;
    onUpdate: ReferentialAction;
    mongoStrategy?: MongoEmbeddingStrategy;
  }) => void;
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  sourceTableName,
  sourceColumnName,
  targetTableName,
  targetColumnName,
  currentDialect,
  onConfirm,
}) => {
  const [cardinality, setCardinality] = useState<Cardinality>('1:N');
  const [onDelete, setOnDelete] = useState<ReferentialAction>('CASCADE');
  const [onUpdate, setOnUpdate] = useState<ReferentialAction>('CASCADE');
  const [mongoStrategy, setMongoStrategy] = useState<MongoEmbeddingStrategy>('reference');

  if (!isOpen) return null;

  const handleSave = () => {
    onConfirm({
      cardinality,
      onDelete,
      onUpdate,
      mongoStrategy: currentDialect === 'mongodb' ? mongoStrategy : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="bg-white border border-slate-200 p-5 w-full max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-100 border border-slate-200">
            <SpriteLinkIcon size={20} color="#334155" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Create Relationship</h2>
            <p className="text-xs text-slate-500 font-medium">
              Connecting <span className="text-slate-900 font-bold">{sourceTableName}.{sourceColumnName}</span> to{' '}
              <span className="text-slate-900 font-bold">{targetTableName}.{targetColumnName}</span>
            </p>
          </div>
        </div>

        {/* Cardinality Selector */}
        <div className="mb-4">
          <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Cardinality
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCardinality('1:N')}
              className={`p-2.5 border text-left ${
                cardinality === '1:N'
                  ? 'border-slate-800 bg-slate-50 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-500'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">1 : N</div>
              <div className="text-[10px] text-slate-500 font-medium">One to Many</div>
            </button>

            <button
              type="button"
              onClick={() => setCardinality('1:1')}
              className={`p-2.5 border text-left ${
                cardinality === '1:1'
                  ? 'border-slate-800 bg-slate-50 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-500'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">1 : 1</div>
              <div className="text-[10px] text-slate-500 font-medium">One to One</div>
            </button>

            <button
              type="button"
              onClick={() => setCardinality('N:M')}
              className={`p-2.5 border text-left ${
                cardinality === 'N:M'
                  ? 'border-slate-800 bg-slate-50 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-500'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">N : M</div>
              <div className="text-[10px] text-slate-500 font-medium">Many to Many</div>
            </button>
          </div>

          {cardinality === 'N:M' && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900">
              Auto-generates junction table <span className="font-mono font-bold bg-white px-1.5 py-0.5 border border-amber-300">{sourceTableName}_{targetTableName}</span> with foreign keys to both tables.
            </div>
          )}
        </div>

        {/* Referential Actions for SQL */}
        {currentDialect !== 'mongodb' && cardinality !== 'N:M' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-display font-bold text-slate-700 mb-1">
                On Delete
              </label>
              <select
                value={onDelete}
                onChange={(e) => setOnDelete(e.target.value as ReferentialAction)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-xs outline-none"
              >
                <option value="CASCADE">CASCADE (Delete child rows)</option>
                <option value="SET NULL">SET NULL</option>
                <option value="RESTRICT">RESTRICT (Prevent deletion)</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-display font-bold text-slate-700 mb-1">
                On Update
              </label>
              <select
                value={onUpdate}
                onChange={(e) => setOnUpdate(e.target.value as ReferentialAction)}
                className="w-full bg-slate-50 border border-slate-200 p-2 font-bold text-xs outline-none"
              >
                <option value="CASCADE">CASCADE (Sync updates)</option>
                <option value="SET NULL">SET NULL</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
          </div>
        )}

        {/* MongoDB Specific Strategy */}
        {currentDialect === 'mongodb' && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200">
            <label className="block text-xs font-display font-bold text-slate-700 mb-2">
              MongoDB Modeling Strategy
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMongoStrategy('reference')}
                className={`p-2 border text-left text-xs ${
                  mongoStrategy === 'reference'
                    ? 'border-slate-800 bg-white font-bold text-slate-900'
                    : 'border-slate-200 text-slate-500 bg-transparent'
                }`}
              >
                <div className="font-bold">Referenced (_id)</div>
                <div className="text-[10px] text-slate-400">Normalized, lighter doc</div>
              </button>
              <button
                type="button"
                onClick={() => setMongoStrategy('embedded')}
                className={`p-2 border text-left text-xs ${
                  mongoStrategy === 'embedded'
                    ? 'border-slate-800 bg-white font-bold text-slate-900'
                    : 'border-slate-200 text-slate-500 bg-transparent'
                }`}
              >
                <div className="font-bold">Embedded Object/Array</div>
                <div className="text-[10px] text-slate-400">Single-query atomic reads</div>
              </button>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 font-bold text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-display font-bold text-xs"
          >
            <SpriteCheckIcon size={14} color="#FFFFFF" />
            Connect Relationship
          </button>
        </div>
      </div>
    </div>
  );
};
