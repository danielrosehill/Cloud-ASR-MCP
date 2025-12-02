# Create a chat completion

POST https://llm-gateway.assemblyai.com/v1/chat/completions
Content-Type: application/json

Generates a response from a model given a prompt or a series of messages.

Reference: https://www.assemblyai.com/docs/api-reference/llm-gateway/create-chat-completion

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create a chat completion
  version: endpoint_.createChatCompletion
paths:
  /chat/completions:
    post:
      operationId: create-chat-completion
      summary: Create a chat completion
      description: >-
        Generates a response from a model given a prompt or a series of
        messages.
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
          description: Successful response containing the model's choices.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
      requestBody:
        description: Request body for creating a chat completion.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LLMGatewayRequest'
components:
  schemas:
    UserAssistantSystemMessageRole:
      type: string
      enum:
        - value: user
        - value: assistant
        - value: system
    ContentPart:
      description: Any type
    UserAssistantSystemMessageContent1:
      type: array
      items:
        $ref: '#/components/schemas/ContentPart'
    UserAssistantSystemMessageContent:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/UserAssistantSystemMessageContent1'
    UserAssistantSystemMessage:
      type: object
      properties:
        role:
          $ref: '#/components/schemas/UserAssistantSystemMessageRole'
        content:
          $ref: '#/components/schemas/UserAssistantSystemMessageContent'
        name:
          type: string
      required:
        - role
        - content
    ToolMessageRole:
      type: string
      enum:
        - value: tool
    ToolMessage:
      type: object
      properties:
        role:
          $ref: '#/components/schemas/ToolMessageRole'
        content:
          type: string
        tool_call_id:
          type: string
      required:
        - role
        - content
        - tool_call_id
    Message:
      oneOf:
        - $ref: '#/components/schemas/UserAssistantSystemMessage'
        - $ref: '#/components/schemas/ToolMessage'
    ToolType:
      type: string
      enum:
        - value: function
    FunctionDescription:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        parameters:
          type: object
          additionalProperties:
            description: Any type
      required:
        - name
        - parameters
    Tool:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ToolType'
        function:
          $ref: '#/components/schemas/FunctionDescription'
      required:
        - type
        - function
    ToolChoice0:
      type: string
      enum:
        - value: none
        - value: auto
    ToolChoiceOneOf1Type:
      type: string
      enum:
        - value: function
    ToolChoiceOneOf1Function:
      type: object
      properties:
        name:
          type: string
      required:
        - name
    ToolChoice1:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ToolChoiceOneOf1Type'
        function:
          $ref: '#/components/schemas/ToolChoiceOneOf1Function'
      required:
        - type
        - function
    ToolChoice:
      oneOf:
        - $ref: '#/components/schemas/ToolChoice0'
        - $ref: '#/components/schemas/ToolChoice1'
    LLMGatewayRequest:
      type: object
      properties:
        messages:
          type: array
          items:
            $ref: '#/components/schemas/Message'
        prompt:
          type: string
        model:
          type: string
        max_tokens:
          type: integer
        temperature:
          type: number
          format: double
        tools:
          type: array
          items:
            $ref: '#/components/schemas/Tool'
        tool_choice:
          $ref: '#/components/schemas/ToolChoice'
      required:
        - model
    ResponseMessage:
      type: object
      properties:
        role:
          type: string
        content:
          type: string
    FunctionToolCallType:
      type: string
      enum:
        - value: function
    FunctionCall:
      type: object
      properties:
        name:
          type: string
        arguments:
          type: string
      required:
        - name
        - arguments
    FunctionToolCall:
      type: object
      properties:
        id:
          type: string
        type:
          $ref: '#/components/schemas/FunctionToolCallType'
        function:
          $ref: '#/components/schemas/FunctionCall'
      required:
        - id
        - type
        - function
    Choice:
      type: object
      properties:
        message:
          $ref: '#/components/schemas/ResponseMessage'
        finish_reason:
          type: string
        tool_calls:
          type: array
          items:
            $ref: '#/components/schemas/FunctionToolCall'
    ResponseRequest:
      type: object
      properties:
        model:
          type: string
        max_tokens:
          type: integer
        temperature:
          type: number
          format: double
        tools:
          type: array
          items:
            $ref: '#/components/schemas/Tool'
        tool_choice:
          $ref: '#/components/schemas/ToolChoice'
    Usage:
      type: object
      properties:
        prompt_tokens:
          type: integer
        completion_tokens:
          type: integer
        total_tokens:
          type: integer
      required:
        - prompt_tokens
        - completion_tokens
        - total_tokens
    Response:
      type: object
      properties:
        request_id:
          type: string
          format: uuid
        choices:
          type: array
          items:
            $ref: '#/components/schemas/Choice'
        request:
          $ref: '#/components/schemas/ResponseRequest'
        usage:
          $ref: '#/components/schemas/Usage'
        http_status_code:
          type: integer
        response_time:
          type: integer
        llm_status_code:
          type: integer

```