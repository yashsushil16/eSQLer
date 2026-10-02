import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';

export const FlowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const cardinality = (data?.cardinality as string) || '1:N';
  const isInvalid = Boolean(data?.isInvalid);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isInvalid ? '#EF4444' : '#64748B',
          strokeWidth: 2,
        }}
      />
      {/* Removed animated particle flow overlay as per anti-slop rules */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`px-2 py-0.5 border font-display text-[10px] font-bold ${
            isInvalid
              ? 'bg-red-50 border-red-300 text-red-600'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
          title={isInvalid ? String(data?.errorMessage || 'Validation Error') : `Relationship: ${cardinality}`}
        >
          {cardinality}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
