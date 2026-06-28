import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await db.insert(schema.users).values({
    email: 'admin@farm.com',
    password: hashedPassword,
  });
  console.log('✅ Admin user created: admin@farm.com / admin123');
  process.exit(0);
}
seed().catch(err => {
  console.error(err);
  process.exit(1);
});
