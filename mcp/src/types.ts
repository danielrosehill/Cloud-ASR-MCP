export interface TranscriptionUsage {
  input_tokens: number;
  output_tokens: number;
  generation_id?: string;
  actual_cost?: number;
}

export interface TranscriptionResponse {
  title: string;
  description: string;
  transcript: string;
  timestamp: string;
  timestamp_readable: string;
  backend: 'gemini' | 'openai' | 'openrouter' | 'voxtral';
  model?: string;
  usage?: TranscriptionUsage;
}

export interface TranscriptionResult {
  success: boolean;
  data?: TranscriptionResponse;
  error?: string;
}

export const SUPPORTED_FORMATS: Record<string, string> = {
  '.mp3': 'audio/mp3',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.aiff': 'audio/aiff',
  '.m4a': 'audio/mp4',
  '.webm': 'audio/webm',
  '.mpeg': 'audio/mpeg',
  '.mpga': 'audio/mpeg',
};

// OpenAI has 25MB limit
export const OPENAI_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

// Gemini has larger limits but we'll downsample for efficiency
export const GEMINI_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const GEMINI_DOWNSAMPLE_THRESHOLD_BYTES = 15 * 1024 * 1024;
