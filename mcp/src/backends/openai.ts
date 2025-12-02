import OpenAI from 'openai';
import * as fs from 'fs';
import { TranscriptionResponse, OPENAI_MAX_FILE_SIZE_BYTES } from '../types.js';
import { validateAudioFile, formatTimestamp, getFileSize } from '../utils.js';

// Model types
export type OpenAITranscriptionModel = 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';

// Environment variable for default model preference
const DEFAULT_MODEL_ENV = 'OPENAI_TRANSCRIPTION_MODEL';

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return apiKey;
}

function getDefaultModel(): OpenAITranscriptionModel {
  const envModel = process.env[DEFAULT_MODEL_ENV];
  if (envModel === 'gpt-4o-transcribe' || envModel === 'gpt-4o-mini-transcribe') {
    return envModel;
  }
  // Default to the standard model
  return 'gpt-4o-transcribe';
}

function generateTitle(transcript: string): string {
  // Generate a simple title from first few words
  const words = transcript.split(/\s+/).slice(0, 6);
  let title = words.join(' ');
  if (transcript.split(/\s+/).length > 6) {
    title += '...';
  }
  return title || 'Audio Transcription';
}

function generateDescription(transcript: string): string {
  // Generate a description from first sentence or 100 chars
  const firstSentence = transcript.split(/[.!?]/)[0];
  if (firstSentence.length <= 100) {
    return firstSentence.trim() + '.';
  }
  return firstSentence.substring(0, 100).trim() + '...';
}

export async function transcribeWithOpenAI(
  filePath: string,
  model?: OpenAITranscriptionModel,
  prompt?: string
): Promise<TranscriptionResponse> {
  validateAudioFile(filePath, OPENAI_MAX_FILE_SIZE_BYTES);

  const fileSize = getFileSize(filePath);
  if (fileSize > OPENAI_MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File too large for OpenAI (${Math.round(fileSize / 1024 / 1024)}MB). ` +
      `Maximum size is 25MB. Consider using AssemblyAI for larger files.`
    );
  }

  const client = new OpenAI({ apiKey: getApiKey() });
  const selectedModel = model || getDefaultModel();

  const transcriptionOptions: OpenAI.Audio.TranscriptionCreateParams = {
    file: fs.createReadStream(filePath),
    model: selectedModel,
    response_format: 'text',
  };

  // Add prompt if provided (supported by gpt-4o-transcribe and gpt-4o-mini-transcribe)
  if (prompt) {
    transcriptionOptions.prompt = prompt;
  }

  const transcription = await client.audio.transcriptions.create(transcriptionOptions);

  // The response is just text when response_format is 'text'
  const transcript = typeof transcription === 'string' ? transcription : (transcription as { text: string }).text;
  const timestamps = formatTimestamp();

  return {
    title: generateTitle(transcript),
    description: generateDescription(transcript),
    transcript,
    timestamp: timestamps.iso,
    timestamp_readable: timestamps.readable,
    backend: 'openai',
    model: selectedModel,
  };
}

// Convenience functions for specific models
export async function transcribeWithOpenAINormal(
  filePath: string,
  prompt?: string
): Promise<TranscriptionResponse> {
  return transcribeWithOpenAI(filePath, 'gpt-4o-transcribe', prompt);
}

export async function transcribeWithOpenAIEconomy(
  filePath: string,
  prompt?: string
): Promise<TranscriptionResponse> {
  return transcribeWithOpenAI(filePath, 'gpt-4o-mini-transcribe', prompt);
}
