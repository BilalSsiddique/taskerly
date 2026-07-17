import { UnauthorizedException } from '@nestjs/common';

export type AuthSession = {
  user?: {
    id?: string;
  };
};

export function getSessionUserId(
  session: AuthSession | null | undefined,
): string {
  const userId = session?.user?.id;

  if (!userId) {
    throw new UnauthorizedException('Authenticated session is required');
  }

  return userId;
}
