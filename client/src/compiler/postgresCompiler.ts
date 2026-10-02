import { DiagramGraph, TableDefinition, UniversalType } from '../types/schema';
import { topologicalSortTables } from './toposort';

export function mapTypeToPostgres(type: UniversalType, isAutoIncrement?: boolean): string {
  if (isAutoIncrement) {
    if (type === 'bigint') return 'BIGSERIAL';
    return 'SERIAL';
  }
  switch (type) {
    case 'int':
      return 'INTEGER';
    case 'bigint':
      return 'BIGINT';
    case 'float':
      return 'REAL';
    case 'decimal':
      return 'NUMERIC(12, 2)';
    case 'boolean':
      return 'BOOLEAN';
    case 'varchar':
      return 'VARCHAR(255)';
    case 'text':
      return 'TEXT';
    case 'uuid':
      return 'UUID';
    case 'date':
      return 'DATE';
    case 'timestamp':
      return 'TIMESTAMP WITH TIME ZONE';
    case 'json':
      return 'JSONB';
    case 'blob':
      return 'BYTEA';
    default:
      return 'TEXT';
  }
}

export function compilePostgres(graph: DiagramGraph): { sql: string; errors: string[] } {
  const errors: string[] = [];
  const topo = topologicalSortTables(graph);

  if (topo.hasCycle) {
    errors.push(topo.error || 'Circular foreign key dependency detected.');
  }

  const lines: string[] = [
    '-- Compiled by eSQLer for PostgreSQL Engine',
    '-- Generated at ' + new Date().toISOString(),
    '',
  ];

  const tableMap = new Map<string, TableDefinition>();
  graph.tables.forEach((t) => tableMap.set(t.id, t));

  for (const table of topo.sortedTables) {
    lines.push(`-- Table: ${table.name}`);
    lines.push(`CREATE TABLE IF NOT EXISTS "${table.name}" (`);

    const colLines: string[] = [];
    const pkColumns: string[] = [];

    table.columns.forEach((col) => {
      let colDef = `  "${col.name}" `;
      const pgType = mapTypeToPostgres(col.type, col.isAutoIncrement);
      colDef += pgType;

      if (!col.isAutoIncrement) {
        if (!col.isNullable) colDef += ' NOT NULL';
        if (col.isUnique && !col.isPrimary) colDef += ' UNIQUE';
        if (col.defaultValue !== undefined && col.defaultValue !== '') {
          colDef += ` DEFAULT ${formatPgDefaultValue(col.defaultValue, col.type)}`;
        }
      }

      if (col.isPrimary) {
        pkColumns.push(`"${col.name}"`);
      }

      colLines.push(colDef);
    });

    if (pkColumns.length > 0) {
      colLines.push(`  PRIMARY KEY (${pkColumns.join(', ')})`);
    }

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

  // Handle N:M Junction Tables
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
      lines.push(`  "${colAName}" ${mapTypeToPostgres(colA.type)} NOT NULL,`);
      lines.push(`  "${colBName}" ${mapTypeToPostgres(colB.type)} NOT NULL,`);
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

function formatPgDefaultValue(val: string, type: UniversalType): string {
  if (type === 'int' || type === 'bigint' || type === 'float' || type === 'decimal') {
    return isNaN(Number(val)) ? `'${val}'` : val;
  }
  if (type === 'boolean') {
    return val === '1' || val === 'true' ? 'TRUE' : 'FALSE';
  }
  if (val.toUpperCase() === 'NOW()' || val.toUpperCase() === 'CURRENT_TIMESTAMP' || val.toUpperCase() === 'NULL' || val.toUpperCase() === 'GEN_RANDOM_UUID()') {
    return val;
  }
  return `'${val.replace(/'/g, "''")}'`;
}
