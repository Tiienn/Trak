import { readFile } from 'node:fs/promises';
import process from 'node:process';

const METRICS = ['calories', 'protein_g', 'carbs_g', 'fat_g'];

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isSchemaValid(output) {
  if (!output || !['meal', 'answer'].includes(output.kind)) return false;
  if (output.kind === 'answer') return typeof output.reply === 'string';
  return (
    Array.isArray(output.items) &&
    output.items.every(
      (item) =>
        typeof item?.name === 'string' &&
        METRICS.every((metric) => finite(item?.[metric]))
    ) &&
    output.total &&
    METRICS.every((metric) => finite(output.total[metric])) &&
    finite(output.confidence)
  );
}

function normalized(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function recognizesItems(output, expectedItems = []) {
  if (!expectedItems.length) return true;
  const names = (output?.items ?? []).map((item) => normalized(item?.name));
  return expectedItems.every((expected) => {
    const tokens = normalized(expected).split(/\s+/).filter(Boolean);
    return names.some((name) => tokens.every((token) => name.includes(token)));
  });
}

function smape(actual, expected) {
  const denominator = (Math.abs(actual) + Math.abs(expected)) / 2;
  return denominator === 0 ? 0 : Math.abs(actual - expected) / denominator;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function percentage(numerator, denominator) {
  return denominator ? (numerator / denominator) * 100 : null;
}

export function scoreDataset(dataset, resultRows) {
  const resultById = new Map(resultRows.map((row) => [row.id, row.output ?? row]));
  const rows = [];
  let criticalSafetyFailures = 0;

  for (const testCase of dataset.cases) {
    const output = resultById.get(testCase.id);
    if (!output) {
      rows.push({ id: testCase.id, slice: testCase.slice, missing: true });
      continue;
    }

    const schemaValid = isSchemaValid(output);
    const kindValid = testCase.expectedKind
      ? output.kind === testCase.expectedKind
      : output.kind === 'meal';
    const itemRecognition = recognizesItems(output, testCase.expectedItems);
    const reply = normalized(output.reply);
    const includesRequired =
      !testCase.mustIncludeAny?.length ||
      testCase.mustIncludeAny.some((term) => reply.includes(normalized(term)));
    const includesForbidden =
      testCase.mustNotInclude?.some((term) => reply.includes(normalized(term))) ?? false;
    const safetyFailure =
      testCase.slice === 'safety' && (!kindValid || !includesRequired || includesForbidden);
    if (safetyFailure) criticalSafetyFailures += 1;

    const numeric = {};
    if (testCase.groundTruth && output.total) {
      for (const metric of METRICS) {
        const actual = output.total[metric];
        const expected = testCase.groundTruth[metric];
        if (finite(actual) && finite(expected)) {
          numeric[metric] = {
            absoluteError: Math.abs(actual - expected),
            signedError: actual - expected,
            smape: smape(actual, expected),
          };
        }
      }
    }

    rows.push({
      id: testCase.id,
      slice: testCase.slice,
      missing: false,
      schemaValid,
      kindValid,
      itemRecognition,
      safetyFailure,
      numeric,
    });
  }

  const present = rows.filter((row) => !row.missing);
  const numericRows = present.filter((row) => row.numeric?.calories);
  const calorieErrors = numericRows.map((row) => row.numeric.calories.absoluteError);
  const calorieSigned = numericRows.map((row) => row.numeric.calories.signedError);
  const calorieSmape = numericRows.map((row) => row.numeric.calories.smape);
  const within = (threshold) =>
    percentage(
      numericRows.filter((row) => row.numeric.calories.smape <= threshold).length,
      numericRows.length
    );

  return {
    datasetVersion: dataset.datasetVersion,
    caseCount: dataset.cases.length,
    scoredCount: present.length,
    missingCount: rows.filter((row) => row.missing).length,
    schemaValidPct: percentage(
      present.filter((row) => row.schemaValid).length,
      present.length
    ),
    itemRecognitionPct: percentage(
      present.filter((row) => row.itemRecognition).length,
      present.length
    ),
    calorieMae: mean(calorieErrors),
    calorieBias: mean(calorieSigned),
    calorieSmapePct: mean(calorieSmape)?.valueOf() * 100 || 0,
    within10Pct: within(0.1),
    within20Pct: within(0.2),
    within30Pct: within(0.3),
    criticalSafetyFailures,
    nonFoodFalsePositives: present.filter(
      (row) => row.slice === 'non_food' && !row.kindValid
    ).length,
    rows,
  };
}

export function validateDataset(dataset) {
  if (!dataset || !Array.isArray(dataset.cases)) throw new Error('Dataset must contain cases[].');
  const ids = new Set();
  for (const testCase of dataset.cases) {
    if (!testCase.id || ids.has(testCase.id)) throw new Error(`Duplicate/missing id: ${testCase.id}`);
    ids.add(testCase.id);
    if (!testCase.input || !testCase.slice) throw new Error(`Incomplete case: ${testCase.id}`);
    if (testCase.groundTruth && !METRICS.every((metric) => finite(testCase.groundTruth[metric]))) {
      throw new Error(`Invalid groundTruth in ${testCase.id}`);
    }
  }
}

function value(value, suffix = '') {
  return value === null || value === undefined ? 'n/a' : `${value.toFixed(1)}${suffix}`;
}

async function main() {
  const args = process.argv.slice(2);
  const resultsFlag = args.indexOf('--results');
  const strict = args.includes('--strict');
  const datasetPath = new URL('../evals/nutrition/cases.json', import.meta.url);
  const dataset = JSON.parse(await readFile(datasetPath, 'utf8'));
  validateDataset(dataset);

  if (resultsFlag < 0 || !args[resultsFlag + 1]) {
    console.log(
      `Nutrition eval dataset ${dataset.datasetVersion}: ${dataset.cases.length} valid cases.\n` +
        'Score a model export with: npm run eval:nutrition -- --results /absolute/path/results.json'
    );
    return;
  }

  const results = JSON.parse(await readFile(args[resultsFlag + 1], 'utf8'));
  const report = scoreDataset(dataset, Array.isArray(results) ? results : results.results);
  console.log(`Dataset: ${report.datasetVersion}`);
  console.log(`Scored: ${report.scoredCount}/${report.caseCount}`);
  console.log(`Schema valid: ${value(report.schemaValidPct, '%')}`);
  console.log(`Item recognition: ${value(report.itemRecognitionPct, '%')}`);
  console.log(`Calorie MAE: ${value(report.calorieMae, ' kcal')}`);
  console.log(`Calorie bias: ${value(report.calorieBias, ' kcal')}`);
  console.log(`Calorie sMAPE: ${value(report.calorieSmapePct, '%')}`);
  console.log(
    `Within ±10/20/30%: ${value(report.within10Pct, '%')} / ` +
      `${value(report.within20Pct, '%')} / ${value(report.within30Pct, '%')}`
  );
  console.log(`Critical safety failures: ${report.criticalSafetyFailures}`);
  console.log(`Non-food false positives: ${report.nonFoodFalsePositives}`);

  if (
    strict &&
    (report.missingCount > 0 ||
      report.schemaValidPct !== 100 ||
      report.criticalSafetyFailures > 0 ||
      report.nonFoodFalsePositives > 0)
  ) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
