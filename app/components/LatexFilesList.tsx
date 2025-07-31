'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiDocumentText, HiCalendar, HiUser, HiEye } from 'react-icons/hi';
import { getLatexTreeFromAPI } from '../utils/fileTreeStorage';
import { LatexProject } from '../utils/latexProjectStorage';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileNode[];
  projectData?: LatexProject;
  parentId?: string;
  path: string;
}

interface LatexFilesListProps {
  user: User | null;
}

const LatexFilesList: React.FC<LatexFilesListProps> = ({ user }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fetch all LaTeX files from the file tree
  const fetchLatexFiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const savedTree = await getLatexTreeFromAPI(user.id);
      
      // Extract all files from the tree (flatten the hierarchy)
      const extractFiles = (nodes: any[]): FileNode[] => {
        let allFiles: FileNode[] = [];
        
        nodes.forEach(node => {
          if (node.type === 'file') {
            allFiles.push({
              id: node.id,
              name: node.name,
              type: 'file',
              projectData: {
                id: node.id,
                name: node.name,
                lastEdited: node.updatedAt || new Date().toISOString(),
                content: node.content,
                createdBy: user.id,
                role: user.role,
              },
              path: node.path || node.name
            });
          }
          
          if (node.children && node.children.length > 0) {
            allFiles = [...allFiles, ...extractFiles(node.children)];
          }
        });
        
        return allFiles;
      };
      
      const allFiles = extractFiles(savedTree);
      setFiles(allFiles);
    } catch (error) {
      console.error('Error fetching LaTeX files:', error);
      toast.error('Failed to load LaTeX files');
    } finally {
      setIsLoading(false);
    }
  };

  // Load files when component mounts or user changes
  useEffect(() => {
    fetchLatexFiles();
  }, [user]);

  // Handle file click - open in LaTeX editor
  const handleFileClick = (file: FileNode) => {
    if (file.projectData) {
      // Save the current view to sessionStorage
      sessionStorage.setItem('currentView', 'latex');
      // Navigate to the root with the latex view active and the file selected
      router.push(`/?latexFile=${encodeURIComponent(JSON.stringify(file.projectData))}`);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-2 text-gray-600">Loading LaTeX files...</span>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your LaTeX Documents</h2>
        <p className="text-gray-600">
          {files.length === 0 
            ? "No LaTeX documents found. Create your first document to get started."
            : `${files.length} document${files.length === 1 ? '' : 's'} found`
          }
        </p>
      </div>

      {/* Files List */}
      {files.length > 0 ? (
        <div className="grid gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFileClick(file)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <HiDocumentText className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-purple-700 transition-colors truncate">
                      {file.name}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <HiCalendar className="h-4 w-4" />
                        <span>{formatDate(file.projectData?.lastEdited || '')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <HiUser className="h-4 w-4" />
                        <span>{user?.name || user?.email || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileClick(file);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <HiEye className="h-4 w-4" />
                    <span>Open</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <HiDocumentText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No LaTeX Documents</h3>
          <p className="text-gray-600 mb-4">
            You haven't created any LaTeX documents yet. Start by creating your first document.
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem('currentView', 'latex');
              router.push('/');
            }}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <HiDocumentText className="h-4 w-4 mr-2" />
            Create First Document
          </button>
        </div>
      )}

      {/* Refresh Button */}
      {files.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={fetchLatexFiles}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh List
          </button>
        </div>
      )}
    </div>
  );
};

export default LatexFilesList; 