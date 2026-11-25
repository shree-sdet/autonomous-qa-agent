
import 'dotenv/config';

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { runQAPipeline,runGoldenDatasetRegression,runRepeatabilityTest } from './qa.pipeline';

async function main() {

if (process.argv.includes('--regression')) {
  console.log('\n======================================');
  console.log(' AUTONOMOUS QA AGENT - REGRESSION');
  console.log('======================================');

  const results = await runGoldenDatasetRegression();

  let overallRegressionPassed = true;
  let overallQualityPassed = true;

  for (const result of results) {
    console.log(`\n--------------------------------------`);
    console.log(`Example: ${result.exampleId}`);
    console.log(`Feature: ${result.feature}`);
    console.log(`Quality Status: ${result.qualityStatus}`);
    console.log(`Regression Status: ${result.regressionStatus}`);

    if (result.qualityStatus === 'FAIL') {
      overallQualityPassed = false;
    }

    if (result.regressionStatus === 'FAIL') {
      overallRegressionPassed = false;
    }

    console.log('\nMetric Comparison:');

    for (const comparison of result.comparisons) {
      const difference =
        comparison.difference > 0
          ? `+${comparison.difference}`
          : `${comparison.difference}`;

      console.log(
        `${comparison.metric}: ` +
        `Baseline ${comparison.baseline}% | ` +
        `Current ${comparison.current}% | ` +
        `Difference ${difference} percentage points | ` +
        `${comparison.passed ? 'PASS' : 'FAIL'}`
      );
    }
  }

  console.log('\n======================================');
  console.log(' OVERALL REGRESSION SUMMARY');
  console.log('======================================');

  console.log(
    `Quality Evaluation: ${
      overallQualityPassed ? 'PASS' : 'FAIL'
    }`
  );

  console.log(
    `Regression Comparison: ${
      overallRegressionPassed ? 'PASS' : 'FAIL'
    }`
  );

  console.log('======================================');

  return;
}

if (process.argv.includes('--repeatability')) {
  const exampleId =
    process.argv.find((arg) => arg.startsWith('--example='))?.split('=')[1]
    ?? 'GOLD-002';

  const repetitionsArg =
    process.argv.find((arg) => arg.startsWith('--runs='))?.split('=')[1];

  const repetitions = repetitionsArg
    ? Number(repetitionsArg)
    : 2;

  const report = await runRepeatabilityTest(
    exampleId,
    repetitions
  );

  console.log('\n======================================');
  console.log(' AI EVALUATION - REPEATABILITY REPORT');
  console.log('======================================');

  for (const run of report.runs) {
    console.log(`\nRun ${run.runNumber}`);
    console.log(`Generated scenarios: ${run.scenarioCount}`);
    console.log(`Grounded scenarios: ${run.groundedScenarioCount}`);

    console.log(
      `Requirement coverage: ${run.metrics.requirementCoverage}%`
    );

    console.log(
      `Acceptance criteria coverage: ${run.metrics.acceptanceCriteriaCoverage}%`
    );

    console.log(
      `Scenario quality: ${run.metrics.scenarioQuality}%`
    );
  }

  console.log('\n======================================');
  console.log(' REPEATABILITY COMPARISON');
  console.log('======================================');

  const metricNames = [
    'requirementCoverage',
    'acceptanceCriteriaCoverage',
    'scenarioQuality'
  ] as const;

  for (const metric of metricNames) {
    const scores = report.runs.map(
      (run) => run.metrics[metric]
    );

    const min = Math.min(...scores);
    const max = Math.max(...scores);

    console.log(
      `${metric}: Min ${min}% | Max ${max}% | ` +
      `Variation ${max - min} percentage points`
    );
  }

  const scenarioCounts = report.runs.map(
    (run) => run.scenarioCount
  );

  const groundedCounts = report.runs.map(
    (run) => run.groundedScenarioCount
  );

  const metricsStable = metricNames.every((metric) => {
    const scores = report.runs.map(
      (run) => run.metrics[metric]
    );

    return scores.every((score) => score === scores[0]);
  });

  const scenarioCountsStable = scenarioCounts.every(
    (count) => count === scenarioCounts[0]
  );

  const groundedCountsStable = groundedCounts.every(
    (count) => count === groundedCounts[0]
  );

  console.log(
    `\nMetrics consistent: ${metricsStable ? 'YES' : 'NO'}`
  );

  console.log(
    `Scenario count consistent: ${scenarioCountsStable ? 'YES' : 'NO'}`
  );

  console.log(
    `Grounded scenario count consistent: ${groundedCountsStable ? 'YES' : 'NO'}`
  );

  console.log('======================================');

  return;
}

  const terminal = createInterface({
    input: stdin,
    output: stdout
  });

  try {
    console.log('\n====================================');
    console.log('       AUTONOMOUS QA AGENT');
    console.log('====================================\n');

    // Step 1: Accept user requirement
    const requirement = await terminal.question(
      'Enter your software requirement: '
    );

    // Step 2: Execute complete QA pipeline
    console.log('\nStarting QA pipeline...\n');

    const result = await runQAPipeline(requirement);

    // Step 3: Display requirement analysis
    console.log('\n========== REQUIREMENT ANALYSIS ==========');

    console.log('Feature:', result.requirementAnalysis.feature);

    console.log('\nSummary:');
    console.log(result.requirementAnalysis.summary);

    console.log('\nExtracted Requirements:');

    for (const item of result.requirementAnalysis.requirements) {
      console.log(`\n${item.id} - ${item.description}`);
      console.log(`Priority: ${item.priority}`);
      console.log(`Category: ${item.category}`);

      console.log('Acceptance Criteria:');

      if (item.acceptanceCriteria.length === 0) {
        console.log('- None explicitly provided');
      } else {
        item.acceptanceCriteria.forEach(criteria => {
          console.log(`- ${criteria}`);
        });
      }
    }

    // Step 4: Handle clarification
    if (result.status === 'needs_clarification') {
      console.log('\n========== CLARIFICATION REQUIRED ==========');

      result.requirementAnalysis.openQuestions.forEach(question => {
        console.log(`- ${question}`);
      });

      console.log('\nTest generation skipped.');
      return;
    }

    // Step 5: Display generated test cases
    console.log('\n========== GENERATED TEST CASES ==========');

    if (result.testCases) {
      for (const scenario of result.testCases.scenarios) {
        console.log(`\n${scenario.id}: ${scenario.title}`);
        console.log(`Priority: ${scenario.priority}`);
        console.log(`Category: ${scenario.category}`);

        console.log(
          `Requirements: ${scenario.requirementIds.join(', ')}`
        );

        console.log('\nSteps:');

        scenario.steps.forEach((step, index) => {
          console.log(`${index + 1}. ${step}`);
        });

        console.log('\nExpected Result:');
        console.log(scenario.expectedResult);
      }
    }

    // Step 6: Display evaluation report
    console.log('\n========== AI EVALUATION REPORT ==========');

    if (result.evaluation) {
      const evaluation = result.evaluation;

      console.log(`Total Scenarios: ${evaluation.totalScenarios}`);
      console.log(
        `Quality Passed: ${evaluation.qualityPassedScenarios}`
      );
      console.log(
        `Quality Failed: ${evaluation.qualityFailedScenarios}`
      );

      console.log(
        `Requirement Coverage: ${evaluation.coveragePercentage}%`
      );

      console.log('\nRequirement Coverage Details:');

      for (const item of evaluation.coverage) {
        console.log(
          `\n${item.requirementId}: ${item.covered ? 'Covered' : 'Not Covered'}`
        );

        console.log(`Description: ${item.description}`);

        console.log(
          `Matched Scenarios: ${
            item.matchedScenarios.join(', ') || 'None'
          }`
        );

        console.log(`Reasoning: ${item.reasoning}`);

        for (const criterion of item.acceptanceCriteria) {
          console.log(
            `- Acceptance Criterion: ${criterion.criterion}`
          );

          console.log(
            `  Status: ${criterion.covered ? 'Covered' : 'Not Covered'}`
          );
        }
      }

      // Display LLM-as-a-Judge scores
      console.log('\n========== SCENARIO QUALITY SCORES ==========');

      if (evaluation.scenarioAssessments.length === 0) {
        console.log('No scenario assessments available.');
      } else {
        for (const assessment of evaluation.scenarioAssessments) {
          console.log(`\nTest Case: ${assessment.testCaseId}`);

          console.log(`Relevance: ${assessment.relevanceScore}/5`);
          console.log(`Faithfulness: ${assessment.faithfulnessScore}/5`);
          console.log(`Clarity: ${assessment.clarityScore}/5`);
          console.log(`Feedback: ${assessment.feedback}`);
          console.log(`Evidence: ${assessment.evidence}`);
        }
      }

      console.log('\nDetected Quality Issues:');

      if (evaluation.issues.length === 0) {
        console.log('No quality issues detected.');
      } else {
        evaluation.issues.forEach(issue => {
          console.log(
            `- [${issue.type}] ${issue.testCaseId}: ${issue.message}`
          );
        });
      }

      console.log('\n========== FINAL QUALITY STATUS ==========');

      console.log(`Status: ${evaluation.qualityStatus}`);

      console.log(
        `Requirement Coverage: ${
          evaluation.thresholdResults.requirementCoveragePassed
            ? 'PASS'
            : 'FAIL'
        }`
      );

      console.log(
        `Acceptance Criteria Coverage: ${
          evaluation.thresholdResults.acceptanceCriteriaCoveragePassed
            ? 'PASS'
            : 'FAIL'
        }`
      );

      console.log(
        `Scenario Quality: ${
          evaluation.thresholdResults.scenarioQualityPassed
            ? 'PASS'
            : 'FAIL'
        }`
      );

      console.log('\nCovered Categories:');
      console.log(evaluation.coveredCategories.join(', ') || 'None');
    } else {
      console.log('Evaluation result is unavailable.');
    }

    console.log('\n====================================');
    console.log('       QA PIPELINE COMPLETED');
    console.log('====================================');

  } catch (error) {
    console.error('\nQA pipeline failed:', error);
    process.exitCode = 1;

  } finally {
    terminal.close();
  }
}

main();
