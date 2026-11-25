
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  RequirementAnalysisSchema,
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

export async function analyzeRequirement(
  userRequirement: string
): Promise<RequirementAnalysis> {

  if (!userRequirement.trim()) {
    throw new Error('Requirement cannot be empty.');
  }

  const response = await client.responses.parse({
    model,

    instructions: `
You are an expert Business Analyst and Senior QA Engineer.

Your responsibility is to analyze software requirements
and extract accurate, structured, testable requirements.

REQUIREMENT EXTRACTION RULES:


REQUIREMENT EXTRACTION RULES:

1. Identify the feature being discussed.

2. Extract every distinct, explicitly stated requirement.
   Do not omit any requested behavior.

3. Do not split one requirement into multiple overlapping
   requirements.

   Split requirements only when they describe genuinely
   independent behaviors or business rules.

4. Convert each requirement into a clear,
   independently testable statement.

5. Extract acceptance criteria from the observable
   expected behaviors and conditions stated in the input.

6. A requirement sentence can itself represent an
   acceptance criterion when it describes a testable
   expected behavior.

7. For example:

   Input:
   "Users should be able to register using a valid email."

   Requirement:
   "Users can register using a valid email."

   Acceptance Criteria:
   - "Users can register using a valid email."

8. For example:

   Input:
   "Users should be able to upload PDF files up to 5 MB."

   Requirement:
   "Users can upload PDF files up to 5 MB."

   Acceptance Criteria:
   - "Users can upload PDF files up to 5 MB."

9. Extract multiple acceptance criteria when the input
   explicitly specifies multiple independent conditions.

10. Never invent additional functionality, validation
    rules, limits, expected outcomes or business behavior.

11. If the input genuinely contains no identifiable
    expected behavior or acceptance condition,
    return an empty acceptanceCriteria array.

12. Assign unique sequential requirement IDs:
    REQ-001, REQ-002, REQ-003, etc.

13. Assign priority and category based on the
    available requirement information.

14. Preserve the original supporting text in the source field.


AMBIGUITY HANDLING:

11. Distinguish missing information from
    explicitly stated requirements.

12. Put genuine assumptions in the assumptions array.
    Do not present assumptions as confirmed requirements.

13. Put unresolved questions in openQuestions.

14. Set needsClarification to true only when missing
    information prevents meaningful requirement analysis.

15. Missing detailed acceptance criteria alone does not
    mean clarification is required.

16. If the input is too vague to identify any meaningful
    testable requirement, return an empty requirements
    array and set needsClarification to true.

17. Do not ask questions about information the user
    has already explicitly provided.


QUALITY CHECK:

Before returning the result, verify:

- Every explicitly stated behavior is represented.
- No independent requirement has been omitted.
- No overlapping requirements have been unnecessarily created.
- Every testable expected behavior is represented
  in acceptanceCriteria.
- Acceptance criteria are directly supported by the input.
- No additional business rules or application behavior
  have been invented.
- Assumptions are not presented as confirmed requirements.
- Open questions represent genuine unresolved information.

Return structured output matching the supplied schema.

`,

    input: `
Analyze the following software requirement:

${userRequirement}
`,

    text: {
      format: zodTextFormat(
        RequirementAnalysisSchema,
        'requirement_analysis'
      )
    }
  });

  if (response.status !== 'completed') {
    throw new Error(
      `Requirement analysis was not completed. Status: ${response.status}`
    );
  }

  if (!response.output_parsed) {
    throw new Error(
      'The AI did not return a valid structured requirement analysis.'
    );
  }

  return RequirementAnalysisSchema.parse(
    response.output_parsed
  );
}
