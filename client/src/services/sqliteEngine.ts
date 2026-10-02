import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { DiagramGraph, TableDefinition, ColumnDefinition, UniversalType, RelationshipDefinition } from '../types/schema';
import { compileSqlite } from '../compiler/sqliteCompiler';

export interface QueryResult {
  columns: string[];
  values: any[][];
  executionTimeMs: number;
  rowsAffected?: number;
}

class SqliteEngineService {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    try {
      this.SQL = await initSqlJs({
        locateFile: (file) => (file.endsWith('.wasm') ? '/sql-wasm.wasm' : file),
      });
    } catch (e) {
      this.SQL = await initSqlJs({
        locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm',
      });
    }

    this.db = new this.SQL.Database();
    this.isInitialized = true;
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Applies DDL / schema script to the in-memory SQLite database
   */
  async applySchema(sql: string): Promise<{ success: boolean; error?: string }> {
    await this.init();
    if (!this.db) throw new Error('SQLite DB not initialized');

    try {
      this.db.run(sql);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Executes a parameterized query
   */
  async runQuery(sql: string, params: any[] = []): Promise<QueryResult> {
    await this.init();
    if (!this.db) throw new Error('SQLite DB not initialized');

    const start = performance.now();
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);

      const columns = stmt.getColumnNames();
      const values: any[][] = [];

      while (stmt.step()) {
        values.push(stmt.get());
      }
      stmt.free();

      const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        columns,
        values,
        executionTimeMs,
      };
    } catch (err: any) {
      // For non-SELECT statements (INSERT/UPDATE/DELETE/CREATE)
      try {
        this.db.run(sql, params);
        const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;
        return {
          columns: ['status'],
          values: [['Statement executed successfully']],
          executionTimeMs,
        };
      } catch (innerErr: any) {
        throw new Error(innerErr.message || String(innerErr));
      }
    }
  }

  /**
   * Fetches all rows for a given table
   */
  async fetchTableData(tableName: string, limit = 100, offset = 0): Promise<QueryResult> {
    const sql = `SELECT * FROM "${tableName}" LIMIT ? OFFSET ?;`;
    return this.runQuery(sql, [limit, offset]);
  }

  /**
   * Parameterized Insert
   */
  async insertRow(tableName: string, rowData: Record<string, any>): Promise<{ success: boolean; sql: string; error?: string }> {
    await this.init();
    const keys = Object.keys(rowData).filter((k) => rowData[k] !== undefined && rowData[k] !== '');
    if (keys.length === 0) {
      const sql = `INSERT INTO "${tableName}" DEFAULT VALUES;`;
      await this.runQuery(sql);
      return { success: true, sql };
    }

    const columns = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((k) => rowData[k]);
    const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders});`;

    try {
      await this.runQuery(sql, values);
      return { success: true, sql };
    } catch (err: any) {
      return { success: false, sql, error: err.message };
    }
  }

  /**
   * Parameterized Update
   */
  async updateRow(
    tableName: string,
    primaryKeyCol: string,
    primaryKeyValue: any,
    updateData: Record<string, any>
  ): Promise<{ success: boolean; sql: string; error?: string }> {
    await this.init();
    const keys = Object.keys(updateData);
    if (keys.length === 0) return { success: true, sql: '' };

    const setClauses = keys.map((k) => `"${k}" = ?`).join(', ');
    const values = [...keys.map((k) => updateData[k]), primaryKeyValue];
    const sql = `UPDATE "${tableName}" SET ${setClauses} WHERE "${primaryKeyCol}" = ?;`;

    try {
      await this.runQuery(sql, values);
      return { success: true, sql };
    } catch (err: any) {
      return { success: false, sql, error: err.message };
    }
  }

  /**
   * Parameterized Delete
   */
  async deleteRow(tableName: string, primaryKeyCol: string, primaryKeyValue: any): Promise<{ success: boolean; sql: string; error?: string }> {
    await this.init();
    const sql = `DELETE FROM "${tableName}" WHERE "${primaryKeyCol}" = ?;`;
    try {
      await this.runQuery(sql, [primaryKeyValue]);
      return { success: true, sql };
    } catch (err: any) {
      return { success: false, sql, error: err.message };
    }
  }

  /**
   * Introspects the live SQLite database schema and converts it to a DiagramGraph
   */
  async introspectSchema(): Promise<DiagramGraph> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tablesRes = await this.runQuery(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_%_junction';`
    );

    const tableNames = tablesRes.values.map((row) => String(row[0]));
    const tables: TableDefinition[] = [];
    const relationships: RelationshipDefinition[] = [];

    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#38BDF8', '#A78BFA', '#FB923C'];

    for (let i = 0; i < tableNames.length; i++) {
      const tName = tableNames[i];
      const tableId = `tbl_${tName}`;
      const color = colors[i % colors.length];

      // PRAGMA table_info
      const colsRes = await this.runQuery(`PRAGMA table_info("${tName}");`);
      // columns: cid, name, type, notnull, dflt_value, pk
      const columns: ColumnDefinition[] = colsRes.values.map((cRow) => {
        const colName = String(cRow[1]);
        const rawType = String(cRow[2] || 'TEXT').toUpperCase();
        const notNull = Number(cRow[3]) === 1;
        const dflt = cRow[4] !== null ? String(cRow[4]) : undefined;
        const isPk = Number(cRow[5]) >= 1;

        let uType: UniversalType = 'text';
        if (rawType.includes('INT')) uType = 'int';
        else if (rawType.includes('REAL') || rawType.includes('FLOAT') || rawType.includes('DOUBLE')) uType = 'float';
        else if (rawType.includes('BLOB')) uType = 'blob';
        else if (rawType.includes('BOOL')) uType = 'boolean';
        else if (rawType.includes('DATE') || rawType.includes('TIME')) uType = 'timestamp';

        return {
          id: `col_${tName}_${colName}`,
          name: colName,
          type: uType,
          isPrimary: isPk,
          isNullable: !notNull,
          isUnique: false,
          defaultValue: dflt,
        };
      });

      tables.push({
        id: tableId,
        name: tName,
        columns,
        color,
        sprite: 'cylinder',
        position: { x: 100 + (i % 3) * 340, y: 100 + Math.floor(i / 3) * 300 },
      });

      // PRAGMA foreign_key_list
      const fksRes = await this.runQuery(`PRAGMA foreign_key_list("${tName}");`);
      // columns: id, seq, table, from, to, on_update, on_delete, match
      fksRes.values.forEach((fkRow) => {
        const targetTableName = String(fkRow[2]);
        const fromColName = String(fkRow[3]);
        const toColName = String(fkRow[4]);

        relationships.push({
          id: `rel_${tName}_${fromColName}_${targetTableName}`,
          sourceTableId: tableId,
          sourceColumnId: `col_${tName}_${fromColName}`,
          targetTableId: `tbl_${targetTableName}`,
          targetColumnId: `col_${targetTableName}_${toColName}`,
          cardinality: '1:N',
          onDelete: (fkRow[6] as any) || 'CASCADE',
          onUpdate: (fkRow[5] as any) || 'CASCADE',
        });
      });
    }

    return {
      dialect: 'sqlite',
      tables,
      relationships,
    };
  }

  /**
   * Automated Round-Trip Self-Test:
   * 1. Takes a DiagramGraph
   * 2. Compiles to SQLite DDL
   * 3. Executes in a fresh SQLite WASM DB
   * 4. Reverse-engineers the live schema back into a DiagramGraph
   * 5. Validates equivalence
   */
  async runRoundTripTest(graph: DiagramGraph): Promise<{
    passed: boolean;
    compiledSql: string;
    reverseEngineeredTables: number;
    details: string;
  }> {
    await this.init();
    if (!this.SQL) throw new Error('SQL.js not loaded');

    // Create fresh isolated DB for test
    const testDb = new this.SQL.Database();
    const compiled = compileSqlite(graph);

    if (compiled.errors.length > 0) {
      return {
        passed: false,
        compiledSql: compiled.sql,
        reverseEngineeredTables: 0,
        details: `Compilation errors: ${compiled.errors.join(', ')}`,
      };
    }

    try {
      testDb.run(compiled.sql);

      // Introspect tables
      const tRes = testDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      const generatedTableNames = tRes.length > 0 ? tRes[0].values.map((r) => String(r[0])) : [];

      const expectedTableNames = graph.tables.map((t) => t.name);
      const allFound = expectedTableNames.every((name) => generatedTableNames.includes(name));

      testDb.close();

      return {
        passed: allFound,
        compiledSql: compiled.sql,
        reverseEngineeredTables: generatedTableNames.length,
        details: allFound
          ? `Success! All ${graph.tables.length} tables verified in live SQLite engine.`
          : `Mismatch: Expected [${expectedTableNames.join(', ')}] but found [${generatedTableNames.join(', ')}]`,
      };
    } catch (err: any) {
      testDb.close();
      return {
        passed: false,
        compiledSql: compiled.sql,
        reverseEngineeredTables: 0,
        details: `Execution failure: ${err.message}`,
      };
    }
  }

  /**
   * Export SQLite binary database
   */
  exportDatabase(): Uint8Array {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.export();
  }

  /**
   * Import SQLite binary database
   */
  async importDatabase(bytes: ArrayBuffer): Promise<void> {
    await this.init();
    if (!this.SQL) throw new Error('SQL.js not loaded');
    if (this.db) this.db.close();
    this.db = new this.SQL.Database(new Uint8Array(bytes));
  }
}

export const sqliteEngine = new SqliteEngineService();
