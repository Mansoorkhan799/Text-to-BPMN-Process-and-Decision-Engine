'use client';

import { useEffect, useRef, useState } from 'react';
import BpmnViewer from 'bpmn-js/lib/Viewer';
// Directly import CSS for smoother loading
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import { getProjectVersions, DiagramVersion } from '../utils/projectVersions';

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
  width: 100%;
  height: 100%;
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

/* Hide any bpmn.io branding */
.bjs-powered-by {
  display: none !important;
}

/* Hover styles for elements */
.highlight-on-hover .djs-visual:hover {
  stroke: #2563eb !important;
  stroke-width: 3px !important;
  filter: drop-shadow(0 0 3px rgba(37, 99, 235, 0.5));
  transition: all 0.2s ease;
}

/* Modal styles */
.bpmn-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.bpmn-modal-content {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}

.bpmn-modal-content.fullscreen {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  border-radius: 0;
}

.bpmn-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.bpmn-modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.bpmn-modal-body {
  flex: 1;
  overflow: hidden;
  min-height: 500px;
  position: relative;
}

.bpmn-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

/* Zoom controls */
.zoom-controls {
  position: absolute;
  bottom: 120px;
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

/* View mode controls */
.view-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.view-controls button {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  height: 36px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #555;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.view-controls button svg {
  margin-right: 6px;
}

.view-controls button:hover {
  background: #f8f8f8;
  color: #333;
}

.view-controls button.active {
  background: #e0f2fe;
  color: #0284c7;
  border-color: #7dd3fc;
}

/* Version selector */
.version-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-selector select {
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
  background-color: white;
  font-size: 0.875rem;
  color: #374151;
  min-width: 120px;
}

.version-navigation {
  display: flex;
  gap: 4px;
}

.version-navigation button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.version-navigation button:hover:not(:disabled) {
  background: #e5e7eb;
}

.version-navigation button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Element tooltip styles */
.bpmn-element-tooltip {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
  transform: translate(-50%, -100%);
  margin-top: -8px;
}

.bpmn-element-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
}
`;

interface BpmnViewerProps {
    diagramXML: string;
    onClose: () => void;
    title?: string;
    projectId?: string;
    userId?: string;
    userRole?: string;
    isApprovalView?: boolean;
}

const BpmnViewerComponent: React.FC<BpmnViewerProps> = ({
    diagramXML,
    onClose,
    title = "BPMN Diagram Viewer",
    projectId,
    userId,
    userRole,
    isApprovalView = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewer, setViewer] = useState<any>(null);
    const [currentZoom, setCurrentZoom] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [highlightOnHover, setHighlightOnHover] = useState<boolean>(true);
    const [diagramVersions, setDiagramVersions] = useState<DiagramVersion[]>([]);
    const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
    const [currentXml, setCurrentXml] = useState<string>(diagramXML);
    const [hoveredElement, setHoveredElement] = useState<{ id: string, name: string, x: number, y: number } | null>(null);

    // Handle escape key to close modal or exit fullscreen
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isFullscreen) {
                    setIsFullscreen(false);
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleEscKey);
        return () => {
            window.removeEventListener('keydown', handleEscKey);
        };
    }, [onClose, isFullscreen]);

    // Prevent body scrolling when modal is open
    useEffect(() => {
        // Save the current overflow setting
        const originalStyle = window.getComputedStyle(document.body).overflow;
        // Disable scrolling on body
        document.body.style.overflow = 'hidden';

        // Re-enable scrolling when component unmounts
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

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

    // Initialize versions
    useEffect(() => {
        if (!projectId) {
            // Create initial version entry from the provided XML
            const initialVersion: DiagramVersion = {
                version: "1.0",
                xml: diagramXML,
                timestamp: new Date().toISOString()
            };

            setDiagramVersions([initialVersion]);
            setCurrentVersionIndex(0);
            setCurrentXml(initialVersion.xml);
            return;
        }

        // Fetch version history from storage
        const versions = getProjectVersions(projectId);

        if (versions.length === 0) {
            // If no versions found, create an initial version
            const initialVersion: DiagramVersion = {
                version: "1.0",
                xml: diagramXML,
                timestamp: new Date().toISOString()
            };

            setDiagramVersions([initialVersion]);
        } else {
            setDiagramVersions(versions);
        }

        // Set current version to the latest (first in the array)
        setCurrentVersionIndex(0);
        setCurrentXml(versions.length > 0 ? versions[0].xml : diagramXML);
    }, [diagramXML, projectId]);

    // Initialize viewer
    useEffect(() => {
        if (!containerRef.current || !currentXml) return;

        setIsLoading(true);

        // Create a new viewer instance with the container
        const bpmnViewer = new BpmnViewer({
            container: containerRef.current
        });

        // Set the viewer state
        setViewer(bpmnViewer);

        // Import the diagram
        bpmnViewer.importXML(currentXml)
            .then(() => {
                fitDiagram(bpmnViewer);
                setIsLoading(false);

                // Setup hover event listeners
                setupHoverListeners(bpmnViewer);
            })
            .catch((err: any) => {
                console.error('Error importing BPMN diagram:', err);
                setIsLoading(false);
            });

        // Clean up function
        return () => {
            bpmnViewer.destroy();
        };
    }, [currentXml]);

    // Toggle hover highlighting
    useEffect(() => {
        if (!containerRef.current) return;

        if (highlightOnHover) {
            containerRef.current.classList.add('highlight-on-hover');
        } else {
            containerRef.current.classList.remove('highlight-on-hover');
        }
    }, [highlightOnHover]);

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

    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    // Toggle element highlighting on hover
    const toggleHighlighting = () => {
        setHighlightOnHover(!highlightOnHover);
    };

    // Handle version change
    const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedIndex = parseInt(e.target.value);
        if (selectedIndex >= 0 && selectedIndex < diagramVersions.length) {
            setCurrentVersionIndex(selectedIndex);
            setCurrentXml(diagramVersions[selectedIndex].xml);
        }
    };

    // Navigation between versions
    const goToPreviousVersion = () => {
        if (currentVersionIndex < diagramVersions.length - 1) {
            const newIndex = currentVersionIndex + 1;
            setCurrentVersionIndex(newIndex);
            setCurrentXml(diagramVersions[newIndex].xml);
        }
    };

    const goToNextVersion = () => {
        if (currentVersionIndex > 0) {
            const newIndex = currentVersionIndex - 1;
            setCurrentVersionIndex(newIndex);
            setCurrentXml(diagramVersions[newIndex].xml);
        }
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Determine if we should show version info
    const showVersionInfo = () => {
        // Hide version info for supervisors/admins in approval view
        if (isApprovalView && (userRole === 'supervisor' || userRole === 'admin')) {
            return false;
        }
        // Show versions if they exist
        return diagramVersions.length > 0;
    };

    // Setup hover event listeners for elements
    const setupHoverListeners = (viewerInstance: any) => {
        if (!viewerInstance) return;

        const eventBus = viewerInstance.get('eventBus');
        const elementRegistry = viewerInstance.get('elementRegistry');
        const canvas = viewerInstance.get('canvas');

        // Handle hover on
        eventBus.on('element.hover', (event: any) => {
            const { element } = event;

            // Skip non-visual elements or the canvas itself
            if (!element.id || element.id === '__implicitroot' || element.id === 'Process_1') return;

            // Get the business object name or default to element type
            const name = getElementName(element);
            if (!name) return;

            // Get element position on screen
            const position = getElementPosition(element, canvas);

            // Set hovered element info
            setHoveredElement({
                id: element.id,
                name,
                x: position.x,
                y: position.y
            });
        });

        // Handle hover off
        eventBus.on('element.out', () => {
            setHoveredElement(null);
        });
    };

    // Get element name or type
    const getElementName = (element: any): string => {
        // Try to get the name from business object
        const name = element.businessObject?.name;
        if (name) return name;

        // If no name, return element type
        let type = 'Element';

        if (element.type.includes('Event')) {
            const eventType = element.type.replace('bpmn:', '');
            if (eventType === 'StartEvent') type = 'Start Event';
            else if (eventType === 'EndEvent') type = 'End Event';
            else if (eventType.includes('Intermediate')) type = 'Intermediate Event';
            else type = eventType;
        }
        else if (element.type.includes('Task')) {
            type = element.type.replace('bpmn:', '');
        }
        else if (element.type.includes('Gateway')) {
            type = element.type.replace('bpmn:', '');
        }
        else if (element.type === 'bpmn:SequenceFlow') {
            type = 'Flow';
        }

        return type;
    };

    // Get element position on canvas
    const getElementPosition = (element: any, canvas: any) => {
        // Get element's visual bounds
        const gfx = canvas.getGraphics(element);

        if (!gfx) {
            // Fallback to center of element if graphics not available
            const { x, y, width = 0, height = 0 } = element;
            const viewbox = canvas.viewbox();
            return {
                x: x + (width / 2),
                y: y
            };
        }

        // Get the actual DOM element
        const domElement = gfx.node || gfx;

        // Get element's bounding box
        const bbox = domElement.getBoundingClientRect();

        // Get container's bounding box
        const containerBBox = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

        // Calculate position relative to the container
        return {
            x: bbox.left + (bbox.width / 2) - containerBBox.left,
            y: bbox.top - containerBBox.top
        };
    };

    return (
        <div className="bpmn-modal-overlay" onClick={isFullscreen ? undefined : onClose}>
            <div
                className={`bpmn-modal-content ${isFullscreen ? 'fullscreen' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bpmn-modal-header">
                    <div className="flex items-center">
                        <h2 className="bpmn-modal-title">{title}</h2>
                        {showVersionInfo() && (
                            <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                v{diagramVersions[currentVersionIndex].version}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {showVersionInfo() && diagramVersions.length > 1 && (
                            <div className="version-selector">
                                <select
                                    value={currentVersionIndex}
                                    onChange={handleVersionChange}
                                    className="version-select"
                                >
                                    {diagramVersions.map((version, index) => (
                                        <option key={index} value={index}>
                                            v{version.version} ({formatDate(version.timestamp)})
                                        </option>
                                    ))}
                                </select>
                                <div className="version-navigation">
                                    <button
                                        onClick={goToPreviousVersion}
                                        disabled={currentVersionIndex >= diagramVersions.length - 1}
                                        title="Previous version"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={goToNextVersion}
                                        disabled={currentVersionIndex <= 0}
                                        title="Next version"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="bpmn-modal-body">
                    <div className={`bpmn-viewer-container relative ${highlightOnHover ? 'highlight-on-hover' : ''}`}>
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
                            style={{ height: isFullscreen ? 'calc(100vh - 140px)' : '600px' }}
                        />

                        {/* Element hover tooltip */}
                        {hoveredElement && (
                            <div
                                className="bpmn-element-tooltip"
                                style={{
                                    left: `${hoveredElement.x}px`,
                                    top: `${hoveredElement.y}px`
                                }}
                            >
                                {hoveredElement.name}
                            </div>
                        )}

                        {/* View mode controls */}
                        <div className="view-controls">
                            <button
                                onClick={toggleFullscreen}
                                className={isFullscreen ? 'active' : ''}
                                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                            >
                                {isFullscreen ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 16h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3v-3a1 1 0 10-2 0v3H5a1 1 0 100 2z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                )}
                                <span className="ml-1">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                            </button>
                            <button
                                onClick={toggleHighlighting}
                                className={highlightOnHover ? 'active' : ''}
                                title={highlightOnHover ? "Disable element highlighting" : "Enable element highlighting"}
                            >
                                {highlightOnHover ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                    </svg>
                                )}
                                <span className="ml-1">{highlightOnHover ? "Highlighting On" : "Highlighting Off"}</span>
                            </button>
                        </div>

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

                <div className="bpmn-modal-footer">
                    <div className="text-sm text-gray-500 flex items-center gap-4">
                        {currentZoom && (
                            <span>Zoom: {Math.round(currentZoom * 100)}%</span>
                        )}
                        {showVersionInfo() && (
                            <span>
                                Last Updated: {formatDate(diagramVersions[currentVersionIndex].timestamp)}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BpmnViewerComponent; 