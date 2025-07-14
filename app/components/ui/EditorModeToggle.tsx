'use client';

import React from 'react';
import { FaCode, FaEye } from 'react-icons/fa';

type EditorModeToggleProps = {
    mode: 'code' | 'visual';
    onModeChange: (mode: 'code' | 'visual') => void;
};

const EditorModeToggle = ({ mode, onModeChange }: EditorModeToggleProps) => {
    return (
        <div className="flex items-center bg-gray-800 rounded-lg p-1 shadow-inner">
            <button
                onClick={() => onModeChange('code')}
                className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 ${mode === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                    }`}
                aria-label="Switch to code editor"
            >
                <FaCode className="mr-2" />
                <span>Code</span>
            </button>
            <button
                onClick={() => onModeChange('visual')}
                className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 ${mode === 'visual'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                    }`}
                aria-label="Switch to visual editor"
            >
                <FaEye className="mr-2" />
                <span>Visual</span>
            </button>
        </div>
    );
};

export default EditorModeToggle; 