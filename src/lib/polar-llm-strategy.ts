import { Ingestion } from "@polar-sh/ingestion";
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import { getModelProvider, getModelConfig } from "./model-config";

// Initialize Polar LLM Ingestion Strategy
let llmIngestion: any = null;

export function initializePolarLLMStrategy() {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    throw new Error('POLAR_ACCESS_TOKEN required for LLM tracking');
  }

  if (!llmIngestion) {
    const modelConfig = getModelConfig();

    // Create the base model for Polar tracking based on configured provider
    let baseModel;
    if (modelConfig.provider === "anthropic") {
      baseModel = anthropic(modelConfig.primaryModel);
    } else if (modelConfig.provider === "qwen") {
      if (!process.env.AI_GATEWAY_API_KEY) {
        throw new Error('AI_GATEWAY_API_KEY required for Qwen tracking');
      }
      baseModel = gateway(`alibaba/${modelConfig.primaryModel}`);
    } else {
      baseModel = openai(modelConfig.primaryModel);
    }

    llmIngestion = Ingestion({
      accessToken: process.env.POLAR_ACCESS_TOKEN
    })
    .strategy(new LLMStrategy(baseModel))
    .ingest("llm_tokens"); // This should match your Polar meter filter

  }

  return llmIngestion;
}

// Get a wrapped model for a specific customer
export function getPolarTrackedModel(userId: string, modelName: string = "gpt-5") {
  const ingestion = initializePolarLLMStrategy();
  
  
  // Return the wrapped model with customer tracking
  const trackedModel = ingestion.client({
    externalCustomerId: userId
  });
  
  return trackedModel;
}

// Alternative function to get different model types
export function getPolarTrackedOpenAIModel(userId: string, modelName: string = "gpt-5") {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return openai(modelName);
  }

  try {
    const ingestion = Ingestion({ 
      accessToken: process.env.POLAR_ACCESS_TOKEN 
    })
    .strategy(new LLMStrategy(openai(modelName)))
    .ingest("llm_tokens");
    
    return ingestion.client({
      externalCustomerId: userId
    });
  } catch (error) {
    return openai(modelName);
  }
}