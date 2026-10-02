import { DiagramGraph, ValidationError, TableDefinition } from '../types/schema';
import { topologicalSortTables } from './toposort';

export function validateDiagram(graph: DiagramGraph): ValidationError[] {
  const errors: ValidationError[] = [];
  const tableNames = new Set<string>();

  const tableMap = new Map<string, TableDefinition>();
  graph.tables.forEach((t) => tableMap.set(t.id, t));

  // 1. Table Validation
  for (const table of graph.tables) {
    // Check duplicate table names
    const lowerName = table.name.trim().toLowerCase();
    if (!lowerName) {
      errors.push({
        type: 'error',
        message: 'Table name cannot be empty',
        tableId: table.id,
      });
    } else if (tableNames.has(lowerName)) {
      errors.push({
        type: 'error',
        message: `Duplicate table name "${table.name}"`,
        tableId: table.id,
      });
    } else {
      tableNames.add(lowerName);
    }

    // Check duplicate column names
    const colNames = new Set<string>();
    let hasPk = false;

    for (const col of table.columns) {
      const lowerCol = col.name.trim().toLowerCase();
      if (!lowerCol) {
        errors.push({
          type: 'error',
          message: `Column in "${table.name}" has an empty name`,
          tableId: table.id,
          columnId: col.id,
        });
      } else if (colNames.has(lowerCol)) {
        errors.push({
          type: 'error',
          message: `Duplicate column "${col.name}" in table "${table.name}"`,
          tableId: table.id,
          columnId: col.id,
        });
      } else {
        colNames.add(lowerCol);
      }

      if (col.isPrimary) {
        hasPk = true;
      }
    }

    if (!hasPk && table.columns.length > 0) {
      errors.push({
        type: 'warning',
        message: `Table "${table.name}" does not have a primary key`,
        tableId: table.id,
      });
    }
  }

  // 2. Relationship Validation
  for (const rel of graph.relationships) {
    const sourceTable = tableMap.get(rel.sourceTableId);
    const targetTable = tableMap.get(rel.targetTableId);

    if (!sourceTable || !targetTable) {
      errors.push({
        type: 'error',
        message: 'Relationship connects to a non-existent table',
        relationshipId: rel.id,
      });
      continue;
    }

    const sourceCol = sourceTable.columns.find((c) => c.id === rel.sourceColumnId);
    const targetCol = targetTable.columns.find((c) => c.id === rel.targetColumnId);

    if (!sourceCol || !targetCol) {
      errors.push({
        type: 'error',
        message: `Relationship between "${sourceTable.name}" and "${targetTable.name}" references a missing column`,
        relationshipId: rel.id,
      });
      continue;
    }

    // Type mismatch warning
    if (sourceCol.type !== targetCol.type) {
      errors.push({
        type: 'warning',
        message: `Type mismatch in FK: "${sourceTable.name}.${sourceCol.name}" (${sourceCol.type}) -> "${targetTable.name}.${targetCol.name}" (${targetCol.type})`,
        relationshipId: rel.id,
        tableId: sourceTable.id,
        columnId: sourceCol.id,
      });
    }
  }

  // 3. Circular Dependency Check
  const topo = topologicalSortTables(graph);
  if (topo.hasCycle) {
    errors.push({
      type: 'error',
      message: topo.error || 'Circular foreign key dependency cycle detected.',
    });
  }

  return errors;
}
