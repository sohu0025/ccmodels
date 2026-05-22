import { checkBudgetThreshold, markBudgetNotified } from '../database/budget-alerts';
import { showNotification } from '../tray';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startBudgetChecking(): void {
  stopBudgetChecking();

  // Check every 15 minutes
  intervalHandle = setInterval(() => {
    runBudgetCheck();
  }, 15 * 60 * 1000);

  // Run immediately on start
  runBudgetCheck();
}

export function stopBudgetChecking(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

function runBudgetCheck(): void {
  const result = checkBudgetThreshold();
  if (result) {
    showNotification('CC Models — Budget Alert', result.message);
    markBudgetNotified();
  }
}
