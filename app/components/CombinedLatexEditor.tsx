'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import LatexEditor from './LatexEditor';
import VisualLatexEditor from './VisualLatexEditor';
import EditorModeSwitch from './ui/EditorModeSwitch';
import LatexFileTree from './LatexFileTree';
import { cleanLatexContent } from '../utils/latexCleaner';
import { 
  LatexProject, 
  saveLatexProject, 
  getSavedLatexProjects,
  saveLatexProjectToAPI,
  updateLatexProjectInAPI
} from '../utils/latexProjectStorage';
import { 
  getLatexFileTree, 
  saveLatexFileTree,
  getLatexTreeFromAPI
} from '../utils/fileTreeStorage';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface CombinedLatexEditorProps {
    user?: any;
}

const CombinedLatexEditor: React.FC<CombinedLatexEditorProps> = ({ user: userProp }) => {
    const searchParams = useSearchParams();
    
    // Check for URL parameters for initial content
    const urlContent = searchParams.get('content');
    const urlFileName = searchParams.get('fileName');
    const urlLatexFile = searchParams.get('latexFile');
    
    // Parse latexFile parameter if present
    let parsedLatexFile: LatexProject | null = null;
    if (urlLatexFile) {
        try {
            parsedLatexFile = JSON.parse(decodeURIComponent(urlLatexFile));
        } catch (error) {
            console.error('Error parsing latexFile parameter:', error);
        }
    }
    
    // Initial content for the editor
    const initialContent = parsedLatexFile?.content || urlContent || `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{LaTeX Document}
\\author{Author}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a sample LaTeX document. You can edit it in the editor.

\\end{document}`;

    // Single source of truth for the editor content
    const [latexContent, setLatexContent] = useState<string>(initialContent);

    // Track if the editor has been initialized
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Reference to track the last editor that made changes
    const latestContentRef = useRef(initialContent);

    // State to track which editor is active
    const [activeEditor, setActiveEditor] = useState<'code' | 'visual'>('code');

    // Reference to store code editor instance
    const codeEditorRef = useRef<any>(null);

    // Reference to store visual editor instance
    const visualEditorRef = useRef<any>(null);

    // State for current project and user
    const [currentProject, setCurrentProject] = useState<LatexProject | null>(null);
    const [user, setUser] = useState<any>(userProp || null);

    // Manual save functionality
    const [isSaving, setIsSaving] = useState<boolean>(false);
    
    // Auto-save timeout reference
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Add loading state to prevent auto-save during initial load and editor switches
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Function to refresh the file tree to show latest content
    const refreshFileTree = useCallback(() => {
        if (user) {
            try {
                // Get the latest file tree from storage
                const savedTree = getLatexFileTree(user.id, user.role);
                
                // Update project data in the tree with latest data from storage
                const updateTreeWithLatestProjects = (nodes: any[]): any[] => {
                    return nodes.map(node => {
                        if (node.type === 'file' && node.projectData) {
                            // Get the latest project data from storage
                            const latestProject = getSavedLatexProjects(user.id, user.role).find(p => p.id === node.projectData?.id);
                            if (latestProject) {
                                console.log('Refreshing tree node with latest project data:', { 
                                    nodeId: node.id, 
                                    projectId: latestProject.id, 
                                    contentLength: latestProject.content?.length 
                                });
                                return { ...node, projectData: latestProject };
                            }
                        }
                        if (node.children) {
                            return { ...node, children: updateTreeWithLatestProjects(node.children) };
                        }
                        return node;
                    });
                };
                
                const updatedTree = updateTreeWithLatestProjects(savedTree);
                saveLatexFileTree(updatedTree, user.id, user.role);
                console.log('File tree refreshed with latest project data');
            } catch (error) {
                console.error('Error refreshing file tree:', error);
            }
        }
    }, [user]);

    // Manual save function
    const saveDocument = useCallback(async () => {
        console.log('Manual save triggered');

        // Use the latest content from the ref to ensure we have the most recent content
        const latestContent = latestContentRef.current || latexContent;
        
        if (!user) {
            console.log('No user found, cannot save');
            toast.error('Please log in to save documents');
            return;
        }

        if (!latestContent) {
            console.log('No content to save');
            toast.error('No content to save');
            return;
        }

        setIsSaving(true);
        
        try {
            let projectToSave: LatexProject;
            
            if (currentProject) {
                // Update existing project
                projectToSave = {
                    ...currentProject,
                    content: latestContent,
                    lastEdited: new Date().toISOString().split('T')[0]
                };
                console.log('Updating existing project:', projectToSave.id);
                    
                    // Update in database
                    const success = await updateLatexProjectInAPI(projectToSave);
                    if (!success) {
                        console.log('Failed to update via API, saving locally');
                        // Fallback to simple save
                        saveLatexProject(projectToSave, user.id, user.role);
                        toast.success('Document saved locally (API failed)');
                        setIsSaving(false);
                        return;
                    }
            } else {
                // Create new project if none exists
                projectToSave = {
                    id: `project-${Date.now()}`,
                    name: `Document ${new Date().toLocaleDateString()}`,
                    lastEdited: new Date().toISOString().split('T')[0],
                    content: latestContent,
                    createdBy: user.id,
                    role: user.role
                };
                console.log('Creating new project:', projectToSave.id);
                    
                    // Save to database
                    const success = await saveLatexProjectToAPI(projectToSave, user.id, user.role);
                    if (!success) {
                        console.log('Failed to save via API, saving locally');
                        // Fallback to simple save
                        saveLatexProject(projectToSave, user.id, user.role);
                        toast.success('Document saved locally (API failed)');
                        setCurrentProject(projectToSave);
                        setIsSaving(false);
                        return;
                    }
                    
                setCurrentProject(projectToSave);
            }
            
            // Also save to localStorage for backward compatibility
            saveLatexProject(projectToSave, user.id, user.role);
            
            // Show save confirmation
            toast.success('Document saved successfully!', {
                duration: 2000,
                    position: 'top-right',
                });
                
            } catch (error) {
                console.error('Error saving document:', error);
                toast.error('Failed to save document');
            } finally {
            setIsSaving(false);
            }
    }, [user, currentProject, latexContent]);

    // Auto-save function
    const autoSaveDocument = useCallback(async () => {
        // Don't auto-save if we're still loading
        if (isLoading) {
            console.log('Auto-save skipped due to loading state');
            return;
        }

        // Use the latest content from the ref to ensure we have the most recent content
        const latestContent = latestContentRef.current || latexContent;
        
        if (user && latestContent) {
            setIsSaving(true);
            
            let projectToSave: LatexProject;
            
            if (currentProject) {
                // Update existing project
                projectToSave = {
                    ...currentProject,
                    content: latestContent,
                    lastEdited: new Date().toISOString().split('T')[0]
                };
            } else {
                // Create new project if none exists
                projectToSave = {
                    id: `project-${Date.now()}`,
                    name: `Document ${new Date().toLocaleDateString()}`,
                    lastEdited: new Date().toISOString().split('T')[0],
                    content: latestContent,
                    createdBy: user.id,
                    role: user.role
                };
                setCurrentProject(projectToSave);
            }
            
            try {
                if (currentProject) {
                    // Update existing project in database
                    await updateLatexProjectInAPI(projectToSave);
                } else {
                    // Save new project to database
                    await saveLatexProjectToAPI(projectToSave, user.id, user.role, user.name || user.email || '');
                }
                // Also save to localStorage for backward compatibility
                saveLatexProject(projectToSave, user.id, user.role);
            } catch (error) {
                console.error('Error in auto-save:', error);
            }
            
            // Update the file tree to reflect the saved project changes
            const updateFileTreeWithProject = () => {
                try {
                    const savedTree = getLatexFileTree(user.id, user.role);
                    const updateProjectInTree = (nodes: any[]): any[] => {
                        return nodes.map(node => {
                            if (node.id === projectToSave.id && node.type === 'file') {
                                // Update the project data in the file tree
                                return { ...node, projectData: projectToSave };
                            }
                            if (node.children) {
                                return { ...node, children: updateProjectInTree(node.children) };
                            }
                            return node;
                        });
                    };
                    
                    const updatedTree = updateProjectInTree(savedTree);
                    saveLatexFileTree(updatedTree, user.id, user.role);
                } catch (error) {
                    console.error('Error updating file tree:', error);
                }
            };
            
            updateFileTreeWithProject();
            
            // Refresh the file tree to ensure it shows the latest content
            refreshFileTree();
            
            setIsSaving(false);
            
            // Show subtle auto-save indicator
            toast.success('Auto-saved', {
                duration: 1000,
                position: 'bottom-right',
                style: {
                    background: '#10B981',
                    color: 'white',
                    fontSize: '12px',
                    padding: '8px 12px'
                }
            });
        }
    }, [currentProject, user, isLoading, refreshFileTree]);

    // On component mount, set initialized flag and get user data
    useEffect(() => {
        const initializeEditor = async () => {
            try {
                if (userProp) {
                    setUser(userProp);
                    setIsInitialized(true);
                    setIsLoading(false);
                    return;
                }

                // Get user data from localStorage
                const userData = localStorage.getItem('user');
                
                if (userData) {
                    const parsedUser = JSON.parse(userData);
                    setUser(parsedUser);

                    // Load default project if needed
                    await loadDefaultProjectIfNeeded(parsedUser);
                } else {
                    // For testing purposes, create a default user if none exists
                    const defaultUser = {
                        id: 'test-user',
                        role: 'user',
                        name: 'Test User'
                    };
                    setUser(defaultUser);
                }

                // Mark as initialized
                setIsInitialized(true);
                
                // Set loading to false after a short delay to ensure everything is ready
                setTimeout(() => {
                    setIsLoading(false);
                    console.log('Editor initialization complete, loading set to false');
                }, 500); // Reduced from 1000ms to 500ms
            } catch (error) {
                console.error('Error initializing editor:', error);
                setIsLoading(false);
            }
        };

        initializeEditor();
    }, [userProp]);

    // Fallback timeout to ensure loading state is set to false
    useEffect(() => {
        const fallbackTimeout = setTimeout(() => {
            if (isLoading) {
                console.log('Fallback: Setting loading to false after timeout');
                setIsLoading(false);
            }
        }, 3000); // 3 seconds fallback

        return () => clearTimeout(fallbackTimeout);
    }, [isLoading]);

    // Function to load default project if needed
    const loadDefaultProjectIfNeeded = (userData: any) => {
        // Check if there's a project from URL parameters (BPMN conversion or file selection)
        const urlParams = new URLSearchParams(window.location.search);
        const urlFileName = urlParams.get('fileName');
        const urlContent = urlParams.get('content');
        const urlLatexFile = urlParams.get('latexFile');
        
        // Handle file selection from LaTeX files list
        if (urlLatexFile) {
            try {
                const parsedLatexFile = JSON.parse(decodeURIComponent(urlLatexFile));
                setCurrentProject(parsedLatexFile);
                setLatexContent(parsedLatexFile.content);
                console.log('Loaded LaTeX project from file selection:', parsedLatexFile.name);
                return;
            } catch (error) {
                console.error('Error parsing latexFile parameter:', error);
            }
        }
        
        // Handle BPMN conversion
        if (urlFileName && urlContent) {
            const newProject: LatexProject = {
                id: uuidv4(),
                name: urlFileName,
                lastEdited: new Date().toISOString().split('T')[0],
                createdBy: userData.id,
                role: userData.role,
                content: urlContent
            };
            setCurrentProject(newProject);
            setLatexContent(urlContent);
            console.log('Created new LaTeX project from BPMN:', urlFileName);
            return;
        }
        
        // No default project to load
        console.log('No default project to load');
    };

    // Add keyboard shortcut for Ctrl+S
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            console.log('Key pressed:', event.key, 'Ctrl:', event.ctrlKey, 'Meta:', event.metaKey);
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                event.stopPropagation();
                console.log('Ctrl+S pressed - saving document');
                saveDocument();
            }
        };

        // Add event listener to both document and window to ensure it's captured
        document.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keydown', handleKeyDown, true);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [saveDocument]);

    // Cleanup auto-save timeout on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    // When content changes in either editor
    const handleCodeEditorChange = (content: string) => {
        latestContentRef.current = content;
        setLatexContent(content);
        
        // Trigger auto-save after 2.5 seconds of inactivity (slightly longer to ensure latest character is captured)
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        
        autoSaveTimeoutRef.current = setTimeout(async () => {
            await autoSaveDocument();
        }, 2500);
    };

    const handleVisualEditorChange = (content: string) => {
        latestContentRef.current = content;
        setLatexContent(content);
        
        // Trigger auto-save after 2.5 seconds of inactivity (slightly longer to ensure latest character is captured)
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        
        autoSaveTimeoutRef.current = setTimeout(async () => {
            await autoSaveDocument();
        }, 2500);
    };

    // Keep latestContentRef in sync with latexContent
    useEffect(() => {
        if (latexContent !== latestContentRef.current) {
            latestContentRef.current = latexContent;
        }
    }, [latexContent]);

    // Store editor instance for code editor
    const handleCodeEditorMount = (editor: any) => {
        console.log('Code editor mounted');
        codeEditorRef.current = editor;
    };

    // Store editor instance for visual editor
    const handleVisualEditorMount = (editor: any) => {
        console.log('Visual editor mounted');
        visualEditorRef.current = editor;
    };

    // When switching editors, ensure we're using the most up-to-date content
    const handleEditorSwitch = (editorType: 'code' | 'visual') => {
        if (editorType === activeEditor) return;

        // Set loading state during editor switch
        setIsLoading(true);

        // Clear any pending auto-save when switching editors
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
            console.log('Cleared auto-save timeout when switching editors');
        }

        // Set the active editor immediately for better user feedback
        setActiveEditor(editorType);

        // Clean up LaTeX content when switching to visual editor
        if (editorType === 'visual') {
            // Process the LaTeX content to ensure commands are properly formatted
            const cleanedContent = cleanLatexContent(latexContent);

            // Update the content with the cleaned version
            setLatexContent(cleanedContent);
        }

        // Log for debugging
        console.log(`Switching to ${editorType} editor with content:`, latestContentRef.current.substring(0, 50) + '...');

        // Re-enable auto-save after a short delay
        setTimeout(() => {
            setIsLoading(false);
            console.log('Editor switch complete, auto-save re-enabled');
        }, 500);
    };

    // Handle project selection from file tree
    const handleProjectSelect = (project: LatexProject) => {
        console.log('Project selected:', { 
            id: project.id, 
            name: project.name, 
            contentLength: project.content?.length || 0,
            contentPreview: project.content?.substring(0, 100) + '...'
        });
        
        // Set loading state during project switch
        setIsLoading(true);
        
        // Clear any pending auto-save when switching projects
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
            console.log('Cleared auto-save timeout when switching projects');
        }
        
        // Always fetch the latest project data from storage to ensure we have the most recent content
        if (user) {
            try {
                const savedProjects = getSavedLatexProjects(user.id, user.role);
                const latestProject = savedProjects.find((p: LatexProject) => p.id === project.id);
                
                if (latestProject) {
                    console.log('Found latest project data from storage:', {
                        id: latestProject.id,
                        name: latestProject.name,
                        contentLength: latestProject.content?.length || 0,
                        contentPreview: latestProject.content?.substring(0, 100) + '...'
                    });
                    
                    setCurrentProject(latestProject);
                    if (latestProject.content) {
                        console.log('Setting latex content from latest project data:', latestProject.content.substring(0, 100) + '...');
                        setLatexContent(latestProject.content);
                    } else {
                        console.log('No content found in latest project data');
                        setCurrentProject(project);
                        if (project.content) {
                            setLatexContent(project.content);
                        }
                    }
                } else {
                    console.log('Project not found in storage, using provided project data');
                    setCurrentProject(project);
                    if (project.content) {
                        setLatexContent(project.content);
                    }
                }
            } catch (error) {
                console.error('Error fetching latest project data:', error);
                // Fallback to provided project data
                setCurrentProject(project);
                if (project.content) {
                    setLatexContent(project.content);
                }
            }
        } else {
            // No user, use provided project data
            setCurrentProject(project);
            if (project.content) {
                setLatexContent(project.content);
            }
        }

        // Re-enable auto-save after a short delay
        setTimeout(() => {
            setIsLoading(false);
            console.log('Project switch complete, auto-save re-enabled');
        }, 500);
    };

    // Handle new project creation
    const handleNewProject = () => {
        // Create a new project with a default name
        const newProject: LatexProject = {
            id: `project-${Date.now()}`,
            name: `New Document ${new Date().toLocaleDateString()}`,
            lastEdited: new Date().toISOString().split('T')[0],
            content: initialContent,
            createdBy: user?.id,
            role: user?.role
        };
        
        setCurrentProject(newProject);
        setLatexContent(initialContent);
        
        // Save the new project
        if (user) {
            saveLatexProject(newProject, user.id, user.role);
        }
    };

    // Handle file upload
    const handleFileUpload = (file: File, fileType: 'tex' | 'latex' | 'txt') => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setLatexContent(content);
            // You could also create a new project here if needed
        };
        reader.readAsText(file);
    };

    // Handle refresh from file tree
    const handleRefresh = useCallback(() => {
        // This will be called when the file tree needs to refresh
        // The file tree will automatically reload its data
        console.log('File tree refresh triggered');
    }, []);

    // Manual save function (for save button)
    const handleManualSave = () => {
        console.log('handleManualSave called');
        saveDocument();
    };

    return (
        <div className="flex h-full">
            {/* File Tree */}
            <LatexFileTree
                user={user}
                onProjectSelect={handleProjectSelect}
                onNewProject={handleNewProject}
                onFileUpload={handleFileUpload}
                currentProjectId={currentProject?.id || null}
                onRefresh={handleRefresh}
            />

            {/* Editor Container */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Save indicator */}
                {isSaving && (
                    <div className="absolute top-4 right-4 z-50 bg-green-500 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-2 shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>Saving...</span>
                    </div>
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="absolute top-4 right-4 z-50 bg-yellow-500 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-2 shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>Loading...</span>
                    </div>
                )}
                
                {/* Save hint */}
                <div className="absolute bottom-4 right-4 z-40 bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-xs shadow-sm">
                    {isLoading ? 'Loading...' : 'Auto-saves after 2.5s • Press Ctrl+S to save manually'}
                </div>
                
                {activeEditor === 'code' && (
                    <div className="h-full w-full">
                        <LatexEditor
                            initialContent={latexContent || initialContent}
                            onContentChange={handleCodeEditorChange}
                            editorMode={activeEditor}
                            onEditorModeChange={handleEditorSwitch}
                            isSaving={isSaving}
                            onManualSave={handleManualSave}
                            user={user}
                            projectId={currentProject?.id}
                            onSaveComplete={() => {
                                console.log('Code editor save completed');
                            }}
                        />
                    </div>
                )}

                {activeEditor === 'visual' && (
                    <div className="h-full w-full">
                        <VisualLatexEditor
                            initialLatexContent={cleanLatexContent(latexContent) || initialContent}
                            onContentChange={handleVisualEditorChange}
                            editorMode={activeEditor}
                            onEditorModeChange={handleEditorSwitch}
                            isSaving={isSaving}
                            onManualSave={handleManualSave}
                            projectId={currentProject?.id}
                            user={user}
                            onSaveComplete={() => {
                                console.log('Visual editor save completed');
                            }}
                            // Template protection properties
                            templateName={currentProject?.templateName}
                            templateId={currentProject?.templateId}
                            isTemplateProtected={currentProject?.isTemplateProtected}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CombinedLatexEditor; 