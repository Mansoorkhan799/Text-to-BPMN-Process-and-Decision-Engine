export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string; // For images or file previews
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachedFiles?: AttachedFile[];
  metadata?: any; // Store AI response metadata including auto-detection info
}

export interface AiChat {
  _id: string;
  userId: string;
  title: string;
  messages: Message[];
  timestamp: Date;
  lastModified: Date;
  isArchived: boolean;
  tags: string[];
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChatRequest {
  title: string;
  messages: Message[];
  category?: string;
  tags?: string[];
}

export interface UpdateChatRequest {
  title?: string;
  messages?: Message[];
  category?: string;
  tags?: string[];
  isArchived?: boolean;
  lastModified?: Date;
}

export interface ChatListResponse {
  chats: AiChat[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class AiChatService {
  private baseUrl = '/api/ai-chats';

  // Get all chats with optional filters
  async getChats(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    archived?: boolean;
  } = {}): Promise<ChatListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.category) searchParams.append('category', params.category);
    if (params.archived !== undefined) searchParams.append('archived', params.archived.toString());

    const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.statusText}`);
    }

    return response.json();
  }

  // Get a specific chat by ID
  async getChat(id: string): Promise<AiChat> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chat: ${response.statusText}`);
    }

    return response.json();
  }

  // Create a new chat
  async createChat(data: CreateChatRequest): Promise<AiChat> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create chat: ${response.statusText}`);
    }

    return response.json();
  }

  // Update an existing chat
  async updateChat(id: string, data: UpdateChatRequest): Promise<AiChat> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update chat: ${response.statusText}`);
    }

    return response.json();
  }

  // Delete a chat
  async deleteChat(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete chat: ${response.statusText}`);
    }
  }

  // Archive/unarchive a chat
  async toggleArchive(id: string, isArchived: boolean): Promise<AiChat> {
    return this.updateChat(id, { isArchived });
  }

  // Add a message to an existing chat
  async addMessage(chatId: string, message: Message): Promise<AiChat> {
    const chat = await this.getChat(chatId);
    const updatedMessages = [...chat.messages, message];
    
    return this.updateChat(chatId, { 
      messages: updatedMessages,
      lastModified: new Date()
    });
  }

  // Update chat title
  async updateTitle(chatId: string, title: string): Promise<AiChat> {
    return this.updateChat(chatId, { title });
  }

  // Update chat category
  async updateCategory(chatId: string, category: string): Promise<AiChat> {
    return this.updateChat(chatId, { category });
  }

  // Update chat tags
  async updateTags(chatId: string, tags: string[]): Promise<AiChat> {
    return this.updateChat(chatId, { tags });
  }
}

export const aiChatService = new AiChatService();
export default aiChatService;
