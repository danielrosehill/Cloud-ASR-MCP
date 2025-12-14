import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { SUPPORTED_FORMATS, GEMINI_DOWNSAMPLE_THRESHOLD_BYTES } from './types.js';

export interface AudioFileInfo {
  originalPath: string;
  processedPath: string;
  mimeType: string;
  needsCleanup: boolean;
  fileSize: number;
}

export interface RemoteFileInput {
  file_path?: string;
  file_content?: string;
  file_name?: string;
}

export interface ResolvedFile {
  filePath: string;
  needsCleanup: boolean;
  mimeType: string;
}

/**
 * Writes base64-encoded file content to a temporary file.
 * Returns the path to the temp file.
 */
export function writeBase64ToTempFile(base64Content: string, fileName?: string): string {
  const tempDir = os.tmpdir();
  const ext = fileName ? path.extname(fileName).toLowerCase() : '.mp3';
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const tempPath = path.join(tempDir, `cloud_asr_remote_${uniqueId}${ext}`);

  const buffer = Buffer.from(base64Content, 'base64');
  fs.writeFileSync(tempPath, buffer);

  return tempPath;
}

/**
 * Resolves a file input (either local path or base64 content) to a local file path.
 * If base64 content is provided, writes it to a temp file.
 * Returns file info including whether cleanup is needed.
 */
export function resolveFileInput(input: RemoteFileInput): ResolvedFile {
  if (input.file_content) {
    // Remote file: decode base64 and write to temp
    const tempPath = writeBase64ToTempFile(input.file_content, input.file_name);
    const mimeType = input.file_name
      ? getMimeTypeFromFilename(input.file_name)
      : 'audio/mpeg';
    return {
      filePath: tempPath,
      needsCleanup: true,
      mimeType,
    };
  } else if (input.file_path) {
    // Local file: use directly
    return {
      filePath: input.file_path,
      needsCleanup: false,
      mimeType: getMimeType(input.file_path),
    };
  } else {
    throw new Error('Either file_path or file_content must be provided');
  }
}

/**
 * Gets mime type from a filename (when we don't have a local path)
 */
export function getMimeTypeFromFilename(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return SUPPORTED_FORMATS[ext] || 'audio/mpeg';
}

/**
 * Validates that the extension is supported (for remote files)
 */
export function validateFileExtension(fileName: string): void {
  const ext = path.extname(fileName).toLowerCase();
  if (!SUPPORTED_FORMATS[ext]) {
    const supported = Object.keys(SUPPORTED_FORMATS).join(', ');
    throw new Error(`Unsupported audio format: ${ext}. Supported formats: ${supported}`);
  }
}

/**
 * Cleans up a resolved file if needed (for temp files from remote content)
 */
export function cleanupResolvedFile(resolved: ResolvedFile): void {
  if (resolved.needsCleanup && fs.existsSync(resolved.filePath)) {
    try {
      fs.unlinkSync(resolved.filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
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
