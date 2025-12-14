// Model configuration utility for multi-provider support
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";

export type ModelProvider = "openai" | "anthropic" | "qwen";

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

  if (provider === "qwen") {
    return "qwen";
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

  if (provider === "qwen") {
    return {
      provider: "qwen",
      primaryModel: "qwen3-coder",
      titleModel: "qwen3-coder",
      hasApiKey: !!process.env.AI_GATEWAY_API_KEY,
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

  if (provider === "qwen") {
    if (!process.env.AI_GATEWAY_API_KEY) {
      throw new Error("AI_GATEWAY_API_KEY is required when MODEL_PROVIDER=qwen");
    }
    return gateway(`alibaba/${modelId}`);
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

  if (provider === "qwen") {
    // Qwen-specific options
    // Gateway handles routing automatically
    return {
      // Add Qwen-specific options here if needed in the future
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
  const providerName =
    provider === "anthropic" ? "Anthropic" :
    provider === "openai" ? "OpenAI" :
    provider === "qwen" ? "Alibaba (Qwen)" :
    "Unknown";

  const displayModel =
    provider === "anthropic" ? "Claude Sonnet 4.5" :
    provider === "qwen" ? "Qwen3 Coder" :
    modelId;

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
