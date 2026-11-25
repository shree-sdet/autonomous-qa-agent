
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { analyzeRequirement } from './requirement.analyzer';

async function main() {
  const terminal = createInterface({
    input: stdin,
    output: stdout
  });

  try {
    console.log('\n===== AUTONOMOUS QA AGENT =====\n');

    const userRequirement = await terminal.question(
      'Enter your software requirement: '
    );

    console.log('\nAnalyzing requirement...\n');

    const analysis = await analyzeRequirement(userRequirement);

    console.log('--- REQUIREMENT ANALYSIS ---');
    console.log(JSON.stringify(analysis, null, 2));

    console.log('\n--- ANALYSIS SUMMARY ---');
    console.log(`Feature: ${analysis.feature}`);
    console.log(`Requirements extracted: ${analysis.requirements.length}`);
    console.log(`Assumptions: ${analysis.assumptions.length}`);
    console.log(`Open questions: ${analysis.openQuestions.length}`);

    if (analysis.needsClarification) {
      console.log('\nClarification required:');

      for (const question of analysis.openQuestions) {
        console.log(`- ${question}`);
      }
    } else {
      console.log('\nRequirement analysis completed.');
    }

  } catch (error) {
    console.error('\nRequirement analysis failed:', error);
    process.exitCode = 1;
  } finally {
    terminal.close();
  }
}

main();
