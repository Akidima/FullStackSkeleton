import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
  allowExitOnIdle: true,
  keepAlive: true
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

export const db = drizzle({ client: pool, schema });

// Add connection test function
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// Only export pool once
export default pool;