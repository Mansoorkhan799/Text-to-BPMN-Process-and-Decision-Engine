import aiCacheService from './aiCacheService';

export interface AIRequestOptions {
  maxTokens?: number;
  economyMode?: boolean;
  enableTTS?: boolean;
  voiceId?: string;
}

export interface AIResponse {
  success: boolean;
  response: string;
  audioUrl?: string;
  metadata: {
    inputTokens: number;
    outputTokens: number;
    taskType: string;
    economyMode: boolean;
    cached: boolean;
    timestamp: string;
    topicClassification?: any;
    responseValidation?: any;
  };
  error?: string;
}

export interface DocumentExtractionResult {
  success: boolean;
  extractedText: string;
  metadata: {
    originalFileName: string;
    originalFileSize: number;
    originalFileType: string;
    extractedTextLength: number;
    timestamp: string;
  };
  error?: string;
}

export interface TranscriptionResult {
  success: boolean;
  transcription: string;
  metadata: {
    originalFileSize: number;
    originalFileType: string;
    transcriptionLength: number;
    timestamp: string;
  };
  error?: string;
}

class AIService {
  private baseUrl = '/api/ai';

  private countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async callLLM(
    prompt: string, 
    taskType: 'bpmn_generation' | 'latex_generation' | 'bpmn_question' | 'general',
    documentText?: string,
    options: AIRequestOptions = {},
    files?: File[]
  ): Promise<AIResponse> {
    try {
      const { maxTokens = 8000, economyMode = false } = options;
      
      let fullInput = prompt;
      if (documentText) {
        fullInput += (fullInput ? '\n\n' : '') + documentText;
      }

      const cachedResponse = aiCacheService.getCachedResponse(fullInput, taskType);
      if (cachedResponse) {
        return {
          success: true,
          response: cachedResponse.response,
          metadata: {
            inputTokens: this.countTokens(fullInput),
            outputTokens: this.countTokens(cachedResponse.response),
            taskType,
            economyMode,
            cached: true,
            timestamp: new Date().toISOString()
          }
        };
      }

      let response;
      
      if (files && files.length > 0) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('prompt', fullInput);
        formData.append('taskType', taskType);
        if (documentText) formData.append('documentText', documentText);
        formData.append('maxTokens', maxTokens.toString());
        formData.append('economyMode', economyMode.toString());
        
        // Add files to form data
        files.forEach((file, index) => {
          formData.append(`file_${index}`, file);
        });

        response = await fetch(`${this.baseUrl}/llm`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
          body: formData,
        });
      } else {
        // Use JSON for text-only requests
        response = await fetch(`${this.baseUrl}/llm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
          body: JSON.stringify({
            prompt: fullInput,
            taskType,
            documentText,
            maxTokens,
            economyMode,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to call LLM API');
      }

      const data = await response.json();
      
      aiCacheService.cacheResponse(fullInput, taskType, data.response, data.metadata);

      return {
        success: true,
        response: data.response,
        metadata: {
          inputTokens: data.metadata.inputTokens,
          outputTokens: data.metadata.outputTokens,
          taskType,
          economyMode,
          cached: false,
          timestamp: data.metadata.timestamp
        }
      };

    } catch (error) {
      console.error('Error calling LLM:', error);
      return {
        success: false,
        response: '',
        metadata: {
          inputTokens: 0,
          outputTokens: 0,
          taskType,
          economyMode: options.economyMode || false,
          cached: false,
          timestamp: new Date().toISOString()
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async callWhisper(audioFile: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const response = await fetch(`${this.baseUrl}/whisper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      return await response.json();

    } catch (error) {
      console.error('Error calling Whisper:', error);
      return {
        success: false,
        transcription: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async callTTS(text: string, options: AIRequestOptions = {}): Promise<any> {
    try {
      const { voiceId } = options;

      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          text,
          voiceId,
          provider: 'openai', // Always use OpenAI TTS
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      return await response.json();

    } catch (error) {
      console.error('Error calling TTS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async extractDocumentText(documentFile: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('document', documentFile);

      const response = await fetch(`${this.baseUrl}/document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract document text');
      }

      return await response.json();

    } catch (error) {
      console.error('Error extracting document text:', error);
      return {
        success: false,
        extractedText: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateBPMN(prompt: string, documentText?: string, options: AIRequestOptions = {}, files?: File[]): Promise<AIResponse> {
    const response = await this.callLLM(prompt, 'bpmn_generation', documentText, options, files);
    
    if (options.enableTTS && response.success) {
      const ttsResult = await this.callTTS(response.response, options);
      if (ttsResult.success && ttsResult.audioUrl) {
        response.audioUrl = ttsResult.audioUrl;
      }
    }
    
    return response;
  }

  async generateLaTeX(prompt: string, documentText?: string, options: AIRequestOptions = {}, files?: File[]): Promise<AIResponse> {
    const response = await this.callLLM(prompt, 'latex_generation', documentText, options, files);
    
    if (options.enableTTS && response.success) {
      const ttsResult = await this.callTTS(response.response, options);
      if (ttsResult.success && ttsResult.audioUrl) {
        response.audioUrl = ttsResult.audioUrl;
      }
    }
    
    return response;
  }

  async answerBPMNQuestion(question: string, options: AIRequestOptions = {}): Promise<AIResponse> {
    return this.callLLM(question, 'bpmn_question', undefined, options);
  }

  getCacheStats() {
    return aiCacheService.getCacheStats();
  }

  clearCache() {
    aiCacheService.clearCache();
  }

  private getAuthToken(): string {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) return token;
      
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('authToken='));
      if (authCookie) {
        return authCookie.split('=')[1];
      }
    }
    return '';
  }
}

const aiService = new AIService();
export default aiService;