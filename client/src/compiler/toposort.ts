import { DiagramGraph, TableDefinition } from '../types/schema';

export interface TopoSortResult {
  sortedTables: TableDefinition[];
  hasCycle: boolean;
  cycleTables?: string[];
  error?: string;
}

/**
 * Topologically sorts tables based on foreign key dependencies.
 * If Table A has a foreign key referencing Table B, Table B must be created BEFORE Table A.
 */
export function topologicalSortTables(graph: DiagramGraph): TopoSortResult {
  const tables = graph.tables;
  const tableMap = new Map<string, TableDefinition>();
  tables.forEach((t) => tableMap.set(t.id, t));

  // Build adjacency list: target -> incoming sources that depend on target
  // If sourceTable references targetTable, targetTable must precede sourceTable.
  // In dependency terms: targetTable is a prerequisite of sourceTable.
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // Prerequisite -> Dependents

  tables.forEach((t) => {
    inDegree.set(t.id, 0);
    adj.set(t.id, []);
  });

  // Populate edges
  // In a foreign key relationship: sourceColumn in sourceTable references targetColumn in targetTable.
  // Therefore targetTable is the parent (prerequisite) and sourceTable is the child.
  graph.relationships.forEach((rel) => {
    if (rel.cardinality === 'N:M') {
      // N:M is resolved via a join table, so it doesn't create a direct table-to-table creation dependency
      return;
    }
    const parentId = rel.targetTableId;
    const childId = rel.sourceTableId;

    if (parentId !== childId && tableMap.has(parentId) && tableMap.has(childId)) {
      adj.get(parentId)?.push(childId);
      inDegree.set(childId, (inDegree.get(childId) || 0) + 1);
    }
  });

  // Kahn's Algorithm
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) {
      queue.push(id);
    }
  });

  const sortedIds: string[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    sortedIds.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sortedIds.length !== tables.length) {
    // Cycle detected
    const cycleIds = tables
      .filter((t) => (inDegree.get(t.id) || 0) > 0)
      .map((t) => t.name);

    return {
      sortedTables: tables,
      hasCycle: true,
      cycleTables: cycleIds,
      error: `Circular dependency detected between tables: ${cycleIds.join(' <-> ')}. Break the circular foreign key to establish a valid creation order.`,
    };
  }

  const sortedTables = sortedIds
    .map((id) => tableMap.get(id))
    .filter((t): t is TableDefinition => Boolean(t));

  return {
    sortedTables,
    hasCycle: false,
  };
}
