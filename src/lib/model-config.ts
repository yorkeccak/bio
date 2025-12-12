// Model configuration utility for multi-provider support
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

export type ModelProvider = "openai" | "anthropic";

export interface ModelConfig {
  provider: ModelProvider;
  primaryModel: string;
  titleModel: string;
  hasApiKey: boolean;
}

/**
 * Get the configured model provider from environment
 * Defaults to Anthropic if not specified
 */
export function getModelProvider(): ModelProvider {
  const provider = process.env.MODEL_PROVIDER?.toLowerCase().trim();

  // Default to Anthropic
  if (!provider || provider === "anthropic") {
    return "anthropic";
  }

  if (provider === "openai") {
    return "openai";
  }

  // Invalid provider, log warning and default to Anthropic
  console.warn(`[Model Config] Invalid MODEL_PROVIDER: "${provider}". Defaulting to anthropic.`);
  return "anthropic";
}

/**
 * Get model configuration based on provider
 */
export function getModelConfig(): ModelConfig {
  const provider = getModelProvider();

  if (provider === "anthropic") {
    return {
      provider: "anthropic",
      primaryModel: "claude-sonnet-4-5-20250929",
      titleModel: "claude-3-5-haiku-20241022", // Fast, cheap model for titles
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    };
  }

  // OpenAI
  return {
    provider: "openai",
    primaryModel: "gpt-5",
    titleModel: "gpt-5-nano",
    hasApiKey: !!process.env.OPENAI_API_KEY,
  };
}

/**
 * Create a model instance for the configured provider
 */
export function createModel(modelId: string) {
  const provider = getModelProvider();

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required when MODEL_PROVIDER=anthropic");
    }
    return anthropic(modelId);
  }

  // OpenAI
  if (!process.env.OPENAI_API_KEY) {
    // Fallback to Vercel AI Gateway
    console.warn("[Model Config] OPENAI_API_KEY not found, using Vercel AI Gateway");
    return `openai/${modelId}`;
  }

  return openai(modelId);
}

/**
 * Get provider-specific options for streamText
 */
export function getProviderOptions(provider: ModelProvider): any {
  if (provider === "anthropic") {
    // Anthropic-specific options
    // Note: Claude doesn't have reasoning modes like OpenAI's o-series
    return {
      anthropic: {
        // Add Anthropic-specific options here if needed in the future
        // Currently, no special options required
      }
    };
  }

  // OpenAI-specific options
  return {
    openai: {
      store: true,
      reasoningEffort: 'medium',
      reasoningSummary: 'auto',
      include: ['reasoning.encrypted_content'],
    }
  };
}

/**
 * Get human-readable model information string
 */
export function getModelInfoString(
  modelId: string,
  provider: ModelProvider,
  context: "development" | "production" | "polar-tracked",
  userTier?: string
): string {
  const providerName = provider === "anthropic" ? "Anthropic" : "OpenAI";
  const displayModel = provider === "anthropic" ? "Claude Sonnet 4.5" : modelId;

  if (context === "development") {
    return `${providerName} (${displayModel}) - Development Mode`;
  }

  if (context === "polar-tracked") {
    return `${providerName} (${displayModel}) - Production Mode (Polar Tracked - Pay-per-use)`;
  }

  // Production mode
  if (userTier) {
    return `${providerName} (${displayModel}) - Production Mode (${userTier} tier - Flat Rate)`;
  }

  return `${providerName} (${displayModel}) - Production Mode (Anonymous)`;
}
