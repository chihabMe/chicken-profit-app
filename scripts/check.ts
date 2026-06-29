import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function check() {
  const allUsers = await db.select().from(schema.users);
  console.log("Users in DB:", allUsers.map(u => ({ email: u.email, pass: u.password })));
  
  if (allUsers.length > 0) {
     const isValid = await bcrypt.compare('admin123', allUsers[0].password);
     console.log("Password check for admin123 against first user:", isValid);
  }
}
check().catch(console.error);
