# Cloud ASR MCP

[![npm version](https://badge.fury.io/js/cloud-asr-mcp.svg)](https://www.npmjs.com/package/cloud-asr-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for audio transcription using **multimodal LLMs**—not traditional ASR.

## How It Works

Unlike conventional speech-to-text (Whisper, etc.), this MCP uses audio-capable multimodal models (Gemini, GPT-4o Audio, Voxtral) that process audio in a **single pass**. The key advantage: you can provide **text prompt guidance** to clean up transcripts on the fly—removing filler words, formatting speaker turns, or applying custom instructions—all in one API call.

> **Tested:** Successfully transcribed 50-minute audio files using Gemini in one pass—no chunking required.

## Features

- **Single-pass transcription** - Multimodal LLMs process audio directly, no chunking needed
- **Prompt-guided cleanup** - Remove filler words, format output, or apply custom instructions
- **Multiple backends** - Gemini 2.5, GPT-4o Audio, Voxtral via OpenRouter or direct APIs
- **Long-form support** - Validated with 50+ minute audio files
- **Remote file support** - Works with MetaMCP via SSE transport
- **Optional file output** - Save transcripts as markdown files

## Tools

### OpenRouter (Recommended)

| Tool | Model | Description |
|------|-------|-------------|
| `openrouter_transcribe` | Any | Unified tool with model selection parameter |
| `openrouter_gemini` | Gemini 2.5 Flash | Fast and cost-effective |
| `openrouter_voxtral` | Voxtral Mini | Excellent voice transcription |
| `openrouter_gpt4o` | GPT-4o Audio | High quality transcription |

### Direct API Access

| Tool | Backend | Description |
|------|---------|-------------|
| `voxtral_transcribe` | Mistral | Direct Voxtral API (mini/small models) |
| `gemini_transcribe` | Google | Cleaned transcript with filler words removed |
| `gemini_transcribe_raw` | Google | Verbatim transcript |
| `openai_transcribe` | OpenAI | Whisper gpt-4o-transcribe |
| `openai_transcribe_economy` | OpenAI | Whisper gpt-4o-mini-transcribe |

## Installation

### From npm

```bash
npm install -g cloud-asr-mcp
```

### From source

```bash
git clone https://github.com/danielrosehill/Cloud-ASR-MCP.git
cd Cloud-ASR-MCP/mcp
npm install
npm run build
```

## Configuration

### Environment Variables

```bash
# OpenRouter (recommended - single key for all models)
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_DEFAULT_MODEL="gemini-flash"  # or gemini-pro, gpt-4o-audio, voxtral-mini, voxtral-small

# Direct API keys (optional)
MISTRAL_API_KEY="your-mistral-api-key"
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"

# Transport (for remote/MetaMCP use)
MCP_TRANSPORT="sse"  # or "stdio" (default)
MCP_PORT="3000"
```

## Claude Code MCP Configuration

Add to `~/.claude/settings.json`:

### Using npm package

```json
{
  "mcpServers": {
    "cloud-asr": {
      "command": "npx",
      "args": ["-y", "cloud-asr-mcp"],
      "env": {
        "OPENROUTER_API_KEY": "your-openrouter-api-key"
      }
    }
  }
}
```

### SSE Mode (for MetaMCP)

```bash
MCP_TRANSPORT=sse MCP_PORT=3000 npx cloud-asr-mcp
```

Then connect via SSE at `http://localhost:3000/sse`

## Usage Examples

### Basic transcription
```
Use openrouter_gemini to transcribe /path/to/audio.mp3
```

### Choose specific model
```
Use openrouter_transcribe with model "voxtral-small" on /path/to/audio.mp3
```

### Save transcript to file
```
Transcribe /path/to/audio.mp3 using openrouter_voxtral and save to /home/user/transcripts/
```

## Remote File Support

For remote clients (MetaMCP), send files as base64:

```json
{
  "file_content": "<base64-encoded-audio>",
  "file_name": "recording.mp3"
}
```

## Supported Audio Formats

MP3, WAV, OGG, FLAC, AAC, AIFF, M4A, WEBM, MPEG

## Requirements

- Node.js >= 18.0.0
- ffmpeg (for audio downsampling of large files)

## License

MIT

## Links

- [npm Package](https://www.npmjs.com/package/cloud-asr-mcp)
- [Report Issues](https://github.com/danielrosehill/Cloud-ASR-MCP/issues)
