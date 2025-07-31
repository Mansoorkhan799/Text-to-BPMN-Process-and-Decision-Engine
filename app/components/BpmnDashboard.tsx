'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getBpmnTreeFromAPI, deleteBpmnNode, convertNodeToProject } from '../utils/bpmnNodeStorage';
import BpmnDiagramViewer from './BpmnDiagramViewer';
import BpmnFilesList from './BpmnFilesList';


interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

interface BpmnProject {
    id: string;
    name: string;
    lastEdited?: string;
    xml?: string;
    content?: string;
    preview?: string;
    createdBy?: string;
    role?: string;
    processMetadata?: {
        processName: string;
        description: string;
        processOwner: string;
        processManager: string;
    };
}

interface BpmnDashboardProps {
    user?: User | null;
}

const BpmnDashboard: React.FC<BpmnDashboardProps> = ({ user: propUser }) => {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<BpmnProject | null>(null);
    const [projects, setProjects] = useState<BpmnProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpeningProject, setIsOpeningProject] = useState(false);
    const [user, setUser] = useState<User | null>(propUser || null);

    // Fetch current user on component mount if not provided as prop
    useEffect(() => {
        if (propUser) {
            setUser(propUser);
            return;
        }

        const fetchCurrentUser = async () => {
            try {
                const response = await fetch('/api/auth/check', {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated && data.user) {
                        setUser(data.user);
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchCurrentUser();
    }, [propUser]);

    // Load projects when modal is opened
    useEffect(() => {
        const loadProjects = async () => {
            if (showModal && user) {
                try {
                    setIsLoading(true);
                    const treeData = await getBpmnTreeFromAPI(user.id);
                    // Filter only files (not folders) and convert to BpmnProject format
                    const fileProjects = treeData
                        .filter((node: any) => node.type === 'file')
                        .map((node: any) => convertNodeToProject(node));
                    setProjects(fileProjects);
                } catch (error) {
                    console.error('Error loading projects:', error);
                    toast.error('Failed to load projects');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        
        loadProjects();
    }, [showModal, user]);

    const handleCreateNew = () => {
        // Redirect to BPMN editor view
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('currentView', 'bpmn');
            router.push('/');
        }
    };

    const handleOpenProject = async (project: BpmnProject) => {
        setIsOpeningProject(true);
        try {
            setSelectedProject(project);
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('currentView', 'bpmn');
                sessionStorage.setItem('currentProject', project.id);

                // Store user info with the project in session
                if (user) {
                    sessionStorage.setItem('projectUserId', user.id);
                    sessionStorage.setItem('projectUserRole', user.role || 'user');
                }

                // Simulate a small delay to show loading state
                await new Promise(resolve => setTimeout(resolve, 500));
                
                toast.success(`Opening "${project.name}" in editor...`);
                router.push('/');
            }
        } catch (error) {
            console.error('Error opening project:', error);
            toast.error('Failed to open project');
        } finally {
            setIsOpeningProject(false);
        }
    };

    const handlePreviewProject = (project: BpmnProject) => {
        setSelectedProject(project);
        setShowPreviewModal(true);
    };

    const handleDeleteProject = async (event: React.MouseEvent, projectId: string) => {
        // Stop the click event from propagating to the parent (which would open the project)
        event.stopPropagation();

        if (confirm('Are you sure you want to delete this project?')) {
            if (user) {
                try {
                    await deleteBpmnNode(projectId, user.id);
                    // Update the projects list
                    setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
                    toast.success('Project deleted successfully!');
                } catch (error) {
                    console.error('Error deleting project:', error);
                    toast.error('Failed to delete project');
                }
            }
        }
    };

    // Function to render BPMN preview
    const renderPreview = (project: BpmnProject) => {
        const bpmnXml = project.content || project.xml;
        
        if (bpmnXml) {
            return (
                <div className="h-40 bg-white border rounded overflow-hidden">
                    <BpmnDiagramViewer 
                        xml={bpmnXml}
                        width={400}
                        height={160}
                        className="w-full h-full"
                    />
                </div>
            );
        } else if (project.preview) {
            return (
                <div
                    className="h-40 bg-white border rounded overflow-hidden flex items-center justify-center"
                    dangerouslySetInnerHTML={{
                        __html: project.preview
                            .replace(/width="[^"]*"/, 'width="100%"')
                            .replace(/height="[^"]*"/, 'height="100%"')
                    }}
                />
            );
        } else {
            return (
                <div className="h-40 bg-gray-100 rounded flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col w-full">
            {/* Elegant header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-gray-800 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">BPMN Editor</h1>
                <p className="text-gray-600">Create, edit and manage your business process diagrams</p>
            </div>

            {/* Dotted rectangle container */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-8">
                <div className="space-y-4">
                    {/* New BPMN Diagram */}
                    <div
                        onClick={handleCreateNew}
                        className="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 cursor-pointer transition-colors transform hover:scale-[1.02] duration-200 hover:shadow-md"
                    >
                        <div className="flex items-center">
                            <div className="flex-shrink-0 mr-4">
                                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-medium text-gray-800">New BPMN Diagram</h2>
                                <p className="text-gray-600 text-sm">Start from scratch with a new diagram</p>
                            </div>
                        </div>
                    </div>

                    {/* Open Saved Project */}
                    <div
                        onClick={() => setShowModal(true)}
                        className="bg-green-50 rounded-lg p-4 hover:bg-green-100 cursor-pointer transition-colors transform hover:scale-[1.02] duration-200 hover:shadow-md"
                    >
                        <div className="flex items-center">
                            <div className="flex-shrink-0 mr-4">
                                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-medium text-gray-800">Open Saved Project</h2>
                                <p className="text-gray-600 text-sm">Access your previously saved diagrams</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* BPMN Files List */}
            <BpmnFilesList user={user} />

            {/* Enhanced Modal for saved projects */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
                        <div className="flex justify-between items-center px-6 py-4 border-b">
                            <h2 className="text-xl font-bold text-gray-800">
                                Your Saved Projects
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex justify-center items-center py-10">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-3"></div>
                                    <span className="text-gray-700 ml-3">Loading projects...</span>
                                </div>
                            ) : projects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {projects.map(project => (
                                        <div
                                            key={project.id}
                                            onClick={() => handlePreviewProject(project)}
                                            className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer overflow-hidden"
                                        >
                                            {/* Preview */}
                                            <div className="relative">
                                                {renderPreview(project)}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button
                                                        onClick={(e) => handleDeleteProject(e, project.id)}
                                                        className="p-2 bg-white bg-opacity-90 text-red-500 rounded-full hover:bg-red-100 shadow-sm"
                                                        title="Delete Project"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Project info */}
                                            <div className="p-4">
                                                <h3 className="font-medium text-lg text-gray-800 mb-2">{project.name}</h3>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-500 flex items-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            {project.lastEdited ? new Date(project.lastEdited).toLocaleString() : 'Unknown'}
                                                        </span>
                                                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                            ID: {project.id}
                                                        </span>
                                                    </div>
                                                    {project.processMetadata?.processName && (
                                                        <div className="text-xs text-gray-600">
                                                            Process: {project.processMetadata.processName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-600 font-medium">No saved projects found</p>
                                    <p className="text-sm text-gray-500 mt-2">Create a new project or save an existing one to see it here</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowModal(false);
                                            handleCreateNew();
                                        }}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Create New Diagram
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                                {projects.length > 0 ? `${projects.length} project${projects.length === 1 ? '' : 's'} found` : 'No projects'}
                            </span>
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Preview Modal */}
            {showPreviewModal && selectedProject && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b">
                            <h2 className="text-xl font-bold text-gray-800">
                                {selectedProject.name} - Preview
                            </h2>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={async () => {
                                        setIsOpeningProject(true);
                                        try {
                                            // Navigate to BPMN editor with the selected project
                                            if (typeof window !== 'undefined') {
                                                sessionStorage.setItem('currentView', 'bpmn');
                                                sessionStorage.setItem('currentProject', selectedProject.id);
                                                sessionStorage.setItem('projectUserId', user?.id || '');
                                                sessionStorage.setItem('projectUserRole', user?.role || '');
                                            }
                                            
                                            // Simulate a small delay to show loading state
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                            
                                            toast.success(`Opening "${selectedProject.name}" in editor...`);
                                            setShowPreviewModal(false);
                                            
                                            // Force a page reload to ensure the view switches properly
                                            setTimeout(() => {
                                                window.location.href = '/';
                                            }, 100);
                                        } catch (error) {
                                            console.error('Error opening project:', error);
                                            toast.error('Failed to open project');
                                        } finally {
                                            setIsOpeningProject(false);
                                        }
                                    }}
                                    disabled={isOpeningProject}
                                    className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                                        isOpeningProject 
                                            ? 'bg-blue-400 cursor-not-allowed' 
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {isOpeningProject ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                            Opening...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Open in Editor
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row h-full">
                            {/* BPMN Diagram Preview */}
                            <div className="flex-1 p-6 border-r border-gray-200">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">BPMN Diagram</h3>
                                </div>
                                <div className="bg-white border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                                    {selectedProject.content || selectedProject.xml ? (
                                        <BpmnDiagramViewer 
                                            xml={selectedProject.content || selectedProject.xml || ''}
                                            width={800}
                                            height={400}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="text-center text-gray-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p>No diagram content available</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Process Details */}
                            <div className="w-full lg:w-80 p-6 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Process Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Process Name</label>
                                        <div className="text-sm text-gray-900">
                                            {selectedProject.processMetadata?.processName || 'Not specified'}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <div className="text-sm text-gray-900 min-h-[60px]">
                                            {selectedProject.processMetadata?.description || 'No description available'}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Process Owner</label>
                                        <div className="text-sm text-gray-900">
                                            {selectedProject.processMetadata?.processOwner || 'Not specified'}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Process Manager</label>
                                        <div className="text-sm text-gray-900">
                                            {selectedProject.processMetadata?.processManager || 'Not specified'}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Modified</label>
                                        <div className="text-sm text-gray-900">
                                            {selectedProject.lastEdited ? new Date(selectedProject.lastEdited).toLocaleString() : 'Unknown'}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                                        <div className="text-sm text-gray-900 font-mono text-xs">
                                            {selectedProject.id}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BpmnDashboard; 