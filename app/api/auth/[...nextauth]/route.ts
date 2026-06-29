import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Email/Password',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "farmer@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("AUTHORIZE CALLED WITH:", credentials?.email);
        if (!credentials?.email || !credentials?.password) return null;
        
        const cleanEmail = credentials.email.toLowerCase().trim();
        const user = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        
        console.log("DB USER FOUND:", user.length > 0);
        if (user.length === 0) return null;
        
        const isPasswordValid = await bcrypt.compare(credentials.password, user[0].password);
        console.log("PASSWORD VALID:", isPasswordValid);
        if (!isPasswordValid) return null;
        
        return { id: user[0].id.toString(), email: user[0].email };
      }
    })
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
