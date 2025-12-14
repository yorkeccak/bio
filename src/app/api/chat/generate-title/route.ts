import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { gateway } from '@ai-sdk/gateway';
import { getModelConfig } from '@/lib/model-config';

export async function POST(req: Request) {
  let requestBody: { message: string } | null = null;

  try {
    requestBody = await req.json();

    if (!requestBody) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { message } = requestBody;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get model configuration
    const modelConfig = getModelConfig();

    // Generate title using AI
    const { text } = await generateText({
      model: modelConfig.hasApiKey
        ? (modelConfig.provider === "anthropic"
            ? anthropic(modelConfig.titleModel)
            : modelConfig.provider === "openai"
            ? openai(modelConfig.titleModel)
            : modelConfig.provider === "qwen"
            ? gateway(`alibaba/${modelConfig.titleModel}`)
            : anthropic(modelConfig.titleModel))
        : `${modelConfig.provider === "qwen" ? "alibaba" : modelConfig.provider}/${modelConfig.titleModel}`,
      prompt: `Generate a concise title (max 50 characters) for a biomedical research chat conversation that starts with this message.
      The title should capture the main topic or question.
      If it's about a specific drug, disease, or clinical trial, include it.
      Return ONLY the title, no quotes, no explanation.

      User message: "${message}"`,
      temperature: 0.3
    });

    const title = text.trim().substring(0, 50);

    return new Response(JSON.stringify({ title }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Title generation error:', error);
    // Fallback to simple truncation using cached request body
    if (requestBody?.message) {
      const fallbackTitle = requestBody.message.substring(0, 47) + '...';

      return new Response(JSON.stringify({ title: fallbackTitle }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If we don't have the message, return a generic title
    return new Response(JSON.stringify({ title: 'New Chat' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}