
import OpenAI from 'openai';
import 'dotenv/config';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateResponse() {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL!,
    instructions: `
      You are a Senior QA Engineer.
      Generate clear and actionable test scenarios.
    `,
    input: `
      Generate test scenarios for
      the Juice Shop product search feature.
    `
  });

  console.log(response.output_text);
}

generateResponse();
