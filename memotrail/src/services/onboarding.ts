import { getDatabase } from "./database";

export const onboardingKey = "onboarding";
export interface IntroductionState { completed: boolean; step: number }
function decode(value?: string): IntroductionState {
  if (value) {
    try {
      const state = JSON.parse(value);
      if (state && typeof state.completed === "boolean") return { completed: state.completed, step: Number.isInteger(state.step) && state.step >= 0 && state.step < 5 ? state.step : 0 };
    } catch { /* An unreadable introduction preference never changes journal data. */ }
  }
  return { completed: false, step: 0 };
}
export async function readIntroduction(): Promise<IntroductionState> {
  const db = getDatabase();
  const result = await db.transaction("r", db.settings, db.memories, db.collections, db.timeCapsules, async () => {
    const state = decode((await db.settings.get(onboardingKey))?.value);
    if (state.completed) return { state, existing: false };
    const existing = !!(await db.memories.count() || await db.collections.count() || await db.timeCapsules.count());
    return { state: existing ? { completed: true, step: 0 } : state, existing };
  });
  if (result.existing) {
    // Existing journals must remain accessible even if storage is too full to
    // persist this housekeeping preference. Next launch will check data again.
    await db.settings.put({ key: onboardingKey, value: JSON.stringify(result.state) }).catch(() => undefined);
  }
  return result.state;
}
export async function saveIntroduction(state: IntroductionState) {
  if (!Number.isInteger(state.step) || state.step < 0 || state.step > 4) throw new Error("Choose a valid introduction page.");
  const db = getDatabase();
  await db.transaction("rw", db.settings, async () => {
    const current = decode((await db.settings.get(onboardingKey))?.value);
    // Progress from another tab must never undo a completed introduction.
    if (current.completed && !state.completed) return;
    await db.settings.put({ key: onboardingKey, value: JSON.stringify(state) });
  });
}
