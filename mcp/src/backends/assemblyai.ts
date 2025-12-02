import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { TranscriptionResponse } from '../types.js';
import { validateAudioFile, formatTimestamp, getFileSize } from '../utils.js';

const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com';

function getApiKey(): string {
  const apiKey = process.env.ASSEMBLYAI_API_KEY || process.env.ASSEMBLY_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY or ASSEMBLY_API_KEY environment variable is not set');
  }
  return apiKey;
}

interface AssemblyAIUploadResponse {
  upload_url: string;
}

interface AssemblyAITranscriptResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
}

async function uploadFile(filePath: string, apiKey: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);

  return new Promise((resolve, reject) => {
    const url = new URL('/v2/upload', ASSEMBLYAI_BASE_URL);

    const options: https.RequestOptions = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length,
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
            const response: AssemblyAIUploadResponse = JSON.parse(data);
            resolve(response.upload_url);
          } catch (e) {
            reject(new Error(`Failed to parse upload response: ${data}`));
          }
        } else {
          reject(new Error(`Upload failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Upload request failed: ${e.message}`));
    });

    req.write(fileBuffer);
    req.end();
  });
}

async function createTranscript(audioUrl: string, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL('/v2/transcript', ASSEMBLYAI_BASE_URL);

    const body = JSON.stringify({
      audio_url: audioUrl,
    });

    const options: https.RequestOptions = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Authorization': apiKey,
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
            const response: AssemblyAITranscriptResponse = JSON.parse(data);
            resolve(response.id);
          } catch (e) {
            reject(new Error(`Failed to parse transcript creation response: ${data}`));
          }
        } else {
          reject(new Error(`Transcript creation failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Transcript creation request failed: ${e.message}`));
    });

    req.write(body);
    req.end();
  });
}

async function pollTranscript(transcriptId: string, apiKey: string): Promise<string> {
  const maxAttempts = 120; // 10 minutes max (5 second intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await getTranscriptStatus(transcriptId, apiKey);

    if (result.status === 'completed') {
      if (!result.text) {
        throw new Error('Transcription completed but no text was returned');
      }
      return result.text;
    }

    if (result.status === 'error') {
      throw new Error(`Transcription failed: ${result.error || 'Unknown error'}`);
    }

    // Wait 5 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Transcription timed out after 10 minutes');
}

async function getTranscriptStatus(transcriptId: string, apiKey: string): Promise<AssemblyAITranscriptResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/v2/transcript/${transcriptId}`, ASSEMBLYAI_BASE_URL);

    const options: https.RequestOptions = {
      method: 'GET',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Authorization': apiKey,
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
            const response: AssemblyAITranscriptResponse = JSON.parse(data);
            resolve(response);
          } catch (e) {
            reject(new Error(`Failed to parse transcript status response: ${data}`));
          }
        } else {
          reject(new Error(`Transcript status check failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Transcript status request failed: ${e.message}`));
    });

    req.end();
  });
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

export async function transcribeWithAssemblyAI(filePath: string): Promise<TranscriptionResponse> {
  validateAudioFile(filePath);

  const apiKey = getApiKey();

  // Step 1: Upload the file
  const uploadUrl = await uploadFile(filePath, apiKey);

  // Step 2: Create transcription job
  const transcriptId = await createTranscript(uploadUrl, apiKey);

  // Step 3: Poll for completion
  const transcript = await pollTranscript(transcriptId, apiKey);

  const timestamps = formatTimestamp();

  return {
    title: generateTitle(transcript),
    description: generateDescription(transcript),
    transcript,
    timestamp: timestamps.iso,
    timestamp_readable: timestamps.readable,
    backend: 'assemblyai',
    model: 'assemblyai-default',
  };
}
