'use client';

import React, { useEffect } from 'react';
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

interface XmlCodeModalProps {
  xml: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const XmlCodeModal: React.FC<XmlCodeModalProps> = ({
  xml,
  isOpen,
  onClose,
  title = "BPMN XML Code"
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isFullscreen, onClose]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, button: HTMLElement) => {
    try {
      await navigator.clipboard.writeText(text);
      const originalText = button.textContent;
      const originalClass = button.className;
      
      button.textContent = '✅ Copied!';
      button.className = originalClass.replace('bg-gray-700 hover:bg-gray-600', 'bg-green-600 hover:bg-green-700');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.className = originalClass;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl flex flex-col transition-all duration-300 ${
        isFullscreen 
          ? 'w-full h-full max-w-none max-h-none rounded-none' 
          : 'w-full max-w-4xl h-5/6 max-h-4xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 relative overflow-hidden">
          <div className="bg-gray-900 text-green-400 p-4 h-full overflow-auto relative">
            {/* Copy Button */}
            <button
              onClick={(e) => copyToClipboard(xml, e.target as HTMLButtonElement)}
              className="absolute top-4 right-4 p-2 bg-gray-700 text-white rounded-md text-xs hover:bg-gray-600 transition-colors z-10"
              title="Copy XML to clipboard"
            >
              📋 Copy XML
            </button>
            
            {/* XML Content */}
            <pre className="text-sm whitespace-pre-wrap pr-20 font-mono leading-relaxed">
              {xml || 'No XML content available'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Press ESC to close • Click Copy to copy XML to clipboard
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(xml, document.createElement('button'))}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Copy XML
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XmlCodeModal;
