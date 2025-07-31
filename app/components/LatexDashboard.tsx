'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LatexFilesList from './LatexFilesList';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface LatexDashboardProps {
  user: User | null;
}

const LatexDashboard: React.FC<LatexDashboardProps> = ({ user }) => {
    const router = useRouter();

    const handleEditorClick = () => {
        // Save the current view to sessionStorage
        sessionStorage.setItem('currentView', 'latex');
        // Navigate to the root with the latex view active
        router.push('/');
    };

    return (
        <div className="flex flex-col w-full">
            {/* Elegant header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-gray-800 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">LaTeX Editor</h1>
                <p className="text-gray-600">Create and edit professional LaTeX documents</p>
            </div>

            {/* Dotted rectangle container */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-8">
                <div className="space-y-4">
                    {/* LaTeX Editor */}
                    <div
                        onClick={handleEditorClick}
                        className="bg-purple-50 rounded-lg p-4 hover:bg-purple-100 cursor-pointer transition-colors transform hover:scale-[1.02] duration-200 hover:shadow-md"
                    >
                        <div className="flex items-center">
                            <div className="flex-shrink-0 mr-4">
                                <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-medium text-gray-800">LaTeX Editor</h2>
                                <p className="text-gray-600 text-sm">Switch between code and visual editing modes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LaTeX Files List */}
            <LatexFilesList user={user} />
        </div>
    );
};

export default LatexDashboard; 