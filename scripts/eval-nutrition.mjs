import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { parseArgs } from 'node:util';

const METRICS = ['calories', 'protein_g', 'carbs_g', 'fat_g'];

// Engineering regression tolerances for this weighed/text seed suite, not a
// claim of clinical accuracy or approval criteria for a future photo benchmark.
export const ACCURACY_LIMITS = Object.freeze({ relative: 0.2, calories: 15, macroGrams: 2 });

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function exceedsTolerance(metric) {
  return metric.absoluteError > metric.tolerance + 1e-9;
}

export function isSchemaValid(output) {
  if (!output || !['meal', 'answer'].includes(output.kind)) return false;
  if (output.kind === 'answer') return typeof output.reply === 'string' && output.reply.trim().length > 0;
  return (
    Array.isArray(output.items) &&
    output.items.length > 0 &&
    output.items.every(
      (item) =>
        typeof item?.name === 'string' && item.name.trim().length > 0 &&
        METRICS.every((metric) => finite(item?.[metric]) && item[metric] >= 0)
    ) &&
    Boolean(output.total) &&
    METRICS.every((metric) => finite(output.total[metric]) && output.total[metric] >= 0) &&
    finite(output.confidence) && output.confidence >= 0 && output.confidence <= 1 &&
    METRICS.every((metric) => {
      const sum = output.items.reduce((total, item) => total + item[metric], 0);
      // Allow independent whole-number rounding, not contradictory meal totals.
      return finite(sum) && Math.abs(sum - output.total[metric]) <= Math.max(1, output.items.length * 0.5);
    })
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
  const names = (Array.isArray(output?.items) ? output.items : []).map((item) => normalized(item?.name));
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
  validateDataset(dataset);
  if (!Array.isArray(resultRows)) throw new Error('Results must be an array or an object containing results[].');
  const caseIds = new Set(dataset.cases.map((entry) => entry.id));
  const resultById = new Map();
  const inputErrors = [];
  for (const row of resultRows) {
    if (!row || typeof row.id !== 'string' || !caseIds.has(row.id)) {
      inputErrors.push('Result has a missing or unknown case ID.');
      continue;
    }
    if (resultById.has(row.id)) {
      inputErrors.push(`Duplicate result: ${row.id}`);
      continue;
    }
    resultById.set(row.id, Object.hasOwn(row, 'output') ? row.output : row);
  }
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
    if (testCase.groundTruth && schemaValid && kindValid && output.total) {
      for (const metric of METRICS) {
        const actual = output.total[metric];
        const expected = testCase.groundTruth[metric];
        if (finite(actual) && finite(expected)) {
          numeric[metric] = {
            absoluteError: Math.abs(actual - expected),
            signedError: actual - expected,
            smape: smape(actual, expected),
            relativeError: expected === 0 ? (actual === 0 ? 0 : null) : Math.abs(actual - expected) / expected,
            tolerance: Math.max(metric === 'calories' ? ACCURACY_LIMITS.calories : ACCURACY_LIMITS.macroGrams, expected * ACCURACY_LIMITS.relative),
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
      accuracyValid: testCase.groundTruth ? METRICS.every((metric) =>
        numeric[metric] && !exceedsTolerance(numeric[metric])) : null,
    });
  }

  const present = rows.filter((row) => !row.missing);
  const numericRows = present.filter((row) => row.numeric?.calories);
  const calorieErrors = numericRows.map((row) => row.numeric.calories.absoluteError);
  const calorieSigned = numericRows.map((row) => row.numeric.calories.signedError);
  const calorieSmape = numericRows.map((row) => row.numeric.calories.smape);
  const within = (threshold) =>
    percentage(
      numericRows.filter((row) => row.numeric.calories.relativeError !== null && row.numeric.calories.relativeError <= threshold).length,
      numericRows.length
    );

  return {
    datasetVersion: dataset.datasetVersion,
    caseCount: dataset.cases.length,
    scoredCount: present.length,
    missingCount: rows.filter((row) => row.missing).length,
    inputErrors,
    numericExpectedCount: dataset.cases.filter((entry) => entry.groundTruth).length,
    numericScoredCount: numericRows.length,
    kindValidPct: percentage(present.filter((row) => row.kindValid).length, present.length),
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
    calorieSmapePct: calorieSmape.length ? mean(calorieSmape) * 100 : null,
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
  if (!dataset || !Array.isArray(dataset.cases) || !dataset.cases.length) throw new Error('Dataset must contain non-empty cases[].');
  const ids = new Set();
  for (const testCase of dataset.cases) {
    if (!testCase || typeof testCase.id !== 'string' || !testCase.id.trim() || ids.has(testCase.id)) throw new Error(`Duplicate/missing case id.`);
    ids.add(testCase.id);
    if (typeof testCase.input !== 'string' || !testCase.input.trim() || typeof testCase.slice !== 'string' || !testCase.slice.trim()) throw new Error(`Incomplete case: ${testCase.id}`);
    if (testCase.expectedKind && !['meal', 'answer'].includes(testCase.expectedKind)) throw new Error(`Invalid expected kind: ${testCase.id}`);
    for (const field of ['expectedItems', 'mustIncludeAny', 'mustNotInclude']) {
      if (testCase[field] !== undefined && (!Array.isArray(testCase[field]) || testCase[field].some((term) => typeof term !== 'string' || !normalized(term)))) {
        throw new Error(`Invalid ${field}: ${testCase.id}`);
      }
    }
    if (testCase.groundTruth && (testCase.expectedKind === 'answer' || !METRICS.every((metric) => finite(testCase.groundTruth[metric]) && testCase.groundTruth[metric] >= 0))) {
      throw new Error(`Invalid groundTruth in ${testCase.id}`);
    }
  }
}

/** Fail closed on coverage, schema, classification, recognition, safety and nutrition. */
export function evaluateGate(report) {
  const failures = [...report.inputErrors];
  if (report.missingCount) failures.push(`${report.missingCount} missing result(s).`);
  if (!report.numericExpectedCount) failures.push('No numeric ground truth: nutrition accuracy cannot be evaluated.');
  if (report.numericScoredCount !== report.numericExpectedCount) failures.push('Numeric ground-truth coverage is incomplete.');
  for (const row of report.rows) {
    if (row.missing) continue;
    if (!row.schemaValid) failures.push(`${row.id}: invalid schema or inconsistent item totals.`);
    if (!row.kindValid) failures.push(`${row.id}: wrong response kind.`);
    if (!row.itemRecognition) failures.push(`${row.id}: expected food not recognized.`);
    if (row.safetyFailure) failures.push(`${row.id}: safety check failed.`);
    if (row.accuracyValid === false) {
      for (const metric of METRICS) {
        const n = row.numeric[metric];
        if (n && exceedsTolerance(n)) failures.push(`${row.id}: ${metric} error ${n.absoluteError.toFixed(1)} exceeds ${n.tolerance.toFixed(1)} tolerance.`);
      }
    }
  }
  return { passed: failures.length === 0, failures };
}

function value(value, suffix = '') {
  return value === null || value === undefined ? 'n/a' : `${value.toFixed(1)}${suffix}`;
}

async function main() {
  const { values: { results: resultsPath, strict } } = parseArgs({ options: {
    results: { type: 'string' }, strict: { type: 'boolean', default: false },
  } });
  const datasetPath = new URL('../evals/nutrition/cases.json', import.meta.url);
  const dataset = JSON.parse(await readFile(datasetPath, 'utf8'));
  validateDataset(dataset);

  if (!resultsPath) {
    if (strict) throw new Error('--strict requires --results <path>; validating the dataset alone does not evaluate a model.');
    console.log(
      `Nutrition eval dataset ${dataset.datasetVersion}: ${dataset.cases.length} valid cases.\n` +
        'Score a model export with: npm run eval:nutrition -- --results /absolute/path/results.json'
    );
    return;
  }

  const results = JSON.parse(await readFile(resultsPath, 'utf8'));
  const report = scoreDataset(dataset, Array.isArray(results) ? results : results?.results);
  console.log(`Dataset: ${report.datasetVersion}`);
  console.log(`Scored: ${report.scoredCount}/${report.caseCount}`);
  console.log(`Schema valid: ${value(report.schemaValidPct, '%')}`);
  console.log(`Correct response kind: ${value(report.kindValidPct, '%')}`);
  console.log(`Numeric coverage: ${report.numericScoredCount}/${report.numericExpectedCount}`);
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

  const gate = evaluateGate(report);
  console.log('Per-case limits: calories ±max(15 kcal, 20%); each macro ±max(2 g, 20%).');
  console.log(`Gate: ${gate.passed ? 'PASS' : 'FAIL'}`);
  for (const failure of gate.failures) console.log(`  - ${failure}`);
  if (strict && !gate.passed) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { await main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
