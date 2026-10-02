import { DiagramGraph, TableDefinition, UniversalType } from '../types/schema';
import { topologicalSortTables } from './toposort';

export function mapTypeToMysql(type: UniversalType, isAutoIncrement?: boolean): string {
  if (isAutoIncrement) {
    if (type === 'bigint') return 'BIGINT AUTO_INCREMENT';
    return 'INT AUTO_INCREMENT';
  }
  switch (type) {
    case 'int':
      return 'INT';
    case 'bigint':
      return 'BIGINT';
    case 'float':
      return 'FLOAT';
    case 'decimal':
      return 'DECIMAL(12, 2)';
    case 'boolean':
      return 'TINYINT(1)';
    case 'varchar':
      return 'VARCHAR(255)';
    case 'text':
      return 'TEXT';
    case 'uuid':
      return 'CHAR(36)';
    case 'date':
      return 'DATE';
    case 'timestamp':
      return 'DATETIME';
    case 'json':
      return 'JSON';
    case 'blob':
      return 'LONGBLOB';
    default:
      return 'VARCHAR(255)';
  }
}

export function compileMysql(graph: DiagramGraph): { sql: string; errors: string[] } {
  const errors: string[] = [];
  const topo = topologicalSortTables(graph);

  if (topo.hasCycle) {
    errors.push(topo.error || 'Circular foreign key dependency detected.');
  }

  const lines: string[] = [
    '-- Compiled by eSQLer for MySQL Engine',
    '-- Generated at ' + new Date().toISOString(),
    'SET FOREIGN_KEY_CHECKS = 1;',
    '',
  ];

  const tableMap = new Map<string, TableDefinition>();
  graph.tables.forEach((t) => tableMap.set(t.id, t));

  for (const table of topo.sortedTables) {
    lines.push(`-- Table: ${table.name}`);
    lines.push(`CREATE TABLE IF NOT EXISTS \`${table.name}\` (`);

    const colLines: string[] = [];
    const pkColumns: string[] = [];

    table.columns.forEach((col) => {
      let colDef = `  \`${col.name}\` `;
      const mysqlType = mapTypeToMysql(col.type, col.isAutoIncrement);
      colDef += mysqlType;

      if (!col.isNullable) colDef += ' NOT NULL';
      if (col.isUnique && !col.isPrimary) colDef += ' UNIQUE';
      if (col.defaultValue !== undefined && col.defaultValue !== '' && !col.isAutoIncrement) {
        colDef += ` DEFAULT ${formatMysqlDefaultValue(col.defaultValue, col.type)}`;
      }

      if (col.isPrimary) {
        pkColumns.push(`\`${col.name}\``);
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
        let fkClause = `  FOREIGN KEY (\`${sourceCol.name}\`) REFERENCES \`${targetTable.name}\`(\`${targetCol.name}\`)`;
        if (rel.onDelete) fkClause += ` ON DELETE ${rel.onDelete}`;
        if (rel.onUpdate) fkClause += ` ON UPDATE ${rel.onUpdate}`;
        colLines.push(fkClause);
      }
    });

    lines.push(colLines.join(',\n'));
    lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;');
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
      lines.push(`CREATE TABLE IF NOT EXISTS \`${junctionTableName}\` (`);
      lines.push(`  \`${colAName}\` ${mapTypeToMysql(colA.type)} NOT NULL,`);
      lines.push(`  \`${colBName}\` ${mapTypeToMysql(colB.type)} NOT NULL,`);
      lines.push(`  PRIMARY KEY (\`${colAName}\`, \`${colBName}\`),`);
      lines.push(`  FOREIGN KEY (\`${colAName}\`) REFERENCES \`${tableA.name}\`(\`${colA.name}\`) ON DELETE CASCADE,`);
      lines.push(`  FOREIGN KEY (\`${colBName}\`) REFERENCES \`${tableB.name}\`(\`${colB.name}\`) ON DELETE CASCADE`);
      lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;');
      lines.push('');
    }
  }

  return {
    sql: lines.join('\n'),
    errors,
  };
}

function formatMysqlDefaultValue(val: string, type: UniversalType): string {
  if (type === 'int' || type === 'bigint' || type === 'float' || type === 'decimal') {
    return isNaN(Number(val)) ? `'${val}'` : val;
  }
  if (type === 'boolean') {
    return val === '1' || val === 'true' ? '1' : '0';
  }
  if (val.toUpperCase() === 'CURRENT_TIMESTAMP' || val.toUpperCase() === 'NOW()' || val.toUpperCase() === 'NULL') {
    return val;
  }
  return `'${val.replace(/'/g, "''")}'`;
}
