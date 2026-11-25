
import type { RegressionMetrics } from './testcase.evaluator';

export type RepeatabilityRun = {
  runNumber: number;
  scenarioCount: number;
  groundedScenarioCount: number;
  metrics: RegressionMetrics;
};

export type RepeatabilityPipelineResult = {
  status: 'completed' | 'needs_clarification';
  testCases: {
    scenarios: unknown[];
  } | null;
  evaluation: {
    coveragePercentage: number;
    acceptanceCriteriaCoveragePercentage: number;
    scenarioQualityPercentage: number;
    scenarioAssessments: {
      expectedResultGrounded: boolean;
    }[];
  } | null;
};

export async function executeRepeatabilityTest(
  inputRequirement: string,
  repetitions: number,
  pipeline: (
    requirement: string
  ) => Promise<RepeatabilityPipelineResult>
) {
  if (!Number.isInteger(repetitions) || repetitions < 2) {
    throw new Error('Repetitions must be an integer of at least 2.');
  }

  const runs: RepeatabilityRun[] = [];

  for (let i = 1; i <= repetitions; i++) {
    const result = await pipeline(inputRequirement);

    if (
      result.status !== 'completed' ||
      !result.evaluation ||
      !result.testCases
    ) {
      throw new Error(`Repeatability run ${i} failed.`);
    }

    runs.push({
      runNumber: i,
      scenarioCount: result.testCases.scenarios.length,
      groundedScenarioCount:
        result.evaluation.scenarioAssessments.filter(
          (assessment) => assessment.expectedResultGrounded
        ).length,
      metrics: {
        requirementCoverage: result.evaluation.coveragePercentage,
        acceptanceCriteriaCoverage:
          result.evaluation.acceptanceCriteriaCoveragePercentage,
        scenarioQuality: result.evaluation.scenarioQualityPercentage
      }
    });
  }

  const metricNames = [
  'requirementCoverage',
  'acceptanceCriteriaCoverage',
  'scenarioQuality'
] as const;

const metricVariations = Object.fromEntries(
  metricNames.map((metric) => {
    const scores = runs.map(
      (run) => run.metrics[metric]
    );

    return [
      metric,
      {
        min: Math.min(...scores),
        max: Math.max(...scores),
        variation: Math.max(...scores) - Math.min(...scores)
      }
    ];
  })
);

const scenarioCounts = runs.map(
  (run) => run.scenarioCount
);

const groundedCounts = runs.map(
  (run) => run.groundedScenarioCount
);

const consistent =
  Object.values(metricVariations).every(
    (metric) => metric.variation === 0
  ) &&
  scenarioCounts.every(
    (count) => count === scenarioCounts[0]
  ) &&
  groundedCounts.every(
    (count) => count === groundedCounts[0]
  );

  return {
  runs,
  metricVariations,
  consistent
};
}
