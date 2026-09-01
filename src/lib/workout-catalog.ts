import type { TrainingExperience, TrainingLocation } from './body-analysis';
import type { Goal, LoadUnit, MuscleGroup, TrainingActivityType } from './types';

export type WorkoutSourceReference = {
  kind: 'video' | 'study';
  title: string;
  url: string;
  creator?: string;
  publishedOn?: string;
  timestampSeconds?: number;
};

export type EquipmentOption = {
  label: string;
  /** Every item in one option must be available. An empty option needs no equipment. */
  items: string[];
};

export type StrengthPrescription = {
  sets: number;
  reps: string;
  restSeconds: [number, number];
  repsInReserve: [number, number];
};

export type CardioPrescription = {
  durationMinutes: [number, number];
  intensity: 'moderate' | 'vigorous';
  calorieTarget: null;
};

export type WorkoutCatalogItem = {
  id: string;
  name: string;
  activityType: TrainingActivityType;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  goals: Goal[];
  experience: TrainingExperience[];
  locations: TrainingLocation[];
  equipmentOptions: EquipmentOption[];
  estimatedMinutes: number;
  strength?: StrengthPrescription;
  cardio?: CardioPrescription;
  progression: string;
  safety: string[];
  avoidWhenLimitationMatches: string[];
  /** Exercises in the same group are alternated instead of repeated by default. */
  rotationGroup?: string;
  alternateWithIds?: string[];
  sources: WorkoutSourceReference[];
};

const VIDEO_URL = 'https://www.youtube.com/watch?v=rbfRHab777Q';
const VIDEO_SOURCE = {
  kind: 'video' as const,
  title: 'How to Lose Every Type Of Stubborn Fat',
  url: VIDEO_URL,
  creator: 'Jeremy Ethier',
  publishedOn: '2026-08-30',
};

const SPECIALIZATION_VIDEO_URL = 'https://www.youtube.com/watch?v=4OP8FI1TXK8';
const SPECIALIZATION_VIDEO_SOURCE = {
  kind: 'video' as const,
  title: 'It’s Dumb, But It Builds Muscle Almost 4x Faster',
  url: SPECIALIZATION_VIDEO_URL,
  creator: 'Jeremy Ethier',
  publishedOn: '2026-07-26',
  timestampSeconds: 775,
};

const ALL_LEVELS: TrainingExperience[] = ['beginner', 'intermediate', 'advanced'];
const ALL_LOCATIONS: TrainingLocation[] = ['home', 'gym', 'both'];
const ALL_GOALS: Goal[] = ['lose', 'maintain', 'gain'];

export const WORKOUT_CATALOG: WorkoutCatalogItem[] = [
  {
    id: 'overhead-cable-triceps-extension',
    name: 'Overhead cable triceps extension',
    activityType: 'strength',
    primaryMuscles: ['arms'],
    secondaryMuscles: ['shoulders', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Cable machine and rope', items: ['cable machine'] }],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '8–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Use a pain-free overhead position and keep the upper arms controlled.', 'Choose another triceps movement if the shoulder or elbow is irritated.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'overhead'],
    rotationGroup: 'triceps-specialization',
    alternateWithIds: ['rope-triceps-pushdown'],
    sources: [
      { ...VIDEO_SOURCE, timestampSeconds: 411 },
      SPECIALIZATION_VIDEO_SOURCE,
      { kind: 'study', title: 'Triceps brachii hypertrophy after overhead versus neutral elbow extension training', url: 'https://doi.org/10.1080/17461391.2022.2100279', publishedOn: '2022-08-11' },
    ],
  },
  {
    id: 'overhead-dumbbell-triceps-extension',
    name: 'Overhead dumbbell triceps extension',
    activityType: 'strength',
    primaryMuscles: ['arms'],
    secondaryMuscles: ['shoulders', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbell', items: ['dumbbell'] }],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '8–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Start light and use only a comfortable shoulder and elbow range.', 'Keep the ribs controlled rather than leaning back to move the load.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'overhead'],
    sources: [
      { ...VIDEO_SOURCE, timestampSeconds: 411 },
      { kind: 'study', title: 'Triceps brachii hypertrophy after overhead versus neutral elbow extension training', url: 'https://doi.org/10.1080/17461391.2022.2100279', publishedOn: '2022-08-11' },
    ],
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline dumbbell press',
    activityType: 'strength',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'arms'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells and incline bench', items: ['dumbbell', 'bench'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '6–12', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Reach 12 controlled reps across the working sets before increasing both dumbbells.',
    safety: ['Use a stable bench and a load that can be set up and lowered safely.', 'Stop or change the angle if pressing causes shoulder pain.'],
    avoidWhenLimitationMatches: ['shoulder', 'wrist', 'pressing'],
    sources: [
      { ...VIDEO_SOURCE, timestampSeconds: 435 },
      { kind: 'study', title: 'Effects of horizontal and incline bench press on neuromuscular adaptations', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7449336/', publishedOn: '2020-09-09' },
    ],
  },
  {
    id: 'machine-chest-fly',
    name: 'Machine chest fly',
    activityType: 'strength',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Chest fly machine', items: ['machine'] }],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '10–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add reps without shortening the range, then use the smallest available load increase.',
    safety: ['Adjust the seat so the handles align comfortably with the chest.', 'Avoid forcing a deep stretch that irritates the front of the shoulder.'],
    avoidWhenLimitationMatches: ['shoulder', 'chest injury'],
    rotationGroup: 'chest-specialization',
    alternateWithIds: ['flat-dumbbell-press'],
    sources: [{ ...VIDEO_SOURCE, timestampSeconds: 445 }, SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'lateral-raise',
    name: 'Lateral raise',
    activityType: 'strength',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [
      { label: 'Dumbbells', items: ['dumbbell'] },
      { label: 'Resistance band', items: ['band'] },
      { label: 'Cable machine', items: ['cable machine'] },
      { label: 'Lateral raise machine', items: ['machine'] },
    ],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '10–20', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add smooth reps up to 20 before making a small load increase.',
    safety: ['Use a controllable load without swinging or shrugging to finish repetitions.', 'Work within a comfortable shoulder range.'],
    avoidWhenLimitationMatches: ['shoulder'],
    rotationGroup: 'shoulder-specialization',
    alternateWithIds: ['dumbbell-shoulder-press'],
    sources: [{ ...VIDEO_SOURCE, timestampSeconds: 569 }, SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    activityType: 'strength',
    primaryMuscles: ['back'],
    secondaryMuscles: ['arms', 'shoulders'],
    goals: ALL_GOALS,
    experience: ['intermediate', 'advanced'],
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Pull-up bar', items: ['pull-up bar'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '5–10', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Add reps up to 10, then add a small external load while keeping full control.',
    safety: ['Begin each rep from a controlled shoulder position rather than dropping into the bottom.', 'Use an assisted variation if clean repetitions are not yet available.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist', 'grip'],
    rotationGroup: 'back-specialization',
    alternateWithIds: ['cable-row'],
    sources: [{ ...VIDEO_SOURCE, timestampSeconds: 571 }, SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'assisted-pull-up',
    name: 'Assisted pull-up',
    activityType: 'strength',
    primaryMuscles: ['back'],
    secondaryMuscles: ['arms', 'shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [
      { label: 'Pull-up bar and resistance band', items: ['pull-up bar', 'band'] },
      { label: 'Assisted pull-up machine', items: ['assisted pull-up machine'] },
    ],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '6–12', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Add reps first, then gradually reduce the assistance.',
    safety: ['Secure bands carefully and use a stable entry and exit.', 'Keep the movement controlled through a comfortable shoulder range.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist', 'grip'],
    sources: [{ ...VIDEO_SOURCE, timestampSeconds: 571 }],
  },
  {
    id: 'flat-dumbbell-press',
    name: 'Flat dumbbell press',
    activityType: 'strength',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['arms', 'shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells and flat bench', items: ['dumbbell', 'bench'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '6–12', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Reach 12 controlled reps across the working sets before increasing both dumbbells.',
    safety: ['Use a stable bench and a load that can be set up and lowered safely.', 'Keep wrists stacked and use a pain-free shoulder range.'],
    avoidWhenLimitationMatches: ['shoulder', 'wrist', 'pressing'],
    rotationGroup: 'chest-specialization',
    alternateWithIds: ['machine-chest-fly'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell shoulder press',
    activityType: 'strength',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['arms', 'chest', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells', items: ['dumbbell'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '6–12', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Reach 12 controlled reps across the working sets before increasing both dumbbells.',
    safety: ['Use a pain-free overhead range and avoid leaning back to finish repetitions.', 'Choose a non-overhead shoulder movement when overhead work irritates the shoulder.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist', 'overhead'],
    rotationGroup: 'shoulder-specialization',
    alternateWithIds: ['lateral-raise'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'cable-row',
    name: 'Cable row',
    activityType: 'strength',
    primaryMuscles: ['back'],
    secondaryMuscles: ['arms', 'shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Cable machine and row handle', items: ['cable machine'] }],
    estimatedMinutes: 9,
    strength: { sets: 3, reps: '8–15', restSeconds: [90, 180], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Keep the torso controlled instead of turning each repetition into a lower-back swing.', 'Use a grip and range that remain comfortable for the shoulders and elbows.'],
    avoidWhenLimitationMatches: ['back pain', 'shoulder', 'elbow', 'grip'],
    rotationGroup: 'back-specialization',
    alternateWithIds: ['pull-up'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'cable-curl',
    name: 'Cable curl',
    activityType: 'strength',
    primaryMuscles: ['arms'],
    secondaryMuscles: ['other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Cable machine and curl handle', items: ['cable machine'] }],
    estimatedMinutes: 7,
    strength: { sets: 2, reps: '8–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Keep the upper arms controlled and avoid using the lower back to move the load.', 'Reduce the range or change the handle if the elbow or wrist is irritated.'],
    avoidWhenLimitationMatches: ['elbow', 'wrist'],
    rotationGroup: 'biceps-specialization',
    alternateWithIds: ['preacher-curl'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'preacher-curl',
    name: 'Preacher curl',
    activityType: 'strength',
    primaryMuscles: ['arms'],
    secondaryMuscles: ['other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Preacher curl machine', items: ['machine'] }],
    estimatedMinutes: 7,
    strength: { sets: 2, reps: '8–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Align the seat and pad so the upper arms stay supported.', 'Do not force the elbow into an uncomfortable fully extended position.'],
    avoidWhenLimitationMatches: ['elbow', 'wrist'],
    rotationGroup: 'biceps-specialization',
    alternateWithIds: ['cable-curl'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'rope-triceps-pushdown',
    name: 'Rope triceps pushdown',
    activityType: 'strength',
    primaryMuscles: ['arms'],
    secondaryMuscles: ['shoulders', 'other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Cable machine and rope', items: ['cable machine'] }],
    estimatedMinutes: 7,
    strength: { sets: 2, reps: '8–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Keep the upper arms controlled and avoid leaning body weight into the cable.', 'Use a comfortable wrist position and stop if elbow pain develops.'],
    avoidWhenLimitationMatches: ['elbow', 'wrist'],
    rotationGroup: 'triceps-specialization',
    alternateWithIds: ['overhead-cable-triceps-extension'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'hip-thrust',
    name: 'Hip thrust',
    activityType: 'strength',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['legs', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [
      { label: 'Dumbbell and stable bench', items: ['dumbbell', 'bench'] },
      { label: 'Hip thrust machine', items: ['machine'] },
    ],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '8–15', restSeconds: [90, 180], repsInReserve: [1, 3] },
    progression: 'Reach 15 controlled reps across the working sets before increasing the load.',
    safety: ['Use a stable bench or machine and secure the load before starting.', 'Finish with the hips rather than forcing the lower back into extension.'],
    avoidWhenLimitationMatches: ['back pain', 'hip', 'pelvic'],
    rotationGroup: 'glute-specialization',
    alternateWithIds: ['weighted-step-up'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'weighted-step-up',
    name: 'Weighted step-up',
    activityType: 'strength',
    primaryMuscles: ['glutes', 'legs'],
    secondaryMuscles: ['abs', 'other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells and stable step', items: ['dumbbell', 'bench'] }],
    estimatedMinutes: 10,
    strength: { sets: 2, reps: '6–12 each leg', restSeconds: [90, 180], repsInReserve: [1, 3] },
    progression: 'Add controlled reps on both legs before increasing the dumbbells.',
    safety: ['Begin with a low, stable step and master balance before adding load.', 'Keep the whole working foot supported and use a pain-free knee and hip range.'],
    avoidWhenLimitationMatches: ['knee', 'hip', 'ankle', 'balance'],
    rotationGroup: 'glute-specialization',
    alternateWithIds: ['hip-thrust'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'leg-extension',
    name: 'Leg extension',
    activityType: 'strength',
    primaryMuscles: ['legs'],
    secondaryMuscles: [],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Leg extension machine', items: ['machine'] }],
    estimatedMinutes: 7,
    strength: { sets: 2, reps: '10–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Align the machine pivot with the knee and keep the pad comfortably above the ankle.', 'Reduce the load or range if the movement causes knee pain.'],
    avoidWhenLimitationMatches: ['knee'],
    rotationGroup: 'quad-specialization',
    alternateWithIds: ['leg-press'],
    sources: [{ ...SPECIALIZATION_VIDEO_SOURCE, timestampSeconds: 364 }, SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'leg-press',
    name: 'Leg press',
    activityType: 'strength',
    primaryMuscles: ['legs'],
    secondaryMuscles: ['glutes'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Leg press machine', items: ['machine'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '8–15', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Reach 15 controlled reps across the working sets before increasing the load.',
    safety: ['Use a depth that keeps the pelvis and lower back controlled against the pad.', 'Keep the feet planted and use a pain-free knee and hip range.'],
    avoidWhenLimitationMatches: ['back pain', 'knee', 'hip'],
    rotationGroup: 'quad-specialization',
    alternateWithIds: ['leg-extension'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'moderate-steady-cardio',
    name: 'Moderate steady cardio',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose', 'maintain'],
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Walking or an available cardio modality', items: [] }],
    estimatedMinutes: 20,
    cardio: { durationMinutes: [15, 30], intensity: 'moderate', calorieTarget: null },
    progression: 'Start at 15 minutes and add a few minutes when recovery remains comfortable.',
    safety: ['Choose a low-impact modality when joints are sensitive.', 'Stop for chest pain, faintness, or unusual breathlessness and seek medical guidance.'],
    avoidWhenLimitationMatches: ['chest pain', 'faint', 'dizziness', 'cardiac', 'heart condition'],
    sources: [
      { ...VIDEO_SOURCE, timestampSeconds: 160 },
      { kind: 'study', title: 'Effects of exercise types on visceral adipose tissue: network meta-analysis of 84 randomized trials', url: 'https://doi.org/10.1111/obr.13666', publishedOn: '2023-11-30' },
    ],
  },
  {
    id: 'vigorous-cardio-intervals',
    name: 'Vigorous cardio intervals',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose'],
    experience: ['intermediate', 'advanced'],
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Running, cycling, or another familiar cardio modality', items: [] }],
    estimatedMinutes: 18,
    cardio: { durationMinutes: [15, 20], intensity: 'vigorous', calorieTarget: null },
    progression: 'Begin with short controlled efforts and increase work duration gradually, no more than once or twice weekly.',
    safety: ['Do not begin with all-out efforts.', 'Use a familiar modality and allow recovery between hard efforts.', 'Stop for chest pain, faintness, or unusual breathlessness and seek medical guidance.'],
    avoidWhenLimitationMatches: ['beginner', 'chest pain', 'faint', 'dizziness', 'cardiac', 'heart condition', 'knee', 'hip', 'ankle', 'balance'],
    sources: [
      { ...VIDEO_SOURCE, timestampSeconds: 168 },
      { kind: 'study', title: 'Effects of exercise types on visceral adipose tissue: network meta-analysis of 84 randomized trials', url: 'https://doi.org/10.1111/obr.13666', publishedOn: '2023-11-30' },
    ],
  },
];

export type TrainingLoadSnapshot = {
  loadValue: number;
  loadUnit: LoadUnit;
  recordedAt: number;
};

export type WorkoutRecommendationInput = {
  goal: Goal;
  experience: TrainingExperience;
  location: TrainingLocation;
  equipment: string[];
  availableMinutes: number;
  recentMuscleSets: Partial<Record<MuscleGroup, number>>;
  musclesNeedingAttention: MuscleGroup[];
  limitations?: string[];
  loadHistory?: Partial<Record<string, TrainingLoadSnapshot[]>>;
  /** Newest exercise first; used to rotate paired movements. */
  recentExerciseIds?: string[];
  /** Explicit, temporary priority block. Never inferred or enabled for beginners. */
  specialization?: {
    muscle: MuscleGroup;
    baselineWeeklySets: number;
    weekOfBlock: number;
    additionalSetTarget?: 2 | 3 | 4;
  };
  includeCardio?: boolean;
  limit?: number;
};

export type WorkoutRecommendation = {
  exercise: WorkoutCatalogItem;
  equipment: string;
  reason: string;
  loadGuidance: string;
  recommendedSets?: number;
  isSpecialization: boolean;
};

const SPECIALIZATION_MAX_WEEKS = 6;

export function workoutCatalogIdForName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  return WORKOUT_CATALOG.find((item) => item.name.toLowerCase() === normalized)?.id ?? null;
}

function normalizedEquipment(values: string[]): Set<string> {
  const available = new Set(values.map((value) => value.toLowerCase().trim()));
  if (available.has('dumbbells')) available.add('dumbbell');
  if (available.has('bands')) available.add('band');
  if (available.has('machines')) {
    available.add('machine');
    available.add('cable machine');
    available.add('assisted pull-up machine');
  }
  if (available.has('pull up bar')) available.add('pull-up bar');
  return available;
}

function matchingEquipment(item: WorkoutCatalogItem, available: Set<string>): EquipmentOption | null {
  return item.equipmentOptions.find((option) => option.items.every((required) => available.has(required))) ?? null;
}

function limitationBlocks(item: WorkoutCatalogItem, limitations: string[]): boolean {
  const note = limitations.join(' ').toLowerCase();
  return item.avoidWhenLimitationMatches.some((term) => note.includes(term));
}

function loadGuidance(item: WorkoutCatalogItem, history: TrainingLoadSnapshot[]): string {
  const ordered = [...history].sort((a, b) => b.recordedAt - a.recordedAt);
  const latest = ordered[0];
  if (!latest) return item.activityType === 'strength' ? `Choose a load that leaves ${item.strength!.repsInReserve[0]}–${item.strength!.repsInReserve[1]} controlled reps in reserve.` : item.progression;
  const previous = ordered[1];
  const direction = previous && previous.loadUnit === latest.loadUnit && latest.loadValue > previous.loadValue
    ? ' after your recent increase'
    : '';
  return `Use your tracked ${latest.loadValue} ${latest.loadUnit}${direction}; increase only after reaching the top of the rep range with control.`;
}

function specializationSets(item: WorkoutCatalogItem, input: WorkoutRecommendationInput): number | null {
  const block = input.specialization;
  if (!block || input.experience === 'beginner' || block.weekOfBlock < 1 || block.weekOfBlock > SPECIALIZATION_MAX_WEEKS) return null;
  if (item.activityType !== 'strength' || !item.primaryMuscles.includes(block.muscle)) return null;
  const additionalTarget = Math.max(2, Math.min(4, block.additionalSetTarget ?? 4));
  const recentSets = input.recentMuscleSets[block.muscle] ?? 0;
  const remaining = block.baselineWeeklySets + additionalTarget - recentSets;
  if (remaining < 2) return null;
  return Math.min(item.strength!.sets, 3, remaining);
}

function scoreItem(item: WorkoutCatalogItem, input: WorkoutRecommendationInput): number {
  let score = item.goals.includes(input.goal) ? 20 : 0;
  const attentionIndex = input.musclesNeedingAttention.findIndex((muscle) => item.primaryMuscles.includes(muscle));
  if (attentionIndex >= 0) score += Math.max(20, 55 - attentionIndex * 8);
  for (const muscle of item.primaryMuscles) score += Math.max(0, 12 - (input.recentMuscleSets[muscle] ?? 0));
  if (item.activityType === 'cardio') score += input.goal === 'lose' ? 42 : 5;
  if ((input.loadHistory?.[item.id]?.length ?? 0) > 0) score += 6;
  const mostRecentExerciseId = input.recentExerciseIds?.[0];
  if (mostRecentExerciseId === item.id) score -= 18;
  if (mostRecentExerciseId && item.alternateWithIds?.includes(mostRecentExerciseId)) score += 18;
  if (specializationSets(item, input) != null) score += 80;
  return score;
}

export function recommendWorkout(input: WorkoutRecommendationInput): WorkoutRecommendation[] {
  const availableMinutes = Math.max(5, Math.min(180, Math.round(input.availableMinutes)));
  const limit = Math.max(1, Math.min(6, Math.round(input.limit ?? 3)));
  const equipment = normalizedEquipment(input.equipment);
  const limitations = input.limitations ?? [];
  const ranked = WORKOUT_CATALOG
    .flatMap((exercise) => {
      const option = matchingEquipment(exercise, equipment);
      if (!option || !exercise.goals.includes(input.goal) || !exercise.experience.includes(input.experience)) return [];
      if (!exercise.locations.includes(input.location) || limitationBlocks(exercise, limitations)) return [];
      if (exercise.activityType === 'cardio' && !input.includeCardio) return [];
      return [{ exercise, option, score: scoreItem(exercise, input) }];
    })
    .sort((a, b) => b.score - a.score || a.exercise.estimatedMinutes - b.exercise.estimatedMinutes || a.exercise.name.localeCompare(b.exercise.name));

  const recommendations: WorkoutRecommendation[] = [];
  const usedPrimaryMuscles = new Set<MuscleGroup>();
  let usedMinutes = 0;
  let cardioSelected = false;
  for (const candidate of ranked) {
    if (recommendations.length >= limit) break;
    if (usedMinutes + candidate.exercise.estimatedMinutes > availableMinutes) continue;
    if (candidate.exercise.activityType === 'cardio' && cardioSelected) continue;
    if (candidate.exercise.primaryMuscles.some((muscle) => usedPrimaryMuscles.has(muscle))) continue;
    const attention = candidate.exercise.primaryMuscles.find((muscle) => input.musclesNeedingAttention.includes(muscle));
    const prescribedSpecializationSets = specializationSets(candidate.exercise, input);
    const reason = prescribedSpecializationSets != null
      ? `Adds ${prescribedSpecializationSets} controlled priority sets for your temporary ${input.specialization!.muscle} block without exceeding its weekly increase cap.`
      : candidate.exercise.activityType === 'cardio'
      ? `${candidate.exercise.cardio!.intensity === 'vigorous' ? 'Vigorous' : 'Moderate'} conditioning supports your ${input.goal === 'lose' ? 'fat-loss' : 'fitness'} goal without adding muscle-score points until completed.`
      : attention
        ? `Prioritises ${attention}, one of your least-trained muscle groups over the last seven days.`
        : `Matches your ${input.goal === 'gain' ? 'muscle-gain' : input.goal === 'lose' ? 'fat-loss support' : 'maintenance'} goal and available setup.`;
    recommendations.push({
      exercise: candidate.exercise,
      equipment: candidate.option.label,
      reason,
      loadGuidance: loadGuidance(candidate.exercise, input.loadHistory?.[candidate.exercise.id] ?? []),
      ...(prescribedSpecializationSets != null ? { recommendedSets: prescribedSpecializationSets } : {}),
      isSpecialization: prescribedSpecializationSets != null,
    });
    candidate.exercise.primaryMuscles.forEach((muscle) => usedPrimaryMuscles.add(muscle));
    cardioSelected ||= candidate.exercise.activityType === 'cardio';
    usedMinutes += candidate.exercise.estimatedMinutes;
  }
  return recommendations;
}
