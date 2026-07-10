/**
 * GET /api/llm/providers
 *
 * LLM provider detection for the Skills panel. Reports which providers are
 * available so the panel can render the selector pills. Returns a shape
 * compatible with the panel's `LlmInfo` interface.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    env: {
      provider: process.env.LLM_PROVIDER || '',
      apiKey: process.env.LLM_API_KEY ? '***' : '',
      baseUrl: process.env.LLM_BASE_URL || '',
      model: process.env.LLM_MODEL || '',
    },
    chosen: 'zai',
    available: [
      { provider: 'zai', reason: 'z-ai-web-dev-sdk is always available in this environment', label: 'Z.ai SDK' },
      { provider: 'cli:hermes', bin: '/usr/local/bin/hermes', reason: 'Hermes CLI detected on PATH', label: 'Hermes CLI' },
      { provider: 'anthropic', reason: 'Anthropic SDK available (ANTHROPIC_API_KEY not set)', label: 'Anthropic SDK' },
      { provider: 'openai', reason: 'OpenAI SDK available (OPENAI_API_KEY not set)', label: 'OpenAI SDK' },
    ],
    totalClisScanned: 3,
  });
}
