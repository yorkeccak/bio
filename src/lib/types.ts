import { InferUITools, UIMessage, UIDataTypes } from 'ai';
import { healthcareTools } from './tools';

// Infer the types from our biomedical tools
export type BiomedUITools = InferUITools<typeof healthcareTools>;

// Create a custom UIMessage type with our tools
export type BiomedUIMessage = UIMessage<never, UIDataTypes, BiomedUITools>;