
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  TestCaseResponseSchema,
  type TestCaseResponse,
  type RequirementAnalysis
} from '../schemas/requirement_testcase.schema';

// Validate environment configuration
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL;

if (!apiKey) {
  throw new Error('OPENAI_API_KEY is missing from environment variables.');
}

if (!model) {
  throw new Error('OPENAI_MODEL is missing from environment variables.');
}

const client = new OpenAI({
  apiKey
});

export async function generateTestCases(
  requirementAnalysis: RequirementAnalysis
): Promise<TestCaseResponse> {

  if (
    requirementAnalysis.needsClarification ||
    requirementAnalysis.requirements.length === 0
  ) {
    throw new Error(
      'Cannot generate test cases without sufficiently analyzed requirements.'
    );
  }

  const response = await client.responses.parse({
    model,

    instructions: `
You are a Senior QA Engineer specializing in
software test design and quality engineering.

Your task is to generate comprehensive test scenarios
from the supplied structured requirement analysis.

GENERATION RULES:

1. Generate test scenarios for every supplied requirement.

2. Cover positive and negative scenarios where relevant.

3. Include boundary, validation, security,
   accessibility, performance and other relevant
   scenarios when supported by the requirements.

4. Do not invent application behavior,
   business rules or implementation details.

5. Use the supplied requirement descriptions and
   acceptance criteria as the source of truth.

6. Do not treat assumptions as confirmed requirements.

7. If acceptance criteria are missing, do not invent
   expected application behavior. Use only behavior
   explicitly supported by the requirement.

8. Every test case must contain:
   - A unique test case ID.
   - A clear and descriptive title.
   - An appropriate priority.
   - An appropriate category.
   - At least one requirement ID in requirementIds.
   - Clear, actionable test steps.
   - A specific and testable expected result.

REQUIREMENT TRACEABILITY:

9. Populate requirementIds with the IDs of the
   requirements that the test case is intended to cover.

10. Only use requirement IDs supplied in the input.

11. A test case may reference multiple requirements
    when it genuinely covers them.

12. Do not assign a requirement ID merely because
    the test case mentions similar words.


STRICT REQUIREMENT GROUNDING RULES:

1. Generate test scenarios only from explicitly stated
   requirements and acceptance criteria.

2. Do not invent business rules, validation rules,
   restrictions, or expected behaviors.

3. Do not assume that a file type, size, format,
   authentication method, or other condition must
   be rejected unless the requirement explicitly
   specifies that behavior.

4. Every expected result must be directly supported
   by the requirement or acceptance criteria.

5. If a behavior is not specified, do not generate
   a test scenario that assumes its expected outcome.

6. Before returning test cases, verify that every
   scenario's expected result is grounded in the
   provided requirement and acceptance criteria.

7. Prioritize meaningful positive, negative,
   boundary, and validation scenarios, but only
   where the expected behavior is explicitly defined.

TEST QUALITY:

13. Avoid duplicate test scenarios.

14. Keep each test scenario focused on a clear objective.

15. Make test steps understandable and executable.

16. Avoid vague expected results such as
    "works properly" or "works as expected".

17. Return structured output matching the supplied schema.
`,

    input: JSON.stringify(requirementAnalysis, null, 2),

    text: {
      format: zodTextFormat(
        TestCaseResponseSchema,
        'test_case_response'
      )
    }
  });

  if (response.status !== 'completed') {
    throw new Error(
      `Test generation was not completed: ${response.status}`
    );
  }

  if (!response.output_parsed) {
    throw new Error(
      'The AI did not return valid structured test cases.'
    );
  }

  const testCases = TestCaseResponseSchema.parse(
    response.output_parsed
  );

  return testCases;
}
