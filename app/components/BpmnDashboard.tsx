'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getSavedProjects, deleteProject, saveProject } from '../utils/projectStorage';

interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

interface BpmnProject {
    id: string;
    name: string;
    lastEdited: string;
    xml?: string;
    preview?: string;
    createdBy?: string;
    role?: string;
}

const BpmnDashboard = () => {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<BpmnProject | null>(null);
    const [projects, setProjects] = useState<BpmnProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // Fetch current user on component mount
    useEffect(() => {
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
    }, []);

    // Load projects when modal is opened
    useEffect(() => {
        if (showModal && user) {
            const savedProjects = getSavedProjects(user.id, user.role);
            setProjects(savedProjects);
            setIsLoading(false);
        }
    }, [showModal, user]);

    const handleCreateNew = () => {
        // Redirect to BPMN editor view
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('currentView', 'bpmn');
            router.push('/');
        }
    };

    const handleOpenProject = (project: BpmnProject) => {
        setSelectedProject(project);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('currentView', 'bpmn');
            sessionStorage.setItem('currentProject', project.id);

            // Store user info with the project in session
            if (user) {
                sessionStorage.setItem('projectUserId', user.id);
                sessionStorage.setItem('projectUserRole', user.role || 'user');
            }

            router.push('/');
        }
    };

    const handleDeleteProject = (event: React.MouseEvent, projectId: string) => {
        // Stop the click event from propagating to the parent (which would open the project)
        event.stopPropagation();

        if (confirm('Are you sure you want to delete this project?')) {
            if (user) {
                deleteProject(projectId, user.id, user.role);
                // Update the projects list
                setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
                toast.success('Project deleted successfully!');
            }
        }
    };

    // Function to render SVG preview safely
    const renderPreview = (project: BpmnProject) => {
        if (project.preview) {
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
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 h-full">
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
                                            onClick={() => handleOpenProject(project)}
                                            className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer overflow-hidden"
                                        >
                                            {/* Preview */}
                                            <div className="relative">
                                                {renderPreview(project)}
                                                <button
                                                    onClick={(e) => handleDeleteProject(e, project.id)}
                                                    className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 text-red-500 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                                                    title="Delete Project"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Project info */}
                                            <div className="p-4">
                                                <h3 className="font-medium text-lg text-gray-800 mb-1">{project.name}</h3>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-500 flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {project.lastEdited}
                                                    </span>
                                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                        ID: {project.id}
                                                    </span>
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
        </div>
    );
};

export default BpmnDashboard; 