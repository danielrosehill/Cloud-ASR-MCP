import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import * as fs from 'fs';
import { TranscriptionResponse } from '../types.js';
import { GEMINI_RAW_TRANSCRIPTION_PROMPT, GEMINI_CLEANED_TRANSCRIPTION_PROMPT } from '../prompts.js';
import {
  validateAudioFile,
  prepareAudioFile,
  cleanupTempFile,
  formatTimestamp,
  AudioFileInfo,
} from '../utils.js';
import { GEMINI_MAX_FILE_SIZE_BYTES } from '../types.js';

const MODEL_NAME = 'gemini-2.0-flash';

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return apiKey;
}

async function waitForFileProcessing(ai: GoogleGenAI, fileName: string): Promise<void> {
  let file = await ai.files.get({ name: fileName });

  while (file.state === 'PROCESSING') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    file = await ai.files.get({ name: fileName });
  }

  if (file.state === 'FAILED') {
    throw new Error('File processing failed in Gemini');
  }
}

function parseJsonResponse(text: string): Partial<TranscriptionResponse> {
  let cleaned = text.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      title: 'Voice Note',
      description: 'Transcribed voice note.',
      transcript: text,
    };
  }
}

export async function transcribeWithGemini(
  filePath: string,
  raw: boolean = false
): Promise<TranscriptionResponse> {
  validateAudioFile(filePath, GEMINI_MAX_FILE_SIZE_BYTES);

  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  let audioInfo: AudioFileInfo | null = null;
  let uploadedFileName: string | null = null;

  try {
    audioInfo = await prepareAudioFile(filePath);

    const fileBuffer = fs.readFileSync(audioInfo.processedPath);
    const fileBlob = new Blob([fileBuffer], { type: audioInfo.mimeType });

    const uploadResult = await ai.files.upload({
      file: fileBlob,
      config: {
        mimeType: audioInfo.mimeType,
        displayName: `transcription_${Date.now()}`,
      },
    });

    uploadedFileName = uploadResult.name!;

    await waitForFileProcessing(ai, uploadedFileName);

    const uploadedFile = await ai.files.get({ name: uploadedFileName });

    const prompt = raw ? GEMINI_RAW_TRANSCRIPTION_PROMPT : GEMINI_CLEANED_TRANSCRIPTION_PROMPT;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: createUserContent([
        createPartFromUri(uploadedFile.uri!, uploadedFile.mimeType!),
        prompt,
      ]),
    });

    const text = result.text;
    if (!text) {
      throw new Error('No text response from Gemini');
    }

    const parsed = parseJsonResponse(text);
    const timestamps = formatTimestamp();

    return {
      title: parsed.title || 'Voice Note',
      description: parsed.description || 'Transcribed voice note.',
      transcript: parsed.transcript || text,
      timestamp: timestamps.iso,
      timestamp_readable: timestamps.readable,
      backend: 'gemini',
      model: MODEL_NAME,
    };
  } finally {
    if (audioInfo) {
      cleanupTempFile(audioInfo);
    }
    if (uploadedFileName) {
      try {
        await ai.files.delete({ name: uploadedFileName });
      } catch {
        // Ignore deletion errors
      }
    }
  }
}
