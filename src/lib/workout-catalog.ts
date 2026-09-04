import type { TrainingExperience, TrainingLocation } from './body-analysis';
import type { ExerciseResponse } from './exercise-response-settings';
import { FAT_LOSS_CARDIO_BASELINE, HIGH_VOLUME_SET_THRESHOLD, RECOVERY_CHECK_SET_THRESHOLD, WEEKLY_SET_TARGET } from './training-progress.ts';
import type { CardioIntensity, Goal, LoadUnit, MuscleGroup, TrainingActivityType } from './types';

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

export type FoundationMovementPattern =
  | 'press'
  | 'knee_dominant'
  | 'vertical_pull'
  | 'hip_hinge'
  | 'horizontal_pull'
  | 'shoulder_accessory';

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
  /** Stable machine or isolation movement where an experienced user may safely test technical failure. */
  technicalFailureSuitable?: boolean;
  foundationPattern?: FoundationMovementPattern;
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

const FULL_BODY_VIDEO_URL = 'https://www.youtube.com/watch?v=n_YW24F5HGc';
const FULL_BODY_VIDEO_SOURCE = {
  kind: 'video' as const,
  title: 'The ONLY Workout You Need For 2026 (Do This 3x/Week)',
  url: FULL_BODY_VIDEO_URL,
  creator: 'Jeremy Ethier',
  publishedOn: '2026-01-06',
};

const MUSCLE_GAIN_VIDEO_URL = 'https://www.youtube.com/watch?v=ehQ_5TThkRI';
const MUSCLE_GAIN_VIDEO_SOURCE = {
  kind: 'video' as const,
  title: 'The Fastest Way to Gain 20 lbs Of Muscle (Naturally)',
  url: MUSCLE_GAIN_VIDEO_URL,
  creator: 'Jeremy Ethier',
  publishedOn: '2026-03-22',
};

const FAT_LOSS_FOUNDATION_SOURCE = {
  kind: 'study' as const,
  title: 'Physical Activity Guidelines for Americans, 2nd edition',
  url: 'https://health.gov/sites/default/files/2019-09/Physical_Activity_Guidelines_2nd_edition.pdf',
  publishedOn: '2018-11-12',
};

const HOME_RESISTANCE_SOURCE = {
  kind: 'study' as const,
  title: 'Home-based resistance training during dietary weight loss: randomized pilot trial',
  url: 'https://pubmed.ncbi.nlm.nih.gov/40760444/',
  publishedOn: '2025-08-04',
};

const AQUATIC_EXERCISE_SOURCE = {
  kind: 'study' as const,
  title: 'Aquatic exercise for lower-limb osteoarthritis in adults with overweight or obesity',
  url: 'https://pubmed.ncbi.nlm.nih.gov/42389754/',
  publishedOn: '2026-07-01',
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
    alternateWithIds: ['rope-triceps-pushdown', 'dumbbell-skull-crusher'],
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
      { ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 679 },
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
    foundationPattern: 'press',
    sources: [
      { ...VIDEO_SOURCE, timestampSeconds: 435 },
      { ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 41 },
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
    technicalFailureSuitable: true,
    rotationGroup: 'chest-specialization',
    alternateWithIds: ['flat-dumbbell-press', 'converging-machine-chest-press'],
    sources: [{ ...VIDEO_SOURCE, timestampSeconds: 445 }, SPECIALIZATION_VIDEO_SOURCE, { ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 714 }],
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
    technicalFailureSuitable: true,
    foundationPattern: 'shoulder_accessory',
    rotationGroup: 'shoulder-specialization',
    alternateWithIds: ['dumbbell-shoulder-press'],
    sources: [{ ...VIDEO_SOURCE, timestampSeconds: 569 }, SPECIALIZATION_VIDEO_SOURCE, { ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 535 }, { ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 595 }],
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
    foundationPattern: 'vertical_pull',
    rotationGroup: 'back-specialization',
    alternateWithIds: ['cable-row', 'lat-pulldown', 'chest-supported-machine-row'],
    sources: [{ ...VIDEO_SOURCE, timestampSeconds: 571 }, SPECIALIZATION_VIDEO_SOURCE, { ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 263 }],
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
    foundationPattern: 'vertical_pull',
    sources: [{ ...VIDEO_SOURCE, timestampSeconds: 571 }, { ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 263 }],
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
    foundationPattern: 'press',
    rotationGroup: 'chest-specialization',
    alternateWithIds: ['machine-chest-fly', 'converging-machine-chest-press'],
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
    foundationPattern: 'press',
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
    foundationPattern: 'horizontal_pull',
    rotationGroup: 'back-specialization',
    alternateWithIds: ['pull-up', 'lat-pulldown', 'chest-supported-machine-row'],
    sources: [SPECIALIZATION_VIDEO_SOURCE, { ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 457 }],
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
    technicalFailureSuitable: true,
    rotationGroup: 'biceps-specialization',
    alternateWithIds: ['preacher-curl', 'bayesian-cable-curl'],
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
    technicalFailureSuitable: true,
    rotationGroup: 'biceps-specialization',
    alternateWithIds: ['cable-curl', 'bayesian-cable-curl'],
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
    technicalFailureSuitable: true,
    rotationGroup: 'triceps-specialization',
    alternateWithIds: ['overhead-cable-triceps-extension', 'dumbbell-skull-crusher'],
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
    foundationPattern: 'hip_hinge',
    rotationGroup: 'glute-specialization',
    alternateWithIds: ['weighted-step-up'],
    sources: [SPECIALIZATION_VIDEO_SOURCE, { ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 627 }],
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
    foundationPattern: 'knee_dominant',
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
    technicalFailureSuitable: true,
    rotationGroup: 'quad-specialization',
    alternateWithIds: ['leg-press', 'hack-squat'],
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
    foundationPattern: 'knee_dominant',
    rotationGroup: 'quad-specialization',
    alternateWithIds: ['leg-extension', 'hack-squat'],
    sources: [SPECIALIZATION_VIDEO_SOURCE],
  },
  {
    id: 'goblet-squat',
    name: 'Goblet squat',
    activityType: 'strength',
    primaryMuscles: ['legs', 'glutes'],
    secondaryMuscles: ['abs', 'back'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbell', items: ['dumbbell'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '8–15', restSeconds: [90, 180], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15 before increasing the dumbbell; move to a barbell only when technique and equipment make that appropriate.',
    safety: ['Use a stance and depth that keep the feet planted and the knees and hips comfortable.', 'Keep the load close to the body and stop the set before torso position breaks down.'],
    avoidWhenLimitationMatches: ['back pain', 'knee', 'hip', 'ankle', 'balance'],
    foundationPattern: 'knee_dominant',
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 139 }],
  },
  {
    id: 'barbell-squat',
    name: 'Barbell squat',
    activityType: 'strength',
    primaryMuscles: ['legs', 'glutes'],
    secondaryMuscles: ['abs', 'back'],
    goals: ALL_GOALS,
    experience: ['intermediate', 'advanced'],
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Barbell and squat rack', items: ['barbell'] }],
    estimatedMinutes: 12,
    strength: { sets: 3, reps: '6–10', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Add controlled reps within the range before making the smallest practical barbell increase.',
    safety: ['Set rack safeties and use a load that can be controlled through a comfortable stance and depth.', 'Heel elevation or a box may be used as a setup variation, but neither guarantees isolated muscle growth.'],
    avoidWhenLimitationMatches: ['back pain', 'knee', 'hip', 'ankle', 'balance'],
    foundationPattern: 'knee_dominant',
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 139 }],
  },
  {
    id: 'inverted-row',
    name: 'Inverted row',
    activityType: 'strength',
    primaryMuscles: ['back'],
    secondaryMuscles: ['arms', 'shoulders', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Smith machine or secure low bar', items: ['machine'] }],
    estimatedMinutes: 9,
    strength: { sets: 3, reps: '6–15', restSeconds: [90, 180], repsInReserve: [1, 3] },
    progression: 'Add reps, then lower the bar or elevate the feet gradually while keeping the body controlled.',
    safety: ['Use only a bar or suspension point that is securely fixed and rated for body weight.', 'Keep the body braced and choose an angle that allows controlled shoulder movement.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist', 'grip', 'back pain'],
    foundationPattern: 'horizontal_pull',
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 263 }],
  },
  {
    id: 'dumbbell-romanian-deadlift',
    name: 'Dumbbell Romanian deadlift',
    activityType: 'strength',
    primaryMuscles: ['legs', 'glutes'],
    secondaryMuscles: ['back', 'abs', 'arms'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells', items: ['dumbbell'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '8–15', restSeconds: [90, 180], repsInReserve: [1, 3] },
    progression: 'Reach 15 controlled reps before increasing both dumbbells.',
    safety: ['Hinge the hips with a small comfortable knee bend and keep the dumbbells close.', 'End the descent when hamstring range or torso control reaches its limit rather than forcing extra depth.'],
    avoidWhenLimitationMatches: ['back pain', 'hip', 'hamstring', 'grip'],
    foundationPattern: 'hip_hinge',
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 349 }, { ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 639 }],
  },
  {
    id: 'barbell-romanian-deadlift',
    name: 'Barbell Romanian deadlift',
    activityType: 'strength',
    primaryMuscles: ['legs', 'glutes'],
    secondaryMuscles: ['back', 'abs', 'arms'],
    goals: ALL_GOALS,
    experience: ['intermediate', 'advanced'],
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Barbell', items: ['barbell'] }],
    estimatedMinutes: 12,
    strength: { sets: 3, reps: '6–10', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Reach 10 controlled reps before making the smallest practical barbell increase.',
    safety: ['Keep the bar close and use a controlled hip hinge rather than reaching for the floor.', 'Use straps only if appropriate and never let added load replace stable torso control.'],
    avoidWhenLimitationMatches: ['back pain', 'hip', 'hamstring', 'grip'],
    foundationPattern: 'hip_hinge',
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 349 }, { ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 639 }],
  },
  {
    id: 'prone-incline-rear-delt-raise',
    name: 'Prone incline rear-delt raise',
    activityType: 'strength',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['back', 'other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells and incline bench', items: ['dumbbell', 'bench'] }],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '10–20', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add smooth reps up to 20 before making a small load increase.',
    safety: ['Use a light load and raise through a comfortable shoulder range without swinging.', 'Pad the bench or choose another rear-shoulder movement if lying chest-down is uncomfortable.'],
    avoidWhenLimitationMatches: ['shoulder', 'chest injury'],
    technicalFailureSuitable: true,
    foundationPattern: 'shoulder_accessory',
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 535 }],
  },
  {
    id: 'dead-bug',
    name: 'Dead bug',
    activityType: 'strength',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'No equipment', items: [] }],
    estimatedMinutes: 6,
    strength: { sets: 3, reps: '5–10 each side', restSeconds: [45, 90], repsInReserve: [1, 3] },
    progression: 'Extend the arm and leg farther or add reps only while the trunk remains controlled.',
    safety: ['Use a range that lets the lower back remain comfortably controlled against the floor.', 'Shorten the lever or stop if the movement causes back or hip pain.'],
    avoidWhenLimitationMatches: ['back pain', 'hip'],
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 632 }],
  },
  {
    id: 'hip-abduction',
    name: 'Hip abduction',
    activityType: 'strength',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['legs', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [
      { label: 'Resistance band', items: ['band'] },
      { label: 'Hip abduction machine', items: ['machine'] },
      { label: 'Cable machine and ankle strap', items: ['cable machine'] },
    ],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '10–20', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 20 before increasing resistance.',
    safety: ['Keep the pelvis controlled and use a range that remains comfortable at the hip.', 'Avoid turning the movement into a torso swing to move more resistance.'],
    avoidWhenLimitationMatches: ['hip', 'pelvic'],
    technicalFailureSuitable: true,
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 647 }],
  },
  {
    id: 'standing-calf-raise',
    name: 'Standing calf raise',
    activityType: 'strength',
    primaryMuscles: ['legs'],
    secondaryMuscles: ['other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [
      { label: 'Dumbbells', items: ['dumbbell'] },
      { label: 'Standing calf machine', items: ['machine'] },
    ],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '8–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15 before increasing resistance.',
    safety: ['Use stable support when balance is uncertain and move through a controlled pain-free ankle range.', 'Increase range and load gradually if the Achilles tendon or calf is sensitive.'],
    avoidWhenLimitationMatches: ['ankle', 'achilles', 'calf injury', 'balance'],
    sources: [
      { ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 660 },
      { ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 645 },
      { kind: 'study', title: 'Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training', url: 'https://pubmed.ncbi.nlm.nih.gov/38156065/', publishedOn: '2023-12-20' },
    ],
  },
  {
    id: 'incline-dumbbell-curl',
    name: 'Incline dumbbell curl',
    activityType: 'strength',
    primaryMuscles: ['arms'],
    secondaryMuscles: ['other'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells and incline bench', items: ['dumbbell', 'bench'] }],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '8–12', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Reach 12 controlled reps before increasing both dumbbells.',
    safety: ['Let the upper arms remain supported by the bench angle and avoid forcing the shoulder behind a comfortable position.', 'Stop or shorten the range if the elbow or front of the shoulder is irritated.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist'],
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 679 }],
  },
  {
    id: 'incline-kelso-shrug',
    name: 'Incline Kelso shrug',
    activityType: 'strength',
    primaryMuscles: ['back', 'shoulders'],
    secondaryMuscles: ['arms'],
    goals: ALL_GOALS,
    experience: ['intermediate', 'advanced'],
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells and incline bench', items: ['dumbbell', 'bench'] }],
    estimatedMinutes: 7,
    strength: { sets: 3, reps: '8–12', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Reach 12 controlled repetitions before making a small load increase.',
    safety: ['Keep the arms straight and move the shoulder blades without jerking the dumbbells.', 'Use a comfortable bench angle and avoid forcing the neck or shoulders into a painful range.'],
    avoidWhenLimitationMatches: ['shoulder', 'neck', 'grip'],
    sources: [{ ...FULL_BODY_VIDEO_SOURCE, timestampSeconds: 704 }],
  },
  {
    id: 'converging-machine-chest-press',
    name: 'Converging machine chest press',
    activityType: 'strength',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['arms', 'shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Converging chest press machine', items: ['machine'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '6–12', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Reach 12 controlled reps across the working sets before using the smallest available load increase.',
    safety: ['Adjust the seat so the handles meet the chest at a comfortable height.', 'Use a pain-free pressing range and keep the shoulders supported against the pad.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist', 'pressing'],
    technicalFailureSuitable: true,
    foundationPattern: 'press',
    rotationGroup: 'chest-specialization',
    alternateWithIds: ['machine-chest-fly', 'flat-dumbbell-press'],
    sources: [{ ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 608 }],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat pulldown',
    activityType: 'strength',
    primaryMuscles: ['back'],
    secondaryMuscles: ['arms', 'shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Cable pulldown machine', items: ['cable machine'] }],
    estimatedMinutes: 9,
    strength: { sets: 3, reps: '8–15', restSeconds: [90, 180], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Use a shoulder-width or slightly narrower grip that remains comfortable.', 'Pull to the upper chest without leaning far back or forcing the shoulders behind the body.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist', 'grip'],
    foundationPattern: 'vertical_pull',
    rotationGroup: 'back-specialization',
    alternateWithIds: ['pull-up', 'cable-row', 'chest-supported-machine-row'],
    sources: [{ ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 614 }],
  },
  {
    id: 'chest-supported-machine-row',
    name: 'Chest-supported machine row',
    activityType: 'strength',
    primaryMuscles: ['back'],
    secondaryMuscles: ['shoulders', 'arms'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Chest-supported row machine', items: ['machine'] }],
    estimatedMinutes: 9,
    strength: { sets: 3, reps: '8–15', restSeconds: [90, 180], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15, then use the smallest available load increase.',
    safety: ['Adjust the pad so the chest remains comfortably supported throughout the row.', 'Use a grip and elbow path that do not irritate the shoulders, elbows, or wrists.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist', 'grip', 'chest injury'],
    technicalFailureSuitable: true,
    foundationPattern: 'horizontal_pull',
    rotationGroup: 'back-specialization',
    alternateWithIds: ['pull-up', 'cable-row', 'lat-pulldown'],
    sources: [{ ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 620 }],
  },
  {
    id: 'hack-squat',
    name: 'Hack squat',
    activityType: 'strength',
    primaryMuscles: ['legs'],
    secondaryMuscles: ['glutes', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Hack squat machine', items: ['machine'] }],
    estimatedMinutes: 10,
    strength: { sets: 3, reps: '8–15', restSeconds: [120, 180], repsInReserve: [1, 3] },
    progression: 'Reach 15 controlled reps across the working sets before using the smallest available load increase.',
    safety: ['Set the safeties and use foot placement and depth that keep the knees, hips, and back comfortable.', 'Keep the back supported and stop before pelvic or knee control is lost.'],
    avoidWhenLimitationMatches: ['back pain', 'knee', 'hip', 'ankle'],
    foundationPattern: 'knee_dominant',
    rotationGroup: 'quad-specialization',
    alternateWithIds: ['leg-extension', 'leg-press'],
    sources: [{ ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 632 }],
  },
  {
    id: 'bayesian-cable-curl',
    name: 'Bayesian cable curl',
    activityType: 'strength',
    primaryMuscles: ['arms'],
    secondaryMuscles: ['other'],
    goals: ALL_GOALS,
    experience: ['intermediate', 'advanced'],
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Cable machine and single handle', items: ['cable machine'] }],
    estimatedMinutes: 7,
    strength: { sets: 2, reps: '8–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15 before using the smallest available load increase.',
    safety: ['Start light and step forward only far enough to keep the shoulder and elbow comfortable.', 'Keep the upper arm controlled and avoid twisting the torso to finish repetitions.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist'],
    technicalFailureSuitable: true,
    rotationGroup: 'biceps-specialization',
    alternateWithIds: ['cable-curl', 'preacher-curl'],
    sources: [{ ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 602 }],
  },
  {
    id: 'dumbbell-skull-crusher',
    name: 'Dumbbell skull crusher',
    activityType: 'strength',
    primaryMuscles: ['arms'],
    secondaryMuscles: ['shoulders'],
    goals: ALL_GOALS,
    experience: ['intermediate', 'advanced'],
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Dumbbells and stable bench', items: ['dumbbell', 'bench'] }],
    estimatedMinutes: 7,
    strength: { sets: 2, reps: '8–15', restSeconds: [60, 120], repsInReserve: [1, 3] },
    progression: 'Add controlled reps up to 15 before increasing both dumbbells by the smallest practical amount.',
    safety: ['Begin with a light load and lower the dumbbells through a comfortable elbow and shoulder range.', 'Stop before control breaks down; do not prescribe failure with dumbbells positioned above the head.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'wrist'],
    rotationGroup: 'triceps-specialization',
    alternateWithIds: ['overhead-cable-triceps-extension', 'rope-triceps-pushdown'],
    sources: [{ ...MUSCLE_GAIN_VIDEO_SOURCE, timestampSeconds: 597 }],
  },
  {
    id: 'chair-sit-to-stand',
    name: 'Chair sit-to-stand',
    activityType: 'strength',
    primaryMuscles: ['legs', 'glutes'],
    secondaryMuscles: ['abs'],
    goals: ALL_GOALS,
    experience: ['beginner'],
    locations: ['home', 'both'],
    equipmentOptions: [{ label: 'Stable chair against a wall', items: [] }],
    estimatedMinutes: 6,
    strength: { sets: 2, reps: '6–12', restSeconds: [60, 90], repsInReserve: [2, 3] },
    progression: 'Add controlled reps, then use a slightly lower stable seat before adding external load.',
    safety: ['Use a stable chair against a wall.', 'Reduce the range or choose another movement if the knee or hip becomes painful.'],
    avoidWhenLimitationMatches: ['chair stand', 'knee pain', 'hip pain', 'balance'],
    foundationPattern: 'knee_dominant',
    sources: [FAT_LOSS_FOUNDATION_SOURCE, HOME_RESISTANCE_SOURCE],
  },
  {
    id: 'wall-push-up',
    name: 'Wall push-up',
    activityType: 'strength',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['arms', 'shoulders', 'abs'],
    goals: ALL_GOALS,
    experience: ['beginner'],
    locations: ['home', 'both'],
    equipmentOptions: [{ label: 'Secure wall', items: [] }],
    estimatedMinutes: 6,
    strength: { sets: 2, reps: '6–15', restSeconds: [60, 90], repsInReserve: [2, 3] },
    progression: 'Step farther from the wall, then move to a secure lower incline after reaching 15 clean reps.',
    safety: ['Keep a controlled body line and use a dry, secure surface.', 'Stop if the wrist or shoulder becomes painful.'],
    avoidWhenLimitationMatches: ['wrist', 'shoulder', 'pressing'],
    foundationPattern: 'press',
    sources: [FAT_LOSS_FOUNDATION_SOURCE, HOME_RESISTANCE_SOURCE],
  },
  {
    id: 'incline-push-up',
    name: 'Incline push-up',
    activityType: 'strength',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['arms', 'shoulders', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Secure raised surface', items: [] }],
    estimatedMinutes: 6,
    strength: { sets: 2, reps: '6–15', restSeconds: [60, 90], repsInReserve: [2, 3] },
    progression: 'Lower the secure incline gradually after reaching 15 controlled reps.',
    safety: ['Test that the surface cannot move or tip before starting.', 'Use the wall variation if wrist, shoulder, or trunk control is not ready.'],
    avoidWhenLimitationMatches: ['wrist', 'shoulder', 'pressing', 'balance'],
    foundationPattern: 'press',
    sources: [FAT_LOSS_FOUNDATION_SOURCE, HOME_RESISTANCE_SOURCE],
  },
  {
    id: 'glute-bridge',
    name: 'Glute bridge',
    activityType: 'strength',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['legs', 'abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Floor space or exercise mat', items: [] }],
    estimatedMinutes: 6,
    strength: { sets: 2, reps: '8–15', restSeconds: [60, 90], repsInReserve: [2, 3] },
    progression: 'Add a controlled pause at the top, then reps, before adding load.',
    safety: ['Finish by squeezing the glutes rather than forcing the lower back into extension.', 'Choose a standing alternative when floor transfers are unsuitable.'],
    avoidWhenLimitationMatches: ['floor transfer', 'cannot get on floor', 'back pain'],
    foundationPattern: 'hip_hinge',
    sources: [FAT_LOSS_FOUNDATION_SOURCE, HOME_RESISTANCE_SOURCE],
  },
  {
    id: 'supported-split-squat',
    name: 'Supported split squat',
    activityType: 'strength',
    primaryMuscles: ['legs', 'glutes'],
    secondaryMuscles: ['abs'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Stable hand support', items: [] }],
    estimatedMinutes: 7,
    strength: { sets: 2, reps: '5–10 each side', restSeconds: [60, 90], repsInReserve: [2, 3] },
    progression: 'Increase comfortable range, then reps, before adding load.',
    safety: ['Keep one hand on stable support.', 'Use sit-to-stands instead when balance or knee comfort is uncertain.'],
    avoidWhenLimitationMatches: ['balance', 'knee pain', 'hip pain', 'ankle'],
    foundationPattern: 'knee_dominant',
    sources: [FAT_LOSS_FOUNDATION_SOURCE, HOME_RESISTANCE_SOURCE],
  },
  {
    id: 'backpack-row',
    name: 'Backpack row',
    activityType: 'strength',
    primaryMuscles: ['back'],
    secondaryMuscles: ['arms', 'shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ['home', 'both'],
    equipmentOptions: [{ label: 'Securely packed backpack', items: ['backpack'] }],
    estimatedMinutes: 6,
    strength: { sets: 2, reps: '8–15', restSeconds: [60, 90], repsInReserve: [2, 3] },
    progression: 'Add reps before adding a small amount of securely packed load.',
    safety: ['Close every compartment and confirm the contents cannot shift.', 'Keep the trunk controlled and choose band support if the hinge position is uncomfortable.'],
    avoidWhenLimitationMatches: ['back pain', 'grip', 'balance'],
    foundationPattern: 'horizontal_pull',
    sources: [FAT_LOSS_FOUNDATION_SOURCE, HOME_RESISTANCE_SOURCE],
  },
  {
    id: 'resistance-band-row',
    name: 'Resistance-band row',
    activityType: 'strength',
    primaryMuscles: ['back'],
    secondaryMuscles: ['arms', 'shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Resistance band and exercise-rated anchor', items: ['band'] }],
    estimatedMinutes: 6,
    strength: { sets: 2, reps: '8–15', restSeconds: [60, 90], repsInReserve: [2, 3] },
    progression: 'Add controlled reps, then slower lowering, before using a stronger band.',
    safety: ['Use only an exercise-rated anchor and inspect the band before every session.', 'Do not improvise an attachment to a door or unstable object.'],
    avoidWhenLimitationMatches: ['shoulder', 'elbow', 'grip'],
    foundationPattern: 'horizontal_pull',
    sources: [FAT_LOSS_FOUNDATION_SOURCE, HOME_RESISTANCE_SOURCE],
  },
  {
    id: 'bird-dog',
    name: 'Bird dog',
    activityType: 'strength',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['glutes', 'shoulders'],
    goals: ALL_GOALS,
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Floor space or exercise mat', items: [] }],
    estimatedMinutes: 5,
    strength: { sets: 2, reps: '5–10 each side', restSeconds: [45, 75], repsInReserve: [2, 3] },
    progression: 'Reach farther or add a brief pause while preventing the trunk from rotating.',
    safety: ['Use a small range and keep the trunk still.', 'Choose another trunk exercise when kneeling or floor transfers are uncomfortable.'],
    avoidWhenLimitationMatches: ['wrist', 'knee', 'floor transfer', 'cannot get on floor', 'balance'],
    sources: [FAT_LOSS_FOUNDATION_SOURCE, HOME_RESISTANCE_SOURCE],
  },
  {
    id: 'comfortable-walk',
    name: 'Comfortable walk',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose', 'maintain'],
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Level, predictable walking route', items: [] }],
    estimatedMinutes: 10,
    cardio: { durationMinutes: [5, 20], intensity: 'moderate', calorieTarget: null },
    progression: 'Add time before pace, building toward a conversational brisk walk.',
    safety: ['Use a level, predictable surface when fitness or balance is limited.', 'Slow down or stop if pain changes your walking pattern.'],
    avoidWhenLimitationMatches: ['cannot walk', 'walking restriction', 'chest pain', 'faint', 'cardiac'],
    sources: [FAT_LOSS_FOUNDATION_SOURCE],
  },
  {
    id: 'brisk-walk',
    name: 'Brisk walk',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose', 'maintain'],
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Walking route or treadmill', items: [] }],
    estimatedMinutes: 20,
    cardio: { durationMinutes: [10, 30], intensity: 'moderate', calorieTarget: null },
    progression: 'Extend conversational walking time before adding a mild incline.',
    safety: ['Keep the pace conversational.', 'Do not force pace or incline when pain or gait changes appear.'],
    avoidWhenLimitationMatches: ['cannot walk', 'walking restriction', 'chest pain', 'faint', 'cardiac'],
    sources: [FAT_LOSS_FOUNDATION_SOURCE],
  },
  {
    id: 'indoor-low-impact-cardio',
    name: 'Indoor low-impact cardio',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose', 'maintain'],
    experience: ALL_LEVELS,
    locations: ['home', 'both'],
    equipmentOptions: [{ label: 'Clear indoor floor space', items: [] }],
    estimatedMinutes: 12,
    cardio: { durationMinutes: [5, 20], intensity: 'moderate', calorieTarget: null },
    progression: 'Add uninterrupted time before using larger or faster movements.',
    safety: ['Use stable footwear and clear the floor.', 'Choose simple marching without choreography when balance is limited.'],
    avoidWhenLimitationMatches: ['balance', 'knee pain', 'hip pain', 'ankle'],
    sources: [FAT_LOSS_FOUNDATION_SOURCE],
  },
  {
    id: 'stationary-cycling',
    name: 'Stationary cycling',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose', 'maintain'],
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Stationary bike', items: [] }],
    estimatedMinutes: 20,
    cardio: { durationMinutes: [10, 30], intensity: 'moderate', calorieTarget: null },
    progression: 'Add minutes before adding resistance while keeping a conversational effort.',
    safety: ['Adjust the seat and controls before starting.', 'Pain, numbness, or joint irritation should prompt a fit check or different modality.'],
    avoidWhenLimitationMatches: ['cycling restriction', 'chest pain', 'faint', 'cardiac'],
    sources: [FAT_LOSS_FOUNDATION_SOURCE],
  },
  {
    id: 'elliptical-cardio',
    name: 'Elliptical cardio',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose', 'maintain'],
    experience: ALL_LEVELS,
    locations: ['gym', 'both'],
    equipmentOptions: [{ label: 'Elliptical machine', items: [] }],
    estimatedMinutes: 20,
    cardio: { durationMinutes: [10, 30], intensity: 'moderate', calorieTarget: null },
    progression: 'Add minutes before resistance.',
    safety: ['Use the rails to mount and dismount.', 'Choose another modality when balance or machine familiarity is limited.'],
    avoidWhenLimitationMatches: ['balance', 'elliptical restriction', 'chest pain', 'faint', 'cardiac'],
    sources: [FAT_LOSS_FOUNDATION_SOURCE],
  },
  {
    id: 'swimming-water-walking',
    name: 'Swimming or water walking',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose', 'maintain'],
    experience: ALL_LEVELS,
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Pool access', items: [] }],
    estimatedMinutes: 20,
    cardio: { durationMinutes: [10, 30], intensity: 'moderate', calorieTarget: null },
    progression: 'Add pool time or continuous comfortable laps before pace.',
    safety: ['Use appropriate supervision and stay within your water competence.', 'Follow pool and clinician restrictions.'],
    avoidWhenLimitationMatches: ['cannot swim', 'water restriction', 'open wound', 'chest pain', 'faint', 'cardiac'],
    sources: [FAT_LOSS_FOUNDATION_SOURCE, AQUATIC_EXERCISE_SOURCE],
  },
  {
    id: 'low-impact-cardio-intervals',
    name: 'Low-impact cardio intervals',
    activityType: 'cardio',
    primaryMuscles: [],
    secondaryMuscles: [],
    goals: ['lose'],
    experience: ['intermediate', 'advanced'],
    locations: ALL_LOCATIONS,
    equipmentOptions: [{ label: 'Familiar low-impact cardio modality', items: [] }],
    estimatedMinutes: 18,
    cardio: { durationMinutes: [15, 25], intensity: 'vigorous', calorieTarget: null },
    progression: 'After an easy warm-up, add rounds before intensity; keep every effort controlled rather than maximal.',
    safety: ['Use only after steady cardio is well tolerated.', 'Stop for chest pain, faintness, or severe or unusual breathlessness and seek medical evaluation.'],
    avoidWhenLimitationMatches: ['beginner', 'chest pain', 'faint', 'dizziness', 'cardiac', 'heart condition'],
    sources: [FAT_LOSS_FOUNDATION_SOURCE],
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
    rotationGroup: 'conditioning',
    alternateWithIds: ['vigorous-cardio-intervals'],
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
    rotationGroup: 'conditioning',
    alternateWithIds: ['moderate-steady-cardio'],
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
  /** User feedback from completed or dismissed recommendations. */
  exerciseResponses?: Partial<Record<string, ExerciseResponse>>;
  /** Newest exercise first; used to rotate paired movements. */
  recentExerciseIds?: string[];
  /** User-selected muscle to favour without inferring it from photos or history. */
  priorityMuscle?: MuscleGroup | null;
  /** Strength muscles scheduled by the user's chosen routine for this session. */
  targetMuscles?: MuscleGroup[];
  /** Catalogue exercises surfaced by an optional Body Analysis check-in. */
  analysisExerciseIds?: string[];
  /** Explicit, temporary priority block. Never inferred or enabled for beginners. */
  specialization?: {
    muscle: MuscleGroup;
    baselineWeeklySets: number;
    weekOfBlock: number;
    additionalSetTarget?: 2 | 3 | 4;
  };
  sessionStyle?: 'balanced' | 'full_body';
  recentCardioEquivalentMinutes?: number;
  recentCardioSessions?: number;
  recentVigorousCardioSessions?: number;
  recentHardLegTraining?: boolean;
  /** Current staged target; 150 remains the long-term public-health baseline. */
  cardioTargetMinutes?: number;
  /** Current comfortable continuous duration, supplied explicitly by the user. */
  comfortableCardioMinutes?: number;
  activityBaseline?: 'inactive' | 'some' | 'active';
  preferredCardioIds?: string[];
  balanceConcern?: boolean;
  chairStandComfortable?: boolean;
  includeCardio?: boolean;
  limit?: number;
};

export type WorkoutRecommendation = {
  exercise: WorkoutCatalogItem;
  equipment: string;
  reason: string;
  loadGuidance: string;
  effortGuidance: string;
  estimatedMinutes: number;
  recommendedSets?: number;
  recommendedDurationMinutes?: number;
  cardioIntensity?: CardioIntensity;
  isTimeEfficient: boolean;
  isSpecialization: boolean;
};

const SPECIALIZATION_MAX_WEEKS = 6;
export const MAX_RECOMMENDED_SETS_PER_MUSCLE_SESSION = 10;

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

const EXPLICIT_MOVEMENT_AVOIDANCES = [
  { notePattern: /\b(?:deadlift|deadlifts|rdl|rdls)\b/i, itemPattern: /\bdeadlift\b/i },
] as const;

function limitationBlocks(item: WorkoutCatalogItem, limitations: string[]): boolean {
  const note = limitations.join(' ').toLowerCase();
  if (item.avoidWhenLimitationMatches.some((term) => note.includes(term))) return true;
  return EXPLICIT_MOVEMENT_AVOIDANCES.some(({ notePattern, itemPattern }) => notePattern.test(note) && itemPattern.test(item.name));
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

function timeEfficientSets(item: WorkoutCatalogItem, availableMinutes: number): number | null {
  if (availableMinutes > 30 || item.activityType !== 'strength') return null;
  return Math.min(item.strength!.sets, item.foundationPattern ? 2 : 1);
}

function recommendationMinutes(item: WorkoutCatalogItem, recommendedSets: number | null): number {
  if (item.activityType !== 'strength' || recommendedSets == null) return item.estimatedMinutes;
  return Math.max(4, Math.ceil(item.estimatedMinutes * (recommendedSets / item.strength!.sets)));
}

function cardioSessionMinutes(
  item: WorkoutCatalogItem,
  input: WorkoutRecommendationInput,
  availableMinutes: number
): number | null {
  if (item.activityType !== 'cardio') return null;
  const [minimum, maximum] = item.cardio!.durationMinutes;
  if (input.goal !== 'lose') return Math.min(maximum, availableMinutes);
  const completed = Math.max(0, input.recentCardioEquivalentMinutes ?? 0);
  const target = Math.max(30, Math.min(FAT_LOSS_CARDIO_BASELINE, input.cardioTargetMinutes ?? FAT_LOSS_CARDIO_BASELINE));
  const remaining = Math.max(0, target - completed);
  if (remaining === 0) return null;
  const equivalentMultiplier = item.cardio!.intensity === 'vigorous' ? 2 : 1;
  const remainingActualMinutes = Math.ceil(remaining / equivalentMultiplier);
  const startingDuration = completed === 0 ? minimum : maximum;
  const completionProgress = (input.recentCardioSessions ?? 0) >= 2 ? 5 : 0;
  const toleranceCap = input.comfortableCardioMinutes == null
    ? maximum
    : Math.max(5, Math.min(maximum, Math.round(input.comfortableCardioMinutes) + completionProgress));
  const sessionCap = input.sessionStyle === 'full_body'
    ? Math.max(5, Math.floor(availableMinutes / 2))
    : availableMinutes;
  return Math.max(1, Math.min(startingDuration, maximum, toleranceCap, sessionCap, remainingActualMinutes));
}

function effortGuidance(item: WorkoutCatalogItem, input: WorkoutRecommendationInput, isTimeEfficient: boolean): string {
  if (item.activityType !== 'strength') return item.progression;
  if (!isTimeEfficient) {
    return `Finish each set with ${item.strength!.repsInReserve[0]}–${item.strength!.repsInReserve[1]} controlled reps in reserve.`;
  }
  if (input.experience === 'beginner') {
    return 'Keep 1–2 clean reps in reserve while you build repeatable technique.';
  }
  if (item.technicalFailureSuitable) {
    return 'Final set: go to technical failure—stop when another clean rep is not possible.';
  }
  return 'Work close to failure, but stop with 1–2 clean reps in reserve; do not fail under the load.';
}

function specializationSets(item: WorkoutCatalogItem, input: WorkoutRecommendationInput): number | null {
  const block = input.specialization;
  if (!block || input.experience === 'beginner' || block.weekOfBlock < 1 || block.weekOfBlock > SPECIALIZATION_MAX_WEEKS) return null;
  if (item.activityType !== 'strength' || !item.primaryMuscles.includes(block.muscle)) return null;
  const additionalTarget = Math.max(2, Math.min(4, block.additionalSetTarget ?? 4));
  const recentSets = input.recentMuscleSets[block.muscle] ?? 0;
  if (recentSets >= RECOVERY_CHECK_SET_THRESHOLD) return null;
  const guardedWeeklyTarget = Math.min(
    RECOVERY_CHECK_SET_THRESHOLD,
    block.baselineWeeklySets + additionalTarget,
  );
  const remaining = guardedWeeklyTarget - recentSets;
  if (remaining < 2) return null;
  return Math.min(item.strength!.sets, 3, remaining);
}

function scoreItem(item: WorkoutCatalogItem, input: WorkoutRecommendationInput): number {
  let score = item.goals.includes(input.goal) ? 20 : 0;
  const attentionIndex = input.musclesNeedingAttention.findIndex((muscle) =>
    item.primaryMuscles.includes(muscle) && (input.recentMuscleSets[muscle] ?? 0) < WEEKLY_SET_TARGET
  );
  if (attentionIndex >= 0) score += Math.max(20, 55 - attentionIndex * 8);
  for (const muscle of item.primaryMuscles) {
    const recentSets = input.recentMuscleSets[muscle] ?? 0;
    score += Math.max(0, WEEKLY_SET_TARGET - recentSets);
    if (recentSets >= HIGH_VOLUME_SET_THRESHOLD) score -= 60;
    else if (recentSets >= RECOVERY_CHECK_SET_THRESHOLD) score -= 30;
  }
  if (item.activityType === 'cardio') {
    score += input.goal === 'lose' ? 42 : 5;
    // Steady conditioning is the default; intervals rotate in only for eligible,
    // experienced users instead of becoming the shortest-path recommendation.
    if (item.cardio?.intensity === 'moderate') score += 8;
    if (input.preferredCardioIds?.includes(item.id)) score += 60;
    if (input.activityBaseline === 'inactive' && item.id === 'comfortable-walk') score += 30;
    if (input.preferredCardioIds?.length && item.id === 'moderate-steady-cardio') score -= 20;
    if (!input.preferredCardioIds?.length && item.id === 'moderate-steady-cardio') score += 24;
  }
  if ((input.loadHistory?.[item.id]?.length ?? 0) > 0) score += 6;
  if (input.analysisExerciseIds?.includes(item.id)) score += 22;
  const response = input.exerciseResponses?.[item.id];
  if (response === 'comfortable') score += 24;
  if (response === 'uncomfortable') score -= 40;
  const mostRecentExerciseId = input.recentExerciseIds?.[0];
  if (mostRecentExerciseId === item.id) score -= 18;
  if (mostRecentExerciseId && item.alternateWithIds?.includes(mostRecentExerciseId)) score += 18;
  if (input.sessionStyle === 'full_body' && item.foundationPattern) {
    const recentPatterns = input.recentExerciseIds
      ?.slice(0, 3)
      .flatMap((id) => {
        const pattern = WORKOUT_CATALOG.find((exercise) => exercise.id === id)?.foundationPattern;
        return pattern ? [pattern] : [];
      }) ?? [];
    score += recentPatterns.includes(item.foundationPattern) ? -14 : 14;
  }
  if (
    input.priorityMuscle
    && item.primaryMuscles.includes(input.priorityMuscle)
    && (input.experience !== 'beginner' || (input.recentMuscleSets[input.priorityMuscle] ?? 0) < WEEKLY_SET_TARGET)
  ) score += 36;
  if (specializationSets(item, input) != null) score += 80;
  return score;
}

function setupPreferenceScore(item: WorkoutCatalogItem, option: EquipmentOption, input: WorkoutRecommendationInput): number {
  if (item.activityType !== 'strength') return 0;
  const usesSelectedEquipment = option.items.length > 0;
  const usesStableGymEquipment = option.items.some((equipment) => equipment === 'machine' || equipment === 'cable machine' || equipment === 'assisted pull-up machine');
  let score = 0;
  if (input.location === 'gym') score += usesSelectedEquipment ? 12 : -6;
  if (input.experience === 'advanced') {
    score += usesSelectedEquipment ? 10 : -4;
    if (!item.experience.includes('beginner')) score += 14;
  } else if (input.experience === 'intermediate') {
    if (usesSelectedEquipment) score += 6;
    if (!item.experience.includes('beginner')) score += 8;
  } else if (usesStableGymEquipment) score += 10;
  return score;
}

function fullBodyPatternTarget(availableMinutes: number): number {
  if (availableMinutes < 25) return 2;
  if (availableMinutes < 40) return 3;
  if (availableMinutes < 50) return 4;
  if (availableMinutes < 60) return 5;
  return 6;
}

export function recommendWorkout(input: WorkoutRecommendationInput): WorkoutRecommendation[] {
  const availableMinutes = Math.max(5, Math.min(180, Math.round(input.availableMinutes)));
  const foundationTarget = input.sessionStyle === 'full_body' ? fullBodyPatternTarget(availableMinutes) : 0;
  const limit = Math.max(1, Math.min(8, Math.round(input.limit ?? (foundationTarget || 3))));
  const equipment = normalizedEquipment(input.equipment);
  const limitations = [
    ...(input.limitations ?? []),
    ...(input.balanceConcern ? ['balance'] : []),
  ];
  const ranked = WORKOUT_CATALOG
    .flatMap((exercise) => {
      const option = matchingEquipment(exercise, equipment);
      if (!option || !exercise.goals.includes(input.goal) || !exercise.experience.includes(input.experience)) return [];
      if (!exercise.locations.includes(input.location) || limitationBlocks(exercise, limitations)) return [];
      if (exercise.id === 'chair-sit-to-stand' && input.chairStandComfortable === false) return [];
      if (input.exerciseResponses?.[exercise.id] === 'unsuitable') return [];
      if (exercise.activityType === 'cardio' && !input.includeCardio) return [];
      if (exercise.activityType === 'strength' && input.targetMuscles?.length && !exercise.primaryMuscles.some((muscle) => input.targetMuscles!.includes(muscle))) return [];
      if (exercise.cardio?.intensity === 'vigorous' && ((input.recentVigorousCardioSessions ?? 0) >= 2 || input.recentHardLegTraining)) return [];
      const prescribedSpecializationSets = specializationSets(exercise, input);
      const efficientSets = prescribedSpecializationSets == null ? timeEfficientSets(exercise, availableMinutes) : null;
      const recommendedSets = prescribedSpecializationSets ?? efficientSets;
      const recommendedDurationMinutes = cardioSessionMinutes(exercise, input, availableMinutes);
      if (exercise.activityType === 'cardio' && recommendedDurationMinutes == null) return [];
      return [{
        exercise,
        option,
        score: scoreItem(exercise, input) + setupPreferenceScore(exercise, option, input),
        prescribedSpecializationSets,
        recommendedSets,
        recommendedDurationMinutes,
        isTimeEfficient: efficientSets != null,
        estimatedMinutes: recommendedDurationMinutes ?? recommendationMinutes(exercise, recommendedSets),
      }];
    })
    .sort((a, b) => b.score - a.score || a.estimatedMinutes - b.estimatedMinutes || a.exercise.name.localeCompare(b.exercise.name));
  const reservedCardio = input.goal === 'lose' && input.includeCardio
    ? ranked.find((candidate) => candidate.exercise.activityType === 'cardio') ?? null
    : null;
  const strengthLimit = reservedCardio ? Math.max(0, limit - 1) : limit;
  const strengthMinuteBudget = reservedCardio
    ? Math.max(0, availableMinutes - reservedCardio.estimatedMinutes)
    : availableMinutes;

  const recommendations: WorkoutRecommendation[] = [];
  const selectedIds = new Set<string>();
  const usedPrimaryMuscles = new Set<MuscleGroup>();
  const usedFoundationPatterns = new Set<FoundationMovementPattern>();
  const plannedMuscleSets: Partial<Record<MuscleGroup, number>> = {};
  let usedMinutes = 0;
  let cardioSelected = false;

  function addCandidate(
    candidate: (typeof ranked)[number],
    enforceFoundationPattern: boolean,
    maxRecommendations = limit,
    maxMinutes = availableMinutes
  ): boolean {
    if (recommendations.length >= maxRecommendations || selectedIds.has(candidate.exercise.id)) return false;
    if (usedMinutes + candidate.estimatedMinutes > maxMinutes) return false;
    if (candidate.exercise.activityType === 'cardio' && cardioSelected) return false;
    const candidateSets = candidate.exercise.activityType === 'strength'
      ? candidate.recommendedSets ?? candidate.exercise.strength!.sets
      : 0;
    if (candidate.exercise.primaryMuscles.some((muscle) =>
      (plannedMuscleSets[muscle] ?? 0) + candidateSets > MAX_RECOMMENDED_SETS_PER_MUSCLE_SESSION
    )) return false;
    if (enforceFoundationPattern) {
      if (!candidate.exercise.foundationPattern || usedFoundationPatterns.has(candidate.exercise.foundationPattern)) return false;
    } else if (input.sessionStyle === 'full_body' && candidate.exercise.foundationPattern) {
      return false;
    } else if (input.sessionStyle !== 'full_body' && !input.targetMuscles?.length && candidate.exercise.primaryMuscles.some((muscle) => usedPrimaryMuscles.has(muscle))) {
      return false;
    }
    const attention = candidate.exercise.primaryMuscles.find((muscle) => input.musclesNeedingAttention.includes(muscle));
    const prescribedSpecializationSets = candidate.prescribedSpecializationSets;
    const recommendedSets = candidate.recommendedSets;
    const response = input.exerciseResponses?.[candidate.exercise.id];
    const reason = prescribedSpecializationSets != null
      ? `Adds ${prescribedSpecializationSets} controlled priority sets for your temporary ${input.specialization!.muscle} block without exceeding its weekly increase cap.`
      : candidate.exercise.activityType === 'cardio'
      ? input.goal === 'lose'
        ? `Adds ${candidate.recommendedDurationMinutes! * (candidate.exercise.cardio!.intensity === 'vigorous' ? 2 : 1)} moderate-equivalent minutes toward your ${Math.max(30, Math.min(FAT_LOSS_CARDIO_BASELINE, input.cardioTargetMinutes ?? FAT_LOSS_CARDIO_BASELINE))}-minute staged target.`
        : `${candidate.exercise.cardio!.intensity === 'vigorous' ? 'Vigorous' : 'Moderate'} conditioning supports fitness without adding muscle-score points until completed.`
      : input.priorityMuscle && candidate.exercise.primaryMuscles.includes(input.priorityMuscle)
        ? `Prioritises your chosen ${input.priorityMuscle} focus while keeping the rest of your training balanced.`
      : input.targetMuscles?.length
        ? 'Fits the next session in your chosen routine while respecting recent training, recovery, and available equipment.'
      : candidate.isTimeEfficient
        ? `Uses ${recommendedSets} focused working set${recommendedSets === 1 ? '' : 's'} to cover ${attention ?? candidate.exercise.foundationPattern?.replaceAll('_', ' ') ?? 'a priority muscle'} within your short session.`
      : response === 'comfortable'
        ? 'Favours an exercise you marked comfortable while it continues to fit your goal, setup, recovery, and recent training.'
      : input.sessionStyle === 'full_body' && candidate.exercise.foundationPattern
        ? `Covers your ${candidate.exercise.foundationPattern.replaceAll('_', ' ')} pattern while fitting today’s full-body time budget.`
      : attention
        ? `Prioritises ${attention}, one of your least-trained muscle groups over the last seven days.`
        : `Matches your ${input.goal === 'gain' ? 'muscle-gain' : input.goal === 'lose' ? 'fat-loss support' : 'maintenance'} goal and available setup.`;
    recommendations.push({
      exercise: candidate.exercise,
      equipment: candidate.option.label,
      reason,
      loadGuidance: loadGuidance(candidate.exercise, input.loadHistory?.[candidate.exercise.id] ?? []),
      effortGuidance: effortGuidance(candidate.exercise, input, candidate.isTimeEfficient),
      estimatedMinutes: candidate.estimatedMinutes,
      ...(recommendedSets != null ? { recommendedSets } : {}),
      ...(candidate.recommendedDurationMinutes != null ? { recommendedDurationMinutes: candidate.recommendedDurationMinutes } : {}),
      ...(candidate.exercise.cardio ? { cardioIntensity: candidate.exercise.cardio.intensity } : {}),
      isTimeEfficient: candidate.isTimeEfficient,
      isSpecialization: prescribedSpecializationSets != null,
    });
    selectedIds.add(candidate.exercise.id);
    candidate.exercise.primaryMuscles.forEach((muscle) => {
      usedPrimaryMuscles.add(muscle);
      plannedMuscleSets[muscle] = (plannedMuscleSets[muscle] ?? 0) + candidateSets;
    });
    if (candidate.exercise.foundationPattern) usedFoundationPatterns.add(candidate.exercise.foundationPattern);
    cardioSelected ||= candidate.exercise.activityType === 'cardio';
    usedMinutes += candidate.estimatedMinutes;
    return true;
  }

  if (input.sessionStyle === 'full_body') {
    for (const candidate of ranked) {
      if (usedFoundationPatterns.size >= Math.min(foundationTarget, strengthLimit)) break;
      addCandidate(candidate, true, strengthLimit, strengthMinuteBudget);
    }
  } else if (reservedCardio) {
    for (const candidate of ranked) {
      if (candidate.exercise.activityType === 'cardio') continue;
      if (recommendations.length >= strengthLimit) break;
      addCandidate(candidate, false, strengthLimit, strengthMinuteBudget);
    }
  }
  if (reservedCardio) addCandidate(reservedCardio, false);
  for (const candidate of ranked) {
    if (recommendations.length >= limit) break;
    addCandidate(candidate, false);
  }
  return recommendations;
}
