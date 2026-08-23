import { readFile } from "node:fs/promises";
import pgsql from "pgsql-parser";

const sql = await readFile(new URL("../supabase/migrations/202608230001_initial.sql", import.meta.url), "utf8");
await pgsql.parse(sql);
process.stdout.write("PostgreSQL migration syntax parsed successfully.\n");

