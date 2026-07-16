export interface EnvironmentVariables {
  port: number;
  betterAuthSecret?: string;
  betterAuthUrl?: string;
  databaseUrl?: string;
}

export default (): EnvironmentVariables => ({
  port: parseInt(process.env.PORT || '3002', 10),
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  databaseUrl: process.env.DATABASE_URL,
});
