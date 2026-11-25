
import type {
    RequirementAnalysis,
    TestCaseResponse
} from '../schemas/requirement_testcase.schema';

export type GoldenExample = {
    id: string;
    inputRequirement: string;
    requirementAnalysis: RequirementAnalysis;
    testCases: TestCaseResponse;

    // Expected scenarios (our trusted reference)
    expectedScenarios: {
        id: string;
        description: string;
    }[];

    // Manually verified mapping between generated and expected scenarios
    scenarioMatches: {
        testCaseId: string;
        expectedScenarioId: string | null;
    }[];

    expected: {
        relevant: boolean;
        expectedResultGrounded: boolean;
        clear: boolean;
    };
};

export const goldenDataset: GoldenExample[] = [
    // Example 1: Correct output - Registration
    {
        id: 'GOLD-001',
        inputRequirement: 'Users can register using a valid email.',
        requirementAnalysis: {
            feature: 'User Registration',
            summary: 'Users can register using a valid email.',
            requirements: [
                {
                    id: 'REQ-001',
                    description: 'Users can register with a valid email.',
                    priority: 'High',
                    category: 'Functional',
                    acceptanceCriteria: [
                        'A user can register with a valid email.'
                    ],
                    source: 'User requirement'
                }
            ],
            assumptions: [],
            openQuestions: [],
            needsClarification: false
        },

        testCases: {
            feature: 'User Registration',
            scenarios: [
                {
                    id: 'TC-001',
                    title: 'Register with a valid email',
                    priority: 'High',
                    category: 'Functional',
                    requirementIds: ['REQ-001'],
                    steps: [
                        'Open the registration page.',
                        'Enter a valid email.',
                        'Submit the registration form.'
                    ],
                    expectedResult: 'The user successfully registers.'
                }
            ]
        },

        expectedScenarios: [
            {
                id: 'EXP-001',
                description: 'Register with a valid email.'
            }
        ],

        scenarioMatches: [
            {
                testCaseId: 'TC-001',
                expectedScenarioId: 'EXP-001'
            }
        ],

        expected: {
            relevant: true,
            expectedResultGrounded: true,
            clear: true
        }
    },

    // Example 2: Hallucinated output - File Upload
    {
        id: 'GOLD-002',
        inputRequirement: 'Users can upload PDF files up to 5 MB.',
        requirementAnalysis: {
            feature: 'File Upload',
            summary: 'Users can upload PDF files up to 5 MB.',
            requirements: [
                {
                    id: 'REQ-001',
                    description: 'Users can upload PDF files up to 5 MB.',
                    priority: 'High',
                    category: 'Functional',
                    acceptanceCriteria: [
                        'A PDF file up to 5 MB can be uploaded successfully.'
                    ],
                    source: 'User requirement'
                }
            ],
            assumptions: [],
            openQuestions: [],
            needsClarification: false
        },

        testCases: {
            feature: 'File Upload',
            scenarios: [
                {
                    id: 'TC-002',
                    title: 'Upload a valid PDF file',
                    priority: 'High',
                    category: 'Functional',
                    requirementIds: ['REQ-001'],
                    steps: [
                        'Open the file upload page.',
                        'Select a PDF file smaller than 5 MB.',
                        'Click Upload.'
                    ],
                    expectedResult:
                        'The PDF uploads successfully, is converted into a Word document, and is emailed to the user.'
                }
            ]
        },

        expectedScenarios: [
            {
                id: 'EXP-001',
                description: 'Upload a valid PDF file up to 5 MB.'
            }
        ],

        scenarioMatches: [
            {
                testCaseId: 'TC-002',
                expectedScenarioId: 'EXP-001'
            }
        ],

        expected: {
            relevant: true,
            expectedResultGrounded: false,
            clear: true
        }
    },


    {
        id: 'GOLD-003',
        inputRequirement: 'Users should be able to upload PDF files up to 5 MB. Files larger than 5 MB must be rejected. Non-PDF files must be rejected.',
        requirementAnalysis: {
            feature: 'File Upload',
            summary: 'Users can upload PDF files up to 5 MB.',
            requirements: [
                {
                    id: 'REQ-001',
                    description: 'Users can upload PDF files up to 5 MB.',
                    priority: 'High',
                    category: 'Functional',
                    acceptanceCriteria: [
                        'Users can upload a valid PDF file up to 5 MB.',
                        'Files larger than 5 MB must be rejected.',
                        'Non-PDF files must be rejected.'
                    ],
                    source: 'User requirement'
                }
            ],
            assumptions: [],
            openQuestions: [],
            needsClarification: false
        },

        testCases: {
            feature: 'File Upload',
            scenarios: [
                {
                    id: 'TC-003',
                    title: 'Upload a valid PDF',
                    priority: 'High',
                    category: 'Functional',
                    requirementIds: ['REQ-001'],
                    steps: [
                        'Open the upload page.',
                        'Select a valid PDF smaller than 5 MB.',
                        'Click Upload.'
                    ],
                    expectedResult: 'The PDF uploads successfully.'
                },
                {
                    id: 'TC-004',
                    title: 'Reject PDF larger than 5 MB',
                    priority: 'High',
                    category: 'Validation',
                    requirementIds: ['REQ-001'],
                    steps: [
                        'Open the upload page.',
                        'Select a PDF larger than 5 MB.',
                        'Click Upload.'
                    ],
                    expectedResult: 'The system rejects the file.'
                },
                {
                    id: 'TC-005',
                    title: 'Reject non-PDF file',
                    priority: 'High',
                    category: 'Validation',
                    requirementIds: ['REQ-003'],
                    steps: [
                        'Open the upload page.',
                        'Select a file that is not a PDF.',
                        'Click Upload.'
                    ],
                    expectedResult: 'The system rejects the non-PDF file.'
                }
            ]
        },

        expectedScenarios: [
            {
                id: 'EXP-001',
                description: 'Upload a valid PDF up to 5 MB.'
            },
            {
                id: 'EXP-002',
                description: 'Reject files larger than 5 MB.'
            },
            {
                id: 'EXP-003',
                description: 'Reject non-PDF files.'
            }
        ],

        scenarioMatches: [
            { testCaseId: 'TC-003', expectedScenarioId: 'EXP-001' },
            { testCaseId: 'TC-004', expectedScenarioId: 'EXP-002' },
            { testCaseId: 'TC-005', expectedScenarioId: 'EXP-003' }
        ],

        expected: {
            relevant: true,
            expectedResultGrounded: true,
            clear: true
        }
    }

];
