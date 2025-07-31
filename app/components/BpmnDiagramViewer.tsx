'use client';

import { useEffect, useRef } from 'react';

interface BpmnDiagramViewerProps {
    xml: string;
    width?: number;
    height?: number;
    className?: string;
}

const BpmnDiagramViewer: React.FC<BpmnDiagramViewerProps> = ({ 
    xml, 
    width = 400, 
    height = 200, 
    className = '' 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || !xml) return;

        const loadBpmnViewer = async () => {
            try {
                // Dynamically import BPMN.js
                const { default: BpmnJS } = await import('bpmn-js');
                
                // Create viewer
                const viewer = new BpmnJS({
                    container: containerRef.current!,
                    width: width,
                    height: height
                });
                
                viewerRef.current = viewer;

                // Import the BPMN XML
                await viewer.importXML(xml);
                
                // Fit the diagram to the viewport
                const canvas = viewer.get('canvas') as any;
                if (canvas && typeof canvas.zoom === 'function') {
                    canvas.zoom('fit-viewport');
                }
                
            } catch (error) {
                console.error('Error loading BPMN diagram:', error);
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 14px;">
                            Error loading diagram
                        </div>
                    `;
                }
            }
        };

        loadBpmnViewer();

        // Cleanup
        return () => {
            if (viewerRef.current && typeof viewerRef.current.destroy === 'function') {
                viewerRef.current.destroy();
            }
        };
    }, [xml, width, height]);

    return (
        <div 
            ref={containerRef} 
            className={`bg-white border rounded ${className}`}
            style={{ width: `${width}px`, height: `${height}px` }}
        />
    );
};

export default BpmnDiagramViewer; 