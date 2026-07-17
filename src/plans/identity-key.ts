import { randomBytes } from 'crypto';
import { slugify } from '../common/utils/slug';

export function generatePlanIdentityKey(title: string): string {
  const slug = slugify(title).replace(/-/g, '_').toUpperCase().slice(0, 24);
  const suffix = randomBytes(3).toString('hex').toUpperCase();

  return `PLN-${slug}-${suffix}`;
}
