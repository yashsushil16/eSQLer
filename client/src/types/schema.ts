export type Dialect = 'sqlite' | 'postgres' | 'mysql' | 'mongodb';

export type UniversalType =
  | 'int'
  | 'bigint'
  | 'float'
  | 'decimal'
  | 'varchar'
  | 'text'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'json'
  | 'uuid'
  | 'blob';

export interface ColumnDefinition {
  id: string;
  name: string;
  type: UniversalType;
  isPrimary: boolean;
  isNullable: boolean;
  isUnique: boolean;
  isAutoIncrement?: boolean;
  defaultValue?: string;
  comment?: string;
  [key: string]: any;
}

export type TableSprite = 'cylinder' | 'cube' | 'robot' | 'sparkle' | 'vault' | 'heart' | 'star' | 'badge';

export interface TableDefinition {
  id: string;
  name: string;
  columns: ColumnDefinition[];
  color: string;
  sprite: TableSprite;
  comment?: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  [key: string]: any;
}

export type Cardinality = '1:1' | '1:N' | 'N:M';
export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
export type MongoEmbeddingStrategy = 'reference' | 'embedded';

export interface RelationshipDefinition {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: Cardinality;
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
  mongoStrategy?: MongoEmbeddingStrategy;
  [key: string]: any;
}

export interface DiagramGraph {
  dialect: Dialect;
  tables: TableDefinition[];
  relationships: RelationshipDefinition[];
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  tableId?: string;
  columnId?: string;
  relationshipId?: string;
}
