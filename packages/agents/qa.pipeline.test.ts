
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { executeRepeatabilityTest } from '../evaluations/repeatability';

test('repeatability executes mock pipeline twice consistently', async () => {
  let callCount = 0;

  const mockPipeline = async () => {
    callCount++;

    return {
      status: 'completed' as const,
      testCases: {
        scenarios: [
          { id: 'TC-001' },
          { id: 'TC-002' }
        ]
      },
      evaluation: {
        coveragePercentage: 100,
        acceptanceCriteriaCoveragePercentage: 100,
        scenarioQualityPercentage: 100,
        scenarioAssessments: [
          { expectedResultGrounded: true },
          { expectedResultGrounded: true }
        ]
      }
    };
  };

  const result = await executeRepeatabilityTest(
    'Users should be able to upload PDFs.',
    2,
    mockPipeline
  );

  assert.equal(callCount, 2);
  assert.equal(result.runs.length, 2);
  assert.equal(result.runs[0].scenarioCount, 2);
  assert.equal(result.runs[1].scenarioCount, 2);
  assert.equal(result.runs[0].metrics.scenarioQuality, 100);
  assert.equal(result.runs[1].metrics.scenarioQuality, 100);
});


function createMockResult(
  quality: number = 100
) {
  return {
    status: 'completed' as const,
    testCases: {
      scenarios: [
        { id: 'TC-001' },
        { id: 'TC-002' }
      ]
    },
    evaluation: {
      coveragePercentage: 100,
      acceptanceCriteriaCoveragePercentage: 100,
      scenarioQualityPercentage: quality,
      scenarioAssessments: [
        { expectedResultGrounded: true },
        { expectedResultGrounded: true }
      ]
    }
  };
}

// Test 2: Detect score variation
test('repeatability captures score variations', async () => {
  let callCount = 0;

  const mockPipeline = async () => {
    callCount++;

    return callCount === 1
      ? createMockResult(100)
      : createMockResult(75);
  };

  const result = await executeRepeatabilityTest(
    'PDF upload requirement',
    2,
    mockPipeline
  );

  assert.equal(result.runs[0].metrics.scenarioQuality, 100);
  assert.equal(result.runs[1].metrics.scenarioQuality, 75);
  assert.notEqual(
    result.runs[0].metrics.scenarioQuality,
    result.runs[1].metrics.scenarioQuality
  );
});

// Test 3: Handle failed pipeline execution
test('repeatability handles failed pipeline execution', async () => {
  let callCount = 0;

  const mockPipeline = async () => {
    callCount++;

    if (callCount === 1) {
      return createMockResult(100);
    }

    return {
      status: 'needs_clarification' as const,
      testCases: null,
      evaluation: null
    };
  };

  await assert.rejects(
    () => executeRepeatabilityTest(
      'PDF upload requirement',
      2,
      mockPipeline
    ),
    /Repeatability run 2 failed/
  );
});

// Test 4: Reject invalid repetition count
test('repeatability rejects fewer than two runs', async () => {
  const mockPipeline = async () => createMockResult();

  await assert.rejects(
    () => executeRepeatabilityTest(
      'PDF upload requirement',
      1,
      mockPipeline
    ),
    /Repetitions must be an integer of at least 2/
  );
});

test('repeatability reports metric variations correctly', async () => {
  let callCount = 0;

  const mockPipeline = async () => {
    callCount++;

    return createMockResult(
      callCount === 1 ? 100 : 75
    );
  };

  const result = await executeRepeatabilityTest(
    'PDF upload requirement',
    2,
    mockPipeline
  );

  assert.equal(result.consistent, false);

  assert.equal(
    result.metricVariations.scenarioQuality.variation,
    25
  );

  assert.equal(
    result.metricVariations.scenarioQuality.min,
    75
  );

  assert.equal(
    result.metricVariations.scenarioQuality.max,
    100
  );
});
