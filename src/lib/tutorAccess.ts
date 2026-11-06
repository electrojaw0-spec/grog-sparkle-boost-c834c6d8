export function tutorNeedsPayment(ready: boolean, hasAccess: boolean, freeUsed: number) {
  return ready && !hasAccess && freeUsed >= 7;
}