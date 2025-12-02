#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

import { transcribeWithGemini } from './backends/gemini.js';
import { transcribeWithOpenAINormal, transcribeWithOpenAIEconomy } from './backends/openai.js';
import { transcribeWithAssemblyAI } from './backends/assemblyai.js';
import { saveTranscriptToFile, slugify } from './utils.js';

const server = new Server(
  {
    name: 'cloud-asr-mcp',
    version: '0.1.0',
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
      // Gemini Tools
      {
        name: 'gemini_transcribe',
        description:
          'Transcribes an audio file using Google Gemini multimodal API. Returns a lightly edited transcript with filler words removed, verbal corrections applied, punctuation added, and paragraph breaks inserted. Includes metadata (title, description, timestamps). Supports MP3, WAV, OGG, FLAC, AAC, and AIFF formats. Best for short-to-medium audio where you want cleaned output.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Absolute path to the audio file to transcribe',
            },
            output_dir: {
              type: 'string',
              description:
                'Optional directory path where the transcript will be saved as a markdown file.',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'gemini_transcribe_raw',
        description:
          'Transcribes an audio file using Google Gemini multimodal API. Returns a verbatim transcript with NO cleanup - includes filler words, false starts, and repetitions exactly as spoken. Use this when you need exact speech-to-text without editing.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Absolute path to the audio file to transcribe',
            },
            output_dir: {
              type: 'string',
              description:
                'Optional directory path where the transcript will be saved as a markdown file.',
            },
          },
          required: ['file_path'],
        },
      },
      // OpenAI Tools
      {
        name: 'openai_transcribe',
        description:
          'Transcribes an audio file using OpenAI gpt-4o-transcribe model. High-quality transcription with the standard OpenAI model. Supports files up to 25MB in MP3, MP4, MPEG, MPGA, M4A, WAV, and WEBM formats. Can be customized with a prompt for better accuracy.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Absolute path to the audio file to transcribe',
            },
            prompt: {
              type: 'string',
              description:
                'Optional prompt to guide transcription accuracy. Useful for providing context about the audio content, technical terms, or acronyms.',
            },
            output_dir: {
              type: 'string',
              description:
                'Optional directory path where the transcript will be saved as a markdown file.',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'openai_transcribe_economy',
        description:
          'Transcribes an audio file using OpenAI gpt-4o-mini-transcribe model. Economy option with lower cost. Supports files up to 25MB in MP3, MP4, MPEG, MPGA, M4A, WAV, and WEBM formats.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Absolute path to the audio file to transcribe',
            },
            prompt: {
              type: 'string',
              description:
                'Optional prompt to guide transcription accuracy.',
            },
            output_dir: {
              type: 'string',
              description:
                'Optional directory path where the transcript will be saved as a markdown file.',
            },
          },
          required: ['file_path'],
        },
      },
      // AssemblyAI Tool
      {
        name: 'assemblyai_transcribe',
        description:
          'Transcribes an audio file using AssemblyAI. Best for long-form audio content - uses a job-based workflow that handles large files reliably. Returns transcript with job ID for reference. Supports most common audio formats.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Absolute path to the audio file to transcribe',
            },
            output_dir: {
              type: 'string',
              description:
                'Optional directory path where the transcript will be saved as a markdown file.',
            },
          },
          required: ['file_path'],
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
    output_dir?: string;
    prompt?: string;
  };
  const filePath = typedArgs?.file_path;
  const outputDir = typedArgs?.output_dir;
  const prompt = typedArgs?.prompt;

  if (!filePath) {
    return {
      content: [
        {
          type: 'text',
          text: 'Missing required parameter: file_path',
        },
      ],
      isError: true,
    };
  }

  try {
    let result;

    switch (name) {
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

      case 'assemblyai_transcribe':
        result = await transcribeWithAssemblyAI(filePath);
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
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cloud ASR MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
