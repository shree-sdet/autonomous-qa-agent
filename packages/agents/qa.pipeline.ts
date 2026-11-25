
import { analyzeRequirement } from '../llm/requirement.analyzer';
import { generateTestCases } from '../llm/testcase.generator';
import { regressionBaseline } from '../evaluations/regression.baseline';
import { executeRepeatabilityTest } from '../evaluations/repeatability';
import type {
  RequirementAnalysis,
  TestCaseResponse
} from '../schemas/requirement_testcase.schema';

import {
  evaluateTestCases,
  type EvaluationResult,
  type RegressionMetrics,
  compareRegressionMetrics
} from '../evaluations/testcase.evaluator';

import { goldenDataset } from '../evaluations/golden.dataset';


// ==========================================
// 1. Pipeline Result Type
// ==========================================

export type QAPipelineResult = {
  status: 'completed' | 'needs_clarification';

  requirementAnalysis: RequirementAnalysis;

  testCases: TestCaseResponse | null;

  evaluation: EvaluationResult | null;
};

// ==========================================
// 2. Main QA Pipeline
// ==========================================

export async function runQAPipeline(
  userRequirement: string
): Promise<QAPipelineResult> {

  if (!userRequirement.trim()) {
    throw new Error(
      'Please provide a software requirement.'
    );
  }

  // Step 1: Analyze the requirement
  const requirementAnalysis =
    await analyzeRequirement(userRequirement);

  // Step 2: Check whether clarification is required
  if (
    requirementAnalysis.needsClarification ||
    requirementAnalysis.requirements.length === 0
  ) {
    return {
      status: 'needs_clarification',
      requirementAnalysis,
      testCases: null,
      evaluation: null
    };
  }

  // Step 3: Generate test cases
  const testCases = await generateTestCases(
    requirementAnalysis
  );

  // Step 4: Evaluate generated test cases
  const evaluation = await evaluateTestCases({
    requirementAnalysis,
    testCases
  });

  // Step 5: Return the complete QA result
  return {
    status: 'completed',
    requirementAnalysis,
    testCases,
    evaluation
  };
}



export async function runGoldenDatasetRegression() {
  const results: {
    exampleId: string;
    feature: string;
    qualityStatus: 'PASS' | 'FAIL';
    regressionStatus: 'PASS' | 'FAIL';
    metrics: RegressionMetrics;
    comparisons: {
      metric: string;
      baseline: number;
      current: number;
      difference: number;
      passed: boolean;
    }[];
  }[] = [];

  // Run examples sequentially to avoid concurrent LLM requests.
  for (const example of goldenDataset) {
    console.log(`\nRunning regression: ${example.id}`);

    const result = await runQAPipeline(
      example.inputRequirement
    );

    if (result.status !== 'completed' || !result.evaluation) {
      throw new Error(
        `Regression failed to execute for ${example.id}`
      );
    }

    const evaluation = result.evaluation;

    // Collect current evaluation metrics.
    const metrics: RegressionMetrics = {
      requirementCoverage: evaluation.coveragePercentage,
      acceptanceCriteriaCoverage:
        evaluation.acceptanceCriteriaCoveragePercentage,
      scenarioQuality: evaluation.scenarioQualityPercentage
    };

    // Get the saved baseline for this example.
    const baseline = regressionBaseline[example.id];

    if (!baseline) {
      throw new Error(
        `Baseline not found for ${example.id}`
      );
    }

    // Compare current metrics against the saved baseline.
    const regression = compareRegressionMetrics(
      baseline,
      metrics
    );

    results.push({
      exampleId: example.id,
      feature: result.requirementAnalysis.feature,
      qualityStatus: evaluation.qualityStatus,
      regressionStatus: regression.status,
      metrics,
      comparisons: regression.comparisons
    });
  }

  return results;
}


export async function runRepeatabilityTest(
  exampleId: string,
  repetitions: number = 2
) {
  const example = goldenDataset.find(
    (item) => item.id === exampleId
  );

  if (!example) {
    throw new Error(`Golden Dataset example not found: ${exampleId}`);
  }

  const report = await executeRepeatabilityTest(
    example.inputRequirement,
    repetitions,
    runQAPipeline
  );

  return {
    exampleId,
    runs: report.runs
  };
}
