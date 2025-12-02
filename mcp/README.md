# Cloud ASR MCP

A Model Context Protocol (MCP) server providing cloud-based speech-to-text transcription using multiple backends: Google Gemini, OpenAI, and AssemblyAI.

## Features

- **5 transcription tools** across 3 cloud backends
- **Google Gemini**: Raw and cleaned transcription modes with LLM-powered editing
- **OpenAI**: Standard (gpt-4o-transcribe) and economy (gpt-4o-mini-transcribe) options
- **AssemblyAI**: Job-based workflow ideal for long-form audio
- **Automatic file handling**: Large file downsampling via ffmpeg
- **Optional file output**: Save transcripts as markdown files

## Tools

| Tool | Backend | Description |
|------|---------|-------------|
| `gemini_transcribe` | Gemini | Lightly edited transcript with filler words removed, punctuation added |
| `gemini_transcribe_raw` | Gemini | Verbatim transcript including filler words and corrections |
| `openai_transcribe` | OpenAI | High-quality transcription with gpt-4o-transcribe |
| `openai_transcribe_economy` | OpenAI | Cost-effective option using gpt-4o-mini-transcribe |
| `assemblyai_transcribe` | AssemblyAI | Best for long-form content with job-based processing |

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

Set the following environment variables for the backends you want to use:

```bash
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"
ASSEMBLYAI_API_KEY="your-assemblyai-api-key"  # Also accepts ASSEMBLY_API_KEY
```

## Claude Code MCP Configuration

Add to your Claude Code MCP settings (`~/.claude/settings.json`):

### Using npm package (recommended)

```json
{
  "mcpServers": {
    "cloud-asr": {
      "command": "npx",
      "args": ["-y", "cloud-asr-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "OPENAI_API_KEY": "your-openai-api-key",
        "ASSEMBLYAI_API_KEY": "your-assemblyai-api-key"
      }
    }
  }
}
```

### Using local installation

```json
{
  "mcpServers": {
    "cloud-asr": {
      "command": "node",
      "args": ["/path/to/Cloud-ASR-MCP/mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "OPENAI_API_KEY": "your-openai-api-key",
        "ASSEMBLYAI_API_KEY": "your-assemblyai-api-key"
      }
    }
  }
}
```

## Usage Examples

### Basic transcription
```
Use gemini_transcribe to transcribe /path/to/audio.mp3
```

### Save transcript to file
```
Transcribe /path/to/audio.mp3 using assemblyai_transcribe and save to /home/user/transcripts/
```

### OpenAI with prompt for better accuracy
```
Use openai_transcribe on /path/to/meeting.wav with prompt "Technical discussion about Kubernetes, Docker, and CI/CD pipelines"
```

## Supported Audio Formats

- MP3, WAV, OGG, FLAC, AAC, AIFF, M4A, WEBM, MPEG

## File Size Limits

| Backend | Max Size |
|---------|----------|
| OpenAI | 25 MB |
| Gemini | 100 MB (auto-downsampled if >15 MB) |
| AssemblyAI | 5 GB |

## Requirements

- Node.js >= 18.0.0
- ffmpeg (for audio downsampling of large files)

## License

MIT

## Links

- [GitHub Repository](https://github.com/danielrosehill/Cloud-ASR-MCP)
- [npm Package](https://www.npmjs.com/package/cloud-asr-mcp)
- [Report Issues](https://github.com/danielrosehill/Cloud-ASR-MCP/issues)
