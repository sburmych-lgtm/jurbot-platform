import type { CaseCategory, Urgency } from '../enums.js';

export function getLeadScore(category: CaseCategory, urgency: Urgency, hasDescription: boolean): 'HOT' | 'WARM' | 'COLD' {
  let score = 0;
  if (urgency === 'URGENT') score += 3;
  else if (urgency === 'WEEK') score += 2;
  else score += 1;
  if (['CRIMINAL', 'FAMILY', 'LABOR'].includes(category)) score += 2;
  else if (['COMMERCIAL', 'REALESTATE'].includes(category)) score += 1;
  if (hasDescription) score += 1;
  if (score >= 5) return 'HOT';
  if (score >= 3) return 'WARM';
  return 'COLD';
}
