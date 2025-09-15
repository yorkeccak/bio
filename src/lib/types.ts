import { InferUITools, UIMessage, UIDataTypes } from 'ai';
import { healthcareTools } from './tools';

// Infer the types from our healthcare tools
export type HealthcareUITools = InferUITools<typeof healthcareTools>;

// Create a custom UIMessage type with our tools
export type HealthcareUIMessage = UIMessage<never, UIDataTypes, HealthcareUITools>;