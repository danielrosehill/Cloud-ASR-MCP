#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express, { Request, Response } from 'express';

import { transcribeWithGemini } from './backends/gemini.js';
import { transcribeWithOpenAINormal, transcribeWithOpenAIEconomy } from './backends/openai.js';
import {
  transcribeWithOpenRouter,
  transcribeWithOpenRouterGemini,
  transcribeWithOpenRouterVoxtral,
  transcribeWithOpenRouterGPT4o,
  OPENROUTER_MODELS,
} from './backends/openrouter.js';
import {
  transcribeWithVoxtral,
  transcribeWithVoxtralMini,
  transcribeWithVoxtralSmall,
} from './backends/voxtral.js';
import {
  saveTranscriptToFile,
  resolveFileInput,
  cleanupResolvedFile,
  validateFileExtension,
  RemoteFileInput,
  ResolvedFile,
} from './utils.js';

// Environment configuration
const PORT = parseInt(process.env.MCP_PORT || process.env.PORT || '3000', 10);
const TRANSPORT_MODE = process.env.MCP_TRANSPORT || 'stdio';

// File input schema - supports both local path and remote content
const fileInputSchema = {
  file_path: {
    type: 'string',
    description: 'Absolute path to the audio file (for local mode). Either file_path or file_content is required.',
  },
  file_content: {
    type: 'string',
    description: 'Base64-encoded audio file content (for remote mode). Either file_path or file_content is required.',
  },
  file_name: {
    type: 'string',
    description: 'Original filename with extension (required when using file_content, for MIME type detection). Example: "recording.mp3"',
  },
};

function createServer() {
  const server = new Server(
    {
      name: 'cloud-asr-mcp',
      version: '0.3.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // ============== OpenRouter Tools (Recommended) ==============
        {
          name: 'openrouter_transcribe',
          description:
            'Transcribes audio using OpenRouter API (recommended). Single API key for multiple models including Gemini 2.5, GPT-4o, and Voxtral. Supports model selection via the model parameter. Default: google/gemini-2.5-flash. Shorthand models: gemini-flash, gemini-pro, gpt-4o-audio, voxtral-small, voxtral-mini.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              model: {
                type: 'string',
                description: 'Model to use. Shorthands: gemini-flash, gemini-pro, gpt-4o-audio, voxtral-small, voxtral-mini. Or full model ID like "google/gemini-2.5-flash-preview-05-20".',
              },
              prompt: {
                type: 'string',
                description: 'Optional prompt to guide transcription.',
              },
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },
        {
          name: 'openrouter_gemini',
          description:
            'Transcribes audio using Gemini 2.5 via OpenRouter. Uses google/gemini-2.5-flash by default. Fast and cost-effective.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              prompt: {
                type: 'string',
                description: 'Optional prompt to guide transcription.',
              },
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },
        {
          name: 'openrouter_voxtral',
          description:
            'Transcribes audio using Mistral Voxtral via OpenRouter. Uses voxtral-mini-latest. Excellent for voice transcription.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              prompt: {
                type: 'string',
                description: 'Optional prompt to guide transcription.',
              },
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },
        {
          name: 'openrouter_gpt4o',
          description:
            'Transcribes audio using OpenAI GPT-4o Audio via OpenRouter. Uses gpt-4o-audio-preview. High quality transcription.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              prompt: {
                type: 'string',
                description: 'Optional prompt to guide transcription.',
              },
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },

        // ============== Voxtral Direct (Mistral API) ==============
        {
          name: 'voxtral_transcribe',
          description:
            'Transcribes audio using Mistral Voxtral API directly. Requires MISTRAL_API_KEY. Models: voxtral-mini-latest (default), voxtral-small-latest.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              model: {
                type: 'string',
                enum: ['voxtral-mini-latest', 'voxtral-small-latest'],
                description: 'Voxtral model to use. Default: voxtral-mini-latest.',
              },
              prompt: {
                type: 'string',
                description: 'Optional prompt to guide transcription.',
              },
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },

        // ============== Legacy Tools (Direct API access) ==============
        {
          name: 'gemini_transcribe',
          description:
            'Transcribes audio using Google Gemini API directly (requires GEMINI_API_KEY). Returns cleaned transcript with filler words removed. Consider using openrouter_gemini instead for unified billing.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },
        {
          name: 'gemini_transcribe_raw',
          description:
            'Transcribes audio using Google Gemini API directly (requires GEMINI_API_KEY). Returns verbatim transcript with NO cleanup.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },
        {
          name: 'openai_transcribe',
          description:
            'Transcribes audio using OpenAI Whisper API directly (requires OPENAI_API_KEY). Uses gpt-4o-transcribe model.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              prompt: {
                type: 'string',
                description: 'Optional prompt to guide transcription accuracy.',
              },
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },
        {
          name: 'openai_transcribe_economy',
          description:
            'Transcribes audio using OpenAI Whisper API directly (requires OPENAI_API_KEY). Uses gpt-4o-mini-transcribe for lower cost.',
          inputSchema: {
            type: 'object',
            properties: {
              ...fileInputSchema,
              prompt: {
                type: 'string',
                description: 'Optional prompt to guide transcription accuracy.',
              },
              output_dir: {
                type: 'string',
                description: 'Optional directory to save transcript as markdown file.',
              },
            },
            required: [],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const typedArgs = args as {
      file_path?: string;
      file_content?: string;
      file_name?: string;
      output_dir?: string;
      prompt?: string;
      model?: string;
    };

    const fileInput: RemoteFileInput = {
      file_path: typedArgs?.file_path,
      file_content: typedArgs?.file_content,
      file_name: typedArgs?.file_name,
    };
    const outputDir = typedArgs?.output_dir;
    const prompt = typedArgs?.prompt;
    const model = typedArgs?.model;

    // Validate we have either file_path or file_content
    if (!fileInput.file_path && !fileInput.file_content) {
      return {
        content: [
          {
            type: 'text',
            text: 'Missing required parameter: Either file_path (for local files) or file_content (base64 for remote files) must be provided',
          },
        ],
        isError: true,
      };
    }

    // If file_content provided without file_name, require file_name
    if (fileInput.file_content && !fileInput.file_name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Missing required parameter: file_name is required when using file_content (for MIME type detection)',
          },
        ],
        isError: true,
      };
    }

    // Validate file extension if using remote content
    if (fileInput.file_name) {
      try {
        validateFileExtension(fileInput.file_name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: message }],
          isError: true,
        };
      }
    }

    let resolvedFile: ResolvedFile | null = null;

    try {
      // Resolve file input (write temp file if base64)
      resolvedFile = resolveFileInput(fileInput);
      const filePath = resolvedFile.filePath;

      let result;

      switch (name) {
        // OpenRouter tools (recommended)
        case 'openrouter_transcribe':
          result = await transcribeWithOpenRouter(filePath, model, prompt);
          break;

        case 'openrouter_gemini':
          result = await transcribeWithOpenRouterGemini(filePath, prompt);
          break;

        case 'openrouter_voxtral':
          result = await transcribeWithOpenRouterVoxtral(filePath, prompt);
          break;

        case 'openrouter_gpt4o':
          result = await transcribeWithOpenRouterGPT4o(filePath, prompt);
          break;

        // Voxtral direct
        case 'voxtral_transcribe':
          result = await transcribeWithVoxtral(
            filePath,
            model as 'voxtral-mini-latest' | 'voxtral-small-latest' | undefined,
            prompt
          );
          break;

        // Legacy direct API tools
        case 'gemini_transcribe':
          result = await transcribeWithGemini(filePath, false);
          break;

        case 'gemini_transcribe_raw':
          result = await transcribeWithGemini(filePath, true);
          break;

        case 'openai_transcribe':
          result = await transcribeWithOpenAINormal(filePath, prompt);
          break;

        case 'openai_transcribe_economy':
          result = await transcribeWithOpenAIEconomy(filePath, prompt);
          break;

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }

      // Save to file if output_dir provided
      let savedFilePath: string | undefined;
      if (outputDir && result) {
        savedFilePath = saveTranscriptToFile(
          outputDir,
          result.title,
          result.description,
          result.timestamp_readable,
          result.transcript
        );
      }

      // Include saved path in response if file was saved
      const response = savedFilePath
        ? { ...result, saved_to: savedFilePath }
        : result;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Transcription failed: ${message}`,
          },
        ],
        isError: true,
      };
    } finally {
      // Clean up temp file if it was created from base64 content
      if (resolvedFile) {
        cleanupResolvedFile(resolvedFile);
      }
    }
  });

  return server;
}

// Start with stdio transport
async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cloud ASR MCP server running on stdio');
}

// Start with SSE transport
async function startSSE() {
  const app = express();

  // Store active transports by session
  const transports: Map<string, SSEServerTransport> = new Map();

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', transport: 'sse', version: '0.3.0' });
  });

  // SSE endpoint
  app.get('/sse', async (req: Request, res: Response) => {
    console.error(`New SSE connection from ${req.ip}`);

    const transport = new SSEServerTransport('/message', res);
    const sessionId = crypto.randomUUID();
    transports.set(sessionId, transport);

    const server = createServer();

    res.on('close', () => {
      console.error(`SSE connection closed: ${sessionId}`);
      transports.delete(sessionId);
    });

    await server.connect(transport);
  });

  // Message endpoint for SSE
  app.post('/message', express.json({ limit: '100mb' }), async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  app.listen(PORT, () => {
    console.error(`Cloud ASR MCP server running on SSE at http://0.0.0.0:${PORT}`);
    console.error(`  - SSE endpoint: /sse`);
    console.error(`  - Message endpoint: /message`);
    console.error(`  - Health check: /health`);
  });
}

// Main entry point
async function main() {
  if (TRANSPORT_MODE === 'sse') {
    await startSSE();
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
