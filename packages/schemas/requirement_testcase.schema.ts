
import { z } from 'zod';

// ==========================================
// 1. Requirement Analysis Schemas
// ==========================================

export const RequirementSchema = z.object({
  id: z.string().min(1),

  description: z.string().min(1),

  priority: z.enum(['High', 'Medium', 'Low']),

  category: z.enum([
    'Functional',
    'Validation',
    'Security',
    'Performance',
    'Accessibility',
    'Usability',
    'Compatibility',
    'Business Rule',
    'Other'
  ]),

  // Can be empty when acceptance criteria
  // are not explicitly provided or cannot be extracted.
  acceptanceCriteria: z.array(z.string().min(1)),

  source: z.string().min(1)
});

export const RequirementAnalysisSchema = z.object({
  feature: z.string().min(1),

  summary: z.string().min(1),

  // Can be empty if the requirement is unclear.
  requirements: z.array(RequirementSchema),

  assumptions: z.array(z.string()),

  openQuestions: z.array(z.string()),

  needsClarification: z.boolean()
});

// Inferred requirement types
export type Requirement = z.infer<typeof RequirementSchema>;

export type RequirementAnalysis = z.infer<
  typeof RequirementAnalysisSchema
>;


// ==========================================
// 2. Test Case Generation Schemas
// ==========================================

export const TestCaseSchema = z.object({
  id: z.string().trim().min(1),

  title: z.string().trim().min(1),

  priority: z.enum(['High', 'Medium', 'Low']),

  category: z.enum([
    'Functional',
    'Negative',
    'Security',
    'Accessibility',
    'Performance',
    'Responsive',
    'Usability',
    'Compatibility',
    'Validation',
    'Business Rule',
    'Other'
  ]),

  requirementIds: z.array(
    z.string().trim().min(1)
  ),

  steps: z.array(
    z.string().trim().min(1)
  ).min(1),

  expectedResult: z.string().trim().min(1)
});

export const TestCaseResponseSchema = z.object({
  feature: z.string().min(1),

  scenarios: z.array(TestCaseSchema).min(1)
});

// Inferred test case types
export type TestCase = z.infer<typeof TestCaseSchema>;

export type TestCaseResponse = z.infer<
  typeof TestCaseResponseSchema
>;
