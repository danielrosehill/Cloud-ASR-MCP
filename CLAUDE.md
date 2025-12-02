The purpose of this repository is to create a MCP server for my own use, open sourced, allowing for transcription using three different speech to text backends. I successfully created a Gemini MCP a few days ago. But sometimes I want to use different transcription tools, especially when transcribing long form audio content, where I still prefer to use a traditional speech to text model because I have more confidence in its ability to handle large outputs and it provides more robust mechanisms for downloading a generated transcript. 

I recorded an audio file which I then transcribed, outlining the idea here. But in summary, it's creating two different tools for Gemini, 1 for raw transcription and the other for transcribing with a system prompt. 

 All API documentation at today's date copied into repo at api-ref

But sources are:

Gemini:

https://ai.google.dev/gemini-api/docs/audio

OpenAI

https://platform.openai.com/docs/guides/speech-to-text

Assembly:

https://www.assemblyai.com/docs

For OpenAI let's create two tools:

- gpt-4o-transcribe 
- gpt-4o-mini-transcribe 

Described as 

openai-normal (transcribe)  
openai-economy (minii)

Support an environment variable for preferred openAI model so that the user does not have to specify unless they omit this or to override a default