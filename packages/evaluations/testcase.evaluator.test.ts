
import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  runRuleBasedChecks,calculateAcceptanceCriteriaCoverage,
  ScenarioAssessmentSchema,evaluateTestCases,calculatePrecisionRecallF1,
  evaluateQualityThresholds,compareRegressionMetrics
} from './testcase.evaluator';

import { goldenDataset } from './golden.dataset';

import type {
  RequirementAnalysis,
  TestCaseResponse
} from '../schemas/requirement_testcase.schema';

// Reusable test data
const requirementAnalysis: RequirementAnalysis = {
  feature: 'Email registration',
  summary: 'Users can register with an email address.',
  requirements: [
    {
      id: 'REQ-001',
      description: 'Users can register with a valid email.',
      priority: 'High',
      category: 'Functional',
      acceptanceCriteria: [],
      source: 'User requirement'
    }
  ],
  assumptions: [],
  openQuestions: [],
  needsClarification: false
};

function makeScenario(
  id: string,
  title: string,
  requirementIds: string[] = ['REQ-001']
) {
  return {
    id,
    title,
    priority: 'High' as const,
    category: 'Functional' as const,
    requirementIds,
    steps: ['Enter an email address'],
    expectedResult: 'The email is accepted.'
  };
}

function makeTestCases(
  scenarios: ReturnType<typeof makeScenario>[]
): TestCaseResponse {
  return {
    feature: 'Email registration',
    scenarios
  };
}

function makeAssessment(overrides: Record<string, unknown> = {}) {
  return {
    testCaseId: 'TC-001',
    relevant: true,
    relevanceScore: 5,
    expectedResultGrounded: true,
    faithfulnessScore: 5,
    clear: true,
    clarityScore: 5,
    feedback: 'The scenario is appropriate.',
    evidence: 'It checks the valid email requirement.',
    ...overrides
  };
}

// RULE-BASED TESTS
test('passes scenarios with unique IDs, titles and valid requirement references', () => {
  const result = runRuleBasedChecks(
    requirementAnalysis,
    makeTestCases([
      makeScenario('TC-001', 'Register with valid email'),
      makeScenario('TC-002', 'Register with another valid email')
    ])
  );

  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.failedScenarioIndexes, []);
});

test('detects duplicate test case IDs', () => {
  const result = runRuleBasedChecks(
    requirementAnalysis,
    makeTestCases([
      makeScenario('TC-001', 'First scenario'),
      makeScenario(' tc-001 ', 'Second scenario')
    ])
  );

  assert.ok(
    result.issues.some(issue => issue.type === 'DUPLICATE_ID')
  );

  assert.deepEqual(result.failedScenarioIndexes, [0, 1]);
});

test('detects duplicate test case titles', () => {
  const result = runRuleBasedChecks(
    requirementAnalysis,
    makeTestCases([
      makeScenario('TC-001', 'Valid email'),
      makeScenario('TC-002', ' valid email ')
    ])
  );

  assert.ok(
    result.issues.some(issue => issue.type === 'DUPLICATE_TITLE')
  );

  assert.deepEqual(result.failedScenarioIndexes, [0, 1]);
});

test('detects a test case without requirement references', () => {
  const result = runRuleBasedChecks(
    requirementAnalysis,
    makeTestCases([
      makeScenario('TC-001', 'Valid email', [])
    ])
  );

  assert.ok(
    result.issues.some(
      issue => issue.type === 'MISSING_REQUIREMENT_REFERENCE'
    )
  );
});

test('detects an unknown requirement ID', () => {
  const result = runRuleBasedChecks(
    requirementAnalysis,
    makeTestCases([
      makeScenario('TC-001', 'Valid email', ['REQ-999'])
    ])
  );

  assert.ok(
    result.issues.some(
      issue => issue.type === 'INVALID_REQUIREMENT_REFERENCE'
    )
  );
});

// LLM JUDGE SCORE VALIDATION TESTS
// These tests do not call OpenAI.
test('accepts a valid LLM assessment with high scores', () => {
  const result = ScenarioAssessmentSchema.safeParse(
    makeAssessment()
  );

  assert.equal(result.success, true);
});

test('accepts low scores when Boolean values are false', () => {
  const result = ScenarioAssessmentSchema.safeParse(
    makeAssessment({
      relevant: false,
      relevanceScore: 2,
      expectedResultGrounded: false,
      faithfulnessScore: 1,
      clear: false,
      clarityScore: 2
    })
  );

  assert.equal(result.success, true);
});

test('rejects a score and Boolean value that do not agree', () => {
  const result = ScenarioAssessmentSchema.safeParse(
    makeAssessment({
      relevant: false,
      relevanceScore: 5
    })
  );

  assert.equal(result.success, false);
});

test('rejects scores outside the 1 to 5 range', () => {
  const result = ScenarioAssessmentSchema.safeParse(
    makeAssessment({
      clarityScore: 6
    })
  );

  assert.equal(result.success, false);
});

// Check our Golden Dataset examples.
test('Golden Dataset: correct test case', () => {
  const example = goldenDataset[0];

  const result = ScenarioAssessmentSchema.safeParse({
    testCaseId: example.testCases.scenarios[0].id,
    relevant: example.expected.relevant,
    relevanceScore: example.expected.relevant ? 5 : 2,
    expectedResultGrounded: example.expected.expectedResultGrounded,
    faithfulnessScore: example.expected.expectedResultGrounded ? 5 : 2,
    clear: example.expected.clear,
    clarityScore: example.expected.clear ? 5 : 2,
    feedback: 'The test case is correct.',
    evidence: 'The expected result matches the requirement.'
  });

  assert.equal(result.success, true);
});

test('Golden Dataset: hallucinated expected result', () => {
  const example = goldenDataset[1];

  const result = ScenarioAssessmentSchema.safeParse({
    testCaseId: example.testCases.scenarios[0].id,
    relevant: example.expected.relevant,
    relevanceScore: example.expected.relevant ? 5 : 2,
    expectedResultGrounded: example.expected.expectedResultGrounded,
    faithfulnessScore: example.expected.expectedResultGrounded ? 5 : 2,
    clear: example.expected.clear,
    clarityScore: example.expected.clear ? 5 : 2,
    feedback: 'The expected result contains unsupported behaviour.',
    evidence: 'The requirement does not mention the additional functionality.'
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.expectedResultGrounded, false);
});


for (const example of goldenDataset) {
  test(
    `Golden Dataset: ${example.id}`,
    {
      skip: process.env.RUN_LLM_GOLDEN_TESTS !== 'true'
    },
    async () => {
      const result = await evaluateTestCases({
        requirementAnalysis: example.requirementAnalysis,
        testCases: example.testCases
      });

      const assessment = result.scenarioAssessments.find(
        item => item.testCaseId === example.testCases.scenarios[0].id
      );

      assert.ok(assessment, 'AI assessment was not returned.');

      assert.equal(assessment.relevant, example.expected.relevant);
      assert.equal(
        assessment.expectedResultGrounded,
        example.expected.expectedResultGrounded
      );
      assert.equal(assessment.clear, example.expected.clear);

      console.log(`\n${example.id} evaluation:`);
      console.log(assessment);
    }
  );
}


test('returns 100% when all acceptance criteria are covered', () => {
  const result = calculateAcceptanceCriteriaCoverage([
    {
      acceptanceCriteria: [
        { covered: true },
        { covered: true }
      ]
    }
  ]);

  assert.equal(result, 100);
});

test('returns 50% when half the acceptance criteria are covered', () => {
  const result = calculateAcceptanceCriteriaCoverage([
    {
      acceptanceCriteria: [
        { covered: true },
        { covered: false }
      ]
    }
  ]);

  assert.equal(result, 50);
});

test('returns 0% when no acceptance criteria are covered', () => {
  const result = calculateAcceptanceCriteriaCoverage([
    {
      acceptanceCriteria: [
        { covered: false },
        { covered: false }
      ]
    }
  ]);

  assert.equal(result, 0);
});

test('calculates precision, recall and F1 correctly', () => {
  const result = calculatePrecisionRecallF1(
    ['EXP-001', 'EXP-002', 'EXP-003', 'EXP-004'],
    ['TC-001', 'TC-002', 'TC-003'],
    [
      { testCaseId: 'TC-001', expectedScenarioId: 'EXP-001' },
      { testCaseId: 'TC-002', expectedScenarioId: 'EXP-002' },
      { testCaseId: 'TC-003', expectedScenarioId: null }
    ]
  );

  assert.equal(result.truePositives, 2);
  assert.equal(result.falsePositives, 1);
  assert.equal(result.falseNegatives, 2);

  assert.equal(result.precision, 66.67);
  assert.equal(result.recall, 50);
  assert.equal(result.f1Score, 57.14);
});

test('returns zero when no scenarios are generated', () => {
  const result = calculatePrecisionRecallF1(
    ['EXP-001'],
    [],
    []
  );

  assert.equal(result.precision, 0);
  assert.equal(result.recall, 0);
  assert.equal(result.f1Score, 0);
});

test('counts duplicate matches as false positives', () => {
  const result = calculatePrecisionRecallF1(
    ['EXP-001'],
    ['TC-001', 'TC-002'],
    [
      { testCaseId: 'TC-001', expectedScenarioId: 'EXP-001' },
      { testCaseId: 'TC-002', expectedScenarioId: 'EXP-001' }
    ]
  );

  assert.equal(result.truePositives, 1);
  assert.equal(result.falsePositives, 1);
  assert.equal(result.falseNegatives, 0);
});

for (const example of goldenDataset) {
  test(
    `Golden Dataset metrics: ${example.id}`,
    () => {
      const result = calculatePrecisionRecallF1(
        example.expectedScenarios.map(item => item.id),

        example.testCases.scenarios.map(item => item.id),

        example.scenarioMatches
      );

      console.log(`\n========== ${example.id} METRICS ==========`);

      console.log('True Positives:', result.truePositives);
      console.log('False Positives:', result.falsePositives);
      console.log('False Negatives:', result.falseNegatives);

      console.log('Precision:', `${result.precision}%`);
      console.log('Recall:', `${result.recall}%`);
      console.log('F1 Score:', `${result.f1Score}%`);
    }
  );
}

test('returns PASS when all quality thresholds are met', () => {
  const result = evaluateQualityThresholds({
    requirementCoverage: 100,
    acceptanceCriteriaCoverage: 100,
    scenarioQuality: 95,
    hasAcceptanceCriteria: true
  });

  assert.equal(result.status, 'PASS');
});

test('returns FAIL when a quality threshold is not met', () => {
  const result = evaluateQualityThresholds({
    requirementCoverage: 100,
    acceptanceCriteriaCoverage: 80,
    scenarioQuality: 95,
    hasAcceptanceCriteria: true
  });

  assert.equal(result.status, 'FAIL');
  assert.equal(result.acceptanceCriteriaCoveragePassed, false);
});

test('returns PASS when current metrics are equal to or better than baseline', () => {
  const result = compareRegressionMetrics(
    {
      requirementCoverage: 100,
      acceptanceCriteriaCoverage: 100,
      scenarioQuality: 90
    },
    {
      requirementCoverage: 100,
      acceptanceCriteriaCoverage: 100,
      scenarioQuality: 95
    }
  );

  assert.equal(result.status, 'PASS');
});

test('returns FAIL when a metric drops below baseline', () => {
  const result = compareRegressionMetrics(
    {
      requirementCoverage: 100,
      acceptanceCriteriaCoverage: 100,
      scenarioQuality: 90
    },
    {
      requirementCoverage: 100,
      acceptanceCriteriaCoverage: 80,
      scenarioQuality: 95
    }
  );

  assert.equal(result.status, 'FAIL');
});

test('allows a drop within the configured tolerance', () => {
  const result = compareRegressionMetrics(
    {
      requirementCoverage: 100,
      acceptanceCriteriaCoverage: 100,
      scenarioQuality: 90
    },
    {
      requirementCoverage: 100,
      acceptanceCriteriaCoverage: 98,
      scenarioQuality: 90
    },
    2
  );

  assert.equal(result.status, 'PASS');
});
