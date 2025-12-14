import OpenAI from 'openai';
import * as fs from 'fs';
import { TranscriptionResponse } from '../types.js';
import { validateAudioFile, formatTimestamp, getFileSize } from '../utils.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Default models for different providers via OpenRouter
export const OPENROUTER_MODELS = {
  'gemini-flash': 'google/gemini-2.5-flash-preview-05-20',
  'gemini-pro': 'google/gemini-2.5-pro-preview',
  'gpt-4o-audio': 'openai/gpt-4o-audio-preview',
  'voxtral-small': 'mistralai/voxtral-small-latest',
  'voxtral-mini': 'mistralai/voxtral-mini-latest',
} as const;

export type OpenRouterModel = keyof typeof OPENROUTER_MODELS | string;

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }
  return apiKey;
}

function getDefaultModel(): string {
  const envModel = process.env.OPENROUTER_DEFAULT_MODEL;
  if (envModel) {
    // Check if it's a shorthand
    if (envModel in OPENROUTER_MODELS) {
      return OPENROUTER_MODELS[envModel as keyof typeof OPENROUTER_MODELS];
    }
    return envModel;
  }
  return OPENROUTER_MODELS['gemini-flash'];
}

function resolveModel(model?: string): string {
  if (!model) {
    return getDefaultModel();
  }
  // Check if it's a shorthand
  if (model in OPENROUTER_MODELS) {
    return OPENROUTER_MODELS[model as keyof typeof OPENROUTER_MODELS];
  }
  return model;
}

function generateTitle(transcript: string): string {
  const words = transcript.split(/\s+/).slice(0, 6);
  let title = words.join(' ');
  if (transcript.split(/\s+/).length > 6) {
    title += '...';
  }
  return title || 'Audio Transcription';
}

function generateDescription(transcript: string): string {
  const firstSentence = transcript.split(/[.!?]/)[0];
  if (firstSentence.length <= 100) {
    return firstSentence.trim() + '.';
  }
  return firstSentence.substring(0, 100).trim() + '...';
}

export async function transcribeWithOpenRouter(
  filePath: string,
  model?: string,
  prompt?: string
): Promise<TranscriptionResponse> {
  validateAudioFile(filePath);

  const client = new OpenAI({
    apiKey: getApiKey(),
    baseURL: OPENROUTER_BASE_URL,
  });

  const resolvedModel = resolveModel(model);

  // Read and encode audio as base64
  const audioBuffer = fs.readFileSync(filePath);
  const audioBase64 = audioBuffer.toString('base64');

  // Determine audio format from file extension
  const ext = filePath.toLowerCase().split('.').pop() || 'wav';
  const formatMap: Record<string, string> = {
    'wav': 'wav',
    'mp3': 'mp3',
    'ogg': 'ogg',
    'flac': 'flac',
    'm4a': 'mp4',
    'webm': 'webm',
  };
  const audioFormat = formatMap[ext] || 'wav';

  const systemPrompt = prompt || 'Transcribe this audio accurately. Return only the transcription text.';

  const response = await client.chat.completions.create({
    model: resolvedModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: systemPrompt },
          {
            type: 'input_audio',
            input_audio: {
              data: audioBase64,
              format: audioFormat,
            },
          } as any,
        ],
      },
    ],
  });

  const transcript = response.choices[0]?.message?.content || '';
  const timestamps = formatTimestamp();

  // Extract usage info if available
  const usage = response.usage;
  const inputTokens = usage?.prompt_tokens || 0;
  const outputTokens = usage?.completion_tokens || 0;

  return {
    title: generateTitle(transcript),
    description: generateDescription(transcript),
    transcript,
    timestamp: timestamps.iso,
    timestamp_readable: timestamps.readable,
    backend: 'openrouter' as any,
    model: resolvedModel,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      generation_id: response.id,
    },
  };
}

// Convenience functions for specific model presets
export async function transcribeWithOpenRouterGemini(
  filePath: string,
  prompt?: string
): Promise<TranscriptionResponse> {
  return transcribeWithOpenRouter(filePath, 'gemini-flash', prompt);
}

export async function transcribeWithOpenRouterVoxtral(
  filePath: string,
  prompt?: string
): Promise<TranscriptionResponse> {
  return transcribeWithOpenRouter(filePath, 'voxtral-mini', prompt);
}

export async function transcribeWithOpenRouterGPT4o(
  filePath: string,
  prompt?: string
): Promise<TranscriptionResponse> {
  return transcribeWithOpenRouter(filePath, 'gpt-4o-audio', prompt);
}
