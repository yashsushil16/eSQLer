import { DiagramGraph, Dialect, ValidationError } from '../types/schema';
import { compileSqlite } from './sqliteCompiler';
import { compilePostgres } from './postgresCompiler';
import { compileMysql } from './mysqlCompiler';
import { compileMongo } from './mongoCompiler';
import { validateDiagram } from './validator';

export interface CompilationResult {
  code: string;
  dialect: Dialect;
  errors: ValidationError[];
}

export function compileGraph(graph: DiagramGraph, overrideDialect?: Dialect): CompilationResult {
  const dialect = overrideDialect || graph.dialect || 'sqlite';
  const validationErrors = validateDiagram(graph);

  let code = '';
  let dialectErrors: string[] = [];

  switch (dialect) {
    case 'sqlite': {
      const res = compileSqlite(graph);
      code = res.sql;
      dialectErrors = res.errors;
      break;
    }
    case 'postgres': {
      const res = compilePostgres(graph);
      code = res.sql;
      dialectErrors = res.errors;
      break;
    }
    case 'mysql': {
      const res = compileMysql(graph);
      code = res.sql;
      dialectErrors = res.errors;
      break;
    }
    case 'mongodb': {
      const res = compileMongo(graph);
      code = res.code;
      dialectErrors = res.errors;
      break;
    }
  }

  // Merge dialect errors
  dialectErrors.forEach((err) => {
    if (!validationErrors.some((v) => v.message === err)) {
      validationErrors.push({ type: 'error', message: err });
    }
  });

  return {
    code,
    dialect,
    errors: validationErrors,
  };
}

export * from './validator';
export * from './toposort';
export * from './sqliteCompiler';
export * from './postgresCompiler';
export * from './mysqlCompiler';
export * from './mongoCompiler';
