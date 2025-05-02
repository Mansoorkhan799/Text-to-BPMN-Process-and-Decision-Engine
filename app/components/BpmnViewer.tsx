'use client';

import { useEffect, useRef, useState } from 'react';
import BpmnViewer from 'bpmn-js/lib/Viewer';

// Add custom CSS for grid background
const gridStyles = `
.bpmn-viewer-container {
  background-color: white;
  background-image: 
    repeating-linear-gradient(to right, #f0f0f0, #f0f0f0 1px, transparent 1px, transparent 20px),
    repeating-linear-gradient(to bottom, #f0f0f0, #f0f0f0 1px, transparent 1px, transparent 20px);
  background-size: 20px 20px;
  background-position: -0.5px -0.5px;
  border: 1px solid #e0e0e0;
}

.bpmn-viewer-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image: 
    radial-gradient(circle, #e6e6e6 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: 10px 10px;
  z-index: 0;
}

/* Override bpmn-js styles for better visibility */
.djs-container .viewport {
  z-index: 1;
}

.djs-container .djs-overlay-container {
  z-index: 2;
}

.djs-container .viewport .layer {
  z-index: 1;
}

.djs-container .djs-shape {
  stroke-width: 2px !important;
}

.djs-container .djs-connection {
  stroke-width: 2px !important;
}

.djs-container text {
  font-weight: normal !important;
  font-size: 12px !important;
  fill: #333 !important;
}

/* Hide any bpmn.io branding */
.bjs-powered-by {
  display: none !important;
}

/* Zoom controls */
.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.zoom-controls button {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #555;
  transition: all 0.2s;
}

.zoom-controls button:hover {
  background: #f8f8f8;
  color: #333;
}
`;

interface BpmnViewerProps {
    diagramXML: string;
    onClose: () => void;
}

const BpmnViewerComponent: React.FC<BpmnViewerProps> = ({ diagramXML, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [stylesLoaded, setStylesLoaded] = useState<boolean>(false);
    const [viewer, setViewer] = useState<any>(null);
    const [currentZoom, setCurrentZoom] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Apply custom grid styles
    useEffect(() => {
        // Add the grid styles to the document
        const styleElement = document.createElement('style');
        styleElement.innerHTML = gridStyles;
        document.head.appendChild(styleElement);

        // Clean up
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    // Load CSS
    useEffect(() => {
        const loadStyles = async () => {
            try {
                // Import CSS files
                await import('bpmn-js/dist/assets/diagram-js.css');
                await import('bpmn-js/dist/assets/bpmn-font/css/bpmn.css');
                setStylesLoaded(true);
            } catch (err) {
                console.error('Error loading styles:', err);
            }
        };

        loadStyles();
    }, []);

    // Initialize viewer
    useEffect(() => {
        if (!containerRef.current || !stylesLoaded || !diagramXML) return;

        setIsLoading(true);

        // Create a new viewer instance with the container
        const bpmnViewer = new BpmnViewer({
            container: containerRef.current
        });

        // Set the viewer state
        setViewer(bpmnViewer);

        // Import the diagram
        bpmnViewer.importXML(diagramXML)
            .then(() => {
                fitDiagram(bpmnViewer);
                setIsLoading(false);
            })
            .catch((err: any) => {
                console.error('Error importing BPMN diagram:', err);
                setIsLoading(false);
            });

        // Clean up function
        return () => {
            bpmnViewer.destroy();
        };
    }, [stylesLoaded, diagramXML]);

    // Function to fit the diagram optimally
    const fitDiagram = (viewerInstance: any) => {
        try {
            if (!viewerInstance) return;

            const canvas = viewerInstance.get('canvas');

            // Fit the diagram to the viewport
            canvas.zoom('fit-viewport', 'auto');

            // Get the current zoom level
            const zoom = canvas.zoom();

            // Add some padding by zooming out slightly
            const targetZoom = zoom * 0.9;
            canvas.zoom(targetZoom);

            // Update the zoom state
            setCurrentZoom(targetZoom);
        } catch (err) {
            console.error('Error fitting diagram:', err);
        }
    };

    // Zoom control handlers
    const handleZoomIn = () => {
        if (!viewer) return;

        try {
            const canvas = viewer.get('canvas');
            const newZoom = Math.min(canvas.zoom() * 1.25, 4);
            canvas.zoom(newZoom);
            setCurrentZoom(newZoom);
        } catch (err) {
            console.error('Error zooming in:', err);
        }
    };

    const handleZoomOut = () => {
        if (!viewer) return;

        try {
            const canvas = viewer.get('canvas');
            const newZoom = Math.max(canvas.zoom() * 0.8, 0.2);
            canvas.zoom(newZoom);
            setCurrentZoom(newZoom);
        } catch (err) {
            console.error('Error zooming out:', err);
        }
    };

    const handleResetZoom = () => {
        if (!viewer) return;
        fitDiagram(viewer);
    };

    if (!stylesLoaded) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-3"></div>
                    <span className="text-gray-700 font-medium">Loading viewer...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 md:p-6">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">BPMN Diagram Viewer</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors focus:outline-none"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content area with diagram */}
                <div className="flex-1 overflow-hidden relative p-0">
                    <div className="w-full h-[calc(100vh-190px)] min-h-[500px] bpmn-viewer-container relative overflow-hidden">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-20">
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-3"></div>
                                    <span className="text-gray-700 font-medium">Loading diagram...</span>
                                </div>
                            </div>
                        )}
                        <div
                            ref={containerRef}
                            className="w-full h-full"
                        />

                        {/* Zoom controls */}
                        <div className="zoom-controls">
                            <button onClick={handleZoomIn} title="Zoom In">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </button>
                            <button onClick={handleZoomOut} title="Zoom Out">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                                </svg>
                            </button>
                            <button onClick={handleResetZoom} title="Fit to View">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-100 px-6 py-4 rounded-b-lg flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {currentZoom && `Zoom: ${Math.round(currentZoom * 100)}%`}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 font-medium transition-colors focus:outline-none"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BpmnViewerComponent; 