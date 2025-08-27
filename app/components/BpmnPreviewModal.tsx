'use client';

import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

interface BpmnPreviewModalProps {
  xml: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const BpmnPreviewModal: React.FC<BpmnPreviewModalProps> = ({
  xml,
  isOpen,
  onClose,
  title = "BPMN Diagram Preview"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);

  useEffect(() => {
    if (!isOpen || !containerRef.current || !xml) return;

    const loadBpmnViewer = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Clean previous render
        if (viewerRef.current && typeof viewerRef.current.destroy === 'function') {
          try { 
            viewerRef.current.destroy(); 
          } catch (e) {
            console.warn('Error destroying previous viewer:', e);
          }
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Dynamically import BPMN.js
        const { default: BpmnJS } = await import('bpmn-js/lib/Viewer');
        
        // Create viewer
        const viewer = new BpmnJS({
          container: containerRef.current!
        });
        
        viewerRef.current = viewer;

        // Import the BPMN XML
        await viewer.importXML(xml);
        
        // Fit the diagram to the viewport
        const canvas = viewer.get('canvas') as any;
        if (canvas && typeof canvas.zoom === 'function') {
          canvas.zoom('fit-viewport');
          setCurrentZoom(canvas.zoom());
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading BPMN diagram:', error);
        setError('Failed to load BPMN diagram. Please check if the XML is valid.');
        setIsLoading(false);
      }
    };

    loadBpmnViewer();

    // Cleanup on unmount or when modal closes
    return () => {
      if (viewerRef.current && typeof viewerRef.current.destroy === 'function') {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying viewer on cleanup:', e);
        }
      }
    };
  }, [isOpen, xml]);

  // Handle zoom controls
  const handleZoomIn = () => {
    if (!viewerRef.current) return;
    const canvas = viewerRef.current.get('canvas');
    const newZoom = currentZoom * 1.2;
    canvas.zoom(newZoom);
    setCurrentZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!viewerRef.current) return;
    const canvas = viewerRef.current.get('canvas');
    const newZoom = currentZoom * 0.8;
    canvas.zoom(newZoom);
    setCurrentZoom(newZoom);
  };

  const handleZoomFit = () => {
    if (!viewerRef.current) return;
    const canvas = viewerRef.current.get('canvas');
    canvas.zoom('fit-viewport');
    setCurrentZoom(canvas.zoom());
  };

  const handleZoomReset = () => {
    if (!viewerRef.current) return;
    const canvas = viewerRef.current.get('canvas');
    canvas.zoom(1);
    setCurrentZoom(1);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl flex flex-col transition-all duration-300 ${
        isFullscreen 
          ? 'w-full h-full max-w-none max-h-none rounded-none' 
          : 'w-full max-w-6xl h-5/6 max-h-4xl'
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
        <div className="flex-1 relative overflow-hidden bg-gray-50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading BPMN diagram...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
              <div className="text-center text-red-600">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-lg font-medium">Error Loading Diagram</p>
                <p className="mt-2 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* BPMN Viewer Container */}
          <div
            ref={containerRef}
            className="w-full h-full bg-white"
            style={{
              backgroundImage: `
                repeating-linear-gradient(to right, #f0f0f0, #f0f0f0 1px, transparent 1px, transparent 20px),
                repeating-linear-gradient(to bottom, #f0f0f0, #f0f0f0 1px, transparent 1px, transparent 20px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '-0.5px -0.5px'
            }}
          />

          {/* Zoom Controls */}
          {!isLoading && !error && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white rounded-lg shadow-lg p-2">
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Zoom in"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Zoom out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                </svg>
              </button>
              <button
                onClick={handleZoomFit}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Fit to viewport"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <button
                onClick={handleZoomReset}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Reset zoom (100%)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          )}

          {/* Zoom Level Display */}
          {!isLoading && !error && (
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-1">
              <span className="text-sm text-gray-600">
                {Math.round(currentZoom * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Use mouse wheel to zoom • Drag to pan • Press ESC to close
          </div>
          <div className="flex gap-2">
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

export default BpmnPreviewModal;
