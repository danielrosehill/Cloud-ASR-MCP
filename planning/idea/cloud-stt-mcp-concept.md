# Cloud Speech-to-Text MCP: Concept & Design

**Date**: 2 Dec 2025
**Status**: Planning

## Overview

This repository houses a collection of cloud speech-to-text tools built as MCP servers, designed for use with Claude (particularly Claude Code and Opus 4.5). The core philosophy is to create bespoke, minimal MCP servers rather than using bloated multi-tool servers that require disabling unused functionality.

## Rationale

The current MCP ecosystem is overwhelming with servers that provide many tools you don't need. The solution: create focused, single-purpose MCPs with only the tool definitions you actually use. This repository follows that principle for cloud-based speech-to-text services.

## Proposed Tool Architecture

### Target: 4 Tools Total

1. **Gemini Transcription (Raw)** - Pure speech-to-text using Gemini's multimodal audio capabilities
2. **Gemini Transcription (Cleaned)** - Leverages Gemini's combined LLM + audio processing to return cleaned, organized text
3. **OpenAI Whisper** - Popular gold-standard STT model
4. **AssemblyAI** - Reliable traditional STT with job numbers and downloadable outputs

### Why These Three Backends?

| Service | Best For | Characteristics |
|---------|----------|-----------------|
| **Gemini** | Short-to-medium audio, when cleanup is desired | Multimodal, can process audio + prompt together |
| **OpenAI Whisper** | General-purpose, industry standard | Widely trusted, good baseline |
| **AssemblyAI** | Long transcriptions, reliability | Traditional job-based workflow, avoids context window issues |

## Use Case Considerations

- **Short audio**: Gemini multimodal works well
- **Long audio**: Prefer traditional STT (AssemblyAI) that returns job IDs and downloadable results, avoiding context window challenges
- **Cleanup needed**: Gemini's dual capability (audio processing + LLM) in a single turn

## Technical Requirements

### Environment Variables (3 required)

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`

### Distribution Plan

- Publish to npm for easy installation
- Primary target: Claude Code
- Documentation will include MCP definition with all three environment variables
- Local MCP providing reliable cloud STT access

## Extensibility

While this implementation focuses on three backends for personal use, the architecture allows forking and extension to support:

- Azure Speech Services
- Gladia
- Speechmatics
- Other cloud STT providers

## Notes

This is the first attempt at creating an MCP server requiring multiple API keys. Previous single-key MCPs have been published to npm successfully for easier cross-device installation (avoiding the need to clone and build from source each time).
