'use client';

import React, { useState, useEffect } from 'react';
import { FaCode, FaEye } from 'react-icons/fa';

type EditorModeSwitchProps = {
    mode: 'code' | 'visual';
    onModeChange: (mode: 'code' | 'visual') => void;
};

const EditorModeSwitch = ({ mode, onModeChange }: EditorModeSwitchProps) => {
    // Add state to track animation
    const [isAnimating, setIsAnimating] = useState(false);

    // Trigger animation when mode changes
    useEffect(() => {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 600);
        return () => clearTimeout(timer);
    }, [mode]);

    const handleModeChange = (newMode: 'code' | 'visual') => {
        if (mode !== newMode) {
            onModeChange(newMode);
        }
    };

    return (
        <div className="relative flex items-center">
            <div className="flex items-center bg-gray-700 rounded-full p-1 w-36 h-9 shadow-lg overflow-hidden">
                {/* Animated background glow effect */}
                <div
                    className={`absolute inset-0 bg-blue-500 opacity-20 rounded-full blur-md transition-opacity duration-500 ${isAnimating ? 'animate-pulse' : ''}`}
                />

                {/* Sliding background with enhanced animation */}
                <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-2px)] bg-gradient-to-br from-blue-600 to-blue-700 rounded-full 
                               shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-300 ease-out transform
                               ${isAnimating ? 'scale-105' : 'scale-100'} 
                               ${mode === 'code' ? 'left-1' : 'left-[calc(50%+1px)]'}`}
                />

                {/* Code button with hover effect */}
                <button
                    onClick={() => handleModeChange('code')}
                    className={`relative flex items-center justify-center w-1/2 h-7 rounded-full z-10 
                                transition-all duration-300 hover:scale-105
                                ${mode === 'code' ? 'text-white font-medium' : 'text-gray-300'}`}
                    aria-label="Switch to code editor"
                >
                    <FaCode className={`mr-1 transition-transform duration-300 ${mode === 'code' ? 'scale-110' : 'scale-100'}`} size={12} />
                    <span className="text-sm">Code</span>
                </button>

                {/* Visual button with hover effect */}
                <button
                    onClick={() => handleModeChange('visual')}
                    className={`relative flex items-center justify-center w-1/2 h-7 rounded-full z-10 
                                transition-all duration-300 hover:scale-105
                                ${mode === 'visual' ? 'text-white font-medium' : 'text-gray-300'}`}
                    aria-label="Switch to visual editor"
                >
                    <FaEye className={`mr-1 transition-transform duration-300 ${mode === 'visual' ? 'scale-110' : 'scale-100'}`} size={12} />
                    <span className="text-sm">Visual</span>
                </button>
            </div>
        </div>
    );
};

export default EditorModeSwitch; 