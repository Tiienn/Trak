import type { DailyMission } from './missions';

/** Short labels for the five-column summary; full targets remain in the details. */
export function compactMissionProgress(mission: DailyMission): string {
  if (mission.complete) return 'Done';
  if (mission.key === 'calories' && mission.current >= mission.target) return 'Log meals';
  if (mission.key === 'protein' || mission.key === 'calories') {
    return `${Math.min(99, Math.max(0, Math.floor((mission.current / Math.max(1, mission.target)) * 100)))}%`;
  }
  return `${Math.min(mission.current, mission.target)}/${mission.target}`;
}

export function missionDetail(mission: DailyMission): string {
  if (mission.complete) return 'Complete';
  if (mission.key === 'calories' && mission.current >= mission.target) {
    return 'Fuel target reached · log 3 meals to complete';
  }
  return mission.detail;
}
