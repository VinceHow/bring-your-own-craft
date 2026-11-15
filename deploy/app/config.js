// Defaults in code, so Railway needs no variables. Only PORT (and the volume's mount path) come from the platform.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
// Railway sets RAILWAY_VOLUME_MOUNT_PATH when a volume is attached; follow it wherever it is mounted.
export const VOLUME_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || (fs.existsSync('/data') ? '/data' : null);
const dataDir = VOLUME_DIR || path.join(here, 'data');
export const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'bakery.db');
export const DEMO = (process.env.DEMO ?? '1') === '1';
export const PORT = Number(process.env.PORT) || 3000;
