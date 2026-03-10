let caseCounter = 0;

export function generateCaseNumber(): string {
  caseCounter++;
  const year = new Date().getFullYear();
  const num = caseCounter.toString().padStart(4, '0');
  return `CS-${year}-${num}`;
}
