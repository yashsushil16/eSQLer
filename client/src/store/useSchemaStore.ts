import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import {
  DiagramGraph,
  TableDefinition,
  ColumnDefinition,
  RelationshipDefinition,
  Dialect,
  ValidationError,
  Cardinality,
  ReferentialAction,
  MongoEmbeddingStrategy,
} from '../types/schema';
import { compileGraph, CompilationResult } from '../compiler';
import { sqliteEngine } from '../services/sqliteEngine';

export type ActiveTab = 'canvas' | 'data' | 'query' | 'code';

interface PendingConnection {
  connection: Connection;
  sourceTable: TableDefinition;
  sourceCol: ColumnDefinition;
  targetTable: TableDefinition;
  targetCol: ColumnDefinition;
}

interface SchemaState {
  graph: DiagramGraph;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedTableForData: string | null;
  setSelectedTableForData: (tableName: string | null) => void;

  // React Flow UI state
  nodes: Node<TableDefinition>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;

  // Connection Dialog State
  pendingConnection: PendingConnection | null;
  setPendingConnection: (pending: PendingConnection | null) => void;
  onConnectStart: (connection: Connection) => void;
  confirmConnection: (config: {
    cardinality: Cardinality;
    onDelete: ReferentialAction;
    onUpdate: ReferentialAction;
    mongoStrategy?: MongoEmbeddingStrategy;
  }) => void;

  // Compiler & Validation State
  compilationResult: CompilationResult;
  validationErrors: ValidationError[];
  setDialect: (dialect: Dialect) => void;

  // Schema Actions
  addTable: (x?: number, y?: number, customName?: string) => void;
  updateTable: (id: string, data: Partial<TableDefinition>) => void;
  deleteTable: (id: string) => void;
  addColumn: (tableId: string, initialData?: Partial<ColumnDefinition>) => void;
  updateColumn: (tableId: string, colId: string, data: Partial<ColumnDefinition>) => void;
  deleteColumn: (tableId: string, colId: string) => void;
  deleteRelationship: (id: string) => void;

  // Engine Actions
  syncGraphFromIntrospection: (newGraph: DiagramGraph) => void;
  applyToLocalSqlite: () => Promise<{ success: boolean; error?: string }>;

  // Operation Log
  lastOperationLog: string | null;
  setLastOperationLog: (log: string | null) => void;
}

const PALETTE = ['#94A3B8', '#9CA3AF', '#A1A1AA', '#8B5CF6', '#818CF8', '#38BDF8'];

const INITIAL_GRAPH: DiagramGraph = {
  dialect: 'sqlite',
  tables: [
    {
      id: 'tbl_users',
      name: 'users',
      color: '#94A3B8',
      sprite: 'robot',
      position: { x: 80, y: 100 },
      columns: [
        { id: 'col_users_id', name: 'id', type: 'int', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
        { id: 'col_users_username', name: 'username', type: 'varchar', isPrimary: false, isNullable: false, isUnique: true },
        { id: 'col_users_email', name: 'email', type: 'varchar', isPrimary: false, isNullable: false, isUnique: true },
        { id: 'col_users_created_at', name: 'created_at', type: 'timestamp', isPrimary: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      id: 'tbl_posts',
      name: 'posts',
      color: '#A1A1AA',
      sprite: 'cylinder',
      position: { x: 500, y: 100 },
      columns: [
        { id: 'col_posts_id', name: 'id', type: 'int', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
        { id: 'col_posts_author_id', name: 'author_id', type: 'int', isPrimary: false, isNullable: false, isUnique: false },
        { id: 'col_posts_title', name: 'title', type: 'varchar', isPrimary: false, isNullable: false, isUnique: false },
        { id: 'col_posts_content', name: 'content', type: 'text', isPrimary: false, isNullable: true, isUnique: false },
      ],
    },
  ],
  relationships: [
    {
      id: 'rel_posts_author_id_users_id',
      sourceTableId: 'tbl_posts',
      sourceColumnId: 'col_posts_author_id',
      targetTableId: 'tbl_users',
      targetColumnId: 'col_users_id',
      cardinality: '1:N',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  ],
};

function graphToNodesAndEdges(graph: DiagramGraph): { nodes: Node<TableDefinition>[]; edges: Edge[] } {
  const nodes: Node<TableDefinition>[] = graph.tables.map((t) => ({
    id: t.id,
    type: 'tableNode',
    position: t.position || { x: 100, y: 100 },
    width: t.width,
    height: t.height,
    data: t,
  }));

  const edges: Edge[] = graph.relationships.map((r) => ({
    id: r.id,
    source: r.sourceTableId,
    target: r.targetTableId,
    sourceHandle: `source-${r.sourceColumnId}`,
    targetHandle: `target-${r.targetColumnId}`,
    type: 'flowEdge',
    data: {
      cardinality: r.cardinality,
      relationship: r,
    },
  }));

  return { nodes, edges };
}

const initialConversion = graphToNodesAndEdges(INITIAL_GRAPH);
const initialCompilation = compileGraph(INITIAL_GRAPH);

export const useSchemaStore = create<SchemaState>((set, get) => ({
  graph: INITIAL_GRAPH,
  activeTab: 'canvas',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedTableForData: INITIAL_GRAPH.tables[0]?.name || null,
  setSelectedTableForData: (tableName) => set({ selectedTableForData: tableName }),

  nodes: initialConversion.nodes,
  edges: initialConversion.edges,
  pendingConnection: null,
  setPendingConnection: (pending) => set({ pendingConnection: pending }),
  compilationResult: initialCompilation,
  validationErrors: initialCompilation.errors,
  lastOperationLog: null,
  setLastOperationLog: (log) => set({ lastOperationLog: log }),

  onNodesChange: (changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, get().nodes as any) as unknown as Node<TableDefinition>[];
    const updatedTables = get().graph.tables.map((t) => {
      const matchedNode = updatedNodes.find((n) => n.id === t.id);
      if (matchedNode) {
        return { 
          ...t, 
          position: matchedNode.position,
          width: matchedNode.width ?? t.width,
          height: matchedNode.height ?? t.height,
        };
      }
      return t;
    });

    set({
      nodes: updatedNodes,
      graph: { ...get().graph, tables: updatedTables },
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const updatedEdges = applyEdgeChanges(changes, get().edges);
    const validEdgeIds = new Set(updatedEdges.map((e) => e.id));
    const updatedRelationships = get().graph.relationships.filter((r) => validEdgeIds.has(r.id));
    const updatedGraph = { ...get().graph, relationships: updatedRelationships };
    const compilation = compileGraph(updatedGraph);

    set({
      edges: updatedEdges,
      graph: updatedGraph,
      compilationResult: compilation,
      validationErrors: compilation.errors,
    });
  },

  onConnectStart: (connection: Connection) => {
    const sourceTableId = connection.source;
    const targetTableId = connection.target;
    const sourceHandle = connection.sourceHandle;
    const targetHandle = connection.targetHandle;

    const sourceColId = sourceHandle?.replace('source-', '');
    const targetColId = targetHandle?.replace('target-', '');

    const sourceTable = get().graph.tables.find((t) => t.id === sourceTableId);
    const targetTable = get().graph.tables.find((t) => t.id === targetTableId);

    const sourceCol = sourceTable?.columns.find((c) => c.id === sourceColId);
    const targetCol = targetTable?.columns.find((c) => c.id === targetColId);

    if (sourceTable && targetTable && sourceCol && targetCol) {
      set({
        pendingConnection: {
          connection,
          sourceTable,
          sourceCol,
          targetTable,
          targetCol,
        },
      });
    }
  },

  confirmConnection: (config) => {
    const pending = get().pendingConnection;
    if (!pending) return;

    const { sourceTable, sourceCol, targetTable, targetCol } = pending;
    const relId = `rel_${sourceTable.name}_${sourceCol.name}_${targetTable.name}_${targetCol.name}_${Date.now()}`;

    let updatedTables = [...get().graph.tables];
    if (config.cardinality === 'N:M') {
      const junctionName = `${sourceTable.name}_${targetTable.name}`;
      const existingJunction = updatedTables.find((t) => t.name === junctionName);
      if (!existingJunction) {
        const junctionTable: TableDefinition = {
          id: `tbl_${junctionName}_${Date.now()}`,
          name: junctionName,
          color: '#CBD5E1',
          sprite: 'vault',
          position: {
            x: (sourceTable.position?.x || 100) + 150,
            y: (sourceTable.position?.y || 100) + 200,
          },
          columns: [
            {
              id: `col_${junctionName}_${sourceTable.name}_id`,
              name: `${sourceTable.name}_${sourceCol.name}`,
              type: sourceCol.type,
              isPrimary: true,
              isNullable: false,
              isUnique: false,
            },
            {
              id: `col_${junctionName}_${targetTable.name}_id`,
              name: `${targetTable.name}_${targetCol.name}`,
              type: targetCol.type,
              isPrimary: true,
              isNullable: false,
              isUnique: false,
            },
          ],
        };
        updatedTables.push(junctionTable);
      }
    }

    const newRel: RelationshipDefinition = {
      id: relId,
      sourceTableId: sourceTable.id,
      sourceColumnId: sourceCol.id,
      targetTableId: targetTable.id,
      targetColumnId: targetCol.id,
      cardinality: config.cardinality,
      onDelete: config.onDelete,
      onUpdate: config.onUpdate,
      mongoStrategy: config.mongoStrategy,
    };

    const updatedGraph: DiagramGraph = {
      ...get().graph,
      tables: updatedTables,
      relationships: [...get().graph.relationships, newRel],
    };

    const { nodes, edges } = graphToNodesAndEdges(updatedGraph);
    const compilation = compileGraph(updatedGraph);

    set({
      graph: updatedGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
      pendingConnection: null,
      lastOperationLog: `Connected: ${sourceTable.name}.${sourceCol.name} -> ${targetTable.name}.${targetCol.name} (${config.cardinality})`,
    });
  },

  setDialect: (dialect) => {
    const updatedGraph = { ...get().graph, dialect };
    const compilation = compileGraph(updatedGraph);
    set({
      graph: updatedGraph,
      compilationResult: compilation,
      validationErrors: compilation.errors,
      lastOperationLog: `Switched target database engine to: ${dialect.toUpperCase()}`,
    });
  },

  addTable: (x, y, customName) => {
    const tableNum = get().graph.tables.length + 1;
    const name = customName || `table_${tableNum}`;
    const id = `tbl_${name}_${Date.now()}`;
    const color = PALETTE[tableNum % PALETTE.length];

    const newTable: TableDefinition = {
      id,
      name,
      color,
      sprite: 'cylinder',
      position: {
        x: x ?? Math.random() * 300 + 150,
        y: y ?? Math.random() * 200 + 150,
      },
      columns: [
        {
          id: `col_${name}_id`,
          name: 'id',
          type: 'int',
          isPrimary: true,
          isNullable: false,
          isUnique: true,
          isAutoIncrement: true,
        },
        {
          id: `col_${name}_name`,
          name: 'name',
          type: 'varchar',
          isPrimary: false,
          isNullable: false,
          isUnique: false,
        },
      ],
    };

    const updatedGraph: DiagramGraph = {
      ...get().graph,
      tables: [...get().graph.tables, newTable],
    };

    const { nodes, edges } = graphToNodesAndEdges(updatedGraph);
    const compilation = compileGraph(updatedGraph);

    set({
      graph: updatedGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
      lastOperationLog: `Added table: ${name}`,
    });
  },

  updateTable: (id, data) => {
    const updatedTables = get().graph.tables.map((t) => (t.id === id ? { ...t, ...data } : t));
    const updatedGraph = { ...get().graph, tables: updatedTables };
    const { nodes, edges } = graphToNodesAndEdges(updatedGraph);
    const compilation = compileGraph(updatedGraph);

    set({
      graph: updatedGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
    });
  },

  deleteTable: (id) => {
    const tableName = get().graph.tables.find((t) => t.id === id)?.name;
    const updatedTables = get().graph.tables.filter((t) => t.id !== id);
    const updatedRelationships = get().graph.relationships.filter(
      (r) => r.sourceTableId !== id && r.targetTableId !== id
    );

    const updatedGraph = {
      ...get().graph,
      tables: updatedTables,
      relationships: updatedRelationships,
    };

    const { nodes, edges } = graphToNodesAndEdges(updatedGraph);
    const compilation = compileGraph(updatedGraph);

    set({
      graph: updatedGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
      lastOperationLog: `Deleted table: ${tableName || id}`,
    });
  },

  addColumn: (tableId, initialData) => {
    const updatedTables = get().graph.tables.map((t) => {
      if (t.id === tableId) {
        const colNum = t.columns.length + 1;
        const newCol: ColumnDefinition = {
          id: `col_${t.name}_col_${colNum}_${Date.now()}`,
          name: `col_${colNum}`,
          type: 'varchar',
          isPrimary: false,
          isNullable: true,
          isUnique: false,
          ...initialData,
        };
        return { ...t, columns: [...t.columns, newCol] };
      }
      return t;
    });

    const updatedGraph = { ...get().graph, tables: updatedTables };
    const { nodes, edges } = graphToNodesAndEdges(updatedGraph);
    const compilation = compileGraph(updatedGraph);

    set({
      graph: updatedGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
    });
  },

  updateColumn: (tableId, colId, data) => {
    const updatedTables = get().graph.tables.map((t) => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: t.columns.map((c) => (c.id === colId ? { ...c, ...data } : c)),
        };
      }
      return t;
    });

    const updatedGraph = { ...get().graph, tables: updatedTables };
    const { nodes, edges } = graphToNodesAndEdges(updatedGraph);
    const compilation = compileGraph(updatedGraph);

    set({
      graph: updatedGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
    });
  },

  deleteColumn: (tableId, colId) => {
    const updatedTables = get().graph.tables.map((t) => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: t.columns.filter((c) => c.id !== colId),
        };
      }
      return t;
    });

    const updatedRelationships = get().graph.relationships.filter(
      (r) => r.sourceColumnId !== colId && r.targetColumnId !== colId
    );

    const updatedGraph = {
      ...get().graph,
      tables: updatedTables,
      relationships: updatedRelationships,
    };

    const { nodes, edges } = graphToNodesAndEdges(updatedGraph);
    const compilation = compileGraph(updatedGraph);

    set({
      graph: updatedGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
    });
  },

  deleteRelationship: (id) => {
    const updatedRelationships = get().graph.relationships.filter((r) => r.id !== id);
    const updatedGraph = { ...get().graph, relationships: updatedRelationships };
    const { nodes, edges } = graphToNodesAndEdges(updatedGraph);
    const compilation = compileGraph(updatedGraph);

    set({
      graph: updatedGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
    });
  },

  syncGraphFromIntrospection: (newGraph) => {
    const { nodes, edges } = graphToNodesAndEdges(newGraph);
    const compilation = compileGraph(newGraph);
    set({
      graph: newGraph,
      nodes,
      edges,
      compilationResult: compilation,
      validationErrors: compilation.errors,
      selectedTableForData: newGraph.tables[0]?.name || null,
      lastOperationLog: `Reverse-engineered ${newGraph.tables.length} tables and ${newGraph.relationships.length} relationships into visual diagram.`,
    });
  },

  applyToLocalSqlite: async () => {
    const graph = get().graph;
    const compilation = compileGraph(graph, 'sqlite');
    if (compilation.errors.some((e) => e.type === 'error')) {
      return {
        success: false,
        error: `Cannot apply: ${compilation.errors.find((e) => e.type === 'error')?.message}`,
      };
    }

    const res = await sqliteEngine.applySchema(compilation.code);
    if (res.success) {
      set({
        lastOperationLog: `Applied schema (${graph.tables.length} tables) to in-browser SQLite WASM database!`,
      });
    }
    return res;
  },
}));
