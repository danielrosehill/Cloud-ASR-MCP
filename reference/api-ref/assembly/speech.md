# Process speech understanding

POST https://llm-gateway.assemblyai.com/v1/understanding
Content-Type: application/json

Perform various speech understanding tasks like translation, speaker identification, and custom formatting.

Reference: https://www.assemblyai.com/docs/api-reference/llm-gateway/create-speech-understanding

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Process speech understanding
  version: endpoint_.createSpeechUnderstanding
paths:
  /understanding:
    post:
      operationId: create-speech-understanding
      summary: Process speech understanding
      description: >-
        Perform various speech understanding tasks like translation, speaker
        identification, and custom formatting.
      tags:
        - []
      parameters:
        - name: Authorization
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful response containing the speech understanding results.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/createSpeechUnderstanding_Response_200'
      requestBody:
        description: Request body for speech understanding tasks.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UnderstandingRequest'
components:
  schemas:
    TranslationRequestBodyTranslation:
      type: object
      properties:
        target_languages:
          type: array
          items:
            type: string
        formal:
          type: boolean
      required:
        - target_languages
    TranslationRequestBody:
      type: object
      properties:
        translation:
          $ref: '#/components/schemas/TranslationRequestBodyTranslation'
      required:
        - translation
    SpeakerIdentificationRequestBodySpeakerIdentificationSpeakerType:
      type: string
      enum:
        - value: role
        - value: name
    SpeakerIdentificationRequestBodySpeakerIdentification:
      type: object
      properties:
        speaker_type:
          $ref: >-
            #/components/schemas/SpeakerIdentificationRequestBodySpeakerIdentificationSpeakerType
        known_values:
          type: array
          items:
            type: string
      required:
        - speaker_type
    SpeakerIdentificationRequestBody:
      type: object
      properties:
        speaker_identification:
          $ref: >-
            #/components/schemas/SpeakerIdentificationRequestBodySpeakerIdentification
      required:
        - speaker_identification
    CustomFormattingRequestBodyCustomFormatting:
      type: object
      properties:
        date:
          type: string
        phone_number:
          type: string
        email:
          type: string
        format_utterances:
          type: boolean
    CustomFormattingRequestBody:
      type: object
      properties:
        custom_formatting:
          $ref: '#/components/schemas/CustomFormattingRequestBodyCustomFormatting'
      required:
        - custom_formatting
    UnderstandingRequestSpeechUnderstandingRequest:
      oneOf:
        - $ref: '#/components/schemas/TranslationRequestBody'
        - $ref: '#/components/schemas/SpeakerIdentificationRequestBody'
        - $ref: '#/components/schemas/CustomFormattingRequestBody'
    UnderstandingRequestSpeechUnderstanding:
      type: object
      properties:
        request:
          $ref: '#/components/schemas/UnderstandingRequestSpeechUnderstandingRequest'
      required:
        - request
    UnderstandingRequest:
      type: object
      properties:
        transcript_id:
          type: string
        speech_understanding:
          $ref: '#/components/schemas/UnderstandingRequestSpeechUnderstanding'
      required:
        - transcript_id
        - speech_understanding
    LlmGatewayTranslationResponseSpeechUnderstandingResponseTranslation:
      type: object
      properties:
        status:
          type: string
    LlmGatewayTranslationResponseSpeechUnderstandingResponse:
      type: object
      properties:
        translation:
          $ref: >-
            #/components/schemas/LlmGatewayTranslationResponseSpeechUnderstandingResponseTranslation
    LlmGatewayTranslationResponseSpeechUnderstanding:
      type: object
      properties:
        request:
          $ref: '#/components/schemas/TranslationRequestBody'
        response:
          $ref: >-
            #/components/schemas/LlmGatewayTranslationResponseSpeechUnderstandingResponse
    LlmGatewayTranslationResponseTranslatedTexts:
      type: object
      properties: {}
    LlmGatewayTranslationResponseUtterancesItems:
      type: object
      properties: {}
    LlmGatewayTranslationResponseWordsItems:
      type: object
      properties: {}
    LLMGatewayTranslationResponse:
      type: object
      properties:
        speech_understanding:
          $ref: >-
            #/components/schemas/LlmGatewayTranslationResponseSpeechUnderstanding
        translated_texts:
          $ref: '#/components/schemas/LlmGatewayTranslationResponseTranslatedTexts'
        utterances:
          type: array
          items:
            $ref: '#/components/schemas/LlmGatewayTranslationResponseUtterancesItems'
        words:
          type: array
          items:
            $ref: '#/components/schemas/LlmGatewayTranslationResponseWordsItems'
    LlmGatewaySpeakerIdentificationResponseSpeechUnderstandingResponseSpeakerIdentification:
      type: object
      properties:
        status:
          type: string
      required:
        - status
    LlmGatewaySpeakerIdentificationResponseSpeechUnderstandingResponse:
      type: object
      properties:
        speaker_identification:
          $ref: >-
            #/components/schemas/LlmGatewaySpeakerIdentificationResponseSpeechUnderstandingResponseSpeakerIdentification
    LlmGatewaySpeakerIdentificationResponseSpeechUnderstanding:
      type: object
      properties:
        request:
          $ref: '#/components/schemas/SpeakerIdentificationRequestBody'
        response:
          $ref: >-
            #/components/schemas/LlmGatewaySpeakerIdentificationResponseSpeechUnderstandingResponse
    LlmGatewaySpeakerIdentificationResponseUtterancesItems:
      type: object
      properties: {}
    LlmGatewaySpeakerIdentificationResponseWordsItems:
      type: object
      properties: {}
    LLMGatewaySpeakerIdentificationResponse:
      type: object
      properties:
        speech_understanding:
          $ref: >-
            #/components/schemas/LlmGatewaySpeakerIdentificationResponseSpeechUnderstanding
        utterances:
          type: array
          items:
            $ref: >-
              #/components/schemas/LlmGatewaySpeakerIdentificationResponseUtterancesItems
        words:
          type: array
          items:
            $ref: >-
              #/components/schemas/LlmGatewaySpeakerIdentificationResponseWordsItems
    LlmGatewayCustomFormattingResponseSpeechUnderstandingResponseCustomFormattingFormattedUtterancesItems:
      type: object
      properties: {}
    LlmGatewayCustomFormattingResponseSpeechUnderstandingResponseCustomFormatting:
      type: object
      properties:
        mapping:
          type: object
          additionalProperties:
            type: string
        formatted_text:
          type: string
        formatted_utterances:
          type: array
          items:
            $ref: >-
              #/components/schemas/LlmGatewayCustomFormattingResponseSpeechUnderstandingResponseCustomFormattingFormattedUtterancesItems
        status:
          type: string
      required:
        - mapping
        - formatted_text
        - formatted_utterances
        - status
    LlmGatewayCustomFormattingResponseSpeechUnderstandingResponse:
      type: object
      properties:
        custom_formatting:
          $ref: >-
            #/components/schemas/LlmGatewayCustomFormattingResponseSpeechUnderstandingResponseCustomFormatting
    LlmGatewayCustomFormattingResponseSpeechUnderstanding:
      type: object
      properties:
        request:
          $ref: '#/components/schemas/CustomFormattingRequestBody'
        response:
          $ref: >-
            #/components/schemas/LlmGatewayCustomFormattingResponseSpeechUnderstandingResponse
    LlmGatewayCustomFormattingResponseUtterancesItems:
      type: object
      properties: {}
    LLMGatewayCustomFormattingResponse:
      type: object
      properties:
        speech_understanding:
          $ref: >-
            #/components/schemas/LlmGatewayCustomFormattingResponseSpeechUnderstanding
        utterances:
          type: array
          items:
            $ref: >-
              #/components/schemas/LlmGatewayCustomFormattingResponseUtterancesItems
    createSpeechUnderstanding_Response_200:
      oneOf:
        - $ref: '#/components/schemas/LLMGatewayTranslationResponse'
        - $ref: '#/components/schemas/LLMGatewaySpeakerIdentificationResponse'
        - $ref: '#/components/schemas/LLMGatewayCustomFormattingResponse'

```