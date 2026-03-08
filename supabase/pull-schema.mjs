/**
 * Pulls the current public schema from the remote Supabase database
 * and writes it to supabase/migrations/ as the initial migration.
 *
 * Usage: node supabase/pull-schema.mjs
 *
 * Requires: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE env vars
 * or falls back to the Supabase project connection details.
 */

import pg from 'pg';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  host: process.env.PGHOST || 'db.ortymjemcfsjcmfxdjnu.supabase.co',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || process.argv[2],
  database: process.env.PGDATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function query(sql) {
  const res = await client.query(sql);
  return res.rows;
}

async function main() {
  if (!client.password && !process.env.PGPASSWORD) {
    console.error('Usage: node supabase/pull-schema.mjs <db-password>');
    console.error('Or set PGPASSWORD env var');
    process.exit(1);
  }

  await client.connect();
  console.log('Connected to remote database.');

  const lines = [];
  const push = (s = '') => lines.push(s);

  // ---- ENUMS ----
  push('-- Enums');
  const enums = await query(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname;
  `);
  for (const e of enums) {
    // pg may return labels as a string '{a,b}' instead of array
    const labels = Array.isArray(e.labels) ? e.labels : e.labels.replace(/^\{|\}$/g, '').split(',');
    const vals = labels.map(l => `'${l.trim()}'`).join(', ');
    push(`CREATE TYPE ${e.typname} AS ENUM (${vals});`);
  }
  push();

  // ---- TABLES ----
  push('-- Tables');
  const tables = await query(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  for (const t of tables) {
    const tname = t.table_name;
    // skip supabase internal
    if (tname === 'supabase_migrations' || tname.startsWith('_')) continue;

    const cols = await query(`
      SELECT
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS full_type,
        t.typname AS udt_name,
        CASE WHEN t.typtype = 'e' THEN 'USER-DEFINED'
             WHEN t.typname = '_text' THEN 'ARRAY'
             WHEN t.typname LIKE '_%' AND t2.typtype IS NOT NULL THEN 'ARRAY'
             ELSE t.typname END AS data_type,
        pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
        CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_type t ON a.atttypid = t.oid
      LEFT JOIN pg_type t2 ON t.typelem = t2.oid AND t.typelem <> 0
      LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
      WHERE n.nspname = 'public' AND c.relname = '${tname}'
        AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum;
    `);

    // Primary key columns
    const pkCols = await query(`
      SELECT a.attname AS column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      JOIN pg_class c ON i.indrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = '${tname}' AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum);
    `);
    const pkSet = new Set(pkCols.map(r => r.column_name));

    // Unique constraints (non-PK)
    const uniques = await query(`
      SELECT con.conname AS constraint_name,
        array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum)) AS cols
      FROM pg_constraint con
      JOIN pg_class c ON con.conrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
      WHERE n.nspname = 'public' AND c.relname = '${tname}' AND con.contype = 'u'
      GROUP BY con.conname;
    `);

    // Foreign keys
    const fks = await query(`
      SELECT
        a.attname AS column_name,
        cf.relname AS foreign_table,
        af.attname AS foreign_column,
        con.confdeltype AS delete_rule_code
      FROM pg_constraint con
      JOIN pg_class c ON con.conrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = con.conkey[1]
      JOIN pg_class cf ON con.confrelid = cf.oid
      JOIN pg_attribute af ON af.attrelid = cf.oid AND af.attnum = con.confkey[1]
      WHERE n.nspname = 'public' AND c.relname = '${tname}' AND con.contype = 'f';
    `);
    const fkMap = {};
    for (const fk of fks) {
      fk.delete_rule = fk.delete_rule_code === 'c' ? 'CASCADE' : fk.delete_rule_code === 'n' ? 'SET NULL' : 'NO ACTION';
      fkMap[fk.column_name] = fk;
    }

    // Check constraints
    const checks = await query(`
      SELECT pg_get_constraintdef(con.oid) AS check_clause, con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class c ON con.conrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = '${tname}' AND con.contype = 'c';
    `);

    push(`CREATE TABLE ${tname} (`);
    const colDefs = [];

    for (const c of cols) {
      let type = c.full_type; // use pg's own format_type output
      let def = `  ${c.column_name} ${type}`;

      if (pkSet.has(c.column_name)) def += ' PRIMARY KEY';
      if (c.column_default) {
        let d = c.column_default;
        // Clean up default
        d = d.replace(/::[\w\s\[\]]+$/, '');
        def += ` DEFAULT ${d}`;
      }
      if (c.is_nullable === 'NO' && !pkSet.has(c.column_name)) def += ' NOT NULL';

      // Inline unique for single-column
      const singleUniq = uniques.find(u => {
        const ucols = Array.isArray(u.cols) ? u.cols : u.cols.replace(/^\{|\}$/g, '').split(',');
        return ucols.length === 1 && ucols[0] === c.column_name;
      });
      if (singleUniq) def += ' UNIQUE';

      // Foreign key
      const fk = fkMap[c.column_name];
      if (fk) {
        def += ` REFERENCES ${fk.foreign_table}(${fk.foreign_column})`;
        if (fk.delete_rule === 'CASCADE') def += ' ON DELETE CASCADE';
      }

      colDefs.push(def);
    }

    // Multi-column unique constraints
    for (const u of uniques) {
      const ucols = Array.isArray(u.cols) ? u.cols : u.cols.replace(/^\{|\}$/g, '').split(',');
      if (ucols.length > 1) {
        colDefs.push(`  UNIQUE(${ucols.join(', ')})`);
      }
    }

    // Check constraints (only non-trivial ones)
    for (const ck of checks) {
      const clause = ck.check_clause;
      // pg_get_constraintdef already includes "CHECK (...)"
      if (!clause.includes('IS NOT NULL') || clause.includes('AND') || clause.includes('OR')) {
        colDefs.push(`  ${clause}`);
      }
    }

    push(colDefs.join(',\n'));
    push(');');
    push();
  }

  // ---- INDEXES ----
  push('-- Indexes');
  const indexes = await query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      AND indexname NOT LIKE 'pg_%'
    ORDER BY indexname;
  `);
  for (const idx of indexes) {
    // Skip unique constraint indexes already handled
    push(`${idx.indexdef};`);
  }
  push();

  // ---- FUNCTIONS ----
  push('-- Functions');
  const funcs = await query(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS funcdef
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname;
  `);
  for (const f of funcs) {
    push(f.funcdef + ';');
    push();
  }

  // ---- TRIGGERS ----
  push('-- Triggers');
  const triggers = await query(`
    SELECT
      tg.tgname AS trigger_name,
      cl.relname AS table_name,
      pg_get_triggerdef(tg.oid) AS triggerdef
    FROM pg_trigger tg
    JOIN pg_class cl ON tg.tgrelid = cl.oid
    JOIN pg_namespace n ON cl.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND NOT tg.tgisinternal
    ORDER BY cl.relname, tg.tgname;
  `);
  for (const tr of triggers) {
    push(`${tr.triggerdef};`);
  }
  push();

  const schema = lines.join('\n');
  const outPath = join(__dirname, 'migrations', '20260308000000_remote_schema.sql');
  writeFileSync(outPath, `-- Pulled from remote Supabase database on ${new Date().toISOString()}\n-- Project: ortymjemcfsjcmfxdjnu (Bellariti)\n\n${schema}`);
  console.log(`Schema written to: ${outPath}`);
  console.log(`  ${enums.length} enums, ${tables.length} tables, ${indexes.length} indexes, ${funcs.length} functions, ${triggers.length} triggers`);

  await client.end();
}

function mapType(col) {
  const { udt_name, data_type, character_maximum_length } = col;

  // Arrays
  if (data_type === 'ARRAY') return udt_name.replace(/^_/, '') + '[]';

  // User-defined (enums, etc)
  if (data_type === 'USER-DEFINED') return udt_name;

  // Common mappings
  switch (udt_name) {
    case 'uuid': return 'UUID';
    case 'text': return 'TEXT';
    case 'int4': return 'INTEGER';
    case 'int8': return 'BIGINT';
    case 'bool': return 'BOOLEAN';
    case 'numeric': return 'DECIMAL';
    case 'float8': return 'DOUBLE PRECISION';
    case 'timestamptz': return 'TIMESTAMPTZ';
    case 'timestamp': return 'TIMESTAMP';
    case 'date': return 'DATE';
    case 'jsonb': return 'JSONB';
    case 'json': return 'JSON';
    case 'varchar':
      return character_maximum_length ? `VARCHAR(${character_maximum_length})` : 'TEXT';
    default: return udt_name.toUpperCase();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
