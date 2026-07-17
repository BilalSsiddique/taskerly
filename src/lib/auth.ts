import 'dotenv/config';
import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const FRONTEND_URL_PORT = process.env.FRONTEND_URL_PORT;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  url: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: `http://localhost:${FRONTEND_URL_PORT}/app`,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    process.env.FRONTEND_URL || `http://localhost:${FRONTEND_URL_PORT}`,
    `http://localhost:${FRONTEND_URL_PORT}`,
    `http://127.0.0.1:${FRONTEND_URL_PORT}`,
  ],
  secret: process.env.BETTER_AUTH_SECRET,
});
