/**
 * Load Next.js-style env files for standalone Node scripts (worker, tsx tools).
 * Import this module before any code that reads process.env at module load time.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

const root = process.cwd();
loadEnv({ path: resolve(root, ".env.local") });
loadEnv({ path: resolve(root, ".env") });
