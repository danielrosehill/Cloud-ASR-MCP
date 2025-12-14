import * as fs from 'fs';
import * as https from 'https';
import { TranscriptionResponse } from '../types.js';
import { validateAudioFile, formatTimestamp } from '../utils.js';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export type VoxtralModel = 'voxtral-mini-latest' | 'voxtral-small-latest';

function getApiKey(): string {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY environment variable is not set');
  }
  return apiKey;
}

function getDefaultModel(): VoxtralModel {
  const envModel = process.env.VOXTRAL_MODEL;
  if (envModel === 'voxtral-mini-latest' || envModel === 'voxtral-small-latest') {
    return envModel;
  }
  return 'voxtral-mini-latest';
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

interface MistralResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

async function callMistralAPI(
  audioBase64: string,
  prompt: string,
  model: VoxtralModel,
  apiKey: string
): Promise<MistralResponse> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: audioBase64,
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const url = new URL(MISTRAL_API_URL);

    const options: https.RequestOptions = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response: MistralResponse = JSON.parse(data);
            resolve(response);
          } catch (e) {
            reject(new Error(`Failed to parse Mistral response: ${data}`));
          }
        } else {
          reject(new Error(`Mistral API error (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Mistral API request failed: ${e.message}`));
    });

    req.write(body);
    req.end();
  });
}

export async function transcribeWithVoxtral(
  filePath: string,
  model?: VoxtralModel,
  prompt?: string
): Promise<TranscriptionResponse> {
  validateAudioFile(filePath);

  const apiKey = getApiKey();
  const selectedModel = model || getDefaultModel();

  // Read and encode audio as base64
  const audioBuffer = fs.readFileSync(filePath);
  const audioBase64 = audioBuffer.toString('base64');

  const systemPrompt = prompt || 'Transcribe this audio accurately. Return only the transcription text.';

  const response = await callMistralAPI(audioBase64, systemPrompt, selectedModel, apiKey);

  const transcript = response.choices[0]?.message?.content || '';
  const timestamps = formatTimestamp();

  return {
    title: generateTitle(transcript),
    description: generateDescription(transcript),
    transcript,
    timestamp: timestamps.iso,
    timestamp_readable: timestamps.readable,
    backend: 'voxtral' as any,
    model: selectedModel,
    usage: {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
      generation_id: response.id,
    },
  };
}

// Convenience functions
export async function transcribeWithVoxtralMini(
  filePath: string,
  prompt?: string
): Promise<TranscriptionResponse> {
  return transcribeWithVoxtral(filePath, 'voxtral-mini-latest', prompt);
}

export async function transcribeWithVoxtralSmall(
  filePath: string,
  prompt?: string
): Promise<TranscriptionResponse> {
  return transcribeWithVoxtral(filePath, 'voxtral-small-latest', prompt);
}
