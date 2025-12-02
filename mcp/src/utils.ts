import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SUPPORTED_FORMATS, GEMINI_DOWNSAMPLE_THRESHOLD_BYTES } from './types.js';

export interface AudioFileInfo {
  originalPath: string;
  processedPath: string;
  mimeType: string;
  needsCleanup: boolean;
  fileSize: number;
}

export function validateAudioFile(filePath: string, maxSize?: number): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_FORMATS[ext]) {
    const supported = Object.keys(SUPPORTED_FORMATS).join(', ');
    throw new Error(`Unsupported audio format: ${ext}. Supported formats: ${supported}`);
  }

  if (maxSize) {
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      throw new Error(`File too large (${Math.round(stats.size / 1024 / 1024)}MB). Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
    }
  }
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_FORMATS[ext] || 'audio/mpeg';
}

export function getFileSize(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size;
}

export function formatTimestamp(): { iso: string; readable: string } {
  const now = new Date();
  const iso = now.toISOString();

  const day = now.getDate();
  const month = now.toLocaleString('en-US', { month: 'short' });
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const readable = `${day} ${month} ${year} ${hours}:${minutes}`;

  return { iso, readable };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);
}

export async function prepareAudioFile(filePath: string, downsampleThreshold: number = GEMINI_DOWNSAMPLE_THRESHOLD_BYTES): Promise<AudioFileInfo> {
  const stats = fs.statSync(filePath);
  const mimeType = getMimeType(filePath);

  if (stats.size <= downsampleThreshold) {
    return {
      originalPath: filePath,
      processedPath: filePath,
      mimeType,
      needsCleanup: false,
      fileSize: stats.size,
    };
  }

  const processedPath = await downsampleAudio(filePath);
  const processedStats = fs.statSync(processedPath);

  return {
    originalPath: filePath,
    processedPath,
    mimeType: 'audio/mp3',
    needsCleanup: true,
    fileSize: processedStats.size,
  };
}

async function downsampleAudio(inputPath: string): Promise<string> {
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `cloud_asr_${Date.now()}.mp3`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-ac', '1',
      '-ar', '16000',
      '-b:a', '32k',
      '-y',
      outputPath,
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to run ffmpeg. Is it installed? Error: ${err.message}`));
    });
  });
}

export function cleanupTempFile(fileInfo: AudioFileInfo): void {
  if (fileInfo.needsCleanup && fs.existsSync(fileInfo.processedPath)) {
    try {
      fs.unlinkSync(fileInfo.processedPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export function saveTranscriptToFile(
  outputDir: string,
  title: string,
  description: string,
  timestamp_readable: string,
  transcript: string
): string {
  const slug = slugify(title || 'transcript');
  const filename = `${slug}.md`;
  const savedFilePath = path.join(outputDir, filename);

  const markdownContent = `# ${title}

> ${description}

*Transcribed: ${timestamp_readable}*

---

${transcript}
`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(savedFilePath, markdownContent, 'utf-8');
  return savedFilePath;
}
