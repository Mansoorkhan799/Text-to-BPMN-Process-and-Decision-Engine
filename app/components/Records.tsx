'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Record, Person, Comment, CommentType } from '../types';
import { HiPlus, HiPencil, HiTrash, HiEye, HiEyeOff, HiCheck, HiX, HiLink, HiMicrophone, HiVideoCamera, HiPaperClip, HiCalendar, HiTag, HiUser, HiDocumentText, HiChat, HiChevronDown, HiChevronRight, HiMenu, HiChevronDoubleRight } from 'react-icons/hi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RecordsProps {
  user?: any; // Add user prop for optimized queries
}

const Records: React.FC<RecordsProps> = ({ user }) => {
  // Records state with caching
  const [records, setRecords] = useState<Record[]>([]);
  const [recordsCache, setRecordsCache] = useState<Map<string, Record>>(new Map());
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  
  // Hierarchy state
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  const [draggedRecord, setDraggedRecord] = useState<Record | null>(null);
  const [dragOverRecord, setDragOverRecord] = useState<string | null>(null);
  
  // Load expanded state from localStorage on component mount
  useEffect(() => {
    try {
      const savedExpandedChildren = localStorage.getItem('expandedChildren');
      if (savedExpandedChildren) {
        setExpandedChildren(new Set(JSON.parse(savedExpandedChildren)));
      }
      
      const savedExpandedRecords = localStorage.getItem('expandedRecords');
      if (savedExpandedRecords) {
        setExpandedRecords(new Set(JSON.parse(savedExpandedRecords)));
      }
      
      // Test: Force expand all records with children after a delay
      setTimeout(() => {
        console.log('🧪 Test: Force expanding all records with children on mount');
        const allRecords = Array.from(records);
        const recordsWithChildren = allRecords.filter((r: Record) => {
          const children = allRecords.filter((child: Record) => child.parentId === r.id);
          return children.length > 0;
        });
        
        if (recordsWithChildren.length > 0) {
          const allExpanded = new Set(recordsWithChildren.map((r: Record) => r.id));
          setExpandedChildren(allExpanded);
          console.log('🧪 Test: Force expanded records:', Array.from(allExpanded));
        }
      }, 1000);
    } catch (error) {
      console.error('Error loading expanded state from localStorage:', error);
    }
  }, []);
  
  // Restore expanded state after records are loaded
  useEffect(() => {
    if (records.length > 0) {
      console.log('🔄 Records state changed, records.length:', records.length);
      
      // Use setTimeout to ensure this runs after the fetchRecords function completes
      setTimeout(() => {
        try {
          console.log('⏰ Running delayed state restoration...');
          
          // First, try to restore from localStorage
          const savedExpandedChildren = localStorage.getItem('expandedChildren');
          if (savedExpandedChildren) {
            console.log('🔄 Restoring expanded children state from localStorage:', JSON.parse(savedExpandedChildren));
            setExpandedChildren(new Set(JSON.parse(savedExpandedChildren)));
          }
          
          const savedExpandedRecords = localStorage.getItem('expandedRecords');
          if (savedExpandedRecords) {
            console.log('🔄 Restoring expanded records state from localStorage:', JSON.parse(savedExpandedRecords));
            setExpandedRecords(new Set(JSON.parse(savedExpandedRecords)));
          }
          
          // Auto-expand records that have children to ensure hierarchy is visible
          const recordsWithChildren = records.filter((r: Record) => {
            const children = records.filter((child: Record) => child.parentId === r.id);
            return children.length > 0;
          });
          
          console.log('🔍 Records with children found:', recordsWithChildren.map((r: Record) => ({ 
            id: r.id, 
            title: r.title, 
            childrenCount: records.filter(child => child.parentId === r.id).length 
          })));
          
          if (recordsWithChildren.length > 0) {
            console.log('🔍 Auto-expanding records with children:', recordsWithChildren.map((r: Record) => r.title));
            const autoExpandedChildren = new Set(recordsWithChildren.map((r: Record) => r.id));
            
            // Merge with saved state
            const savedChildren = savedExpandedChildren ? JSON.parse(savedExpandedChildren) as string[] : [];
            const finalExpandedChildren = new Set<string>([
              ...savedChildren,
              ...Array.from(autoExpandedChildren)
            ]);
            
            console.log('🔍 Final expanded children state:', Array.from(finalExpandedChildren));
            setExpandedChildren(finalExpandedChildren);
            
            // Save the auto-expanded state
            try {
              localStorage.setItem('expandedChildren', JSON.stringify(Array.from(finalExpandedChildren)));
              console.log('💾 Saved auto-expanded state to localStorage');
            } catch (error) {
              console.error('Error saving auto-expanded state:', error);
            }
          }
          
          console.log('📊 Records loaded:', records.length, 'Final expanded children:', Array.from(expandedChildren));
          
          // Debug: Check if child records exist
          const childRecords = records.filter(r => r.parentId);
          console.log('🔍 Found child records:', childRecords.map(r => ({ id: r.id, title: r.title, parentId: r.parentId })));
        } catch (error) {
          console.error('Error restoring expanded state after records load:', error);
        }
      }, 200); // Increased delay to ensure fetchRecords completes first
    }
  }, [records.length]);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;
  
  // Performance monitoring
  const [loadTime, setLoadTime] = useState<number>(0);
  const [queryCount, setQueryCount] = useState<number>(0);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  
  // Comment system state
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isViewCommentsModalOpen, setIsViewCommentsModalOpen] = useState(false);
  const [isViewRecordModalOpen, setIsViewRecordModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<Record | null>(null);
  const [commentingRecord, setCommentingRecord] = useState<Record | null>(null);
  const [commentData, setCommentData] = useState<Partial<Comment>>({
    type: 'text',
    content: '',
    author: 'Current User'
  });
  const [commentParentId, setCommentParentId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  
  // Comment editing state
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editingCommentData, setEditingCommentData] = useState<Partial<Comment>>({
    content: '',
    author: ''
  });
  
  // Refresh button state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Chat sidebar state
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [chatRecord, setChatRecord] = useState<Record | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    author: string;
    content: string;
    timestamp: Date;
    isOwner: boolean;
    file?: {
      name: string;
      size: number;
      type: string;
      url: string;
    };
  }>>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  
  // File upload state for chat
  const [chatFileInput, setChatFileInput] = useState<HTMLInputElement | null>(null);
  
  // Audio player state
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Video player state
  const [currentVideo, setCurrentVideo] = useState<HTMLVideoElement | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Record>>({
    title: '',
    date: new Date(),
    tag: '',
    attachments: [],
    link: '',
    voiceNotes: [],
    videoNotes: [],
    owner: '',
    parentId: null,
    level: 0,
    order: 0
  });

  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  
  // Refs for media recording
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Comment recording states
  const [isRecordingCommentAudio, setIsRecordingCommentAudio] = useState(false);
  const [isRecordingCommentVideo, setIsRecordingCommentVideo] = useState(false);
  const [commentAudioBlob, setCommentAudioBlob] = useState<Blob | null>(null);
  const [commentVideoBlob, setCommentVideoBlob] = useState<Blob | null>(null);
  
  // Refs for comment media recording
  const commentAudioRef = useRef<HTMLAudioElement>(null);
  const commentVideoRef = useRef<HTMLVideoElement>(null);
  const commentMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const commentStreamRef = useRef<MediaStream | null>(null);

  // Sample people data
  const people: Person[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Manager' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Developer' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'Analyst' },
    { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Designer' }
  ];

  // Sample tags
  const availableTags = ['Project', 'Meeting', 'Document', 'Task', 'Idea', 'Note', 'Reference'];

  // Smart auto-refresh cache in background with performance optimization
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we have records and cache is getting stale
      if (records.length > 0 && (Date.now() - lastFetchTime) > CACHE_DURATION) {
        // Check if there are any recent updates before refreshing
        const timeSinceLastUpdate = Math.max(...records.map(r => r.updatedAt ? new Date(r.updatedAt).getTime() : 0));
        const timeSinceLastUpdateMs = Date.now() - timeSinceLastUpdate;
        
        // Only refresh if data is actually stale (more than 5 minutes old)
        if (timeSinceLastUpdateMs > 5 * 60 * 1000) {
          console.log('🔄 Auto-refreshing records due to stale cache');
        fetchRecords(false); // Silent refresh
        } else {
          console.log('✅ Cache is fresh, skipping auto-refresh');
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [records.length, lastFetchTime]);

  // Initial fetch
  useEffect(() => {
    fetchRecords();
    setComments([]);
  }, []);

  // Fetch records from MongoDB with optimized caching and query parameters
  const fetchRecords = async (forceRefresh: boolean = false) => {
    const now = Date.now();
    
    // Check if we can use cached data
    if (!forceRefresh && 
        records.length > 0 && 
        (now - lastFetchTime) < CACHE_DURATION) {
      return; // Use cached data
    }
    
    // Preserve expanded state before refreshing
    const currentExpandedChildren = new Set(expandedChildren);
    const currentExpandedRecords = new Set(expandedRecords);
    
    setIsLoadingRecords(true);
    
    try {
      // Build query parameters for optimized fetching
      const params = new URLSearchParams();
      
      // Add user-specific filtering if available
      if (user?.id) {
        params.append('userId', user.id);
      }
      
      // Add current filter parameters
      if (filterTag !== 'all') {
        params.append('tag', filterTag);
      }
      if (filterOwner !== 'all') {
        params.append('owner', filterOwner);
      }
      
      // IMPORTANT: Don't filter by parentId here - we need ALL records to build the hierarchy
      // The previous query was only getting top-level records, missing the children
      
      const response = await fetch(`/api/records?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Convert date strings back to Date objects and handle media files
        const recordsWithDates = data.map((record: any) => ({
          ...record,
          id: record._id || record.id, // Handle MongoDB _id
          createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
          updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
          date: record.date ? new Date(record.date) : new Date(),
          // Filter out invalid voice and video notes that can't be displayed
          voiceNotes: record.voiceNotes?.filter((note: any) => note && note.file) || [],
          videoNotes: record.videoNotes?.filter((note: any) => note && note.file) || []
        }));
        
        // Debug: Log all fetched records to see what we're getting
        console.log('🔍 Raw data from MongoDB:', data);
        console.log('🔍 Processed records:', recordsWithDates.map((r: Record) => ({
          id: r.id,
          title: r.title,
          parentId: r.parentId,
          level: r.level
        })));
        
        // Update cache with new data
        const newCache = new Map();
        recordsWithDates.forEach((record: Record) => {
          newCache.set(record.id, record);
        });
        setRecordsCache(newCache);
        setRecords(recordsWithDates);
        setLastFetchTime(now);
        
        // Simple state restoration - let the useEffect handle the complex logic
        console.log('🔄 Restoring basic expanded state after fetch:', {
          children: Array.from(currentExpandedChildren),
          records: Array.from(currentExpandedRecords)
        });
        
        setExpandedChildren(currentExpandedChildren);
        setExpandedRecords(currentExpandedRecords);
        
        const loadTimeMs = Date.now() - now;
        setLoadTime(loadTimeMs);
        setQueryCount(prev => prev + 1);
        console.log(`✅ Loaded ${recordsWithDates.length} records in ${loadTimeMs}ms`);
        
        // Debug: Check for parent-child relationships
        const parentRecords = recordsWithDates.filter((r: Record) => r.parentId);
        const topLevelRecords = recordsWithDates.filter((r: Record) => !r.parentId);
        console.log('🔍 Records with parentId:', parentRecords.map((r: Record) => ({ id: r.id, title: r.title, parentId: r.parentId })));
        console.log('🔍 Top level records:', topLevelRecords.map((r: Record) => ({ id: r.id, title: r.title })));
        console.log('🔍 All records loaded:', recordsWithDates.map((r: Record) => ({ id: r.id, title: r.title, parentId: r.parentId, level: r.level })));
        
        // Check if we're missing child records
        if (parentRecords.length === 0 && recordsWithDates.length < 3) {
          console.warn('⚠️ WARNING: Expected 3 records (1 parent + 2 children) but only got', recordsWithDates.length);
          console.warn('⚠️ This suggests the API endpoint is filtering out child records');
        }
      } else {
        console.error('Failed to fetch records, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // Comment system functions
  const openCommentModal = (record: Record, parentCommentId?: string) => {
    setCommentingRecord(record);
    setCommentParentId(parentCommentId || null);
    setCommentData({
      type: 'text',
      content: '',
      author: 'Current User'
    });
    
    // Reset editing state
    setEditingComment(null);
    setEditingCommentData({
      content: '',
      author: ''
    });
    
    // Reset comment recording states
    setIsRecordingCommentAudio(false);
    setIsRecordingCommentVideo(false);
    setCommentAudioBlob(null);
    setCommentVideoBlob(null);
    
    // Clean up any active comment streams
    if (commentStreamRef.current) {
      commentStreamRef.current.getTracks().forEach(track => track.stop());
      commentStreamRef.current = null;
    }
    
    setIsCommentModalOpen(true);
  };

  const openViewCommentsModal = (record: Record) => {
    setCommentingRecord(record);
    setIsViewCommentsModalOpen(true);
  };

  const openViewRecordModal = (record: Record) => {
    setViewingRecord(record);
    setIsViewRecordModalOpen(true);
  };

  const closeCommentModal = () => {
    setIsCommentModalOpen(false);
    setCommentingRecord(null);
    setCommentParentId(null);
    setCommentData({
      type: 'text',
      content: '',
      author: 'Current User'
    });
    
    // Reset editing state
    setEditingComment(null);
    setEditingCommentData({
      content: '',
      author: ''
    });
    
    // Reset comment recording states
    setIsRecordingCommentAudio(false);
    setIsRecordingCommentVideo(false);
    setCommentAudioBlob(null);
    setCommentVideoBlob(null);
    
    // Clean up any active comment streams
    if (commentStreamRef.current) {
      commentStreamRef.current.getTracks().forEach(track => track.stop());
      commentStreamRef.current = null;
    }
    
    // Clear comment media recorder
    if (commentMediaRecorderRef.current) {
      commentMediaRecorderRef.current = null;
    }
  };

  const closeViewCommentsModal = () => {
    setIsViewCommentsModalOpen(false);
    setCommentingRecord(null);
  };

  const closeViewRecordModal = () => {
    setIsViewRecordModalOpen(false);
    setViewingRecord(null);
  };

  const handleCommentSubmit = () => {
    if (!commentData.content || !commentingRecord) return;

    const newComment: Comment = {
      id: Date.now().toString(),
        recordId: commentingRecord.id,
        parentId: commentParentId,
        author: commentData.author || 'Current User',
        content: commentData.content,
        type: commentData.type || 'text',
      mediaUrl: commentData.mediaUrl,
      mediaType: commentData.mediaType,
      createdAt: new Date(),
      updatedAt: new Date(),
      level: commentParentId ? (comments.find(c => c.id === commentParentId)?.level || 0) + 1 : 0,
      order: Date.now()
    };

    setComments([...comments, newComment]);
      closeCommentModal();
    showSuccessMessage(commentParentId ? 'Reply added successfully!' : 'Comment added successfully!');
  };

  const toggleCommentExpansion = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const getCommentChildren = (parentId: string): Comment[] => {
    return comments
      .filter(comment => comment.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  const getRecordComments = (recordId: string): Comment[] => {
    return comments
      .filter(comment => comment.recordId === recordId && !comment.parentId)
      .sort((a, b) => a.order - b.order);
  };

    const formatDateTime = (date: Date | string): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Safe function to create object URLs for media files
  const createSafeObjectURL = (file: any): string | null => {
    try {
      if (file && (file instanceof Blob || file instanceof File)) {
        return URL.createObjectURL(file);
      }
      // Handle base64 data from MongoDB
      if (file && file.base64Data && file.mimeType) {
        // Convert base64 to blob
        const byteCharacters = atob(file.base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.mimeType });
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      console.warn('Failed to create object URL for file:', file, error);
      return null;
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false): JSX.Element => {
    const children = getCommentChildren(comment.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedComments.has(comment.id);
    const indentLevel = comment.level * 20;

    return (
      <div key={comment.id} className={`mb-3 ${isReply ? 'ml-6' : ''}`}>
        <div 
          className={`bg-gray-50 rounded-lg p-3 border-l-4 ${
            comment.type === 'voice' ? 'border-l-purple-400' :
            comment.type === 'video' ? 'border-l-red-400' : 'border-l-blue-400'
          }`}
          style={{ marginLeft: `${indentLevel}px` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-gray-900">{comment.author}</span>
                <span className="text-xs text-gray-500">
                  {formatDateTime(comment.createdAt)}
                  {comment.updatedAt && comment.updatedAt > comment.createdAt && (
                    <span className="ml-1 text-gray-400">(edited)</span>
                  )}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <HiChat className="w-3 h-3 mr-1" />
                  text
                </span>
              </div>
              
                <p className="text-gray-700">{comment.content}</p>
              
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => openCommentModal(
                    records.find(r => r.id === comment.recordId)!,
                    comment.id
                  )}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <HiChat className="w-3 h-3 mr-1" />
                  Reply
                </button>
                <button
                  onClick={() => openCommentEditModal(comment)}
                  className="text-xs text-green-600 hover:text-green-800 flex items-center"
                >
                  <HiPencil className="w-3 h-3 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleCommentDelete(comment.id)}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center"
                >
                  <HiTrash className="w-3 h-3 mr-1" />
                  Delete
                </button>
                {hasChildren && (
                  <button
                    onClick={() => toggleCommentExpansion(comment.id)}
                    className="text-xs text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    {isExpanded ? <HiChevronDown className="w-3 h-3 mr-1" /> : <HiChevronRight className="w-3 h-3 mr-1" />}
                    {isExpanded ? 'Hide' : 'Show'} {children.length} {children.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Render replies if expanded */}
        {isExpanded && hasChildren && (
          <div className="mt-2">
            {children.map(child => renderComment(child, true))}
          </div>
        )}
      </div>
    );
  };

  const renderArtifactsSection = (record: Record) => {
    const isExpanded = expandedRecords.has(record.id);
    
    return (
      <div className="mt-2">
        {/* Artifacts List Dropdown */}
        {isExpanded && (
          <div className="mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-2">
              {/* Chat with Owner */}
              <div className="flex items-center p-2 hover:bg-green-50 rounded-md cursor-pointer transition-colors duration-150"
                   onClick={() => {
                     openChatSidebar(record);
                     toggleRecordExpansion(record.id);
                   }}>
                <svg className="w-4 h-4 text-green-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                <span className="text-sm text-gray-700">Chat with Owner</span>
              </div>
              
              {/* Add Child Record */}
              <div className="flex items-center p-2 hover:bg-blue-50 rounded-md cursor-pointer transition-colors duration-150"
                   onClick={() => {
                     setFormData({
                       title: '',
                       date: new Date(),
                       tag: '',
                       attachments: [],
                       link: '',
                       voiceNotes: [],
                       videoNotes: [],
                       owner: record.owner,
                       parentId: record.id,
                       level: (record.level || 0) + 1,
                       order: Date.now()
                     });
                     setIsAddingRecord(true);
                     toggleRecordExpansion(record.id);
                   }}>
                <HiPlus className="w-4 h-4 text-blue-600 mr-3" />
                <span className="text-sm text-gray-700">Add Child Record</span>
              </div>
              
              {/* Edit Record */}
              <div className="flex items-center p-2 hover:bg-yellow-50 rounded-md cursor-pointer transition-colors duration-150"
                   onClick={() => {
                     handleEditRecord(record);
                     toggleRecordExpansion(record.id);
                   }}>
                <HiPencil className="w-4 h-4 text-yellow-600 mr-3" />
                <span className="text-sm text-gray-700">Edit Record</span>
              </div>
              
              {/* Delete Record */}
              <div className="flex items-center p-2 hover:bg-red-50 rounded-md cursor-pointer transition-colors duration-150"
                   onClick={async () => {
                     if (confirm('Are you sure you want to delete this record?')) {
                       try {
                         const response = await fetch(`/api/records/${record.id}`, {
                           method: 'DELETE'
                         });
                         
                         if (response.ok) {
                           setRecords(records.filter(r => r.id !== record.id));
                           showSuccessMessage('Record deleted successfully!');
                         } else {
                           throw new Error('Failed to delete record');
                         }
                       } catch (error) {
                         console.error('Error deleting record:', error);
                         alert('Failed to delete record. Please try again.');
                       }
                     }
                     toggleRecordExpansion(record.id);
                   }}>
                <HiTrash className="w-4 h-4 text-red-600 mr-3" />
                <span className="text-sm text-gray-700">Delete Record</span>
              </div>
              
              {/* Make it Parent (only for child records) */}
              {record.level > 0 && (
                <div className="flex items-center p-2 hover:bg-purple-50 rounded-md cursor-pointer transition-colors duration-150"
                     onClick={() => {
                       moveToTopLevel(record);
                       toggleRecordExpansion(record.id);
                     }}>
                  <HiChevronDoubleRight className="w-4 h-4 text-purple-600 mr-3" />
                  <span className="text-sm text-gray-700">Make it Parent</span>
                </div>
              )}
              
              {/* Add Comment */}
              <div className="flex items-center p-2 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors duration-150"
                   onClick={() => {
                     openCommentModal(record);
                     toggleRecordExpansion(record.id);
                   }}>
                <HiChat className="w-4 h-4 text-indigo-600 mr-3" />
                <span className="text-sm text-gray-700">
                  Add Comment
                  {getRecordComments(record.id).length > 0 && (
                    <span className="ml-2 text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                      {getRecordComments(record.id).length}
                    </span>
                  )}
                </span>
              </div>
              
              {/* View Comments */}
              {getRecordComments(record.id).length > 0 && (
                <div className="flex items-center p-2 hover:bg-green-50 rounded-md cursor-pointer transition-colors duration-150"
                     onClick={() => {
                       openViewCommentsModal(record);
                       toggleRecordExpansion(record.id);
                     }}>
                  <HiEye className="w-4 h-4 text-green-600 mr-3" />
                  <span className="text-sm text-gray-700">
                    View Comments
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      {getRecordComments(record.id).length}
                    </span>
                  </span>
                </div>
              )}
              
              {/* View Record */}
              <div className="flex items-center p-2 hover:bg-purple-50 rounded-md cursor-pointer transition-colors duration-150"
                   onClick={() => {
                     openViewRecordModal(record);
                     toggleRecordExpansion(record.id);
                   }}>
                <HiEye className="w-4 h-4 text-purple-600 mr-3" />
                <span className="text-sm text-gray-700">View Record</span>
              </div>
              
              {/* View Attachments */}
              {record.attachments.length > 0 && (
                <div className="flex items-center p-2 hover:bg-orange-50 rounded-md cursor-pointer transition-colors duration-150"
                     onClick={() => {
                       alert(`Viewing ${record.attachments.length} attachment(s)`);
                       toggleRecordExpansion(record.id);
                     }}>
                  <HiPaperClip className="w-4 h-4 text-orange-600 mr-3" />
                  <span className="text-sm text-gray-700">
                    View Attachments
                    <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                      {record.attachments.length}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const record = records.find(r => r.id === active.id);
    if (record) {
      setDraggedRecord(record);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDragOverRecord(over.id as string);
    } else {
      setDragOverRecord(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const draggedRecord = records.find(r => r.id === active.id);
      const targetRecord = records.find(r => r.id === over.id);
      
      if (draggedRecord && targetRecord) {
        // Check if this would create a circular reference
        if (wouldCreateCircularReference(draggedRecord.id, targetRecord.id)) {
          showSuccessMessage('❌ Cannot create circular reference in hierarchy');
          setDraggedRecord(null);
          setDragOverRecord(null);
          return;
        }
        
        // Determine the new parent and level
        let newParentId: string | null = null;
        let newLevel = 0;
        
        // If dropping on a record, make it a child
        newParentId = targetRecord.id;
        newLevel = (targetRecord.level || 0) + 1;
        
        // Update the dragged record
        const updatedRecord = {
          ...draggedRecord,
          parentId: newParentId,
          level: newLevel,
          updatedAt: new Date()
        };
        
        // Update local state immediately for better UX
        setRecords(prev => prev.map(r => 
          r.id === draggedRecord.id ? updatedRecord : r
        ));
        
        // Update cache
        setRecordsCache(prev => {
          const newCache = new Map(prev);
          newCache.set(draggedRecord.id, updatedRecord);
          return newCache;
        });
        
        // Update in database
        try {
          const response = await fetch(`/api/records/${draggedRecord.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentId: newParentId,
              level: newLevel,
              updatedAt: new Date()
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to update record hierarchy');
          }
          
          showSuccessMessage(
            `✅ "${draggedRecord.title}" is now a child of "${targetRecord.title}"`
          );
        } catch (error) {
          console.error('Error updating record hierarchy:', error);
          // Rollback on error
          setRecords(prev => prev.map(r => 
            r.id === draggedRecord.id ? draggedRecord : r
          ));
          setRecordsCache(prev => {
            const newCache = new Map(prev);
            newCache.set(draggedRecord.id, draggedRecord);
            return newCache;
          });
          alert('Failed to update record hierarchy. Please try again.');
        }
      }
    }
    
    setDraggedRecord(null);
    setDragOverRecord(null);
  };

  // Helper function to prevent circular references
  const wouldCreateCircularReference = (draggedId: string, targetId: string): boolean => {
    const isDescendant = (parentId: string, childId: string): boolean => {
      const children = records.filter(r => r.parentId === parentId);
      for (const child of children) {
        if (child.id === childId) return true;
        if (isDescendant(child.id, childId)) return true;
      }
      return false;
    };
    
    return isDescendant(draggedId, targetId);
  };

  // Function to move record to top level
  const moveToTopLevel = async (record: Record) => {
    try {
      const updatedRecord = {
        ...record,
        parentId: null,
        level: 0,
        updatedAt: new Date()
      };
      
      // Update local state
      setRecords(prev => prev.map(r => 
        r.id === record.id ? updatedRecord : r
      ));
      
      // Update cache
      setRecordsCache(prev => {
        const newCache = new Map(prev);
        newCache.set(record.id, updatedRecord);
        return newCache;
      });
      
      // Update in database
      const response = await fetch(`/api/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: null,
          level: 0,
          updatedAt: new Date()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to move record to top level');
      }
      
              showSuccessMessage(`✅ Child record "${record.title}" is now a parent record`);
    } catch (error) {
      console.error('Error moving record to top level:', error);
      alert('Failed to move record to top level. Please try again.');
    }
  };

  // Optimized hierarchy functions with memoization
  const getRecordChildren = useCallback((parentId: string | null): Record[] => {
    return records
      .filter(record => record.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }, [records]);

  const getRecordLevel = useCallback((record: Record): number => {
    return record.level || 0;
  }, []);

  const toggleRecordExpansion = (recordId: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRecords(newExpanded);
    
    // Save to localStorage
    try {
      localStorage.setItem('expandedRecords', JSON.stringify(Array.from(newExpanded)));
    } catch (error) {
      console.error('Error saving expandedRecords to localStorage:', error);
    }
  };

  const toggleChildrenExpansion = (recordId: string) => {
    const newExpanded = new Set(expandedChildren);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
      console.log('🔽 Collapsed children for record:', recordId);
    } else {
      newExpanded.add(recordId);
      console.log('🔼 Expanded children for record:', recordId);
    }
    setExpandedChildren(newExpanded);
    
    // Save to localStorage
    try {
      const stateToSave = Array.from(newExpanded);
      localStorage.setItem('expandedChildren', JSON.stringify(stateToSave));
      console.log('💾 Saved expanded children state to localStorage:', stateToSave);
    } catch (error) {
      console.error('Error saving expandedChildren to localStorage:', error);
    }
  };

  // Draggable Record Component
  const DraggableRecord: React.FC<{ record: Record; level: number }> = ({ record, level }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: record.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const children = getRecordChildren(record.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedChildren.has(record.id);
    const indentLevel = level * 24;
    const isDragOver = dragOverRecord === record.id;
    
    // Debug logging for this record
    console.log(`🔍 DraggableRecord ${record.title}:`, {
      id: record.id,
      level,
      hasChildren,
      childrenCount: children.length,
      isExpanded,
      expandedChildrenState: Array.from(expandedChildren)
    });

    return (
      <div key={record.id} className="mt-2 mb-4 mx-2">
        <div 
          ref={setNodeRef}
          style={{
            ...style,
            marginLeft: `${indentLevel}px`
          }}
          className={`bg-white rounded-lg border transition-all duration-200 group ${
            isDragging 
              ? 'opacity-50 shadow-2xl scale-105' 
              : 'hover:bg-gray-50 hover:shadow-md hover:border-gray-300'
          } ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-opacity-50' 
              : ''
          } ${
            level > 0 
              ? 'border border-purple-100 shadow-sm bg-gradient-to-r from-purple-50/30 to-white' 
              : 'border border-gray-200 shadow-sm'
          }`}
          id={`record-${record.id}`}
        >
          <div className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {/* Hierarchy indicators and controls */}
                  <div className="flex items-center space-x-2">
                    {/* Drag Handle */}
                    <div 
                      {...attributes}
                      {...listeners}
                      className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600 transition-colors flex items-center justify-center group/drag"
                      title="Drag to create hierarchy"
                    >
                      <HiMenu className="w-3 h-3 group-hover/drag:scale-110 transition-transform" />
                    </div>
                    

                    

                  </div>
                  
                  <h3 className="text-base font-medium text-gray-900">{record.title}</h3>
                  
                  {/* Chevron after title */}
                  {hasChildren && (
                    <button
                      onClick={() => toggleChildrenExpansion(record.id)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      title={isExpanded ? "Collapse children" : "Expand children"}
                    >
                      {isExpanded ? <HiChevronDown className="w-4 h-4" /> : <HiChevronRight className="w-4 h-4" />}
                    </button>
                  )}
                  
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {record.tag}
                  </span>

                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <HiCalendar className="w-4 h-4" />
                    <span>{formatDate(record.date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <HiUser className="w-4 h-4" />
                    <span>{record.owner}</span>
                  </div>
                  {/* Audio/Video indicators */}
                  {record.voiceNotes && record.voiceNotes.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <HiMicrophone className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-purple-600">{record.voiceNotes.length} audio</span>
                    </div>
                  )}
                  {record.videoNotes && record.videoNotes.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <HiVideoCamera className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">{record.videoNotes.length} video</span>
                    </div>
                  )}
                  {record.link && (
                    <div className="flex items-center space-x-2">
                      <HiLink className="w-4 h-4" />
                      <a href={record.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Link
                      </a>
                    </div>
                  )}
                  {record.attachments.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <HiPaperClip className="w-4 h-4" />
                      <span>{record.attachments.length} attachment(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expand Artifacts Button - Right Side */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => toggleRecordExpansion(record.id)}
                  className="relative flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 transition-all duration-200 hover:bg-blue-50 hover:shadow-sm rounded-full border border-transparent hover:border-blue-200"
                  title={expandedRecords.has(record.id) ? "Collapse Artifacts" : "Expand Artifacts"}
                >
                  {expandedRecords.has(record.id) ? (
                    <span className="text-lg font-bold">×</span>
                  ) : (
                    <HiPlus className="w-5 h-5" />
                  )}
                  {getRecordComments(record.id).length > 0 && (
                    <span className="absolute -top-1 -right-1 text-xs text-white bg-indigo-600 rounded-full w-4 h-4 flex items-center justify-center">
                      {getRecordComments(record.id).length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Artifacts Section */}
            {renderArtifactsSection(record)}
          </div>
        </div>
        
        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div className="mt-4 ml-6 relative">

            
            {/* Children container with better spacing */}
            <div className="space-y-3">
              {children.map(child => (
                <DraggableRecord key={child.id} record={child} level={level + 1} />
              ))}
            </div>
          </div>
        )}
        

        
        {/* Drop zone indicator when dragging */}
        {draggedRecord && draggedRecord.id !== record.id && (
          <div className="mx-6 my-2">
            <div className="h-2 bg-blue-200 border-2 border-dashed border-blue-400 rounded opacity-75" />
            <div className="text-center mt-1">
              <span className="text-xs text-blue-600 font-medium">
                Drop here to make "{draggedRecord.title}" a child (Level {level + 1})
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render function that uses the draggable component
  const renderRecordWithChildren = (record: Record, level: number = 0): JSX.Element => {
    console.log(`🎭 Rendering record: ${record.title} (Level: ${level}, ParentId: ${record.parentId})`);
    
    // Debug: Check if this record has children and if they should be expanded
    const children = getRecordChildren(record.id);
    const isExpanded = expandedChildren.has(record.id);
    console.log(`🔍 Record ${record.title}: hasChildren=${children.length > 0}, isExpanded=${isExpanded}, expandedChildren state:`, Array.from(expandedChildren));
    
    return <DraggableRecord key={record.id} record={record} level={level} />;
  };

  // Smart filtering that preserves parent-child relationships
  const filteredRecords = useMemo(() => {
    // First, apply filters to all records
    const filtered = records.filter(record => {
      const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.tag.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = filterTag === 'all' || record.tag === filterTag;
      const matchesOwner = filterOwner === 'all' || record.owner === filterOwner;
      
      return matchesSearch && matchesTag && matchesOwner;
    });
    
    // Then, include child records if their parent is visible
    const allVisibleRecords = new Set(filtered.map(r => r.id));
    const recordsToInclude = [...filtered];
    
    records.forEach(record => {
      if (record.parentId && allVisibleRecords.has(record.parentId)) {
        // This is a child record whose parent is visible, so include it
        if (!allVisibleRecords.has(record.id)) {
          allVisibleRecords.add(record.id);
          recordsToInclude.push(record);
        }
      }
    });
    
    console.log('🔍 Filtering results:', {
      totalRecords: records.length,
      filteredRecords: filtered.length,
      recordsWithChildren: recordsToInclude.length,
      searchTerm,
      filterTag,
      filterOwner
    });
    
    return recordsToInclude;
  }, [records, searchTerm, filterTag, filterOwner]);

  // Handle form operations
  const handleAddRecord = () => {
    setIsAddingRecord(true);
    setFormData({
      title: '',
      date: new Date(),
      tag: '',
      attachments: [],
      link: '',
      voiceNotes: [],
      videoNotes: [],
      owner: '',
      parentId: null,
      level: 0,
      order: 0
    });
  };

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record);
    setFormData({
      title: record.title,
      date: record.date,
      tag: record.tag,
      attachments: record.attachments,
      link: record.link,
      voiceNotes: record.voiceNotes,
      videoNotes: record.videoNotes,
      owner: record.owner,
      parentId: record.parentId || null,
      level: record.level || 0,
      order: record.order || 0
    });
  };

    const handleFormSubmit = async () => {
    if (!formData.title || !formData.tag || !formData.owner) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert voice and video notes to base64 before sending to MongoDB
      const processedFormData = { ...formData };
      
      // Convert attachments to base64
      if (processedFormData.attachments && processedFormData.attachments.length > 0) {
        const processedAttachments = await Promise.all(
          processedFormData.attachments.map(async (file) => {
            if (file instanceof File) {
              const base64Data = await fileToBase64(file);
              return {
                base64Data,
                mimeType: file.type || 'application/octet-stream',
                name: file.name,
                size: file.size
              };
            }
            return file;
          })
        );
        processedFormData.attachments = processedAttachments;
      }
      
      if (processedFormData.voiceNotes && processedFormData.voiceNotes.length > 0) {
        const processedVoiceNotes = await Promise.all(
          processedFormData.voiceNotes.map(async (note) => {
            if (note.file instanceof Blob || note.file instanceof File) {
              const base64Data = await (note.file instanceof Blob ? blobToBase64(note.file) : fileToBase64(note.file));
              const processedNote = {
                ...note,
                file: {
                  base64Data,
                  mimeType: note.file.type || 'audio/webm',
                  name: note.file.name || note.name,
                  size: note.file.size
                }
              };
              return processedNote;
            }
            return note;
          })
        );
        processedFormData.voiceNotes = processedVoiceNotes;
      }

      if (processedFormData.videoNotes && processedFormData.videoNotes.length > 0) {
        const processedVideoNotes = await Promise.all(
          processedFormData.videoNotes.map(async (note) => {
            if (note.file instanceof Blob || note.file instanceof File) {
              const base64Data = await (note.file instanceof Blob ? blobToBase64(note.file) : fileToBase64(note.file));
              const processedNote = {
                ...note,
                file: {
                  base64Data,
                  mimeType: note.file.type || 'video/webm',
                  name: note.file.name || note.name,
                  size: note.file.size
                }
              };
              return processedNote;
            }
            return note;
          })
        );
        processedFormData.videoNotes = processedVideoNotes;
      }

      if (isAddingRecord) {
        // Optimistic update - add record to UI immediately
        const tempId = `temp-${Date.now()}`;
        const newRecord: Record = {
          id: tempId,
          ...processedFormData as Omit<Record, 'id' | 'createdAt' | 'updatedAt'>,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setRecords(prev => [newRecord, ...prev]);
        setIsAddingRecord(false);
        
        // Create record in MongoDB in background
        const response = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(processedFormData)
        });

        const result = await response.json();

        if (response.ok) {
          // Update the temporary record with the real ID
          setRecords(prev => prev.map(record => 
            record.id === tempId 
              ? { ...record, id: result.id }
              : record
          ));
          
          // Update cache
          setRecordsCache(prev => {
            const newCache = new Map(prev);
            newCache.set(result.id, { ...newRecord, id: result.id });
            newCache.delete(tempId);
            return newCache;
          });
          
          showSuccessMessage('Record created successfully!');
        } else {
          // Rollback optimistic update on error
          setRecords(prev => prev.filter(record => record.id !== tempId));
          setIsAddingRecord(true);
          throw new Error(result.error || 'Failed to create record');
        }
      } else if (editingRecord) {
        // Optimistic update for editing
        const updatedRecord = { ...editingRecord, ...processedFormData, updatedAt: new Date() };
        setRecords(prev => prev.map(record => 
          record.id === editingRecord.id ? updatedRecord : record
        ));
        
        // Update cache
        setRecordsCache(prev => {
          const newCache = new Map(prev);
          newCache.set(editingRecord.id, updatedRecord);
          return newCache;
        });
        
        setEditingRecord(null);
        
        // Update record in MongoDB in background
        const response = await fetch(`/api/records/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(processedFormData)
        });

        if (!response.ok) {
          // Rollback optimistic update on error
          await fetchRecords(true); // Force refresh to get correct data
          throw new Error('Failed to update record');
        }
        
        showSuccessMessage('Record updated successfully!');
      }
      
      setFormData({
        title: '',
        date: new Date(),
        tag: '',
        attachments: [],
        link: '',
        voiceNotes: [],
        videoNotes: [],
        owner: '',
        parentId: null,
        level: 0,
        order: 0
      });
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setIsAddingRecord(false);
    setEditingRecord(null);
    setFormData({
      title: '',
      date: new Date(),
      tag: '',
      attachments: [],
      link: '',
      voiceNotes: [],
      videoNotes: [],
      owner: '',
      parentId: null,
      level: 0,
      order: 0
    });
  };

  // File handling
  const handleFileDrop = (e: React.DragEvent, field: 'attachments' | 'voiceNotes' | 'videoNotes') => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    if (field === 'attachments') {
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...files]
      }));
    } else if (field === 'voiceNotes' && files.length > 0) {
      const newVoiceNotes = files
        .filter(file => file.type.startsWith('audio/'))
        .map(file => ({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          file: file,
          recordedAt: new Date()
        }));
      setFormData(prev => ({
        ...prev,
        voiceNotes: [...(prev.voiceNotes || []), ...newVoiceNotes]
      }));
    } else if (field === 'videoNotes' && files.length > 0) {
      const newVideoNotes = files
        .filter(file => file.type.startsWith('video/'))
        .map(file => ({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          file: file,
          recordedAt: new Date()
        }));
      setFormData(prev => ({
        ...prev,
        videoNotes: [...(prev.videoNotes || []), ...newVideoNotes]
      }));
    }
  };

  const handleFileBrowse = (e: React.ChangeEvent<HTMLInputElement>, field: 'attachments' | 'voiceNotes' | 'videoNotes') => {
    const files = Array.from(e.target.files || []);
    
    if (field === 'attachments') {
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...files]
      }));
    } else if (field === 'voiceNotes' && files.length > 0) {
      const newVoiceNotes = files
        .filter(file => file.type.startsWith('audio/'))
        .map(file => ({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          file: file,
          recordedAt: new Date()
        }));
      setFormData(prev => ({
        ...prev,
        voiceNotes: [...(prev.voiceNotes || []), ...newVoiceNotes]
      }));
    } else if (field === 'videoNotes' && files.length > 0) {
      const newVideoNotes = files
        .filter(file => file.type.startsWith('video/'))
        .map(file => ({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          file: file,
          recordedAt: new Date()
        }));
      setFormData(prev => ({
        ...prev,
        videoNotes: [...(prev.videoNotes || []), ...newVideoNotes]
      }));
    }
  };

  const removeFile = (field: 'attachments' | 'voiceNotes' | 'videoNotes', index?: number) => {
    if (field === 'attachments' && typeof index === 'number') {
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments?.filter((_, i) => i !== index) || []
      }));
    } else if (field === 'voiceNotes' && typeof index === 'number') {
      setFormData(prev => ({
        ...prev,
        voiceNotes: prev.voiceNotes?.filter((_, i) => i !== index) || []
      }));
    } else if (field === 'videoNotes' && typeof index === 'number') {
      setFormData(prev => ({
        ...prev,
        videoNotes: prev.videoNotes?.filter((_, i) => i !== index) || []
      }));
    }
  };

  // Audio recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' });
        const newVoiceNote = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          file: file,
          recordedAt: new Date()
        };
        setFormData(prev => ({
          ...prev,
          voiceNotes: [...(prev.voiceNotes || []), newVoiceNote]
        }));
      };
      
      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (error) {
      console.error('Error starting audio recording:', error);
      alert('Could not access microphone');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecordingAudio(false);
    }
  };

  // Video recording
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      streamRef.current = stream;
      
      // Set the stream to the video preview element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Try different MIME types for better browser compatibility
      let mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/ogg';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to browser default
        mimeType = '';
        console.warn('No supported MIME type found, using browser default');
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? {
        mimeType: mimeType
      } : {});
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setVideoBlob(blob);
        
        // Determine file extension based on MIME type
        let fileExtension = '.webm';
        if (mimeType) {
          if (mimeType.includes('mp4')) {
            fileExtension = '.mp4';
          } else if (mimeType.includes('ogg')) {
            fileExtension = '.ogg';
          } else if (mimeType.includes('webm')) {
            fileExtension = '.webm';
          }
        }
        
        const fileName = `video-note-${Date.now()}${fileExtension}`;
        const file = new File([blob], fileName, { type: mimeType || 'video/webm' });
        const newVideoNote = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          file: file,
          recordedAt: new Date()
        };
        setFormData(prev => ({
          ...prev,
          videoNotes: [...(prev.videoNotes || []), newVideoNote]
        }));
        
        // Clear the preview
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
      
      mediaRecorder.start();
        setIsRecordingVideo(true);
    } catch (error) {
      console.error('Error starting video recording:', error);
      alert('Could not access camera or microphone. Please check permissions.');
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecordingVideo(false);
      
      // Clear the preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  // Audio player functions
  const playAudio = (audioFile: File) => {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(URL.createObjectURL(audioFile));
    
    // Set up event listeners before playing
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration || 0);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime || 0);
    });

    audio.addEventListener('ended', () => {
      setIsPlayingAudio(false);
      setCurrentTime(0);
    });

    audio.addEventListener('play', () => {
      setIsPlayingAudio(true);
    });

    audio.addEventListener('pause', () => {
      setIsPlayingAudio(false);
    });

    // Start playing and set up the audio element
    audio.play().then(() => {
      setCurrentAudio(audio);
    }).catch(error => {
      console.error('Error playing audio:', error);
    });
  };

  const pauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlayingAudio(false);
      setCurrentTime(0);
    }
  };

  const seekAudio = (time: number) => {
    if (currentAudio) {
      currentAudio.currentTime = time;
    }
  };

  // Video player functions
  const playVideo = (videoFile: File) => {
    // Stop any currently playing video
    if (currentVideo) {
      currentVideo.pause();
      currentVideo.currentTime = 0;
    }

    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    
    // Set up event listeners before playing
    video.addEventListener('loadedmetadata', () => {
      setVideoDuration(video.duration || 0);
    });

    video.addEventListener('timeupdate', () => {
      setVideoCurrentTime(video.currentTime || 0);
    });

    video.addEventListener('ended', () => {
      setIsPlayingVideo(false);
      setVideoCurrentTime(0);
    });

    video.addEventListener('play', () => {
      setIsPlayingVideo(true);
    });

    video.addEventListener('pause', () => {
      setIsPlayingVideo(false);
    });

    // Start playing and set up the video element
    video.play().then(() => {
      setCurrentVideo(video);
    }).catch(error => {
      console.error('Error playing video:', error);
    });
  };

  const pauseVideo = () => {
    if (currentVideo) {
      currentVideo.pause();
    }
  };

  const stopVideo = () => {
    if (currentVideo) {
      currentVideo.pause();
      currentVideo.currentTime = 0;
      setIsPlayingVideo(false);
      setVideoCurrentTime(0);
    }
  };

  const seekVideo = (time: number) => {
    if (currentVideo) {
      currentVideo.currentTime = time;
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

    // Format date for display
  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Comment recording functions
  const startCommentAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      commentStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      commentMediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setCommentAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setCommentData({
          ...commentData,
          mediaUrl: url,
          mediaType: 'audio'
        });
      };
      
      mediaRecorder.start();
      setIsRecordingCommentAudio(true);
    } catch (error) {
      console.error('Error starting comment audio recording:', error);
      alert('Could not access microphone');
    }
  };

  const stopCommentAudioRecording = () => {
    if (commentMediaRecorderRef.current && isRecordingCommentAudio) {
      commentMediaRecorderRef.current.stop();
      if (commentStreamRef.current) {
        commentStreamRef.current.getTracks().forEach(track => track.stop());
        commentStreamRef.current = null;
      }
      setIsRecordingCommentAudio(false);
    }
  };

  const startCommentVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      commentStreamRef.current = stream;
      
      // Set the stream to the comment video preview element
      if (commentVideoRef.current) {
        commentVideoRef.current.srcObject = stream;
      }
      
      // Try different MIME types for better browser compatibility
      let mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/ogg';
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? {
        mimeType: mimeType
      } : {});
      commentMediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setCommentVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setCommentData({
          ...commentData,
          mediaUrl: url,
          mediaType: 'video'
        });
        
        // Clear the preview
        if (commentVideoRef.current) {
          commentVideoRef.current.srcObject = null;
        }
      };
      
      mediaRecorder.start();
      setIsRecordingCommentVideo(true);
    } catch (error) {
      console.error('Error starting comment video recording:', error);
      alert('Could not access camera or microphone. Please check permissions.');
    }
  };

  const stopCommentVideoRecording = () => {
    if (commentMediaRecorderRef.current && isRecordingCommentVideo) {
      commentMediaRecorderRef.current.stop();
      if (commentStreamRef.current) {
        commentStreamRef.current.getTracks().forEach(track => track.stop());
        commentStreamRef.current = null;
      }
      setIsRecordingCommentVideo(false);
      
      // Clear the preview
      if (commentVideoRef.current) {
        commentVideoRef.current.srcObject = null;
      }
    }
  };

  // Comment editing functions
  const openCommentEditModal = (comment: Comment) => {
    setEditingComment(comment);
    setEditingCommentData({
      content: comment.content,
      author: comment.author
    });
    // Set the commenting record to the record this comment belongs to
    const record = records.find(r => r.id === comment.recordId);
    if (record) {
      setCommentingRecord(record);
      setIsCommentModalOpen(true);
    }
  };

  const closeCommentEditModal = () => {
    setEditingComment(null);
    setEditingCommentData({
      content: '',
      author: ''
    });
    setIsCommentModalOpen(false);
  };

  const handleCommentEditSubmit = () => {
    if (!editingCommentData.content || !editingCommentData.author) {
      alert('Please fill in all required fields');
      return;
    }

    const updatedComment: Comment = {
      ...editingComment!,
      content: editingCommentData.content,
      author: editingCommentData.author,
      updatedAt: new Date()
    };

    setComments(comments.map(c => c.id === editingComment!.id ? updatedComment : c));
    closeCommentEditModal();
    showSuccessMessage('Comment updated successfully!');
  };

  const handleCommentDelete = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      // Also delete all child comments
      const deleteCommentAndChildren = (id: string) => {
        const children = comments.filter(c => c.parentId === id);
        children.forEach(child => deleteCommentAndChildren(child.id));
        setComments(prev => prev.filter(c => c.id !== id));
      };
      
      deleteCommentAndChildren(commentId);
      closeCommentEditModal();
    }
  };

  // Show success message function
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000); // Auto-hide after 3 seconds
  };

  // Chat sidebar functions
  const openChatSidebar = (record: Record) => {
    setChatRecord(record);
    // Start with empty chat - no default messages
    setChatMessages([]);
    setIsChatSidebarOpen(true);
  };

  const closeChatSidebar = () => {
    setIsChatSidebarOpen(false);
    setChatRecord(null);
    setChatMessages([]);
    setNewChatMessage('');
  };

  const sendChatMessage = () => {
    if (!newChatMessage.trim() || !chatRecord) return;

    const message = {
      id: Date.now().toString(),
      author: 'Current User',
      content: newChatMessage.trim(),
      timestamp: new Date(),
      isOwner: false
    };

    setChatMessages(prev => [...prev, message]);
    setNewChatMessage('');
    
    // Simulate owner response after a short delay
    setTimeout(() => {
      const ownerResponse = {
        id: (Date.now() + 1).toString(),
        author: chatRecord.owner,
        content: getOwnerResponse(newChatMessage.trim()),
        timestamp: new Date(),
        isOwner: true
      };
      setChatMessages(prev => [...prev, ownerResponse]);
      
      // Auto-scroll to bottom to show new messages
      const chatMessagesContainer = document.querySelector('.overflow-y-auto');
      if (chatMessagesContainer) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      }
    }, 1000);
  };

  // Helper function to generate contextual responses
  const getOwnerResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('question') || message.includes('help')) {
      return 'I\'d be happy to help! What specific questions do you have about this record?';
    } else if (message.includes('file') || message.includes('document')) {
      return 'I can help you with any files or documents related to this record. What do you need?';
    } else if (message.includes('update') || message.includes('change')) {
      return 'I can help you make updates or changes to this record. What would you like to modify?';
    } else if (message.includes('deadline') || message.includes('due')) {
      return 'Let me check the timeline for this record. What deadline are you referring to?';
    } else if (message.includes('team') || message.includes('collaborate')) {
      return 'Great idea! I can help you coordinate with the team on this record.';
    } else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return `Hello! I'm ${chatRecord?.owner}. How can I help you with "${chatRecord?.title}" today?`;
    } else if (message.includes('thanks') || message.includes('thank you')) {
      return 'You\'re welcome! Is there anything else I can help you with?';
    } else {
      return 'Thanks for your message! I\'ll review this and get back to you with more details.';
    }
  };

  // Convert Blob to base64 string
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data:audio/webm;base64, prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Convert File to base64 string
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data:audio/webm;base64, prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // File upload functions for chat
  const handleChatFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatRecord) return;

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size too large. Please select a file smaller than 10MB.');
      return;
    }

    // Create a temporary URL for the file
    const fileUrl = URL.createObjectURL(file);
    
    // Add file message to chat
    const fileMessage = {
      id: Date.now().toString(),
      author: 'Current User',
      content: `Uploaded: ${file.name}`,
      timestamp: new Date(),
      isOwner: false,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl
      }
    };

    setChatMessages(prev => [...prev, fileMessage]);
    
    // Clear the file input
    if (chatFileInput) {
      chatFileInput.value = '';
    }
    
    // Simulate owner response about the file
    setTimeout(() => {
      const ownerResponse = {
        id: (Date.now() + 1).toString(),
        author: chatRecord.owner,
        content: getFileResponse(file.name),
        timestamp: new Date(),
        isOwner: true
      };
      setChatMessages(prev => [...prev, ownerResponse]);
      
      // Auto-scroll to bottom to show new messages
      const chatMessagesContainer = document.querySelector('.overflow-y-auto');
      if (chatMessagesContainer) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      }
    }, 1000);
  };

  // Helper function to generate file-specific responses
  const getFileResponse = (fileName: string): string => {
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'pdf' || fileExt === 'doc' || fileExt === 'docx') {
      return `Thanks for sharing "${fileName}"! I'll review this document and get back to you with my thoughts.`;
    } else if (fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'png' || fileExt === 'gif') {
      return `Thanks for sharing "${fileName}"! I can see the image you've uploaded. What would you like me to help you with regarding this?`;
    } else if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
      return `Thanks for sharing "${fileName}"! I'll analyze this data and provide you with insights.`;
    } else if (fileExt === 'zip' || fileExt === 'rar' || fileExt === '7z') {
      return `Thanks for sharing "${fileName}"! I'll extract and review the contents of this archive.`;
    } else {
      return `Thanks for sharing "${fileName}"! I'll review this file and get back to you with my analysis.`;
    }
  };

  const openChatFileSelector = () => {
    if (chatFileInput) {
      chatFileInput.click();
    }
  };

  // Scroll performance optimization
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const recordsContainerRef = useRef<HTMLDivElement>(null);

  // Debounced scroll handler for better performance
  const handleScroll = useCallback(() => {
    if (!isScrolling) {
      setIsScrolling(true);
      requestAnimationFrame(() => {
        if (recordsContainerRef.current) {
          setScrollTop(recordsContainerRef.current.scrollTop);
        }
        setIsScrolling(false);
      });
    }
  }, [isScrolling]);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (recordsContainerRef.current) {
      recordsContainerRef.current.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  }, []);

  // Scroll to specific record
  const scrollToRecord = useCallback((recordId: string) => {
    const element = document.getElementById(`record-${recordId}`);
    if (element && recordsContainerRef.current) {
      const container = recordsContainerRef.current;
      const elementTop = element.offsetTop;
      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      container.scrollTo({
        top: elementTop - containerTop - containerHeight / 2,
        behavior: 'smooth'
      });
    }
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isChatSidebarOpen && !isAddingRecord && !editingRecord) {
        switch (event.key) {
          case 'Home':
            event.preventDefault();
            scrollToTop();
            break;
          case 'End':
            event.preventDefault();
            if (recordsContainerRef.current) {
              recordsContainerRef.current.scrollTo({
                top: recordsContainerRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }
            break;
          case 'PageUp':
            event.preventDefault();
            if (recordsContainerRef.current) {
              recordsContainerRef.current.scrollBy({
                top: -recordsContainerRef.current.clientHeight,
                behavior: 'smooth'
              });
            }
            break;
          case 'PageDown':
            event.preventDefault();
            if (recordsContainerRef.current) {
              recordsContainerRef.current.scrollBy({
                top: recordsContainerRef.current.clientHeight,
                behavior: 'smooth'
              });
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isChatSidebarOpen, isAddingRecord, editingRecord, scrollToTop]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Records</h2>
            <p className="text-sm text-gray-600">Manage your records with attachments, notes, and more</p>

            {records.length > 0 && (
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <p>
                📊 {records.length} records • Last updated: {lastFetchTime > 0 ? new Date(lastFetchTime).toLocaleTimeString() : 'Never'}
                {isLoadingRecords && <span className="ml-2 text-blue-600">🔄 Refreshing...</span>}
                </p>
                                 
                


              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">

            
            <button
              onClick={async () => {
                setIsRefreshing(true);
                // Force refresh records from MongoDB
                await fetchRecords(true);
                setSearchTerm('');
                setFilterTag('all');
                setFilterOwner('all');
                
                // Stop the rotation after a short delay
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              title="Refresh Records"
            >
              <svg 
                className={`w-4 h-4 transition-transform duration-1000 ${isRefreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          <button
            onClick={handleAddRecord}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <HiPlus className="w-4 h-4 mr-2" />
            Add Record
          </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="px-6 py-3 bg-green-50 border-l-4 border-green-400">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccessMessage(null)}
                className="inline-flex text-green-400 hover:text-green-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Owners</option>
            {people.map(person => (
              <option key={person.id} value={person.name}>{person.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Records List */}
      <div 
        className="overflow-y-auto max-h-96 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
        style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          msOverflowStyle: 'none'
        }}
        ref={recordsContainerRef}
        onScroll={handleScroll}
      >

          
        {/* Scroll to Top Button */}
        {filteredRecords.length > 3 && scrollTop > 100 && (
          <div className="sticky top-0 z-10 bg-gradient-to-b from-white via-white to-transparent pb-2">
            <button
              onClick={scrollToTop}
              className="ml-auto mr-4 px-3 py-2 bg-blue-600 text-white text-xs rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110"
              title="Scroll to top"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        )}


        
        {isLoadingRecords ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2">
              <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-600">Loading records...</span>
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <HiDocumentText className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No records found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm || filterTag !== 'all' || filterOwner !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by creating your first record.'}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
          <div className="divide-y divide-gray-200">
              {filteredRecords
                .filter(record => !record.parentId) // Only show top-level records
                .map((record, index) => (
              <div 
                key={record.id} 
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.3s ease-out forwards'
                }}
                  >
                    {renderRecordWithChildren(record, 0)}
                  </div>
                ))}
                    </div>
                    
            <DragOverlay>
              {draggedRecord ? (
                <div 
                  className="bg-white rounded-lg border-2 border-blue-300 shadow-lg opacity-90 max-w-md"
                  style={{
                    marginLeft: `${(draggedRecord.level || 0) * 24}px`
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-4 h-4 text-gray-400">
                        <HiDocumentText className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">{draggedRecord.title}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {draggedRecord.tag}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <HiCalendar className="w-4 h-4" />
                        <span>{formatDate(draggedRecord.date)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <HiUser className="w-4 h-4" />
                        <span>{draggedRecord.owner}</span>
                        {/* Audio/Video indicators in drag overlay */}
                        {draggedRecord.voiceNotes && draggedRecord.voiceNotes.length > 0 && (
                          <HiMicrophone className="w-3 h-3 text-purple-500 ml-1" />
                        )}
                        {draggedRecord.videoNotes && draggedRecord.videoNotes.length > 0 && (
                          <HiVideoCamera className="w-3 h-3 text-red-500 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add/Edit Record Modal */}
      {(isAddingRecord || editingRecord) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isAddingRecord ? 'Add New Record' : 'Edit Record'}
              </h3>
              <p className="text-sm text-gray-600">
                {isAddingRecord 
                  ? 'Create a new record with all required details' 
                  : 'Update the existing record details'}
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter record title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date ? formData.date.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({...formData, date: new Date(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tag */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tag <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tag}
                  onChange={(e) => setFormData({...formData, tag: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a tag</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Owner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.owner}
                  onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an owner</option>
                  {people.map(person => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
              </div>

              {/* Parent Record */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Record
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => {
                    const parentId = e.target.value || null;
                    const level = parentId ? (records.find(r => r.id === parentId)?.level || 0) + 1 : 0;
                    setFormData({...formData, parentId, level});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No parent (top level)</option>
                  {records.map(record => (
                    <option key={record.id} value={record.id}>
                      {record.title} {record.level > 0 ? `(Level ${record.level})` : ''}
                    </option>
                  ))}
                </select>
                {formData.parentId && (
                  <p className="text-xs text-gray-500 mt-1">
                    This record will be a child of "{records.find(r => r.id === formData.parentId)?.title}"
                  </p>
                )}
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Attachments */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleFileDrop(e, 'attachments')}
                >
                  <HiPaperClip className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop files here, or{' '}
                    <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                      browse
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileBrowse(e, 'attachments')}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">Supports any file type</p>
                </div>
                
                {/* Display attached files */}
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm text-gray-700">
                          {file instanceof File ? file.name : (file as any).name}
                        </span>
                        <button
                          onClick={() => removeFile('attachments', index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Notes
                </label>
                <div className="space-y-2">
                  {formData.voiceNotes && formData.voiceNotes.length > 0 ? (
                    formData.voiceNotes.map((voiceNote, index) => (
                      <div key={voiceNote.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{voiceNote.name}</p>
                            <p className="text-xs text-gray-500">Recorded on: {formatDate(voiceNote.recordedAt)}</p>
                          </div>
                          <button
                            onClick={() => removeFile('voiceNotes', index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Audio Player */}
                        <div className="mt-3">
                                    <audio 
            controls 
            className="w-full h-10 rounded-lg"
            preload="metadata"
          >
            {createSafeObjectURL(voiceNote.file) && (
              <source src={createSafeObjectURL(voiceNote.file)!} type="audio/webm" />
            )}
            Your browser does not support the audio element.
          </audio>
                                    {createSafeObjectURL(voiceNote.file) ? (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Use the audio player controls above
            </p>
          ) : (
            <p className="text-xs text-red-500 mt-2 text-center">
              Audio file not available
            </p>
          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No audio notes yet.</p>
                  )}
                  
                  {/* Recording Interface */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  <HiMicrophone className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    
                    {/* Live Audio Preview */}
                    {isRecordingAudio && (
                      <div className="mb-4">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                        <p className="text-xs text-red-600 mt-2 font-medium">🔴 Recording audio...</p>
                      </div>
                    )}
                    
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isRecordingAudio 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                        {isRecordingAudio ? 'Stop Recording' : 'Record Audio Note'}
                    </button>
                    <p className="text-xs text-gray-500">or drag & drop audio file</p>
                    <label className="text-blue-600 hover:text-blue-500 cursor-pointer text-xs">
                      Browse audio file
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                          onChange={(e) => handleFileBrowse(e, 'voiceNotes')}
                      />
                    </label>
                    </div>
                  </div>
                  </div>
                </div>
                
              {/* Video Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Notes
                </label>
                <div className="space-y-2">
                  {formData.videoNotes && formData.videoNotes.length > 0 ? (
                    formData.videoNotes.map((videoNote, index) => (
                      <div key={videoNote.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{videoNote.name}</p>
                            <p className="text-xs text-gray-500">Recorded on: {formatDate(videoNote.recordedAt)}</p>
                          </div>
                       <button
                            onClick={() => removeFile('videoNotes', index)}
                         className="text-red-600 hover:text-red-800"
                       >
                         <HiX className="w-4 h-4" />
                       </button>
                     </div>
                     
                        {/* Video Player */}
                        <div className="mt-3">
                          {(() => {
                            const videoUrl = createSafeObjectURL(videoNote.file);
                            return (
            <video 
                                src={videoUrl || ''}
              className="w-full max-w-md mx-auto rounded-lg border border-gray-200 shadow-sm"
              controls
              preload="metadata"
              onLoadedMetadata={(e) => {
                const target = e.target as HTMLVideoElement;
                if (target.duration) {
                  // Video metadata loaded
                }
              }}
                                onError={(e) => {
                                  const target = e.target as HTMLVideoElement;
                                  console.error('Video loading error:', target.error);
                                  console.error('Video error details:', {
                                    code: target.error?.code,
                                    message: target.error?.message
                                  });
                                }}
                                onLoadStart={() => {
                                  // Video load started
                                }}
                                onCanPlay={() => {
                                  // Video can play
                                }}
                                onCanPlayThrough={() => {
                                  // Video can play through
                                }}
                              />
                            );
                          })()}
                                    {createSafeObjectURL(videoNote.file) ? (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Use the video player controls above
            </p>
          ) : (
            <p className="text-xs text-red-500 mt-2 text-center">
              Video file not available
            </p>
          )}
                             </div>
                           </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No video notes yet.</p>
                  )}
                  
                  {/* Recording Interface */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                    <HiVideoCamera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    
                    {/* Live Video Preview */}
                    {isRecordingVideo && streamRef.current && (
                      <div className="mb-4">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          className="w-full max-w-md mx-auto rounded-lg border border-gray-300"
                          style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie view
                        />
                        <p className="text-xs text-red-600 mt-2 font-medium">🔴 Recording in progress...</p>
                             </div>
                         )}
                    
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isRecordingVideo 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                        {isRecordingVideo ? 'Stop Recording' : 'Record Video Note'}
                    </button>
                    <p className="text-xs text-gray-500">or drag & drop video file</p>
                    <label className="text-blue-600 hover:text-blue-500 cursor-pointer text-xs">
                      Browse video file
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                          onChange={(e) => handleFileBrowse(e, 'videoNotes')}
                      />
                    </label>
                    </div>
                  </div>
                             </div>
                           </div>
                         </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                             <button
                onClick={handleFormCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                             >
                Cancel
                             </button>
                             <button
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{isAddingRecord ? 'Creating...' : 'Updating...'}</span>
                  </div>
                ) : (
                  isAddingRecord ? 'Create Record' : 'Update Record'
                )}
                             </button>
                     </div>
          </div>
        </div>
      )}

      {/* Hidden media elements for recording */}
      <audio ref={audioRef} className="hidden" />
      <video ref={videoRef} className="hidden" />
      
      {/* Hidden media elements for comment recording */}
      <audio ref={commentAudioRef} className="hidden" />
      <video ref={commentVideoRef} className="hidden" />
      
      {/* Comment Modal */}
      {isCommentModalOpen && commentingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-8 border-0 w-11/12 md:w-3/5 lg:w-2/5 xl:w-1/3 shadow-2xl rounded-2xl bg-white max-h-[85vh] overflow-y-auto">
            {/* Header with gradient background */}
            <div className="mb-8 -mx-8 -mt-8 px-8 pt-8 pb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-full">
                    <HiChat className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {editingComment ? 'Edit Comment' : 'Add Comment'}
              </h3>
                    <p className="text-blue-100 text-sm">
                      {commentingRecord.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeCommentModal}
                  className="text-white hover:text-blue-100 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>
              
              {/* Record info card */}
              <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                      {commentingRecord.tag}
                    </span>
                    <span className="text-blue-100 text-sm">•</span>
                    <span className="text-blue-100 text-sm">{commentingRecord.owner}</span>
                  </div>
                  {commentParentId && !editingComment && (
                    <span className="text-blue-100 text-sm bg-white bg-opacity-20 px-2 py-1 rounded-full">
                      Reply
                    </span>
                  )}
                  {editingComment && (
                    <span className="text-green-100 text-sm bg-white bg-opacity-20 px-2 py-1 rounded-full">
                      Editing
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
                             
              {/* Author Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiUser className="h-5 w-5 text-gray-400" />
                  </div>
                <input
                  type="text"
                    value={editingComment ? editingCommentData.author : commentData.author}
                    onChange={(e) => {
                      if (editingComment) {
                        setEditingCommentData({...editingCommentData, author: e.target.value});
                      } else {
                        setCommentData({...commentData, author: e.target.value});
                      }
                    }}
                  placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                />
                </div>
                               </div>
                               
              {/* Content Input */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Comment <span className="text-red-500">*</span>
                </label>
                
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <HiChat className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    value={editingComment ? editingCommentData.content : commentData.content}
                    onChange={(e) => {
                      if (editingComment) {
                        setEditingCommentData({...editingCommentData, content: e.target.value});
                      } else {
                        setCommentData({...commentData, content: e.target.value});
                      }
                    }}
                    placeholder="Write your comment..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 resize-none"
                    rows={5}
                  />
              </div>
                <div className="mt-2 text-xs text-gray-500 text-right">
                  Share your thoughts, questions, or feedback...
                            </div>
                          </div>
                        


            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
                    <button
                onClick={closeCommentModal}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Cancel
                    </button>
              {editingComment && (
                                    <button
                  onClick={() => handleCommentDelete(editingComment.id)}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                                    >
                  Delete Comment
                                    </button>
              )}
              <button
                onClick={editingComment ? handleCommentEditSubmit : handleCommentSubmit}
                disabled={editingComment ? (!editingCommentData.content || !editingCommentData.author) : (!commentData.content || !commentData.author)}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <div className="flex items-center space-x-2">
                  <HiChat className="w-4 h-4" />
                  <span>{editingComment ? 'Update Comment' : 'Add Comment'}</span>
                                  </div>
              </button>
                                </div>
                            </div>
                </div>
                          </div>
                        )}
                        
      {/* Chat Sidebar */}
      {isChatSidebarOpen && chatRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {chatRecord.owner.charAt(0).toUpperCase()}
                    </span>
                  </div>
                <div>
                    <h3 className="text-xl font-bold">Chat with {chatRecord.owner}</h3>
                    <p className="text-blue-100 text-sm">{chatRecord.title}</p>
                  </div>
                </div>
                       <button
                  onClick={closeChatSidebar}
                  className="text-white hover:text-blue-100 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                >
                  <HiX className="w-6 h-6" />
                       </button>
              </div>
              
              {/* Record Info Card */}
              <div className="bg-white bg-opacity-15 rounded-xl p-4 backdrop-blur-sm border border-white border-opacity-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-25 text-white border border-white border-opacity-30">
                      {chatRecord.tag}
                    </span>
                    <span className="text-blue-100 text-sm">•</span>
                    <span className="text-blue-100 text-sm">{chatRecord.owner}</span>
                  </div>
                  <div className="text-blue-100 text-xs">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages - Takes remaining space */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwner ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl shadow-sm ${
                      message.isOwner
                        ? 'bg-white text-gray-800 border border-gray-200'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {message.isOwner && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">
                            {message.author.charAt(0).toUpperCase()}
                          </span>
                                  </div>
                        <span className="text-xs text-gray-500 font-medium">{message.author}</span>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className="text-sm leading-relaxed">{message.content}</div>
                    
                    {/* File Attachment Display */}
                    {message.file && (
                      <div className={`mt-3 p-3 rounded-lg border ${
                        message.isOwner 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-blue-500 border-blue-400'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            message.isOwner ? 'bg-blue-100' : 'bg-white bg-opacity-20'
                          }`}>
                            <HiPaperClip className={`w-4 h-4 ${
                              message.isOwner ? 'text-blue-600' : 'text-white'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium truncate ${
                              message.isOwner ? 'text-gray-700' : 'text-white'
                            }`}>
                              {message.file.name}
                            </div>
                            <div className={`text-xs ${
                              message.isOwner ? 'text-gray-500' : 'text-blue-100'
                            }`}>
                              {(message.file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <a
                          href={message.file.url}
                          download={message.file.name}
                          className={`mt-2 inline-flex items-center text-xs font-medium ${
                            message.isOwner 
                              ? 'text-blue-600 hover:text-blue-700' 
                              : 'text-white hover:text-blue-100'
                          }`}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </a>
                      </div>
                    )}
                    
                    <div className={`text-xs mt-2 ${message.isOwner ? 'text-gray-400' : 'text-blue-100'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                                </div>
                              ))}
              
                            {/* Welcome Message */}
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HiChat className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">Start a conversation</h4>
                  <p className="text-gray-500 text-sm">Send a message or upload a file to begin chatting with {chatRecord.owner}</p>
                </div>
              )}

              {/* New Message Indicator */}
              {chatMessages.length > 0 && (
                <div className="text-center py-2">
                  <div className="inline-flex items-center space-x-2 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live chat</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat Input - Fixed at bottom */}
            <div className="border-t border-gray-200 p-6 bg-white flex-shrink-0">
              <div className="flex items-center space-x-3">
                {/* Upload Button */}
                <button
                  onClick={openChatFileSelector}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200"
                  title="Upload file (max 10MB)"
                >
                  <HiPaperClip className="w-5 h-5" />
                </button>
                
                {/* Hidden File Input */}
                <input
                  ref={(el) => setChatFileInput(el)}
                  type="file"
                  onChange={handleChatFileUpload}
                  className="hidden"
                  accept="*/*"
                />
                
                {/* Message Input */}
                <div className="flex-1 relative">
                            <input
                  type="text"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type your message..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                </div>
                
                {/* Send Button */}
              <button
                  onClick={sendChatMessage}
                  disabled={!newChatMessage.trim()}
                  className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* View Comments Modal */}
      {isViewCommentsModalOpen && commentingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-8 border-0 w-11/12 md:w-3/5 lg:w-2/5 xl:w-1/3 shadow-2xl rounded-2xl bg-white max-h-[85vh] overflow-y-auto">
            {/* Header with gradient background */}
            <div className="mb-8 -mx-8 -mt-8 px-8 pt-8 pb-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-t-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-full">
                    <HiEye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      View Comments
                    </h3>
                    <p className="text-green-100 text-sm">
                      {commentingRecord.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeViewCommentsModal}
                  className="text-white hover:text-green-100 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>
              
              {/* Record info card */}
              <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                      {commentingRecord.tag}
                    </span>
                    <span className="text-green-100 text-sm">•</span>
                    <span className="text-green-100 text-sm">{commentingRecord.owner}</span>
                  </div>
                  <span className="text-green-100 text-sm bg-white bg-opacity-20 px-2 py-1 rounded-full">
                    {getRecordComments(commentingRecord.id).length} Comments
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Comments List */}
              {getRecordComments(commentingRecord.id).length > 0 ? (
                <div className="space-y-4">
                  {getRecordComments(commentingRecord.id).map(comment => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-l-green-500">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          comment.type === 'text' ? 'bg-blue-100 text-blue-800' :
                          comment.type === 'voice' ? 'bg-purple-100 text-purple-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {comment.type === 'text' ? 'Text' : comment.type === 'voice' ? 'Audio' : 'Video'}
                        </span>
                      </div>
                      
                      <div className="text-gray-700 mb-3">
                        {comment.type === 'text' ? (
                          <p>{comment.content}</p>
                        ) : comment.type === 'voice' ? (
                          <div className="flex items-center space-x-2">
                            <HiMicrophone className="w-4 h-4 text-purple-500" />
                            <span className="text-sm text-purple-600">Audio Comment</span>
                            {comment.mediaUrl && (
                              <audio controls className="w-full">
                                <source src={comment.mediaUrl} type="audio/wav" />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <HiVideoCamera className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-600">Video Comment</span>
                            {comment.mediaUrl && (
                              <video controls className="w-full rounded">
                                <source src={comment.mediaUrl} type="video/webm" />
                                Your browser does not support the video element.
                              </video>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            closeViewCommentsModal();
                            openCommentModal(commentingRecord, comment.id);
                          }}
                          className="text-xs text-green-600 hover:text-green-800 flex items-center"
                        >
                          <HiChat className="w-3 h-3 mr-1" />
                          Reply
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this comment?')) {
                              // Remove the comment from the comments array
                              setComments(prev => prev.filter(c => c.id !== comment.id));
                              showSuccessMessage('Comment deleted successfully!');
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center"
                        >
                          <HiTrash className="w-3 h-3 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <HiChat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No comments yet. Be the first to add one!</p>
                </div>
              )}
              
              {/* Add Comment Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    closeViewCommentsModal();
                    openCommentModal(commentingRecord);
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 font-medium"
                >
                  <HiChat className="w-4 h-4 inline mr-2" />
                  Add New Comment
                </button>
              </div>
            </div>
          </div>
        </div>
              )}
        
        {/* View Record Modal */}
        {isViewRecordModalOpen && viewingRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-8 border-0 w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-2xl rounded-2xl bg-white max-h-[85vh] overflow-y-auto">
              {/* Header with gradient background */}
              <div className="mb-8 -mx-8 -mt-8 px-8 pt-8 pb-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-t-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white bg-opacity-20 rounded-full">
                      <HiDocumentText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        View Record
                      </h3>
                      <p className="text-purple-100 text-sm">
                        {viewingRecord.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeViewRecordModal}
                    className="text-white hover:text-purple-100 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-3">
                      <HiDocumentText className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Title</p>
                        <p className="text-lg text-gray-900">{viewingRecord.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <HiCalendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Date</p>
                        <p className="text-lg text-gray-900">{formatDate(viewingRecord.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <HiTag className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Tag</p>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {viewingRecord.tag}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <HiUser className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Owner</p>
                        <p className="text-lg text-gray-900">{viewingRecord.owner}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Voice Notes */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <HiMicrophone className="w-5 h-5 text-purple-500 mr-2" />
                      Voice Notes ({viewingRecord.voiceNotes.length})
                    </h4>
                    {viewingRecord.voiceNotes.length > 0 ? (
                      <div className="space-y-3">
                        {viewingRecord.voiceNotes.map((voiceNote, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">{voiceNote.name}</span>
                              <span className="text-xs text-gray-500">
                                {voiceNote.duration ? `${Math.round(voiceNote.duration)}s` : 'Unknown duration'}
                              </span>
                            </div>
                            {voiceNote.file && 'base64Data' in voiceNote.file && (
                              <audio controls className="w-full">
                                <source src={`data:${voiceNote.file.mimeType};base64,${voiceNote.file.base64Data}`} type={voiceNote.file.mimeType} />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                            {voiceNote.file && voiceNote.file instanceof File && (
                              <audio controls className="w-full">
                                <source src={URL.createObjectURL(voiceNote.file)} type={voiceNote.file.type} />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Recorded: {new Date(voiceNote.recordedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No voice notes available</p>
                    )}
                  </div>

                  {/* Video Notes */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <HiVideoCamera className="w-5 h-5 text-red-500 mr-2" />
                      Video Notes ({viewingRecord.videoNotes.length})
                    </h4>
                    {viewingRecord.videoNotes.length > 0 ? (
                      <div className="space-y-3">
                        {viewingRecord.videoNotes.map((videoNote, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-red-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">{videoNote.name}</span>
                              <span className="text-xs text-gray-500">
                                {videoNote.duration ? `${Math.round(videoNote.duration)}s` : 'Unknown duration'}
                              </span>
                            </div>
                            {videoNote.file && 'base64Data' in videoNote.file && (
                              <video controls className="w-full rounded">
                                <source src={`data:${videoNote.file.mimeType};base64,${videoNote.file.base64Data}`} type={videoNote.file.mimeType} />
                                Your browser does not support the video element.
                              </video>
                            )}
                            {videoNote.file && videoNote.file instanceof File && (
                              <video controls className="w-full rounded">
                                <source src={URL.createObjectURL(videoNote.file)} type={videoNote.file.type} />
                                Your browser does not support the video element.
                              </video>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Recorded: {new Date(videoNote.recordedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No video notes available</p>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Attachments */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <HiPaperClip className="w-5 h-5 text-orange-500 mr-2" />
                      Attachments ({viewingRecord.attachments.length})
                    </h4>
                    {viewingRecord.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {viewingRecord.attachments.map((attachment, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                {attachment.name || `Attachment ${index + 1}`}
                              </span>
                              {attachment.size && (
                                <span className="text-xs text-gray-500">
                                  {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              )}
                            </div>
                            {('mimeType' in attachment && attachment.mimeType) && (
                              <p className="text-xs text-gray-500 mt-1">{attachment.mimeType}</p>
                            )}
                            {attachment instanceof File && (
                              <p className="text-xs text-gray-500 mt-1">{attachment.type}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No attachments available</p>
                    )}
                  </div>

                  {/* Link */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <HiLink className="w-5 h-5 text-blue-500 mr-2" />
                      Link
                    </h4>
                    {viewingRecord.link ? (
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <a 
                          href={viewingRecord.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {viewingRecord.link}
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No link available</p>
                    )}
                  </div>
                </div>

                

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        closeViewRecordModal();
                        handleEditRecord(viewingRecord);
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium"
                    >
                      <HiPencil className="w-4 h-4 inline mr-2" />
                      Edit Record
                    </button>
                    <button
                      onClick={() => {
                        closeViewRecordModal();
                        openCommentModal(viewingRecord);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium"
                    >
                      <HiChat className="w-4 h-4 inline mr-2" />
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Custom CSS for audio slider and scroll improvements */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #059669;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #059669;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        /* Custom scrollbar styles */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Smooth animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scroll performance optimizations */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          will-change: scroll-position;
        }

        /* Hover effects for scroll to top button */
        .group:hover .opacity-0 {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default Records;
