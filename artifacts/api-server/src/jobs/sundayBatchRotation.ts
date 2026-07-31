/**
 * Legacy Ignite 3-week pipeline scheduler.
 *
 * Ignite V2 no longer maintains:
 *   1 active + 2 upcoming batches automatically.
 *
 * This compatibility stub intentionally performs no work.
 * Future weekly lifecycle is controlled by the Ignite V2
 * Draft -> Deploy -> Start workflow.
 */

export async function runSundayBatchRotation(): Promise<void> {
  console.log("[Ignite V2] Legacy Sunday batch rotation disabled");
}

export function scheduleSundayBatchRotation(): void {
  console.log("[Ignite V2] Legacy Sunday batch rotation scheduler disabled");
}
