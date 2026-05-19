interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
  openSince: number;
}

export interface CircuitStatus {
  isOpen: boolean;
  failures: number;
  cooldownRemaining: number;
}

const breakers = new Map<string, CircuitBreakerState>();

const THRESHOLD = 3;       // Consecutive failures before opening
const COOLDOWN_MS = 30000; // 30 seconds before half-open

export function recordFailure(providerId: string): void {
  const state = breakers.get(providerId) || { failures: 0, lastFailureTime: 0, isOpen: false, openSince: 0 };
  state.failures++;
  state.lastFailureTime = Date.now();
  if (state.failures >= THRESHOLD && !state.isOpen) {
    state.isOpen = true;
    state.openSince = Date.now();
    console.log(`[CC Switch] Circuit breaker OPEN for provider ${providerId}`);
  }
  breakers.set(providerId, state);
}

export function recordSuccess(providerId: string): void {
  const state = breakers.get(providerId);
  if (state) {
    if (state.isOpen) {
      console.log(`[CC Switch] Circuit breaker CLOSED for provider ${providerId}`);
    }
    breakers.delete(providerId); // Reset on success
  }
}

export function isCircuitOpen(providerId: string): boolean {
  const state = breakers.get(providerId);
  if (!state || !state.isOpen) return false;
  // Check cooldown — auto-recover after COOLDOWN_MS
  if (Date.now() - state.openSince > COOLDOWN_MS) {
    console.log(`[CC Switch] Circuit breaker HALF-OPEN for provider ${providerId}`);
    state.isOpen = false;
    return false;
  }
  return true;
}

export function getCircuitStatus(providerId: string): CircuitStatus {
  const state = breakers.get(providerId);
  if (!state) return { isOpen: false, failures: 0, cooldownRemaining: 0 };
  const effectiveOpen = state.isOpen && (Date.now() - state.openSince <= COOLDOWN_MS);
  const cooldownRemaining = effectiveOpen ? Math.max(0, COOLDOWN_MS - (Date.now() - state.openSince)) : 0;
  return { isOpen: effectiveOpen, failures: state.failures, cooldownRemaining };
}

export function getAllCircuitStatuses(): Record<string, CircuitStatus> {
  const result: Record<string, CircuitStatus> = {};
  for (const providerId of breakers.keys()) {
    result[providerId] = getCircuitStatus(providerId);
  }
  return result;
}
