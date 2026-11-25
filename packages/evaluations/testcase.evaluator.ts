
import OpenAI from 'openai';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  RequirementAnalysisSchema,
  TestCaseResponseSchema,
  type RequirementAnalysis,
  type TestCaseResponse
} from '../schemas/requirement_testcase.schema';


// 1. LLM response schemas

const AcceptanceCriterionEvaluationSchema = z.object({
  criterion: z.string().min(1),
  covered: z.boolean(),
  matchedScenarioIds: z.array(z.string()),
  reasoning: z.string()
});

const RequirementCoverageSchema = z.object({
  requirementId: z.string().min(1),
  covered: z.boolean(),
  matchedScenarioIds: z.array(z.string()),
  reasoning: z.string().min(1),
  acceptanceCriteria: z.array(AcceptanceCriterionEvaluationSchema)
});

// Validate the LLM's scores and Boolean values.
export const ScenarioAssessmentSchema = z.object({
  testCaseId: z.string().min(1),

  relevant: z.boolean(),
  relevanceScore: z.number().int().min(1).max(5),

  expectedResultGrounded: z.boolean(),
  faithfulnessScore: z.number().int().min(1).max(5),

  clear: z.boolean(),
  clarityScore: z.number().int().min(1).max(5),

  feedback: z.string().min(1),
  evidence: z.string().min(1)
}).superRefine((assessment, ctx) => {
  if (assessment.relevant !== (assessment.relevanceScore >= 3)) {
    ctx.addIssue({
      code: 'custom',
      path: ['relevanceScore'],
      message: 'Relevance must be true when score is 3 or higher.'
    });
  }

  if (assessment.expectedResultGrounded !== (assessment.faithfulnessScore >= 3)) {
    ctx.addIssue({
      code: 'custom',
      path: ['faithfulnessScore'],
      message: 'Grounded must be true when score is 3 or higher.'
    });
  }

  if (assessment.clear !== (assessment.clarityScore >= 3)) {
    ctx.addIssue({
      code: 'custom',
      path: ['clarityScore'],
      message: 'Clarity must be true when score is 3 or higher.'
    });
  }
});

const AIEvaluationSchema = z.object({
  requirementCoverage: z.array(RequirementCoverageSchema),
  scenarioAssessments: z.array(ScenarioAssessmentSchema)
});

// 2. Types

export type EvaluationIssue = {
  testCaseId: string;
  type:
  | 'DUPLICATE_ID'
  | 'DUPLICATE_TITLE'
  | 'INVALID_REQUIREMENT_REFERENCE'
  | 'MISSING_REQUIREMENT_REFERENCE'
  | 'IRRELEVANT_SCENARIO'
  | 'UNGROUNDED_EXPECTED_RESULT'
  | 'UNCLEAR_SCENARIO'
  | 'MISSING_AI_ASSESSMENT'
  | 'DUPLICATE_AI_ASSESSMENT'
  | 'INVALID_AI_ASSESSMENT';
  message: string;
};

export type ScenarioEvaluationResult = z.infer<
  typeof ScenarioAssessmentSchema
>;

export type EvaluationInput = {
  requirementAnalysis: RequirementAnalysis;
  testCases: TestCaseResponse;
};

export type EvaluationResult = {
  feature: string;
  totalScenarios: number;
  qualityPassedScenarios: number;
  qualityFailedScenarios: number;
  issues: EvaluationIssue[];
  coveredCategories: string[];
  scenarioAssessments: ScenarioEvaluationResult[];

  coverage: {
    requirementId: string;
    description: string;
    covered: boolean;
    matchedScenarios: string[];
    reasoning: string;
    acceptanceCriteria: {
      criterion: string;
      covered: boolean;
      matchedScenarios: string[];
      reasoning: string;
    }[];
  }[];
  coveragePercentage: number;
  acceptanceCriteriaCoveragePercentage: number;

  scenarioQualityPercentage: number;
  thresholdEvaluation: {
    requirementCoveragePassed: boolean;
    acceptanceCriteriaCoveragePassed: boolean;
    scenarioQualityPassed: boolean;
    status: 'PASS' | 'FAIL';
  };
  qualityStatus: 'PASS' | 'FAIL';
  thresholdResults: {
    requirementCoveragePassed: boolean;
    acceptanceCriteriaCoveragePassed: boolean;
    scenarioQualityPassed: boolean;
  };
};

export const EVALUATION_THRESHOLDS = {
  requirementCoverage: 100,
  acceptanceCriteriaCoverage: 100,
  scenarioQuality: 90
};

export function calculateAcceptanceCriteriaCoverage(
  coverage: {
    acceptanceCriteria: {
      covered: boolean;
    }[];
  }[]
): number {
  const allCriteria = coverage.flatMap(
    requirement => requirement.acceptanceCriteria
  );

  if (allCriteria.length === 0) {
    return 0;
  }

  const coveredCount = allCriteria.filter(
    criterion => criterion.covered
  ).length;

  return Math.round(
    (coveredCount / allCriteria.length) * 100
  );
}

type ScenarioMatch = {
  testCaseId: string;
  expectedScenarioId: string | null;
};

export function calculatePrecisionRecallF1(
  expectedScenarioIds: string[],
  generatedScenarioIds: string[],
  scenarioMatches: ScenarioMatch[]
) {
  const matchedExpectedIds = new Set<string>();
  let truePositives = 0;
  let falsePositives = 0;

  for (const testCaseId of generatedScenarioIds) {
    const match = scenarioMatches.find(
      item => item.testCaseId === testCaseId
    );

    if (
      match?.expectedScenarioId &&
      expectedScenarioIds.includes(match.expectedScenarioId) &&
      !matchedExpectedIds.has(match.expectedScenarioId)
    ) {
      truePositives++;
      matchedExpectedIds.add(match.expectedScenarioId);
    } else {
      falsePositives++;
    }
  }

  const falseNegatives = expectedScenarioIds.filter(
    id => !matchedExpectedIds.has(id)
  ).length;

  const precision =
    truePositives + falsePositives === 0
      ? 0
      : truePositives / (truePositives + falsePositives);

  const recall =
    truePositives + falseNegatives === 0
      ? 0
      : truePositives / (truePositives + falseNegatives);

  const f1Score =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision: Math.round(precision * 10000) / 100,
    recall: Math.round(recall * 10000) / 100,
    f1Score: Math.round(f1Score * 10000) / 100
  };
}

export function evaluateQualityThresholds(input: {
  requirementCoverage: number;
  acceptanceCriteriaCoverage: number;
  scenarioQuality: number;
  hasAcceptanceCriteria: boolean;
}) {
  const results = {
    requirementCoveragePassed:
      input.requirementCoverage >=
      EVALUATION_THRESHOLDS.requirementCoverage,

    acceptanceCriteriaCoveragePassed:
      !input.hasAcceptanceCriteria ||
      input.acceptanceCriteriaCoverage >=
      EVALUATION_THRESHOLDS.acceptanceCriteriaCoverage,

    scenarioQualityPassed:
      input.scenarioQuality >=
      EVALUATION_THRESHOLDS.scenarioQuality
  };

  return {
    ...results,
    status: Object.values(results).every(Boolean) ? 'PASS' as const : 'FAIL' as const
  };
}


// 3. Rule-based checks
export function runRuleBasedChecks(
  requirementAnalysis: RequirementAnalysis,
  testCases: TestCaseResponse
) {
  const issues: EvaluationIssue[] = [];
  const failedIndexes = new Set<number>();
  const coveredCategories = new Set<string>();

  const seenIds = new Map<string, number>();
  const seenTitles = new Map<string, number>();

  const validRequirementIds = new Set(
    requirementAnalysis.requirements.map(requirement => requirement.id)
  );

  testCases.scenarios.forEach((scenario, index) => {
    const id = scenario.id.trim().toLowerCase();
    const title = scenario.title.trim().toLowerCase();

    // Duplicate ID check
    if (seenIds.has(id)) {
      failedIndexes.add(seenIds.get(id)!);
      failedIndexes.add(index);

      issues.push({
        testCaseId: scenario.id,
        type: 'DUPLICATE_ID',
        message: `Duplicate test case ID: ${scenario.id}`
      });
    } else {
      seenIds.set(id, index);
    }

    // Duplicate title check
    if (seenTitles.has(title)) {
      failedIndexes.add(seenTitles.get(title)!);
      failedIndexes.add(index);

      issues.push({
        testCaseId: scenario.id,
        type: 'DUPLICATE_TITLE',
        message: `Duplicate test case title: ${scenario.title}`
      });
    } else {
      seenTitles.set(title, index);
    }

    // Missing requirement reference check
    if (scenario.requirementIds.length === 0) {
      failedIndexes.add(index);

      issues.push({
        testCaseId: scenario.id,
        type: 'MISSING_REQUIREMENT_REFERENCE',
        message: 'Test case has no linked requirements.'
      });
    }

    // Invalid requirement reference check
    for (const requirementId of scenario.requirementIds) {
      if (!validRequirementIds.has(requirementId)) {
        failedIndexes.add(index);

        issues.push({
          testCaseId: scenario.id,
          type: 'INVALID_REQUIREMENT_REFERENCE',
          message: `Unknown requirement ID: ${requirementId}`
        });
      }
    }

    coveredCategories.add(scenario.category);
  });

  return {
    issues,
    failedScenarioIndexes: [...failedIndexes],
    coveredCategories: [...coveredCategories]
  };
}

// 4. LLM-as-a-Judge evaluation

export async function evaluateTestCases(
  input: EvaluationInput
): Promise<EvaluationResult> {

  const analysis = RequirementAnalysisSchema.parse(
    input.requirementAnalysis
  );

  const testCases = TestCaseResponseSchema.parse(input.testCases);

  const scenarios = testCases.scenarios;
  const requirements = analysis.requirements;

  // First run deterministic rule-based checks.
  const ruleResult = runRuleBasedChecks(analysis, testCases);

  const issues: EvaluationIssue[] = [...ruleResult.issues];

  const failedIndexes = new Set(
    ruleResult.failedScenarioIndexes
  );

  // Create OpenAI client.
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey) throw new Error('OPENAI_API_KEY is missing.');
  if (!model) throw new Error('OPENAI_MODEL is missing.');

  const client = new OpenAI({ apiKey });

  // Ask the LLM to evaluate test cases.
  const response = await client.responses.parse({
    model,

    instructions: `
You are an independent Senior QA Quality Evaluator.

Evaluate the supplied test cases against the supplied requirements.

REQUIREMENT COVERAGE:
- Evaluate every requirement.
- Decide whether at least one scenario genuinely tests it.
- Return only supplied requirement IDs and scenario IDs.
- Do not rely on keyword matching alone.

ACCEPTANCE CRITERIA:
- Evaluate every supplied acceptance criterion.
- Return every acceptance criterion exactly as provided in the original requirement.
- Do not omit, combine, or rewrite acceptance criteria.
- If a requirement has no acceptance criteria, return an empty array.

SCENARIO QUALITY:
- Evaluate every test scenario for relevance, grounded expected results and clarity.
- Do not invent application behavior or requirements.
- Return exactly one assessment for each supplied scenario.

SCORING (1 to 5):
- Relevance: 1 = unrelated, 5 = directly tests the requirement.
- Faithfulness: 1 = unsupported or contradictory, 5 = fully supported.
- Clarity: 1 = unclear, 5 = clear and actionable.
- For each score, set its Boolean field to false for scores 1-2 and true for scores 3-5.
- Give concise feedback and evidence based on the supplied requirement and test case.

Return structured output matching the supplied schema.
`,

    input: JSON.stringify({
      requirementAnalysis: analysis,
      testCases
    }),

    text: {
      format: zodTextFormat(
        AIEvaluationSchema,
        'ai_test_case_evaluation'
      )
    }
  });

  if (response.status !== 'completed') {
    throw new Error(`AI evaluation was not completed: ${response.status}`);
  }

  if (!response.output_parsed) {
    throw new Error('The AI did not return a valid evaluation.');
  }

  const aiEvaluation = AIEvaluationSchema.parse(
    response.output_parsed
  );

  // 5. Match AI coverage to actual requirements and scenarios.

  const scenarioIds = new Set(
    scenarios.map(scenario => scenario.id)
  );

  const coverage = requirements.map(requirement => {
    const aiResult = aiEvaluation.requirementCoverage.find(
      item => item.requirementId === requirement.id
    );

    const matchedScenarios = (
      aiResult?.matchedScenarioIds ?? []
    ).filter(id => scenarioIds.has(id));

    return {
      requirementId: requirement.id,
      description: requirement.description,

      covered:
        aiResult?.covered === true &&
        matchedScenarios.length > 0,

      matchedScenarios,

      reasoning:
        aiResult?.reasoning ??
        'No evaluation returned for this requirement.',


      acceptanceCriteria: requirement.acceptanceCriteria.map(
        originalCriterion => {
          // Find the AI evaluation for this original criterion.
          const criterionResult = (
            aiResult?.acceptanceCriteria ?? []
          ).find(
            item =>
              item.criterion.trim().toLowerCase() ===
              originalCriterion.trim().toLowerCase()
          );

          // If the AI omitted the criterion, mark it as not covered.
          if (!criterionResult) {
            return {
              criterion: originalCriterion,
              covered: false,
              matchedScenarios: [],
              reasoning:
                'The AI evaluator did not return an assessment for this acceptance criterion.'
            };
          }

          // Keep only scenario IDs that actually exist.
          const matched = criterionResult.matchedScenarioIds.filter(
            id => scenarioIds.has(id)
          );

          return {
            criterion: originalCriterion,
            covered: criterionResult.covered && matched.length > 0,
            matchedScenarios: matched,
            reasoning: criterionResult.reasoning
          };
        })



    };
  });

  // 6. Match AI assessments to generated scenarios.

  const assessmentMap = new Map<
    string,
    ScenarioEvaluationResult
  >();

  for (const assessment of aiEvaluation.scenarioAssessments) {

    // Unknown scenario ID
    if (!scenarioIds.has(assessment.testCaseId)) {
      issues.push({
        testCaseId: assessment.testCaseId,
        type: 'INVALID_AI_ASSESSMENT',
        message: 'AI returned an unknown test case ID.'
      });

      continue;
    }

    // Duplicate assessment
    if (assessmentMap.has(assessment.testCaseId)) {
      issues.push({
        testCaseId: assessment.testCaseId,
        type: 'DUPLICATE_AI_ASSESSMENT',
        message: 'AI returned more than one assessment for this test case.'
      });

      const index = scenarios.findIndex(
        item => item.id === assessment.testCaseId
      );

      if (index >= 0) failedIndexes.add(index);

      continue;
    }

    assessmentMap.set(assessment.testCaseId, assessment);
  }

  // Check that every scenario has an assessment.

  const scenarioAssessments: ScenarioEvaluationResult[] = [];

  scenarios.forEach((scenario, index) => {
    const assessment = assessmentMap.get(scenario.id);

    if (!assessment) {
      failedIndexes.add(index);

      issues.push({
        testCaseId: scenario.id,
        type: 'MISSING_AI_ASSESSMENT',
        message: 'AI did not return an assessment for this test case.'
      });

      return;
    }

    scenarioAssessments.push(assessment);

    if (!assessment.relevant) {
      failedIndexes.add(index);

      issues.push({
        testCaseId: scenario.id,
        type: 'IRRELEVANT_SCENARIO',
        message: assessment.feedback
      });
    }

    if (!assessment.expectedResultGrounded) {
      failedIndexes.add(index);

      issues.push({
        testCaseId: scenario.id,
        type: 'UNGROUNDED_EXPECTED_RESULT',
        message: assessment.feedback
      });
    }

    if (!assessment.clear) {
      failedIndexes.add(index);

      issues.push({
        testCaseId: scenario.id,
        type: 'UNCLEAR_SCENARIO',
        message: assessment.feedback
      });
    }
  });

  // 7. Calculate coverage and quality.

  const coveredCount = coverage.filter(
    item => item.covered
  ).length;

  const coveragePercentage = requirements.length === 0
    ? 0
    : Math.round(
      (coveredCount / requirements.length) * 100
    );

  // Calculate acceptance criteria coverage.
  const acceptanceCriteriaCoveragePercentage =
    calculateAcceptanceCriteriaCoverage(coverage);

  const qualityPassedScenarios =
    scenarios.length - failedIndexes.size;

  const scenarioQualityPercentage = scenarios.length === 0
    ? 0
    : Math.round(
      (qualityPassedScenarios / scenarios.length) * 100
    );

  const thresholdEvaluation = evaluateQualityThresholds({
    requirementCoverage: coveragePercentage,
    acceptanceCriteriaCoverage: acceptanceCriteriaCoveragePercentage,
    scenarioQuality: scenarioQualityPercentage,
    hasAcceptanceCriteria: coverage.some(
      item => item.acceptanceCriteria.length > 0
    )
  });

  return {
    feature: analysis.feature,

    totalScenarios: scenarios.length,

    qualityPassedScenarios,

    qualityFailedScenarios:
      failedIndexes.size,

    issues,

    coveredCategories: ruleResult.coveredCategories,

    scenarioAssessments,

    coverage,
    coveragePercentage,
    acceptanceCriteriaCoveragePercentage,
    scenarioQualityPercentage,
    thresholdEvaluation,
    qualityStatus: thresholdEvaluation.status,

    thresholdResults: {
      requirementCoveragePassed:
        thresholdEvaluation.requirementCoveragePassed,

      acceptanceCriteriaCoveragePassed:
        thresholdEvaluation.acceptanceCriteriaCoveragePassed,

      scenarioQualityPassed:
        thresholdEvaluation.scenarioQualityPassed
    }
  };
}


export type RegressionMetrics = {
  requirementCoverage: number;
  acceptanceCriteriaCoverage: number;
  scenarioQuality: number;
};

export type RegressionResult = {
  status: 'PASS' | 'FAIL';
  comparisons: {
    metric: string;
    baseline: number;
    current: number;
    difference: number;
    passed: boolean;
  }[];
};

export function compareRegressionMetrics(
  baseline: RegressionMetrics,
  current: RegressionMetrics,
  allowedDrop = 0
): RegressionResult {
  const comparisons = [
    {
      metric: 'Requirement Coverage',
      baseline: baseline.requirementCoverage,
      current: current.requirementCoverage
    },
    {
      metric: 'Acceptance Criteria Coverage',
      baseline: baseline.acceptanceCriteriaCoverage,
      current: current.acceptanceCriteriaCoverage
    },
    {
      metric: 'Scenario Quality',
      baseline: baseline.scenarioQuality,
      current: current.scenarioQuality
    }
  ].map((item) => {
    const difference = Number(
      (item.current - item.baseline).toFixed(2)
    );

    return {
      ...item,
      difference,
      passed: difference >= -allowedDrop
    };
  });

  return {
    status: comparisons.every((item) => item.passed)
      ? 'PASS'
      : 'FAIL',
    comparisons
  };
}
