'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlineMicrophone, HiOutlineVolumeUp, HiArrowUp, HiOutlinePhotograph, HiOutlineDocumentText, HiOutlineTemplate, HiOutlineChat, HiOutlineX, HiOutlineMenu, HiOutlineSearch, HiOutlineLibrary, HiOutlinePlay, HiOutlineCube, HiOutlineDocument, HiOutlinePencil, HiOutlineDotsVertical, HiOutlineCog, HiOutlineSpeakerphone, HiOutlineClipboardCopy, HiOutlineUser } from 'react-icons/hi';
import aiChatService, { Message, AiChat } from '@/app/utils/aiChatService';
import aiService from '@/app/utils/aiService';
import BpmnPreviewModal from './BpmnPreviewModal';
import BpmnDiagramViewer from './BpmnDiagramViewer';
import XmlCodeModal from './XmlCodeModal';
import { createBpmnNode } from '@/app/utils/bpmnNodeStorage';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// AI Thinking Animation Component
const AIThinkingAnimation = () => {
  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-3">
        {/* AI Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
        
        {/* Thinking Bubble */}
        <div className="bg-gray-100 rounded-2xl px-4 py-3 border border-gray-200/50">
          <div className="flex items-center space-x-1">
            <span className="text-gray-600 text-sm">AI is thinking</span>
            <div className="flex space-x-1 ml-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AIProcessGeneratorProps {
  user?: any; // User object from authentication
}

export default function AIProcessGenerator({ user }: AIProcessGeneratorProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New popup states
  const [showLibraryPopup, setShowLibraryPopup] = useState(false);
  const [showBpmnElementsPopup, setShowBpmnElementsPopup] = useState(false);
  const [selectedElementType, setSelectedElementType] = useState('All');
  
  // Chat management states
  const [chats, setChats] = useState<AiChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Chat menu states
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // Auto-save states
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedMessageCount, setLastSavedMessageCount] = useState(0);
  
  // BPMN XML Code Preview states (now shows XML instead of diagram)
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  const [previewXml, setPreviewXml] = useState('');
  
  // Loading states for BPMN editor creation
  const [isCreatingBpmnFile, setIsCreatingBpmnFile] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // AI Feature states
  const [isRecording, setIsRecording] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [economyMode, setEconomyMode] = useState(false);
  const [maxTokens, setMaxTokens] = useState(8000);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [isDocumentProcessing, setIsDocumentProcessing] = useState(false);
  
  // Edit feature states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  
  // Copy feature states
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const searchPopupRef = useRef<HTMLDivElement>(null);
  
  // Media recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // New popup refs
  const libraryPopupRef = useRef<HTMLDivElement>(null);
  const bpmnElementsPopupRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-save function - saves messages to database automatically
  const autoSaveMessages = useCallback(async (chatMessages: Message[], chatId?: string) => {
    if (chatMessages.length === 0) return;
    
    // Don't save if we're already saving or if no new messages
    if (isAutoSaving || chatMessages.length <= lastSavedMessageCount) return;
    
    // Don't save if user is currently typing (debounce)
    if (inputValue.trim()) return;
    
    try {
      setIsAutoSaving(true);
      
      if (chatId) {
        // Update existing chat with new messages
        await aiChatService.updateChat(chatId, { 
          messages: chatMessages,
          lastModified: new Date()
        });
        
        // Update the chat in the local state to reflect changes
        setChats(prev => prev.map(chat => 
          chat._id === chatId 
            ? { ...chat, messages: chatMessages, lastModified: new Date() }
            : chat
        ));
      } else {
        // Create new chat if this is a new conversation
        const firstMessage = chatMessages[0];
        const title = firstMessage.content.length > 50 
          ? firstMessage.content.substring(0, 50) + '...' 
          : firstMessage.content;
        
        const newChat = await aiChatService.createChat({
          title,
          messages: chatMessages,
          category: 'General'
        });
        
        setCurrentChatId(newChat._id);
        setChats(prev => [newChat, ...prev]);
      }
      
      setLastSavedMessageCount(chatMessages.length);
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Reset the saved count to allow retry
      setLastSavedMessageCount(Math.max(0, lastSavedMessageCount - 1));
    } finally {
      setIsAutoSaving(false);
    }
  }, [isAutoSaving, lastSavedMessageCount, inputValue]);

  // Auto-save effect - triggers whenever messages change
  useEffect(() => {
    if (messages.length > 0 && messages.length > lastSavedMessageCount) {
      // Debounce auto-save to avoid too many database calls
      const timeoutId = setTimeout(() => {
        autoSaveMessages(messages, currentChatId || undefined);
      }, 1000); // 1 second delay after last message change
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentChatId, lastSavedMessageCount, autoSaveMessages]);

  // Auto-resize textarea function
  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // Max height of 200px
    }
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    autoResize();
  };

  // Auto-resize on mount and when inputValue changes
  useEffect(() => {
    autoResize();
  }, [inputValue]);

  // Enhanced auto-scroll during generation
  useEffect(() => {
    if (chatContainerRef.current && isGenerating) {
      const scrollToBottom = () => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      };
      
      // Scroll immediately when generation starts
      setTimeout(scrollToBottom, 100);
      
      // Continue scrolling as content grows
      const interval = setInterval(scrollToBottom, 200);
      
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [messages]);

  // Scroll detection for scroll-to-bottom button
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollToBottom(!isNearBottom);
    };

    chatContainer.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();
    
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, [messages, isGenerating]);

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close search popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchPopupRef.current && !searchPopupRef.current.contains(event.target as Node)) {
        setShowSearchPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close library popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (libraryPopupRef.current && !libraryPopupRef.current.contains(event.target as Node)) {
        setShowLibraryPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  // Close BPMN elements popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bpmnElementsPopupRef.current && !bpmnElementsPopupRef.current.contains(event.target as Node)) {
        setShowBpmnElementsPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  // Close chat menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if click is outside any chat menu
      if (!target.closest('.chat-menu-container')) {
        setShowChatMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats by time periods
  const groupChatsByTime = (chats: AiChat[]) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const yesterdayChats = chats.filter(chat => {
      const lastModified = typeof chat.lastModified === 'string' ? new Date(chat.lastModified) : chat.lastModified;
      return lastModified >= yesterday && lastModified < now;
    });
    
    const previousWeekChats = chats.filter(chat => {
      const lastModified = typeof chat.lastModified === 'string' ? new Date(chat.lastModified) : chat.lastModified;
      return lastModified >= weekAgo && lastModified < yesterday;
    });

    return { yesterdayChats, previousWeekChats };
  };

  const { yesterdayChats, previousWeekChats } = groupChatsByTime(filteredChats);

  // Sample data for popups
  const libraryItems = [
    { id: '1', name: 'Customer Order Workflow', type: 'BPMN', category: 'Sales', lastModified: '2 days ago' },
    { id: '2', name: 'Employee Onboarding', type: 'BPMN', category: 'HR', lastModified: '1 week ago' },
    { id: '3', name: 'Invoice Processing', type: 'BPMN', category: 'Finance', lastModified: '3 days ago' },
    { id: '4', name: 'Product Approval', type: 'BPMN', category: 'Operations', lastModified: '5 days ago' },
    { id: '5', name: 'Quality Control Process', type: 'BPMN', category: 'Operations', lastModified: '1 day ago' }
  ];



  const bpmnElements = [
    { id: '1', name: 'Start Event', type: 'Event', symbol: '⚪', description: 'Beginning of a process' },
    { id: '2', name: 'End Event', type: 'Event', symbol: '⚫', description: 'End of a process' },
    { id: '3', name: 'Task', type: 'Activity', symbol: '▭', description: 'Work performed in a process' },
    { id: '4', name: 'Gateway', type: 'Gateway', symbol: '◇', description: 'Decision point in a process' },
    { id: '5', name: 'Pool', type: 'Container', symbol: '▯', description: 'Participant in a process' },
    { id: '6', name: 'Lane', type: 'Container', symbol: '▭', description: 'Sub-division of a pool' },
    { id: '7', name: 'Subprocess', type: 'Activity', symbol: '▭', description: 'Embedded process' },
    { id: '8', name: 'Data Object', type: 'Data', symbol: '▱', description: 'Data input/output' }
  ];

  // Filter BPMN elements based on selected type
  const filteredBpmnElements = selectedElementType === 'All' 
    ? bpmnElements 
    : bpmnElements.filter(element => element.type === selectedElementType);



  // AI Processing Functions
  const processWithAI = async (prompt: string, taskType: 'bpmn_generation' | 'latex_generation' | 'bpmn_question' | 'general', uploadedDoc?: File | null) => {
    try {
      setIsGenerating(true);
      
      let aiResponse: any;
      
      // Prepare files array if document is uploaded
      const files = uploadedDoc ? [uploadedDoc] : undefined;
      
      if (taskType === 'bpmn_generation') {
        aiResponse = await aiService.generateBPMN(prompt, documentText, {
          maxTokens,
          economyMode,
          enableTTS: isTTSEnabled
        }, files);
      } else if (taskType === 'latex_generation') {
        aiResponse = await aiService.generateLaTeX(prompt, documentText, {
          maxTokens,
          economyMode,
          enableTTS: isTTSEnabled
        }, files);
      } else {
        aiResponse = await aiService.callLLM(prompt, taskType, documentText, {
          maxTokens,
          economyMode
        }, files);
      }
      
      if (aiResponse.success) {
        // Check if the backend auto-detected a different intent than what we sent
        const metadata = aiResponse.metadata;
        const wasAutoDetected = metadata?.wasAutoDetected;
        const detectedIntent = metadata?.detectedIntent;
        
        // If intent was auto-detected and it's different from what we sent, update the taskType
        if (wasAutoDetected && detectedIntent && detectedIntent !== taskType) {
          console.log(`✅ Auto-detected intent: ${detectedIntent} (original: ${taskType})`);
          
          // Show user feedback for successful auto-detection
          if (detectedIntent === 'bpmn_generation') {
            console.log('🎯 Automatically generating BPMN diagram based on your request');
          } else if (detectedIntent === 'latex_generation') {
            console.log('📄 Automatically generating LaTeX document based on your request');
          } else if (detectedIntent === 'bpmn_question') {
            console.log('❓ Providing BPMN consultation based on your question');
          }
        }
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: aiResponse.response,
          timestamp: new Date(),
          metadata: metadata // Store metadata for potential future use
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Auto-save will handle saving the message to database
      } else {
        throw new Error(aiResponse.error || 'Failed to generate response');
      }
      
    } catch (error) {
      console.error('AI processing error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I apologize, but I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support if the issue persists.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isGenerating) return;

    // Prepare attached files if any
    const attachedFiles = uploadedDocument ? [{
      id: Date.now().toString(),
      name: uploadedDocument.name,
      type: uploadedDocument.type,
      size: uploadedDocument.size,
      url: uploadedDocument.type.startsWith('image/') ? URL.createObjectURL(uploadedDocument) : undefined
    }] : undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachedFiles
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);
    setShowQuickPrompts(false);
    
    // Store the current uploaded document to pass to AI processing
    const currentUploadedDoc = uploadedDocument;
    // Clear uploaded document from the prompt editor after sending
    setUploadedDocument(null);
    setDocumentText('');

    // Always use intelligent auto-detection as primary method
    // The backend will analyze the prompt and determine the most appropriate task type
    // This provides a much more natural ChatGPT-like experience where users don't need to specify options
    let taskType: 'bpmn_generation' | 'latex_generation' | 'bpmn_question' | 'general' = 'general';
    
    // Only use manual options as hints if they're explicitly selected
    // This serves as an override mechanism for edge cases
    if (selectedOptions.includes('Generate BPMN diagram') && selectedOptions.includes('Generate LaTeX')) {
      // If both are selected, let the backend auto-detect which is more appropriate
      taskType = 'general'; // Backend will intelligently decide
    } else if (selectedOptions.includes('Generate BPMN diagram')) {
      taskType = 'bpmn_generation'; // Explicit user override
    } else if (selectedOptions.includes('Generate LaTeX')) {
      taskType = 'latex_generation'; // Explicit user override
    } else {
      // Primary path: Let the backend intelligently detect intent from the prompt
      // This enables natural language interaction like ChatGPT
      taskType = 'general'; // Backend will auto-detect the actual intent
    }

    // Process with AI using the determined task type
    await processWithAI(inputValue, taskType, currentUploadedDoc);
    
    // Clear selected options after processing
    setSelectedOptions([]);
  };

  const togglePlusMenu = () => {
    setShowPlusMenu(!showPlusMenu);
  };

  const handleOptionSelect = async (option: string) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter(opt => opt !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
      
      // Handle specific option actions
      if (option === 'Generate BPMN diagram') {
        // If there's input text, generate BPMN immediately
        if (inputValue.trim()) {
          await processWithAI(inputValue, 'bpmn_generation');
        } else {
          // Set placeholder text for BPMN generation
          setInputValue("Describe the business process you want to model...");
        }
      } else if (option === 'Generate LaTeX') {
        // If there's input text, generate LaTeX immediately
        if (inputValue.trim()) {
          await processWithAI(inputValue, 'latex_generation');
        } else {
          // Set placeholder text for LaTeX generation
          setInputValue("Describe the LaTeX document you want to create...");
        }
      }
    }
    setShowPlusMenu(false);
  };

  const removeOption = (option: string) => {
    setSelectedOptions(selectedOptions.filter(opt => opt !== option));
  };

  const removeAttachedFile = () => {
    setUploadedDocument(null);
    setDocumentText('');
    setIsDocumentProcessing(false);
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setShowQuickPrompts(true);
    setShowChatMenu(null);
    setEditingChatId(null);
    setLastSavedMessageCount(0); // Reset saved message count for new chat
  };

  const loadChat = async (chatId: string) => {
    try {
      const chat = await aiChatService.getChat(chatId);
      setMessages(chat.messages);
      setCurrentChatId(chatId);
      setShowQuickPrompts(false);
      setShowChatMenu(null);
      setEditingChatId(null);
      setLastSavedMessageCount(chat.messages.length); // Set saved count to loaded chat length
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await aiChatService.deleteChat(chatId);
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (currentChatId === chatId) {
        setMessages([]);
        setCurrentChatId(null);
        setShowQuickPrompts(true);
      }
      setShowChatMenu(null);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const startRenameChat = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
    setShowChatMenu(null);
  };

  const saveChatTitle = async (chatId: string) => {
    try {
      if (editingTitle.trim()) {
        await aiChatService.updateChat(chatId, { title: editingTitle.trim() });
        setChats(prev => prev.map(chat => 
          chat._id === chatId ? { ...chat, title: editingTitle.trim() } : chat
        ));
        setEditingChatId(null);
        setEditingTitle('');
      }
    } catch (error) {
      console.error('Failed to update chat title:', error);
    }
  };

  const cancelRename = () => {
    // Restore the original title from the current chat
    const currentChat = chats.find(chat => chat._id === editingChatId);
    if (currentChat) {
      setEditingTitle(currentChat.title);
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Stop recording after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          stopRecording();
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      const result = await aiService.callWhisper(file);
      
      if (result.success) {
        setInputValue(result.transcription);
        // Auto-resize textarea
        setTimeout(() => autoResize(), 100);
      } else {
        alert('Failed to transcribe audio: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio input.');
    }
  };

  // Document Upload Functions
  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setUploadedDocument(file);
    setIsDocumentProcessing(true);
    
    try {
      const result = await aiService.extractDocumentText(file);
      
      if (result.success) {
        setDocumentText(result.extractedText);
        setIsDocumentProcessing(false);
        
        // Auto-focus the input field for better UX
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      } else {
        alert(`❌ Failed to extract text from document: ${result.error}\n\nPlease try a different file or contact support.`);
        setUploadedDocument(null);
        setIsDocumentProcessing(false);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      alert(`❌ Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check the file format and try again.`);
      setUploadedDocument(null);
      setIsDocumentProcessing(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveChatTitle(chatId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    // Convert string to Date if needed
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Load chats from database on component mount
  useEffect(() => {
    const loadChatsFromDB = async () => {
      try {
        setIsLoading(true);
        const response = await aiChatService.getChats();
        setChats(response.chats);
      } catch (error) {
        console.error('Failed to load chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatsFromDB();
  }, []);

  // Edit message functions
  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditedContent(content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent('');
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editedContent.trim()) return;
    
    // Find the message being edited
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    // Remove all messages after the edited message (including AI responses)
    const updatedMessages = messages.slice(0, messageIndex);
    
    // Update the edited message
    const editedMessage: Message = {
      ...messages[messageIndex],
      content: editedContent.trim()
    };
    
    updatedMessages.push(editedMessage);
    setMessages(updatedMessages);
    
    // Clear edit state
    setEditingMessageId(null);
    setEditedContent('');
    
    // Reprocess the edited message
    setIsLoading(true);
    
    try {
      // Use intelligent auto-detection for edited content as well
      // This ensures consistent behavior throughout the application
      let taskType: 'bpmn_generation' | 'latex_generation' | 'bpmn_question' | 'general' = 'general';
      
      // Only use manual options as explicit overrides if selected
      if (selectedOptions.includes('Generate BPMN diagram')) {
        taskType = 'bpmn_generation'; // Explicit override
      } else if (selectedOptions.includes('Generate LaTeX')) {
        taskType = 'latex_generation'; // Explicit override
      } else if (selectedOptions.includes('Ask BPMN questions')) {
        taskType = 'bpmn_question'; // Explicit override
      } else {
        // Primary path: Let the enhanced backend auto-detection handle it
        // The backend now has much more sophisticated analysis capabilities
        taskType = 'general'; // Backend will intelligently classify the edited content
      }
      
      const response = await aiService.callLLM(
        editedContent,
        taskType,
        documentText || undefined,
        { maxTokens, economyMode }
      );
      
      if (response.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Handle TTS if enabled
        if (isTTSEnabled && response.response) {
          try {
            const ttsResponse = await aiService.callTTS(response.response);
            if (ttsResponse.success && ttsResponse.audioUrl) {
              const audio = new Audio(ttsResponse.audioUrl);
              audio.play().catch(console.error);
            }
          } catch (ttsError) {
            console.error('TTS Error:', ttsError);
          }
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `I apologize, but I encountered an error while processing your request: ${response.error || 'Unknown error'}. Please try again or contact support if the issue persists.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error processing edited message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I apologize, but I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support if the issue persists.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy function for AI responses
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageId(messageId);
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  // Enhanced markdown renderer for AI responses
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentSection: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';
    let skipLines = 0;

    const flushCurrentSection = () => {
      if (currentSection.length > 0) {
        elements.push(<div key={elements.length} className="mb-4">{currentSection}</div>);
        currentSection = [];
      }
    };

    // Helper function to render text with inline formatting
    const renderInlineText = (text: string) => {
      // Handle **bold** text
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, index) => {
      if (skipLines > 0) {
        skipLines--;
        return;
      }

      const trimmedLine = line.trim();
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = trimmedLine.substring(3).trim();
          codeContent = '';
          flushCurrentSection();
        } else {
          inCodeBlock = false;
          elements.push(
            <div key={elements.length} className="mb-6">
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto relative">
                <button
                  onClick={(e) => copyToClipboard(codeContent, e.target as HTMLButtonElement)}
                  className="absolute top-2 right-2 p-2 bg-gray-700 text-white rounded-md text-xs hover:bg-gray-600 transition-colors"
                  title="Copy Code"
                >
                  📋 Copy
                </button>
                {codeLanguage && <div className="text-xs text-gray-400 mb-2">{codeLanguage}</div>}
                <pre className="text-sm whitespace-pre-wrap pr-16">{codeContent}</pre>
              </div>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeContent += (codeContent ? '\n' : '') + line;
        return;
      }

      // Handle headings
      if (trimmedLine.startsWith('### ')) {
        flushCurrentSection();
        elements.push(
          <h4 key={elements.length} className="text-base font-semibold text-gray-800 mb-3 mt-6">
            {trimmedLine.substring(4)}
          </h4>
        );
      } else if (trimmedLine.startsWith('## ')) {
        flushCurrentSection();
        elements.push(
          <h3 key={elements.length} className="text-lg font-semibold text-gray-800 mb-4 mt-8">
            {trimmedLine.substring(3)}
          </h3>
        );
      } else if (trimmedLine.startsWith('# ')) {
        flushCurrentSection();
        elements.push(
          <h2 key={elements.length} className="text-xl font-bold text-gray-900 mb-6 mt-10 first:mt-0 border-b-2 border-blue-200 pb-3">
            {trimmedLine.substring(2)}
          </h2>
        );
      }
      // Handle table headers
      else if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        const cells = trimmedLine.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
        const nextLine = lines[index + 1];
        if (nextLine && nextLine.trim().startsWith('|---')) {
          // This is a table header
          flushCurrentSection();
          const tableRows: JSX.Element[] = [];
          
          // Add header row
          tableRows.push(
            <tr key={0} className="bg-blue-50">
              {cells.map((cell, cellIndex) => (
                <th key={cellIndex} className="px-4 py-3 text-left font-semibold text-gray-800 border-b-2 border-blue-200">
                  {cell}
                </th>
              ))}
            </tr>
          );
          
          // Look for table data rows
          let tableIndex = index + 2; // Skip separator line
          let dataRowCount = 0;
          while (tableIndex < lines.length) {
            const dataLine = lines[tableIndex].trim();
            if (dataLine.startsWith('|') && dataLine.endsWith('|')) {
              const dataCells = dataLine.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
              tableRows.push(
                <tr key={tableIndex} className={dataRowCount % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                  {dataCells.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 text-gray-700 border-b border-gray-200">
                      {renderInlineText(cell)}
                    </td>
                  ))}
                </tr>
              );
              tableIndex++;
              dataRowCount++;
            } else {
              break;
            }
          }
          
          elements.push(
            <div key={elements.length} className="mb-6 overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg shadow-sm">
                <tbody>
                  {tableRows}
                </tbody>
              </table>
            </div>
          );
          
          // Skip processed lines
          skipLines = tableIndex - index - 1;
          return;
        }
      }
      // Handle bullet points with bold labels
      else if (trimmedLine.startsWith('- **') && trimmedLine.includes('**:')) {
        const match = trimmedLine.match(/^- \*\*(.*?)\*\*:\s*(.*)$/);
        if (match) {
          currentSection.push(
            <div key={currentSection.length} className="mb-3 flex">
              <span className="mr-2 text-blue-600">•</span>
              <div>
                <span className="font-semibold text-gray-900">{match[1]}</span>
                <span className="text-gray-700">: {match[2]}</span>
              </div>
            </div>
          );
        }
      } 
      // Handle regular bullet points
      else if (trimmedLine.startsWith('- ')) {
        currentSection.push(
          <div key={currentSection.length} className="mb-2 flex">
            <span className="mr-2 text-blue-600 mt-1">•</span>
            <span className="text-gray-700 leading-relaxed">{renderInlineText(trimmedLine.substring(2))}</span>
          </div>
        );
      } 
      // Handle numbered lists
      else if (/^\d+\.\s/.test(trimmedLine)) {
        const match = trimmedLine.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          currentSection.push(
            <div key={currentSection.length} className="mb-3 flex">
              <span className="mr-3 font-medium text-blue-600 min-w-[24px]">{match[1]}.</span>
              <div className="text-gray-700 leading-relaxed">{renderInlineText(match[2])}</div>
            </div>
          );
        }
      }
      // Handle regular paragraphs
      else if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('|')) {
        currentSection.push(
          <p key={currentSection.length} className="text-gray-700 mb-3 leading-relaxed">
            {renderInlineText(trimmedLine)}
          </p>
        );
      }
      // Handle empty lines
      else if (!trimmedLine && currentSection.length > 0) {
        flushCurrentSection();
      }
    });

    flushCurrentSection();
    return elements;
  };

  // Utility function to copy text to clipboard
  const copyToClipboard = async (text: string, button: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show success feedback
      const originalText = button.innerHTML;
      const originalClass = button.className;
      button.innerHTML = '✓ Copied!';
      button.className = 'absolute top-2 right-2 p-2 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 transition-colors';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.className = originalClass;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      // Show success feedback even for fallback
      const originalText = button.innerHTML;
      const originalClass = button.className;
      button.innerHTML = '✓ Copied!';
      button.className = 'absolute top-2 right-2 p-2 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 transition-colors';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.className = originalClass;
      }, 2000);
    }
  };

  // Function to create BPMN file and open in editor
  const openInBpmnEditor = async (xmlContent: string, processDescription: string) => {
    try {
      // Check if user is authenticated
      if (!user || !user.id) {
        alert('Please log in to save files');
        return;
      }

      // Start loading process
      setIsCreatingBpmnFile(true);
      setLoadingMessage('Preparing BPMN file...');

      console.log('Creating BPMN file for user:', user);
      const userId = user.id;

      // Generate a unique filename based on process description or timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const processName = processDescription.split('\n')[0] || 'AI Generated Process';
      const filename = `${processName.substring(0, 30).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'AI_Process'}_${timestamp}`;

      console.log('Creating BPMN file with data:', {
        userId,
        filename,
        xmlContentLength: xmlContent.length,
        processName
      });

      // Update loading message
      setLoadingMessage('Creating BPMN file in database...');

      // Create the BPMN file using the createBpmnNode function
      const newNode = await createBpmnNode({
        userId: userId,
        type: 'file',
        name: filename,
        content: xmlContent,
        processMetadata: {
          processName: processName,
          description: processDescription,
          processOwner: user.name || 'AI Generated',
          processManager: user.name || 'AI Generated'
        }
      });

      console.log('BPMN file created successfully:', newNode);

      // Update loading message
      setLoadingMessage('Setting up BPMN editor...');

      // Set up session storage for BPMN editor navigation (following existing pattern)
      if (typeof window !== 'undefined') {
        // Clear any existing project data to avoid conflicts
        sessionStorage.removeItem('currentProject');
        sessionStorage.removeItem('projectUserId');
        sessionStorage.removeItem('projectUserRole');
        
        // Set new project data
        sessionStorage.setItem('currentView', 'bpmn');
        sessionStorage.setItem('currentProject', newNode.id);
        sessionStorage.setItem('projectUserId', userId);
        sessionStorage.setItem('projectUserRole', user.role || 'user');
        
        console.log('Session storage set:', {
          currentView: 'bpmn',
          currentProject: newNode.id,
          projectUserId: userId,
          projectUserRole: user.role || 'user'
        });
      }

      // Small delay to show the loading message
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update loading message
      setLoadingMessage('Opening BPMN editor...');

      // Show success toast
      toast.success(`BPMN file "${filename}" created successfully! Opening editor...`);

      // Force a page reload to ensure the view switches properly (following BpmnDashboard pattern)
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
      
      // Fallback: Clear loading state in case navigation is delayed
      setTimeout(() => {
        setIsCreatingBpmnFile(false);
        setLoadingMessage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating BPMN file:', error);
      
      // Show detailed error information
      let errorMessage = 'Failed to create BPMN file. Please try again.';
      if (error instanceof Error) {
        errorMessage += `\n\nError details: ${error.message}`;
        console.error('Error stack:', error.stack);
      }
      
      // Clear loading state on error
      setIsCreatingBpmnFile(false);
      setLoadingMessage('');
      
      alert(errorMessage);
    }
  };

  return (
    <div className="flex h-full bg-gradient-to-r from-pink-100 via-orange-50 to-blue-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-16'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <HiOutlineChat className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-gray-900">AI Process Generator</span>
              </div>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              {isSidebarOpen ? <HiOutlineX className="w-5 h-5" /> : <HiOutlineMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={startNewChat}
              className={`w-full flex items-center justify-center space-x-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isSidebarOpen 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <HiOutlinePlus className="w-5 h-5" />
              {isSidebarOpen && <span>New chat</span>}
            </button>
          </div>

          {/* Navigation Options */}
          {isSidebarOpen && (
            <div className="px-3 space-y-1">
              <button 
                onClick={() => setShowSearchPopup(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <HiOutlineSearch className="w-5 h-5" />
                <span>Search chats</span>
              </button>
              <button 
                onClick={() => setShowLibraryPopup(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <HiOutlineLibrary className="w-5 h-5" />
                <span>Library</span>
              </button>

              <button 
                onClick={() => setShowBpmnElementsPopup(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <HiOutlineCube className="w-5 h-5" />
                <span>BPMN Elements</span>
              </button>

              
              {/* AI Settings */}
              <button 
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <HiOutlineCog className="w-5 h-5" />
                <span>AI Settings</span>
              </button>
            </div>
          )}

          {/* Chats Section */}
          {isSidebarOpen && (
            <div className="mt-6 px-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-3">
                Chats
              </h3>
              <div className="space-y-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading chats...</span>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No chats yet</p>
                    <p className="text-xs text-gray-400">Start a conversation to see your chats here</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat._id}
                      className={`group relative flex items-center space-x-2 px-3 py-2 text-sm rounded-lg cursor-pointer transition-all duration-200 ${
                        currentChatId === chat._id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => loadChat(chat._id)}
                    >
                      <HiOutlineChat className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {editingChatId === chat._id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleTitleKeyDown(e, chat._id)}
                              onFocus={(e) => e.target.select()}
                              className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => saveChatTitle(chat._id)}
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors duration-150"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => cancelRename()}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-150"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="truncate font-medium">{chat.title}</div>
                        )}
                        <div className="text-xs text-gray-500">{formatTimestamp(chat.lastModified)}</div>
                      </div>
                      
                      {/* Chat Menu Button - Hidden during editing */}
                      {editingChatId !== chat._id && (
                        <div className="relative chat-menu-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowChatMenu(showChatMenu === chat._id ? null : chat._id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all duration-200"
                        >
                          <HiOutlineDotsVertical className="w-3 h-3" />
                        </button>

                        {/* Chat Menu Dropdown */}
                        {showChatMenu === chat._id && (
                          <div className="absolute right-0 bottom-full mb-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200/50 overflow-hidden z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenameChat(chat._id, chat.title);
                              }}
                              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center space-x-2"
                            >
                              <HiOutlinePencil className="w-4 h-4" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat._id);
                              }}
                              className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 flex items-center space-x-2"
                            >
                              <HiOutlineX className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center px-6 py-8 bg-gradient-to-b from-transparent via-pink-50/30 to-blue-50/30">
          {/* Title Section - Only show when there are NO messages */}
          {messages.length === 0 && (
            <div className="text-center mb-8 max-w-3xl">
              {/* AI Icon */}
              <div className="flex justify-center mb-4">
                <div className="p-2 bg-white rounded-xl shadow-lg overflow-hidden">
                  <img 
                    src="/ai-process-generator-icon.png" 
                    alt="AI Process Generator Icon" 
                    className="w-20 h-20 object-cover rounded-xl"
                  />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                AI Process Generator
              </h1>
              <p className="text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">
                From idea to BPMN diagram in seconds.
                Just tell us what you need, our AI builds the perfect process flow for you. Fast, smart, and zero drawing required.
              </p>
              
              {/* Topic Focus Notice */}

            </div>
          )}

          {/* Chat Messages - Only show if there are messages */}
          {messages.length > 0 && (
            <div className="w-full max-w-3xl mb-6 relative">
              
              {/* Scroll to bottom button */}
              {showScrollToBottom && (
                <button
                  onClick={() => {
                    if (chatContainerRef.current) {
                      chatContainerRef.current.scrollTo({
                        top: chatContainerRef.current.scrollHeight,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="absolute bottom-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200/50 hover:bg-white transition-all duration-200 hover:shadow-xl"
                  title="Scroll to bottom"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              )}

              {/* Chat messages container - with fixed height for proper scrolling */}
              <div 
                ref={chatContainerRef}
                className="max-h-96 overflow-y-auto space-y-3 pr-2 chat-container-scrollbar"
              >
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} items-end space-x-3`}
                  >
                    {/* AI Avatar - shown on left for AI messages */}
                    {message.type === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 mb-1">
                        <span className="text-white text-xs font-bold">AI</span>
                      </div>
                    )}
                    
                    <div
                      className={`relative ${message.type === 'user' ? 'pl-8' : ''}`}
                      onMouseEnter={() => {
                        if (message.type === 'user') {
                          setHoveredMessageId(message.id);
                        }
                      }}
                      onMouseLeave={() => {
                        if (message.type === 'user') {
                          setHoveredMessageId(null);
                        }
                      }}
                    >
                      {message.type === 'user' && editingMessageId !== message.id && (
                                                  <button
                            onClick={() => handleEditMessage(message.id, message.content)}
                            className={`absolute left-0 top-1/2 transform -translate-y-1/2 transition-opacity duration-200 p-1 bg-gray-800 hover:bg-gray-700 rounded-full ${
                              hoveredMessageId === message.id ? 'opacity-100' : 'opacity-0'
                            }`}
                            title="Edit message"
                          >
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.828-2.828z" />
                            </svg>
                          </button>
                      )}
                    <div
                      className={`max-w-xl px-4 py-3 rounded-xl ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-gray-200/50'
                      }`}
                    >
                        <div className="text-sm">
                        {message.type === 'assistant' && message.content.includes('<?xml') ? (
                          <div className="space-y-3">
                            {/* Response Type Indicator */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                BPMN Diagram Generated
                              </div>
                            </div>
                            
                            {/* Extract and display the text explanation before XML */}
                            {(() => {
                              const xmlStart = message.content.indexOf('<?xml');
                              if (xmlStart > 0) {
                                const textContent = message.content.substring(0, xmlStart).trim();
                                if (textContent) {
                                  return (
                                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                      <p className="text-gray-800">{textContent}</p>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                            
                            {/* Display the BPMN diagram directly */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                              {(() => {
                                // Extract the XML content for the diagram viewer
                                const xmlStart = message.content.indexOf('<?xml');
                                if (xmlStart !== -1) {
                                  let xmlContent;
                                  const xmlEnd = message.content.lastIndexOf('</bpmn:definitions>');
                                  if (xmlEnd !== -1) {
                                    xmlContent = message.content.substring(xmlStart, xmlEnd + 20).trim();
                                  } else {
                                    // Fallback extraction
                                    xmlContent = message.content.substring(xmlStart);
                                    const businessTextMarkers = [
                                      '**Business Insights', 'Business Insights', '**Recommendations', 'Recommendations',
                                      '**This', 'This is a', '**For a', 'For a production'
                                    ];
                                    for (const marker of businessTextMarkers) {
                                      const markerIndex = xmlContent.indexOf(marker);
                                      if (markerIndex !== -1) {
                                        xmlContent = xmlContent.substring(0, markerIndex).trim();
                                        break;
                                      }
                                    }
                                  }
                                  
                                  // Return the BPMN diagram viewer
                                  return (
                                    <div className="relative">
                                      {/* Copy XML Button */}
                                      <button
                                        onClick={(e) => {
                                          copyToClipboard(xmlContent, e.target as HTMLButtonElement);
                                        }}
                                        className="absolute top-2 right-2 z-10 p-2 bg-gray-700 text-white rounded-md text-xs hover:bg-gray-600 transition-colors shadow-lg"
                                        title="Copy BPMN XML"
                                      >
                                        📋 Copy XML
                                      </button>
                                      <BpmnDiagramViewer 
                                        xml={xmlContent} 
                                        width={600} 
                                        height={400}
                                        className="w-full"
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <div className="p-4 text-center text-gray-500">
                                    <p>Unable to render BPMN diagram</p>
                                  </div>
                                );
                              })()}
                            </div>
                            
                            {/* Loading Message */}
                            {isCreatingBpmnFile && (
                              <div className="mt-3 flex justify-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg">
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span className="font-medium">{loadingMessage}</span>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons below the diagram */}
                            <div className="mt-3 flex justify-center gap-3">
                              {/* Open in Editor Button */}
                              <button
                                onClick={() => {
                                  if (isCreatingBpmnFile) return; // Prevent multiple clicks
                                  
                                  console.log('Open in Editor button clicked!');
                                  // Extract the XML content and process description
                                  const xmlStart = message.content.indexOf('<?xml');
                                  if (xmlStart !== -1) {
                                    let xmlContent;
                                    let processDescription = '';
                                    
                                    // Extract process description (text before XML)
                                    if (xmlStart > 0) {
                                      processDescription = message.content.substring(0, xmlStart).trim();
                                    }
                                    
                                    // Extract XML content
                                    const xmlEnd = message.content.lastIndexOf('</bpmn:definitions>');
                                    if (xmlEnd !== -1) {
                                      xmlContent = message.content.substring(xmlStart, xmlEnd + 20).trim();
                                    } else {
                                      // Fallback extraction
                                      xmlContent = message.content.substring(xmlStart);
                                      const businessTextMarkers = [
                                        '**Business Insights', 'Business Insights', '**Recommendations', 'Recommendations',
                                        '**This', 'This is a', '**For a', 'For a production'
                                      ];
                                      for (const marker of businessTextMarkers) {
                                        const markerIndex = xmlContent.indexOf(marker);
                                        if (markerIndex !== -1) {
                                          xmlContent = xmlContent.substring(0, markerIndex).trim();
                                          break;
                                        }
                                      }
                                    }
                                    
                                    console.log('Extracted XML content length:', xmlContent?.length);
                                    console.log('Process description:', processDescription);
                                    
                                    // Open in BPMN editor
                                    if (xmlContent) {
                                      openInBpmnEditor(xmlContent, processDescription);
                                    } else {
                                      alert('No valid BPMN XML content found in this response.');
                                    }
                                  }
                                }}
                                disabled={isCreatingBpmnFile}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm font-medium text-sm ${
                                  isCreatingBpmnFile 
                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                title={isCreatingBpmnFile ? 'Creating BPMN file...' : 'Open in BPMN Editor'}
                              >
                                {isCreatingBpmnFile ? (
                                  <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Open in Editor
                                  </>
                                )}
                              </button>
                              
                              {/* View XML Code Button */}
                              <button
                                onClick={() => {
                                  // Extract the XML content for preview
                                  const xmlStart = message.content.indexOf('<?xml');
                                  if (xmlStart !== -1) {
                                    const xmlEnd = message.content.lastIndexOf('</bpmn:definitions>');
                                    if (xmlEnd !== -1) {
                                      const xmlContent = message.content.substring(xmlStart, xmlEnd + 20).trim();
                                      setPreviewXml(xmlContent);
                                      setShowXmlPreview(true);
                                    } else {
                                      // Fallback extraction
                                      let xmlContent = message.content.substring(xmlStart);
                                      const businessTextMarkers = [
                                        '**Business Insights', 'Business Insights', '**Recommendations', 'Recommendations',
                                        '**This', 'This is a', '**For a', 'For a production'
                                      ];
                                      for (const marker of businessTextMarkers) {
                                        const markerIndex = xmlContent.indexOf(marker);
                                        if (markerIndex !== -1) {
                                          xmlContent = xmlContent.substring(0, markerIndex).trim();
                                          break;
                                        }
                                      }
                                      setPreviewXml(xmlContent);
                                      setShowXmlPreview(true);
                                    }
                                  }
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm font-medium text-sm"
                                title="View BPMN XML Code"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                View XML Code
                              </button>
                            </div>
                            
                            {/* Extract and display process description after XML */}
                            {(() => {
                              const xmlEnd = message.content.lastIndexOf('</bpmn:definitions>');
                              if (xmlEnd > 0 && xmlEnd + 20 < message.content.length) {
                                const afterXml = message.content.substring(xmlEnd + 20).trim();
                                if (afterXml) {
                                  // Parse the description content
                                  const parseDescription = (text: string) => {
                                    const sections = {
                                      processName: '',
                                      shortDescription: '',
                                      actors: [] as string[],
                                      keyTasks: [] as string[],
                                      processFlow: '',
                                      decisionPoints: [] as string[],
                                      outcomes: [] as string[]
                                    };

                                    // Extract process name
                                    const processNameMatch = text.match(/\*\*Process Name\*\*:\s*([^\n*]+)/);
                                    if (processNameMatch) sections.processName = processNameMatch[1].trim();

                                    // Extract short description
                                    const shortDescMatch = text.match(/\*\*Short Description\*\*:\s*([^*]+)/);
                                    if (shortDescMatch) sections.shortDescription = shortDescMatch[1].trim();

                                    // Extract actors/participants
                                    const actorsMatch = text.match(/\*\*Actors\/Participants\*\*:\s*([^*]+)/);
                                    if (actorsMatch) {
                                      sections.actors = actorsMatch[1].split(/[,\n-]/).map(a => a.trim()).filter(a => a);
                                    }

                                    // Extract key tasks
                                    const keyTasksMatch = text.match(/\*\*Key Tasks\*\*:\s*([^*]+)/);
                                    if (keyTasksMatch) {
                                      sections.keyTasks = keyTasksMatch[1].split(/[,\n-]/).map(t => t.trim()).filter(t => t);
                                    }

                                    // Extract process flow
                                    const processFlowMatch = text.match(/\*\*Process Flow\*\*:\s*([^*]+)/);
                                    if (processFlowMatch) sections.processFlow = processFlowMatch[1].trim();

                                    // Extract decision points
                                    const decisionMatch = text.match(/\*\*Decision Points\*\*:\s*([^*]+)/);
                                    if (decisionMatch) {
                                      sections.decisionPoints = decisionMatch[1].split(/[,\n-]/).map(d => d.trim()).filter(d => d);
                                    }

                                    // Extract outcomes
                                    const outcomesMatch = text.match(/\*\*Outcomes\*\*:\s*([^*]+)/);
                                    if (outcomesMatch) {
                                      sections.outcomes = outcomesMatch[1].split(/[,\n-]/).map(o => o.trim()).filter(o => o);
                                    }

                                    return sections;
                                  };

                                  const description = parseDescription(afterXml);
                                  
                                  return (
                                    <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden">
                                      {/* Header */}
                                      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          Process Description
                                        </h3>
                                        {/* Copy Description Button */}
                                        <button
                                          onClick={(e) => {
                                            // Format the description for copying
                                            let descriptionText = "PROCESS DESCRIPTION\n" + "=".repeat(20) + "\n\n";
                                            
                                            if (description.processName) {
                                              descriptionText += `Process Name: ${description.processName}\n\n`;
                                            }
                                            
                                            if (description.shortDescription) {
                                              descriptionText += `Description: ${description.shortDescription}\n\n`;
                                            }
                                            
                                            if (description.actors.length > 0) {
                                              descriptionText += `Actors/Participants:\n${description.actors.map(actor => `• ${actor}`).join('\n')}\n\n`;
                                            }
                                            
                                            if (description.keyTasks.length > 0) {
                                              descriptionText += `Key Tasks:\n${description.keyTasks.map(task => `• ${task}`).join('\n')}\n\n`;
                                            }
                                            
                                            if (description.processFlow) {
                                              descriptionText += `Process Flow: ${description.processFlow}\n\n`;
                                            }
                                            
                                            if (description.decisionPoints.length > 0) {
                                              descriptionText += `Decision Points:\n${description.decisionPoints.map(point => `• ${point}`).join('\n')}\n\n`;
                                            }
                                            
                                            if (description.outcomes.length > 0) {
                                              descriptionText += `Outcomes:\n${description.outcomes.map(outcome => `• ${outcome}`).join('\n')}\n\n`;
                                            }
                                            
                                            // If no structured data, use raw content
                                            if (!description.processName && !description.shortDescription && !description.actors.length && !description.keyTasks.length && !description.processFlow && !description.decisionPoints.length && !description.outcomes.length) {
                                              descriptionText = afterXml;
                                            }
                                            
                                            copyToClipboard(descriptionText, e.currentTarget as HTMLButtonElement);
                                          }}
                                          className="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/30 rounded-md text-white transition-colors shadow-sm"
                                          title="Copy Process Description"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                        </button>
                                      </div>

                                      {/* Content */}
                                      <div className="p-4 space-y-4">
                                        {/* Process Name */}
                                        {description.processName && (
                                          <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-1">Process Name</h4>
                                            <p className="text-gray-900 font-medium">{description.processName}</p>
                                          </div>
                                        )}

                                        {/* Short Description */}
                                        {description.shortDescription && (
                                          <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                                            <p className="text-gray-800 text-sm leading-relaxed">{description.shortDescription}</p>
                                          </div>
                                        )}

                                        {/* Two-column layout for the rest */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Actors */}
                                          {description.actors.length > 0 && (
                                            <div>
                                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                </svg>
                                                Actors/Participants
                                              </h4>
                                              <div className="flex flex-wrap gap-1">
                                                {description.actors.map((actor, idx) => (
                                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                    {actor}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Key Tasks */}
                                          {description.keyTasks.length > 0 && (
                                            <div>
                                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                Key Tasks
                                              </h4>
                                              <ul className="text-sm text-gray-800 space-y-1">
                                                {description.keyTasks.map((task, idx) => (
                                                  <li key={idx} className="flex items-start gap-2">
                                                    <span className="text-blue-600 mt-1">•</span>
                                                    {task}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>

                                        {/* Process Flow */}
                                        {description.processFlow && (
                                          <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              Process Flow
                                            </h4>
                                            <p className="text-gray-800 text-sm leading-relaxed">{description.processFlow}</p>
                                          </div>
                                        )}

                                        {/* Decision Points and Outcomes */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Decision Points */}
                                          {description.decisionPoints.length > 0 && (
                                            <div>
                                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Decision Points
                                              </h4>
                                              <ul className="text-sm text-gray-800 space-y-1">
                                                {description.decisionPoints.map((point, idx) => (
                                                  <li key={idx} className="flex items-start gap-2">
                                                    <span className="text-orange-600 mt-1">◆</span>
                                                    {point}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}

                                          {/* Outcomes */}
                                          {description.outcomes.length > 0 && (
                                            <div>
                                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                </svg>
                                                Outcomes
                                              </h4>
                                              <ul className="text-sm text-gray-800 space-y-1">
                                                {description.outcomes.map((outcome, idx) => (
                                                  <li key={idx} className="flex items-start gap-2">
                                                    <span className="text-green-600 mt-1">✓</span>
                                                    {outcome}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>

                                        {/* Fallback: If no structured data found, show raw content */}
                                        {!description.processName && !description.shortDescription && !description.actors.length && !description.keyTasks.length && !description.processFlow && !description.decisionPoints.length && !description.outcomes.length && (
                                          <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-gray-800 text-sm whitespace-pre-wrap">{afterXml}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        ) : message.type === 'assistant' && message.content.includes('\\documentclass') ? (
                          <div className="space-y-3">
                            {/* Response Type Indicator */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                                LaTeX Document Generated
                              </div>
                            </div>
                            
                            {/* Extract and display the text explanation before LaTeX */}
                            {(() => {
                              const latexStart = message.content.indexOf('\\documentclass');
                              if (latexStart > 0) {
                                const textContent = message.content.substring(0, latexStart).trim();
                                if (textContent) {
                                  return (
                                    <div className="mb-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                                      <p className="text-gray-800">{textContent}</p>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                            
                            {/* Display the LaTeX content in a code block */}
                            <div className="bg-gray-900 text-yellow-400 p-3 rounded-lg overflow-x-auto relative">
                              {/* Copy Button */}
                              <button
                                onClick={(e) => {
                                  // Extract only the LaTeX content, not the entire message
                                  const latexStart = message.content.indexOf('\\documentclass');
                                  if (latexStart !== -1) {
                                    // Find the end of the LaTeX document
                                    const latexEnd = message.content.lastIndexOf('\\end{document}');
                                    if (latexEnd !== -1) {
                                      // Include the complete LaTeX structure
                                      const latexContent = message.content.substring(latexStart, latexEnd + 16);
                                      copyToClipboard(latexContent, e.target as HTMLButtonElement);
                                    } else {
                                      // Fallback: copy from LaTeX start to end of message
                                      const latexContent = message.content.substring(latexStart);
                                      copyToClipboard(latexContent, e.target as HTMLButtonElement);
                                    }
                                  }
                                }}
                                className="absolute top-2 right-2 p-2 bg-gray-700 text-white rounded-md text-xs hover:bg-gray-600 transition-colors"
                                title="Copy LaTeX Code"
                              >
                                📋 Copy
                              </button>
                              <pre className="text-xs whitespace-pre-wrap pr-16">
                                {message.content.substring(message.content.indexOf('\\documentclass'))}
                              </pre>
                            </div>
                            
                            {/* Extract and display any text after LaTeX */}
                            {(() => {
                              const latexEnd = message.content.lastIndexOf('\\end{document}');
                              if (latexEnd > 0 && latexEnd + 16 < message.content.length) {
                                const afterLatex = message.content.substring(latexEnd + 16).trim();
                                if (afterLatex) {
                                  return (
                                    <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                      <p className="text-gray-800">{afterLatex}</p>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        ) : message.type === 'assistant' && message.content.includes('I apologize, but I\'m specialized in') ? (
                          <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                                Scope Guardrail
                              </div>
                            </div>
                            <p className="text-gray-800">{message.content}</p>
                          </div>
                        ) : message.type === 'assistant' && (message.content.includes('```') || message.content.includes('`')) ? (
                          <div className="space-y-3">
                            {/* Response Type Indicator */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                                Code Response
                              </div>
                            </div>
                            
                            {/* Extract and display text before code blocks */}
                            {(() => {
                              const codeStart = message.content.indexOf('```');
                              if (codeStart > 0) {
                                const textContent = message.content.substring(0, codeStart).trim();
                                if (textContent) {
                                  return (
                                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-400">
                                      <p className="text-gray-800">{textContent}</p>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                            
                            {/* Display code blocks with copy buttons */}
                            {message.content.split('```').map((block, index) => {
                              if (index % 2 === 1 && block.trim()) { // Odd indices are code blocks
                                const language = block.split('\n')[0].trim();
                                const codeContent = block.substring(language.length).trim();
                                return (
                                  <div key={index} className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto relative">
                                    {/* Copy Button */}
                                    <button
                                      onClick={(e) => {
                                        // codeContent already contains only the code, not the entire message
                                        copyToClipboard(codeContent, e.target as HTMLButtonElement);
                                      }}
                                      className="absolute top-2 right-2 p-2 bg-gray-700 text-white rounded-md text-xs hover:bg-gray-600 transition-colors"
                                      title="Copy Code"
                                    >
                                      📋 Copy
                                    </button>
                                    <div className="text-xs text-gray-400 mb-2">{language}</div>
                                    <pre className="text-xs whitespace-pre-wrap pr-16">
                                      {codeContent}
                                    </pre>
                                  </div>
                                );
                              }
                              return null;
                            })}
                            
                            {/* Extract and display text after code blocks */}
                            {(() => {
                              const codeEnd = message.content.lastIndexOf('```');
                              if (codeEnd > 0 && codeEnd + 3 < message.content.length) {
                                const afterCode = message.content.substring(codeEnd + 3).trim();
                                if (afterCode) {
                                  return (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-400">
                                      <p className="text-gray-800">{afterCode}</p>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <div>
                            {message.type === 'user' ? (
                              <div>
                                {editingMessageId === message.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editedContent}
                                      onChange={(e) => setEditedContent(e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded-lg resize-none text-gray-900 bg-white"
                                      rows={3}
                                      placeholder="Edit your message..."
                                      autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1 text-xs bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveEdit(message.id)}
                                        disabled={!editedContent.trim() || editedContent.trim() === message.content}
                                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Save & Regenerate
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p>{message.content}</p>
                                    
                                    {/* Display attached files */}
                                    {message.attachedFiles && message.attachedFiles.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {message.attachedFiles.map((file) => (
                                          <div key={file.id} className="flex items-center space-x-2 p-2 bg-white/50 rounded-lg border border-white/20">
                                            <div className="flex-shrink-0">
                                              {file.type.includes('pdf') ? (
                                                <div className="w-6 h-8 bg-red-100 rounded flex items-center justify-center">
                                                  <span className="text-red-600 text-xs font-bold">PDF</span>
                                                </div>
                                              ) : file.type.includes('word') ? (
                                                <div className="w-6 h-8 bg-blue-100 rounded flex items-center justify-center">
                                                  <span className="text-blue-600 text-xs font-bold">DOC</span>
                                                </div>
                                              ) : file.type.includes('xml') || file.name.endsWith('.bpmn') ? (
                                                <div className="w-6 h-8 bg-green-100 rounded flex items-center justify-center">
                                                  <span className="text-green-600 text-xs font-bold">XML</span>
                                                </div>
                                              ) : file.type.includes('json') || file.name.endsWith('.json') ? (
                                                <div className="w-6 h-8 bg-yellow-100 rounded flex items-center justify-center">
                                                  <span className="text-yellow-600 text-xs font-bold">JSON</span>
                                                </div>
                                              ) : file.type.startsWith('image/') ? (
                                                file.url ? (
                                                  <img src={file.url} alt={file.name} className="w-6 h-8 object-cover rounded" />
                                                ) : (
                                                  <div className="w-6 h-8 bg-purple-100 rounded flex items-center justify-center">
                                                    <span className="text-purple-600 text-xs font-bold">IMG</span>
                                                  </div>
                                                )
                                              ) : file.name.endsWith('.tex') || file.name.endsWith('.latex') ? (
                                                <div className="w-6 h-8 bg-indigo-100 rounded flex items-center justify-center">
                                                  <span className="text-indigo-600 text-xs font-bold">TEX</span>
                                                </div>
                                              ) : (
                                                <div className="w-6 h-8 bg-gray-100 rounded flex items-center justify-center">
                                                  <span className="text-gray-600 text-xs font-bold">FILE</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium text-white truncate">
                                                {file.name}
                                              </p>
                                              <p className="text-xs text-blue-200">
                                                {file.size > 1024 * 1024 
                                                  ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                                                  : `${(file.size / 1024).toFixed(1)} KB`
                                                }
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="relative group">
                                <div className="formatted-response">
                                  {renderMarkdown(message.content)}
                                </div>
                                
                                {/* Copy button for simple text responses */}
                                <button
                                  onClick={() => handleCopyMessage(message.id, message.content)}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-xs flex items-center gap-1"
                                  title="Copy response"
                                >
                                  {copiedMessageId === message.id ? (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <HiOutlineClipboardCopy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                    
                    {/* User Avatar - shown on right for user messages */}
                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mb-1">
                        <HiOutlineUser className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isGenerating && (
                  <AIThinkingAnimation />
                )}
              </div>
            </div>
          )}

          {/* Quick Prompts Section - Only show if showQuickPrompts is true and no messages */}
          {showQuickPrompts && messages.length === 0 && (
            <div className="w-full max-w-3xl mt-6">
              <div className="text-center mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Quick Prompts for BPMN Generation
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => {
                      setInputValue("Create a customer order processing workflow");
                      setShowQuickPrompts(false); // Hide quick prompts when a quick prompt is clicked
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-sm rounded-full border border-pink-400/70 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-200"
                  >
                    Customer Order Processing
                  </button>
                  <button
                    onClick={() => {
                      setInputValue("Design an employee onboarding process");
                      setShowQuickPrompts(false); // Hide quick prompts when a quick prompt is clicked
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-sm rounded-full border border-pink-400/70 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-200"
                  >
                    Employee Onboarding
                  </button>
                  <button
                    onClick={() => {
                      setInputValue("Build a product approval workflow");
                      setShowQuickPrompts(false); // Hide quick prompts when a quick prompt is clicked
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-sm rounded-full border border-pink-400/70 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-200"
                  >
                    Product Approval
                  </button>
                  <button
                    onClick={() => {
                      setInputValue("Create an invoice processing system");
                      setShowQuickPrompts(false); // Hide quick prompts when a quick prompt is clicked
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-sm rounded-full border border-pink-400/70 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-200"
                  >
                    Invoice Processing
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input Bar - Only show when there are NO messages (initial state) */}
          {messages.length === 0 && (
            <div className="w-full max-w-3xl">
              <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                  {/* Main Input Bar */}
                  <div className="bg-white rounded-3xl shadow-lg border border-gray-200/50 flex items-end px-3 py-3">
                    {/* Left Side - Plus Icon */}
                    <div className="relative" ref={plusMenuRef}>
                      <button
                        type="button"
                        onClick={togglePlusMenu}
                        className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200 mr-2"
                      >
                        <HiOutlinePlus className="w-5 h-5" />
                      </button>

                      {/* Plus Menu Dropdown */}
                      {showPlusMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200/50 overflow-hidden z-10">
                          {/* Add Photos & Files Option - File Upload */}
                          <div className="px-3 py-2 border-b border-gray-100">
                            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors duration-150">
                              <HiOutlinePhotograph className="w-6 h-6 text-blue-500 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">Add photos & files</div>
                                <div className="text-xs text-gray-500">BPMN 2.0, JSON, Word, PDF, TEX</div>
                              </div>
                              <input
                                type="file"
                                multiple
                                accept=".bpmn,.xml,.json,.doc,.docx,.pdf,.tex,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    const file = e.target.files[0];
                                    // Set the uploaded document for all file types
                                    setUploadedDocument(file);
                                    
                                    // Only extract text for PDF and Word documents for backward compatibility
                                    if (file.type.includes('pdf') || file.type.includes('word')) {
                                      handleDocumentUpload(e.target.files);
                                    } else {
                                      // For all other file types, clear document text as files will be sent raw to LLM
                                      setDocumentText('');
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {/* Generate BPMN Diagram Option */}
                          <button
                            type="button"
                            onClick={() => handleOptionSelect('Generate BPMN diagram')}
                            className="w-full px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2"
                          >
                            <HiOutlineTemplate className="w-6 h-6 text-green-500 flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-gray-900 text-sm">Generate BPMN diagram</div>
                              <div className="text-xs text-gray-500">AI-powered process flow creation</div>
                            </div>
                          </button>

                          {/* Generate LaTeX Option */}
                          <button
                            type="button"
                            onClick={() => handleOptionSelect('Generate LaTeX')}
                            className="w-full px-3 py-2 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2"
                          >
                            <HiOutlineDocumentText className="w-6 h-6 text-purple-500 flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-gray-900 text-sm">Generate LaTeX</div>
                              <div className="text-xs text-gray-500">AI-powered LaTeX document creation</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* File Attachment Display */}
                    {uploadedDocument && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {uploadedDocument.type.includes('pdf') ? (
                                <div className="w-8 h-10 bg-red-100 rounded flex items-center justify-center">
                                  <span className="text-red-600 text-xs font-bold">PDF</span>
                                </div>
                              ) : uploadedDocument.type.includes('word') ? (
                                <div className="w-8 h-10 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-blue-600 text-xs font-bold">DOC</span>
                                </div>
                              ) : uploadedDocument.type.includes('bpmn') || uploadedDocument.type.includes('xml') ? (
                                <div className="w-8 h-10 bg-green-100 rounded flex items-center justify-center">
                                  <span className="text-green-600 text-xs font-bold">XML</span>
                                </div>
                              ) : uploadedDocument.type.includes('json') || uploadedDocument.name.endsWith('.json') ? (
                                <div className="w-8 h-10 bg-yellow-100 rounded flex items-center justify-center">
                                  <span className="text-yellow-600 text-xs font-bold">JSON</span>
                                </div>
                              ) : uploadedDocument.type.startsWith('image/') ? (
                                <div className="w-8 h-10 bg-purple-100 rounded flex items-center justify-center">
                                  <span className="text-purple-600 text-xs font-bold">IMG</span>
                                </div>
                              ) : uploadedDocument.name.endsWith('.tex') || uploadedDocument.name.endsWith('.latex') ? (
                                <div className="w-8 h-10 bg-indigo-100 rounded flex items-center justify-center">
                                  <span className="text-indigo-600 text-xs font-bold">TEX</span>
                                </div>
                              ) : (
                                <div className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-bold">FILE</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {uploadedDocument.name}
                                </p>
                                {isDocumentProcessing && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-blue-600">Processing...</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {uploadedDocument.size > 1024 * 1024 
                                  ? `${(uploadedDocument.size / (1024 * 1024)).toFixed(1)} MB`
                                  : `${(uploadedDocument.size / 1024).toFixed(1)} KB`
                                }
                                {documentText && ` • ${documentText.length} characters extracted`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={removeAttachedFile}
                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors duration-150"
                            title="Remove file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        

                      </div>
                    )}

                    {/* Center - Textarea Field */}
                    <div className="flex-1 flex flex-col">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                        placeholder={uploadedDocument 
                          ? "Now describe what you want to do with this document (e.g., 'Generate a BPMN diagram from this process description')"
                          : "Describe the process you want to create..."
                        }
                      className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none border-none bg-transparent resize-none overflow-hidden min-h-[24px] max-h-[200px]"
                      disabled={isGenerating}
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e as any);
                        }
                      }}
                    />
                    </div>

                    {/* Right Side - Action Icons */}
                    <div className="flex items-center space-x-1.5 ml-3">
                      {/* Microphone Icon */}
                      {/* Microphone Icon - Disabled */}
                      <button
                        type="button"
                        disabled={true}
                        className="p-1.5 rounded-full transition-all duration-200 text-gray-300 cursor-not-allowed opacity-50"
                        title="Voice recording (Coming soon)"
                      >
                        <HiOutlineMicrophone className="w-5 h-5" />
                      </button>

                      {/* Sound Level Icon / Send Button - Changes when typing */}
                      <button
                        type={inputValue.trim() ? "submit" : "button"}
                        className={`p-1.5 rounded-full transition-all duration-200 ${
                          inputValue.trim() 
                            ? 'text-white bg-black hover:bg-gray-800' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        disabled={isGenerating}
                      >
                        {inputValue.trim() ? (
                          // Show up arrow send button when user is typing
                          <HiArrowUp className="w-5 h-5" />
                        ) : (
                          // Show disabled sound bars when input is empty
                          <div className="flex items-center gap-0.5 opacity-30">
                            <div className="w-0.5 bg-gray-400 rounded-sm h-1.5"></div>
                            <div className="w-0.5 bg-gray-400 rounded-sm h-3"></div>
                            <div className="w-0.5 bg-gray-400 rounded-sm h-4"></div>
                            <div className="w-0.5 bg-gray-400 rounded-sm h-3"></div>
                            <div className="w-0.5 bg-gray-400 rounded-sm h-1.5"></div>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button (Hidden but functional) */}
                  <button
                    type="submit"
                    className="absolute opacity-0 pointer-events-none"
                    disabled={!inputValue.trim() || isGenerating}
                  >
                    Submit
                  </button>
                </div>

                {/* Selected Options Tags */}
                {selectedOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedOptions.map((option, index) => (
                      <div
                        key={index}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                          option === 'Generate BPMN diagram' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : option === 'Generate LaTeX'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}
                      >
                        {option === 'Generate BPMN diagram' && (
                          <HiOutlineTemplate className="w-4 h-4" />
                        )}
                        {option === 'Generate LaTeX' && (
                          <HiOutlineDocumentText className="w-4 h-4" />
                        )}
                        <span>{option}</span>
                        <button
                          type="button"
                          onClick={() => removeOption(option)}
                          className="hover:bg-opacity-80 rounded-full p-0.5 transition-colors duration-150"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    
                    {/* Action hint */}
                    <div className="w-full text-xs text-gray-500 mt-2">
                      💡 <strong>Tip:</strong> {selectedOptions.includes('Generate BPMN diagram') && selectedOptions.includes('Generate LaTeX') 
                        ? 'You can generate both BPMN and LaTeX from the same prompt. Type your description and press Enter.'
                        : selectedOptions.includes('Generate BPMN diagram')
                        ? 'Type your business process description and press Enter to generate a BPMN diagram.'
                        : selectedOptions.includes('Generate LaTeX')
                        ? 'Type your document requirements and press Enter to generate LaTeX code.'
                        : 'Select an option above to get started with AI-powered generation.'
                      }
                    </div>
                  </div>
                )}


              </form>
            </div>
          )}

          {/* Bottom Spacing */}
          <div className="h-8"></div>
        </div>

        {/* Floating Input Bar - Only show when there are messages */}
        {messages.length > 0 && (
          <div className="floating-input-bar">
            <div className="flex justify-center px-6 py-4">
              <div className="w-full max-w-3xl">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="relative">
                    {/* Main Input Bar */}
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-200/50 flex items-end px-3 py-3">
                      {/* Left Side - Plus Icon */}
                      <div className="relative" ref={plusMenuRef}>
                  <button
                          type="button"
                          onClick={togglePlusMenu}
                          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200 mr-2"
                        >
                          <HiOutlinePlus className="w-5 h-5" />
                        </button>

                        {/* Plus Menu Dropdown */}
                        {showPlusMenu && (
                          <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200/50 overflow-hidden z-20">
                            {/* Add Photos & Files Option - File Upload */}
                            <div className="px-3 py-2 border-b border-gray-100">
                              <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors duration-150">
                                <HiOutlinePhotograph className="w-6 h-6 text-blue-500 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">Add photos & files</div>
                                  <div className="text-xs text-gray-500">BPMN 2.0, JSON, Word, PDF, TEX</div>
                                </div>
                                <input
                                  type="file"
                                  multiple
                                  accept=".bpmn,.xml,.json,.doc,.docx,.pdf,.tex,.png,.jpg,.jpeg"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      const file = e.target.files[0];
                                      // Set the uploaded document for all file types
                                      setUploadedDocument(file);
                                      
                                      // Only extract text for PDF and Word documents for backward compatibility
                                      if (file.type.includes('pdf') || file.type.includes('word')) {
                                        handleDocumentUpload(e.target.files);
                                      } else {
                                        // For all other file types, clear document text as files will be sent raw to LLM
                                        setDocumentText('');
                                      }
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            {/* Generate BPMN Diagram Option */}
                            <button
                              type="button"
                              onClick={() => handleOptionSelect('Generate BPMN diagram')}
                              className="w-full px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2"
                            >
                              <HiOutlineTemplate className="w-6 h-6 text-green-500 flex-shrink-0" />
                              <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900 text-sm">Generate BPMN diagram</div>
                                <div className="text-xs text-gray-500">AI-powered process flow creation</div>
                              </div>
                  </button>

                            {/* Generate LaTeX Option */}
                  <button
                              type="button"
                              onClick={() => handleOptionSelect('Generate LaTeX')}
                              className="w-full px-3 py-2 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2"
                            >
                              <HiOutlineDocumentText className="w-6 h-6 text-purple-500 flex-shrink-0" />
                              <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900 text-sm">Generate LaTeX</div>
                                <div className="text-xs text-gray-500">AI-powered LaTeX document creation</div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* File Attachment Display */}
                      {uploadedDocument && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {uploadedDocument.type.includes('pdf') ? (
                                  <div className="w-8 h-10 bg-red-100 rounded flex items-center justify-center">
                                    <span className="text-red-600 text-xs font-bold">PDF</span>
                                  </div>
                                ) : uploadedDocument.type.includes('word') ? (
                                  <div className="w-8 h-10 bg-blue-100 rounded flex items-center justify-center">
                                    <span className="text-blue-600 text-xs font-bold">DOC</span>
                                  </div>
                                ) : uploadedDocument.type.includes('bpmn') || uploadedDocument.type.includes('xml') ? (
                                  <div className="w-8 h-10 bg-green-100 rounded flex items-center justify-center">
                                    <span className="text-green-600 text-xs font-bold">XML</span>
                                  </div>
                                ) : uploadedDocument.type.includes('json') || uploadedDocument.name.endsWith('.json') ? (
                                  <div className="w-8 h-10 bg-yellow-100 rounded flex items-center justify-center">
                                    <span className="text-yellow-600 text-xs font-bold">JSON</span>
                                  </div>
                                ) : uploadedDocument.type.startsWith('image/') ? (
                                  <div className="w-8 h-10 bg-purple-100 rounded flex items-center justify-center">
                                    <span className="text-purple-600 text-xs font-bold">IMG</span>
                                  </div>
                                ) : uploadedDocument.name.endsWith('.tex') || uploadedDocument.name.endsWith('.latex') ? (
                                  <div className="w-8 h-10 bg-indigo-100 rounded flex items-center justify-center">
                                    <span className="text-indigo-600 text-xs font-bold">TEX</span>
                                  </div>
                                ) : (
                                  <div className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center">
                                    <span className="text-gray-600 text-xs font-bold">FILE</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {uploadedDocument.name}
                                  </p>
                                  {isDocumentProcessing && (
                                    <div className="flex items-center space-x-1">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                      <span className="text-xs text-blue-600">Processing...</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {uploadedDocument.size > 1024 * 1024 
                                    ? `${(uploadedDocument.size / (1024 * 1024)).toFixed(1)} MB`
                                    : `${(uploadedDocument.size / 1024).toFixed(1)} KB`
                                  }
                                  {documentText && ` • ${documentText.length} characters extracted`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={removeAttachedFile}
                              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors duration-150"
                              title="Remove file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          

                        </div>
                      )}

                      {/* Center - Textarea Field */}
                      <div className="flex-1 flex flex-col">
                      <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                          placeholder={uploadedDocument 
                            ? "Now describe what you want to do with this document (e.g., 'Generate a BPMN diagram from this process description')"
                            : "Describe the process you want to create..."
                          }
                        className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none border-none bg-transparent resize-none overflow-hidden min-h-[24px] max-h-[200px]"
                        disabled={isGenerating}
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e as any);
                          }
                        }}
                      />
                      </div>

                      {/* Right Side - Action Icons */}
                      <div className="flex items-center space-x-1.5 ml-3">
                        {/* Microphone Icon - Disabled */}
                        <button
                          type="button"
                          disabled={true}
                          className="p-1.5 text-gray-300 cursor-not-allowed opacity-50 rounded-full transition-all duration-200"
                          title="Voice recording (Coming soon)"
                        >
                          <HiOutlineMicrophone className="w-5 h-5" />
                  </button>

                        {/* Sound Level Icon / Send Button - Changes when typing */}
                  <button
                          type={inputValue.trim() ? "submit" : "button"}
                          className={`p-1.5 rounded-full transition-all duration-200 ${
                            inputValue.trim() 
                              ? 'text-white bg-black hover:bg-gray-800' 
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                          disabled={isGenerating}
                        >
                          {inputValue.trim() ? (
                            // Show up arrow send button when user is typing
                            <HiArrowUp className="w-5 h-5" />
                          ) : (
                            // Show disabled sound bars when input is empty
                            <div className="flex items-center gap-0.5 opacity-30">
                              <div className="w-0.5 bg-gray-400 rounded-sm h-1.5"></div>
                              <div className="w-0.5 bg-gray-400 rounded-sm h-3"></div>
                              <div className="w-0.5 bg-gray-400 rounded-sm h-4"></div>
                              <div className="w-0.5 bg-gray-400 rounded-sm h-3"></div>
                              <div className="w-0.5 bg-gray-400 rounded-sm h-1.5"></div>
                            </div>
                          )}
                  </button>
                      </div>
                    </div>

                    {/* Submit Button (Hidden but functional) */}
                  <button
                      type="submit"
                      className="absolute opacity-0 pointer-events-none"
                      disabled={!inputValue.trim() || isGenerating}
                    >
                      Submit
                  </button>
                </div>

                  {/* Selected Options Tags */}
                  {selectedOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedOptions.map((option, index) => (
                        <div
                          key={index}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                            option === 'Generate BPMN diagram' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : option === 'Generate LaTeX'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {option === 'Generate BPMN diagram' && (
                            <HiOutlineTemplate className="w-4 h-4" />
                          )}
                          {option === 'Generate LaTeX' && (
                            <HiOutlineDocumentText className="w-4 h-4" />
                          )}
                          <span>{option}</span>
                          <button
                            type="button"
                            onClick={() => removeOption(option)}
                            className="hover:bg-opacity-80 rounded-full p-0.5 transition-colors duration-150"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
              </div>
                      ))}
                      
                      {/* Action hint */}
                      <div className="w-full text-xs text-gray-500 mt-2">
                        💡 <strong>Tip:</strong> {selectedOptions.includes('Generate BPMN diagram') && selectedOptions.includes('Generate LaTeX') 
                          ? 'You can generate both BPMN and LaTeX from the same prompt. Type your description and press Enter.'
                          : selectedOptions.includes('Generate BPMN diagram')
                          ? 'Type your business process description and press Enter to generate a BPMN diagram.'
                          : selectedOptions.includes('Generate LaTeX')
                          ? 'Type your document requirements and press Enter to generate LaTeX code.'
                          : 'Select an option above to get started with AI-powered generation.'
                        }
                      </div>
            </div>
          )}


                </form>
        </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Chat Popup */}
      {showSearchPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            ref={searchPopupRef}
            className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <button
                onClick={() => setShowSearchPopup(false)}
                className="ml-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* New Chat Option */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    startNewChat();
                    setShowSearchPopup(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <HiOutlinePencil className="w-5 h-5 text-gray-600" />
                  <span>New chat</span>
                </button>
              </div>

              {/* Yesterday Section */}
              {yesterdayChats.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Yesterday
                  </h3>
                  <div className="space-y-1">
                                         {yesterdayChats.map((chat) => (
                       <button
                         key={chat._id}
                         onClick={() => {
                           loadChat(chat._id);
                           setShowSearchPopup(false);
                         }}
                         className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 text-left"
                       >
                         <HiOutlineChat className="w-4 h-4 text-gray-600 flex-shrink-0" />
                         <span className="truncate">{chat.title}</span>
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               {/* Previous 7 Days Section */}
               {previousWeekChats.length > 0 && (
                 <div className="mb-6">
                   <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                     Previous 7 Days
                   </h3>
                   <div className="space-y-1">
                     {previousWeekChats.map((chat) => (
                       <button
                         key={chat._id}
                         onClick={() => {
                           loadChat(chat._id);
                           setShowSearchPopup(false);
                         }}
                         className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 text-left"
                       >
                         <HiOutlineChat className="w-4 h-4 text-gray-600 flex-shrink-0" />
                         <span className="truncate">{chat.title}</span>
                       </button>
                     ))}
                   </div>
                 </div>
               )}

              {/* No results message */}
              {filteredChats.length === 0 && searchQuery && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No chats found matching "{searchQuery}"</p>
                </div>
              )}

              {/* Empty state when no chats */}
              {chats.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No chats yet. Start a new conversation!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Library Popup */}
      {showLibraryPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            ref={libraryPopupRef}
            className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HiOutlineLibrary className="h-6 w-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Library</h2>
              </div>
              <button
                onClick={() => setShowLibraryPopup(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-gray-600 mb-4">
                Access your collection of saved processes, components, and reusable elements
              </p>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Sales', 'HR', 'Finance', 'Operations'].map((category) => (
                    <button
                      key={category}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Library Items */}
              <div className="space-y-3">
                {libraryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <HiOutlineDocumentText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{item.type}</span>
                          <span>•</span>
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>{item.lastModified}</span>
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* BPMN Elements Popup */}
      {showBpmnElementsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            ref={bpmnElementsPopupRef}
            className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HiOutlineCube className="h-6 w-6 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">BPMN Elements</h2>
              </div>
              <button
                onClick={() => setShowBpmnElementsPopup(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-gray-600 mb-4">
                Standard BPMN shapes and symbols for building process diagrams
              </p>
              
              {/* Element Types */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Element Types</h3>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Event', 'Activity', 'Gateway', 'Container', 'Data'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedElementType(type)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ${
                        selectedElementType === type
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* BPMN Elements Grid */}
              <div className="grid grid-cols-2 gap-4">
                {filteredBpmnElements.length > 0 ? (
                  filteredBpmnElements.map((element) => (
                    <div
                      key={element.id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-lg">
                          {element.symbol}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{element.name}</h4>
                          <span className="text-xs text-gray-500">{element.type}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{element.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-gray-500 text-sm">No elements found for "{selectedElementType}" type</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}



      {/* AI Settings Popup */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HiOutlineCog className="h-6 w-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Settings</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Token Management */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Token Management</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Tokens</label>
                    <input
                      type="range"
                      min="1000"
                      max="8000"
                      step="500"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1000</span>
                      <span>{maxTokens}</span>
                      <span>8000</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="economyMode"
                      checked={economyMode}
                      onChange={(e) => setEconomyMode(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="economyMode" className="text-sm text-gray-700">
                      Economy Mode (focused responses, maintains completeness)
                    </label>
                  </div>
                </div>
              </div>

              {/* Text-to-Speech Settings */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Text-to-Speech</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 opacity-50">
                    <input
                      type="checkbox"
                      id="ttsEnabled"
                      checked={false}
                      disabled={true}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-not-allowed"
                    />
                    <label htmlFor="ttsEnabled" className="text-sm text-gray-400 cursor-not-allowed">
                      Enable TTS for AI responses (Coming soon)
                    </label>
                  </div>
                </div>
              </div>



              {/* Cache Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Cache Information</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cached responses:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {aiService.getCacheStats().totalEntries}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      aiService.clearCache();
                      alert('Cache cleared successfully!');
                    }}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 hover:underline"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* XML Code Modal */}
      <XmlCodeModal
        xml={previewXml}
        isOpen={showXmlPreview}
        onClose={() => setShowXmlPreview(false)}
        title="BPMN XML Code"
      />
    </div>
  );
}
