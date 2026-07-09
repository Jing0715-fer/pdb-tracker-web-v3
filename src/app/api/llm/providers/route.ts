/**
 * GET /api/llm/providers
 *
 * Mock of the pdb-tracker-web-v3 provider-detection endpoint. Reports which
 * LLM providers/CLIs are "available" so the Skills panel can render the
 * selector pills. Mirrors the original response shape.
 */
export const runtime = 'nodejs';

export async function GET() {
  const body = {
    env: {
      provider: process.env.LLM_PROVIDER || '',
      apiKey: process.env.LLM_API_KEY ? '***' : '',
      baseUrl: process.env.LLM_BASE_URL || '',
      model: process.env.LLM_MODEL || '',
    },
    chosen: 'zai',
    available: [
      {
        provider: 'zai',
        reason: 'z-ai-web-dev-sdk is always available in this environment',
        label: 'Z.ai SDK',
      },
      {
        provider: 'cli:hermes',
        bin: '/usr/local/bin/hermes',
        reason: 'Hermes CLI detected on PATH',
        label: 'Hermes CLI',
      },
      {
        provider: 'anthropic',
        reason: 'Anthropic SDK available (ANTHROPIC_API_KEY not set, will prompt)',
        label: 'Anthropic SDK',
      },
      {
        provider: 'openai',
        reason: 'OpenAI SDK available (OPENAI_API_KEY not set, will prompt)',
        label: 'OpenAI SDK',
      },
    ],
    totalClisScanned: 3,
  };
  return Response.json(body);
}
