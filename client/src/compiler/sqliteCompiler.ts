import { DiagramGraph, TableDefinition, ColumnDefinition, UniversalType, RelationshipDefinition } from '../types/schema';
import { topologicalSortTables } from './toposort';

export function mapTypeToSqlite(type: UniversalType, isAutoIncrement?: boolean): string {
  if (isAutoIncrement && (type === 'int' || type === 'bigint')) {
    return 'INTEGER PRIMARY KEY AUTOINCREMENT';
  }
  switch (type) {
    case 'int':
    case 'bigint':
      return 'INTEGER';
    case 'float':
    case 'decimal':
      return 'REAL';
    case 'boolean':
      return 'INTEGER'; // SQLite uses 0 and 1
    case 'varchar':
    case 'text':
    case 'uuid':
    case 'date':
    case 'timestamp':
    case 'json':
      return 'TEXT';
    case 'blob':
      return 'BLOB';
    default:
      return 'TEXT';
  }
}

export function compileSqlite(graph: DiagramGraph): { sql: string; errors: string[] } {
  const errors: string[] = [];
  const topo = topologicalSortTables(graph);

  if (topo.hasCycle) {
    errors.push(topo.error || 'Circular foreign key dependency detected.');
  }

  const lines: string[] = [
    '-- Compiled by eSQLer for SQLite Engine',
    '-- Generated at ' + new Date().toISOString(),
    'PRAGMA foreign_keys = ON;',
    '',
  ];

  const tableMap = new Map<string, TableDefinition>();
  graph.tables.forEach((t) => tableMap.set(t.id, t));

  // Generate regular tables in topologically sorted order
  for (const table of topo.sortedTables) {
    lines.push(`-- Table: ${table.name}`);
    lines.push(`CREATE TABLE IF NOT EXISTS "${table.name}" (`);

    const colLines: string[] = [];
    const pkColumns: string[] = [];

    table.columns.forEach((col) => {
      let colDef = `  "${col.name}" `;
      const sqliteType = mapTypeToSqlite(col.type, col.isAutoIncrement);
      colDef += sqliteType;

      if (col.isAutoIncrement && (col.type === 'int' || col.type === 'bigint')) {
        // Already includes PRIMARY KEY AUTOINCREMENT
      } else {
        if (!col.isNullable) colDef += ' NOT NULL';
        if (col.isUnique && !col.isPrimary) colDef += ' UNIQUE';
        if (col.defaultValue !== undefined && col.defaultValue !== '') {
          colDef += ` DEFAULT ${formatDefaultValue(col.defaultValue, col.type)}`;
        }
        if (col.isPrimary) {
          pkColumns.push(`"${col.name}"`);
        }
      }

      if (col.type === 'boolean') {
        colDef += ` CHECK ("${col.name}" IN (0, 1))`;
      }

      colLines.push(colDef);
    });

    // Primary key constraint if composite or not auto-increment
    const hasAutoIncPk = table.columns.some((c) => c.isAutoIncrement && c.isPrimary);
    if (pkColumns.length > 0 && !hasAutoIncPk) {
      colLines.push(`  PRIMARY KEY (${pkColumns.join(', ')})`);
    }

    // Foreign keys for this table (1:1 and 1:N where sourceTable is this table)
    const tableForeignKeys = graph.relationships.filter(
      (rel) => rel.sourceTableId === table.id && rel.cardinality !== 'N:M'
    );

    tableForeignKeys.forEach((rel) => {
      const sourceCol = table.columns.find((c) => c.id === rel.sourceColumnId);
      const targetTable = tableMap.get(rel.targetTableId);
      const targetCol = targetTable?.columns.find((c) => c.id === rel.targetColumnId);

      if (sourceCol && targetTable && targetCol) {
        let fkClause = `  FOREIGN KEY ("${sourceCol.name}") REFERENCES "${targetTable.name}"("${targetCol.name}")`;
        if (rel.onDelete) fkClause += ` ON DELETE ${rel.onDelete}`;
        if (rel.onUpdate) fkClause += ` ON UPDATE ${rel.onUpdate}`;
        colLines.push(fkClause);
      }
    });

    lines.push(colLines.join(',\n'));
    lines.push(');');
    lines.push('');
  }

  // Handle N:M Junction Join Tables
  const nmRelationships = graph.relationships.filter((rel) => rel.cardinality === 'N:M');
  for (const rel of nmRelationships) {
    const tableA = tableMap.get(rel.sourceTableId);
    const tableB = tableMap.get(rel.targetTableId);
    const colA = tableA?.columns.find((c) => c.id === rel.sourceColumnId);
    const colB = tableB?.columns.find((c) => c.id === rel.targetColumnId);

    if (tableA && tableB && colA && colB) {
      const junctionTableName = `${tableA.name}_${tableB.name}`;
      const colAName = `${tableA.name}_${colA.name}`;
      const colBName = `${tableB.name}_${colB.name}`;

      lines.push(`-- Auto-generated N:M Junction Table: ${junctionTableName}`);
      lines.push(`CREATE TABLE IF NOT EXISTS "${junctionTableName}" (`);
      lines.push(`  "${colAName}" ${mapTypeToSqlite(colA.type)} NOT NULL,`);
      lines.push(`  "${colBName}" ${mapTypeToSqlite(colB.type)} NOT NULL,`);
      lines.push(`  PRIMARY KEY ("${colAName}", "${colBName}"),`);
      lines.push(`  FOREIGN KEY ("${colAName}") REFERENCES "${tableA.name}"("${colA.name}") ON DELETE CASCADE,`);
      lines.push(`  FOREIGN KEY ("${colBName}") REFERENCES "${tableB.name}"("${colB.name}") ON DELETE CASCADE`);
      lines.push(');');
      lines.push('');
    }
  }

  return {
    sql: lines.join('\n'),
    errors,
  };
}

function formatDefaultValue(val: string, type: UniversalType): string {
  if (type === 'int' || type === 'bigint' || type === 'float' || type === 'decimal') {
    return isNaN(Number(val)) ? `'${val}'` : val;
  }
  if (type === 'boolean') {
    return val === 'true' || val === '1' ? '1' : '0';
  }
  if (val.toUpperCase() === 'CURRENT_TIMESTAMP' || val.toUpperCase() === 'NULL') {
    return val;
  }
  return `'${val.replace(/'/g, "''")}'`;
}
