# Upload a media file

POST https://api.assemblyai.com/v2/upload
Content-Type: application/octet-stream

<Note>To upload a media file to our EU server, replace `api.assemblyai.com` with `api.eu.assemblyai.com`.</Note>
Upload a media file to AssemblyAI's servers.


Reference: https://www.assemblyai.com/docs/api-reference/files/upload

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Upload a media file
  version: endpoint_files.upload
paths:
  /v2/upload:
    post:
      operationId: upload
      summary: Upload a media file
      description: >
        <Note>To upload a media file to our EU server, replace
        `api.assemblyai.com` with `api.eu.assemblyai.com`.</Note>

        Upload a media file to AssemblyAI's servers.
      tags:
        - - subpackage_files
      parameters:
        - name: Authorization
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Media file uploaded successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadedFile'
        '400':
          description: Bad request
          content: {}
        '401':
          description: Unauthorized
          content: {}
        '404':
          description: Not found
          content: {}
        '429':
          description: Too many requests
          content: {}
        '500':
          description: An error occurred while processing the request
          content: {}
        '503':
          description: Service unavailable
          content: {}
        '504':
          description: Gateway timeout
          content: {}
      requestBody:
        content:
          application/octet-stream:
            schema:
              type: string
              format: binary
components:
  schemas:
    UploadedFile:
      type: object
      properties:
        upload_url:
          type: string
          format: url
      required:
        - upload_url

```