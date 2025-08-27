# AI Integration Features

This document describes the AI integration features implemented in the AI Process Generator application.

## Overview

The application now includes real AI integrations for:
- **LLM Processing**: OpenAI GPT-4o Mini API integration for BPMN and LaTeX generation
- **Speech-to-Text**: OpenAI Whisper API for voice input
- **Text-to-Speech**: OpenAI TTS for audio responses
- **Document Processing**: PDF and DOCX text extraction
- **Cost Optimization**: Caching, token limits, and economy mode

## API Endpoints

### 1. LLM Processing (`/api/ai/llm`)
- **Purpose**: Generate AI responses using OpenAI GPT-4o Mini API
- **Features**: 
  - BPMN XML generation with business process explanations
  - LaTeX code generation with document structure explanations
  - BPMN question answering and business workflow consulting
  - Professional business process guidance
  - Guardrails to keep responses within scope
  - Token counting and monitoring
  - Economy mode for focused responses

### 2. Speech-to-Text (`/api/ai/whisper`)
- **Purpose**: Convert audio input to text using OpenAI Whisper
- **Features**:
  - 30-second recording limit
  - Audio file validation
  - Clean transcription output

### 3. Text-to-Speech (`/api/ai/tts`)
- **Purpose**: Convert text responses to speech
- **Features**:
  - OpenAI TTS with multiple voice options
  - Configurable voice settings
  - Base64 audio output for frontend
  - Cost-effective voice generation

### 4. Document Processing (`/api/ai/document`)
- **Purpose**: Extract text from uploaded documents
- **Features**:
  - PDF and DOCX support
  - Text cleaning and filtering
  - Irrelevant content removal
  - Size and type validation

## Enhanced Response Format

### BPMN Generation Responses
- **Business Process Explanation**: Clear description of the process being modeled
- **BPMN XML Code**: Complete, valid BPMN 2.0 XML structure
- **Business Insights**: Additional recommendations and process optimization tips
- **Professional Formatting**: Color-coded sections for better readability

### LaTeX Generation Responses
- **Document Structure Explanation**: Clear description of what the LaTeX will create
- **Complete LaTeX Code**: Full, compilable LaTeX document
- **Usage Instructions**: Compilation notes and best practices

### Business Process Consulting
- **Expert Guidance**: Professional advice on workflow optimization
- **BPMN Best Practices**: Standards-compliant modeling guidance
- **Process Insights**: Actionable business recommendations

## Guardrails and Scope Control

### Intent Detection System
- **Smart Analysis**: Automatically detects user intent from natural language
- **BPMN Generation**: Triggers when users want diagrams, processes, or workflows
- **LaTeX Generation**: Activates for document creation requests
- **Business Consulting**: Provides guidance for process questions and advice
- **Scope Enforcement**: Automatically redirects off-topic requests

### Response Boundaries
- **BPMN Expertise**: Business process modeling and workflow design
- **LaTeX Generation**: Document creation for business and technical purposes
- **Business Consulting**: Process optimization and workflow guidance
- **Scope Enforcement**: Polite redirection for off-topic requests

### Professional Standards
- **Business Tone**: Maintains professional consulting standards
- **Actionable Advice**: Provides practical, implementable recommendations
- **Industry Best Practices**: References established standards and methodologies
- **Quality Assurance**: Ensures responses meet professional business standards

## Frontend Features

### Voice Recording
- **Microphone Button**: Click to start/stop recording
- **Visual Feedback**: Red indicator during recording
- **Auto-transcription**: Converts speech to text input
- **30-second Limit**: Automatic stop to prevent abuse

### Document Upload
- **File Support**: PDF, DOCX, DOC files
- **Text Extraction**: Automatic processing and display
- **Content Preview**: Shows extracted text with token count
- **Clear Function**: Remove uploaded document

### AI Settings Panel
- **Token Management**: Adjustable max token limits (500-2000)
- **Economy Mode**: Shorter responses for cost reduction
- **TTS Toggle**: Enable/disable text-to-speech
- **Cache Information**: View and clear cached responses

### Cost Optimization
- **Token Counter**: Real-time token estimation
- **Input Monitoring**: Visual indicators for long inputs
- **Response Caching**: 24-hour cache for repeated queries
- **Economy Mode**: Focused responses while maintaining completeness

### Enhanced Response Display
- **Response Type Indicators**: Shows what type of response you're getting
- **Color-Coded Sections**: Different colors for explanations vs. code
- **Professional Formatting**: Clean, readable output structure
- **Copy Functionality**: One-click copy buttons for all code sections (BPMN XML, LaTeX, general code)
- **Smart Code Detection**: Automatically detects and formats code blocks with copy buttons
- **Context-Aware Typing**: Shows relevant loading messages

## Environment Configuration

Create a `.env.local` file with the following variables:

```env
# AI Services
OPENAI_API_KEY=your_openai_api_key_here

# Existing variables
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_uri
# ... other existing variables
```

## Usage Examples

### Generate BPMN from Text
1. Type your process description in the input field
2. Click send or press Enter
3. AI generates BPMN XML response
4. Optional: Enable TTS for audio response

### Voice Input
1. Click the microphone button
2. Speak your process description
3. Recording automatically stops after 30 seconds
4. Transcribed text appears in input field

### Document Processing
1. Upload PDF/DOCX file via settings or plus menu
2. Document text is automatically extracted
3. Use extracted text as context for AI prompts
4. AI considers document content when generating responses

### Cost Optimization
1. Adjust max tokens in AI Settings
2. Enable Economy Mode for shorter responses
3. Monitor token usage with real-time counter
4. Clear cache to free up memory

## Security Features

- **Authentication Required**: All AI endpoints require valid JWT tokens
- **Input Sanitization**: Text cleaning and validation
- **File Validation**: Type and size restrictions
- **Rate Limiting**: Built-in token and size limits
- **Secure Backend**: No API keys exposed to frontend

## Performance Features

- **Response Caching**: 24-hour cache for repeated queries
- **Token Optimization**: Efficient prompt engineering
- **Async Processing**: Non-blocking API calls
- **Error Handling**: Graceful fallbacks and user feedback

## Cost Considerations

- **Token Monitoring**: Track input/output token usage
- **Economy Mode**: Focused responses while maintaining completeness
- **Caching**: Reduces API calls for repeated queries
- **TTS Toggle**: Optional feature to control audio generation costs

## Troubleshooting

### Common Issues
1. **API Key Errors**: Check environment variables
2. **Recording Issues**: Ensure microphone permissions
3. **File Upload Failures**: Check file type and size
4. **Slow Responses**: Reduce token limits or enable economy mode

### Error Handling
- All errors are logged to console
- User-friendly error messages displayed
- Graceful fallbacks for failed API calls
- Retry mechanisms for transient failures

## Future Enhancements

- **Advanced Caching**: Redis-based distributed caching
- **Batch Processing**: Multiple document processing
- **Custom Models**: Fine-tuned AI models for specific domains
- **Analytics**: Usage tracking and cost monitoring
- **Webhook Support**: Real-time notifications for long processes
