// Defaults in code, so Railway needs no variables. Only PORT comes from the platform.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const dataDir = fs.existsSync('/data') ? '/data' : path.join(here, 'data');
export const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'bakery.db');
export const DEMO = (process.env.DEMO ?? '1') === '1';
export const PORT = Number(process.env.PORT) || 3000;
