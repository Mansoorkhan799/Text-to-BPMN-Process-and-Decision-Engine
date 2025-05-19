'use client';

import { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewerComponent from './BpmnViewer';
import { toast } from 'react-hot-toast';
import { saveProject, getProjectById, canAccessProject } from '../utils/projectStorage';
import { XMLParser } from 'fast-xml-parser';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

// Add custom CSS for grid background
const gridStyles = `
.bjs-container {
  background-color: white;
  background-image: 
    repeating-linear-gradient(to right, #f0f0f0, #f0f0f0 1px, transparent 1px, transparent 20px),
    repeating-linear-gradient(to bottom, #f0f0f0, #f0f0f0 1px, transparent 1px, transparent 20px);
  background-size: 20px 20px;
  background-position: -0.5px -0.5px;
}

/* Create the dotted grid effect */
.bjs-container::before {
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
`;

// We handle CSS imports through a dynamic import approach
// to avoid SSR issues with Next.js

// Default BPMN XML template for new diagrams
const INITIAL_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="182" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="186" y="142" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="270" y="80" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="422" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="427" y="142" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="218" y="120" />
        <di:waypoint x="270" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="120" />
        <di:waypoint x="422" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

const BpmnEditor = () => {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [modeler, setModeler] = useState<any>(null);
    const [projectName, setProjectName] = useState('Untitled Diagram');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [tempProjectName, setTempProjectName] = useState('');
    const projectNameInputRef = useRef<HTMLInputElement>(null);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [showImportDropdown, setShowImportDropdown] = useState(false);
    const [showViewer, setShowViewer] = useState(false);
    const [currentDiagramXML, setCurrentDiagramXML] = useState<string>('');
    const [user, setUser] = useState<User | null>(null);
    const [exampleDropdownOpen, setExampleDropdownOpen] = useState(false);
    const [downloadingExample, setDownloadingExample] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [exportingFile, setExportingFile] = useState(false);
    const [importingFile, setImportingFile] = useState(false);
    const [sendingForApproval, setSendingForApproval] = useState(false);
    const [stylesLoaded, setStylesLoaded] = useState<boolean>(false);
    const [loadingProject, setLoadingProject] = useState<boolean>(false);

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

    // Modify the useEffect that checks for saved project to improve loading
    useEffect(() => {
        if (typeof window !== 'undefined' && modeler && user) {
            const savedProjectId = sessionStorage.getItem('currentProject');
            if (savedProjectId) {
                setProjectId(savedProjectId);
                setLoadingProject(true);

                // Get user info from session if available (for projects opened from dashboard)
                const projectUserId = sessionStorage.getItem('projectUserId') || user.id;
                const projectUserRole = sessionStorage.getItem('projectUserRole') || user.role;

                // Use our storage utility to get the project data
                const project = getProjectById(savedProjectId, projectUserId, projectUserRole);
                if (project) {
                    // Check if the current user can access this project
                    if (!canAccessProject(project, user.id, user.role)) {
                        toast.error("You don't have permission to access this project");
                        setLoadingProject(false);

                        // Redirect back to dashboard
                        if (typeof window !== 'undefined') {
                            sessionStorage.setItem('currentView', 'dashboard');
                            window.location.reload();
                        }
                        return;
                    }

                    // Important: Set the project name immediately from the saved project
                    setProjectName(project.name || 'Untitled Diagram');
                    console.log("Loading project with name:", project.name);

                    // If we have XML for the project, load it
                    if (project.xml) {
                        try {
                            modeler.importXML(project.xml)
                                .then(() => {
                                    toast.success(`Project "${project.name}" loaded successfully!`);
                                    // Fit the diagram to the viewport after loading
                                    setTimeout(() => {
                                        modeler.get('canvas').zoom('fit-viewport');
                                    }, 100);
                                })
                                .catch((err: any) => {
                                    console.error('Error loading saved project:', err);
                                    toast.error('Failed to load project diagram');
                                })
                                .finally(() => {
                                    setLoadingProject(false);
                                });
                        } catch (err) {
                            console.error('Error loading saved project:', err);
                            toast.error('Failed to load project diagram');
                            setLoadingProject(false);
                        }
                    } else {
                        setLoadingProject(false);
                    }
                } else {
                    toast.error('Project not found');
                    setLoadingProject(false);
                }

                // Clear the project ID from session storage to avoid reloading it every time
                sessionStorage.removeItem('currentProject');
                sessionStorage.removeItem('projectUserId');
                sessionStorage.removeItem('projectUserRole');
            }
        }
    }, [modeler, user]);

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

    // Initialize modeler
    useEffect(() => {
        if (!containerRef.current || !stylesLoaded) return;

        // Create a new modeler instance
        const bpmnModeler = new BpmnModeler({
            container: containerRef.current,
            keyboard: {
                bindTo: window
            }
        });

        // Set the modeler state
        setModeler(bpmnModeler);

        // Import the initial diagram
        bpmnModeler.importXML(INITIAL_DIAGRAM).catch((err: any) => {
            console.error('Error importing BPMN diagram', err);
        });

        // Clean up function
        return () => {
            bpmnModeler.destroy();
        };
    }, [stylesLoaded]);

    // Function to save the current diagram as a project with improved functionality
    const handleSaveProject = async () => {
        if (!modeler || !user) return;

        try {
            setDownloading(true);

            // Get XML from the modeler
            const { xml } = await modeler.saveXML({ format: true });

            // Generate a preview of the diagram as SVG
            const { svg } = await modeler.saveSVG();

            // Generate a new ID if this is a new project
            const id = projectId || Math.floor(Math.random() * 10000000).toString();

            // Make sure to use the current projectName (which might be from the header)
            // Save the project using our storage utility with all necessary data
            saveProject({
                id,
                name: projectName,
                lastEdited: new Date().toISOString().split('T')[0],
                xml,
                preview: svg
            }, user.id, user.role);

            // Update the project ID state
            setProjectId(id);

            toast.success(`Project "${projectName}" saved successfully!`);

            setTimeout(() => {
                setDownloading(false);
            }, 500);
        } catch (err) {
            console.error('Error saving project:', err);
            toast.error('Failed to save project');
            setDownloading(false);
        }
    };

    // Function to handle going back to dashboard
    const handleBackToDashboard = () => {
        if (typeof window !== 'undefined') {
            // Ensure the current view is set to dashboard
            sessionStorage.setItem('currentView', 'dashboard');

            // Clear any current project to prevent automatic loading
            sessionStorage.removeItem('currentProject');
            sessionStorage.removeItem('projectUserId');
            sessionStorage.removeItem('projectUserRole');

            window.location.reload();
        }
    };

    // Function to save the diagram as SVG
    const handleSaveSVG = async () => {
        if (!modeler) return;

        try {
            setExportingFile(true);

            // Get SVG from the modeler
            const { svg } = await modeler.saveSVG();

            // Create a blob from the SVG
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            // Create and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diagram.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            console.error('Error saving BPMN diagram as SVG:', err);
        } finally {
            setExportingFile(false);
        }
    };

    // Function to save the diagram as XML
    const handleSaveXML = async () => {
        if (!modeler) return;

        try {
            setExportingFile(true);

            // Get XML from the modeler
            const { xml } = await modeler.saveXML({ format: true });

            // Create a blob from the XML with the correct XML MIME type
            const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            // Create and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName.replace(/\s+/g, '_')}.bpmn`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            console.error('Error saving BPMN diagram as XML:', err);
        } finally {
            setExportingFile(false);
        }
    };

    // Function to save the diagram as JSON
    const handleSaveJSON = async () => {
        if (!modeler) return;

        try {
            setExportingFile(true);

            // Get XML from the modeler
            const { xml } = await modeler.saveXML({ format: true });

            // Configure XML parser
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_',
                textNodeName: '#text'
            });

            // Parse XML to JSON
            const jsonObj = parser.parse(xml);

            // Create a formatted JSON string
            const jsonStr = JSON.stringify(jsonObj, null, 2);

            // Create a blob from the JSON
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName.replace(/\s+/g, '_')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            console.error('Error saving BPMN diagram as JSON:', err);
        } finally {
            setExportingFile(false);
        }
    };

    // Function to create a new diagram
    const handleNew = () => {
        if (!modeler) return;

        modeler.importXML(INITIAL_DIAGRAM).catch((err: any) => {
            console.error('Error importing BPMN diagram', err);
        });
    };

    // Function to open the viewer
    const handleOpenViewer = async () => {
        try {
            const { xml } = await modeler.saveXML({ format: true });
            setCurrentDiagramXML(xml);
            setShowViewer(true);
        } catch (err) {
            console.error('Error opening viewer:', err);
            toast.error('Failed to generate diagram for viewing');
        }
    };

    // Send BPMN for approval to supervisors
    const handleSendForApproval = async () => {
        // Make sure we have a user
        if (!user) {
            toast.error('You must be logged in to send for approval');
            return;
        }

        try {
            setSendingForApproval(true);

            // Get the current XML
            const { xml } = await modeler.saveXML({ format: true });

            // Send to the API endpoint
            const response = await fetch('/api/notifications/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: `BPMN Approval: ${projectName}`,
                    message: `${user.name || user.email} has requested approval for a BPMN diagram: ${projectName}`,
                    bpmnXml: xml,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send for approval');
            }

            const data = await response.json();

            if (data.success) {
                toast.success('BPMN sent for approval successfully');
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error sending for approval:', error);
            toast.error('Failed to send BPMN for approval');
        } finally {
            setSendingForApproval(false);
        }
    };

    // Function to start renaming project
    const handleStartRename = () => {
        setTempProjectName(projectName);
        setIsRenaming(true);
        // Focus the input after it becomes visible
        setTimeout(() => {
            if (projectNameInputRef.current) {
                projectNameInputRef.current.focus();
                projectNameInputRef.current.select();
            }
        }, 10);
    };

    // Function to save the new project name
    const handleSaveRename = () => {
        if (tempProjectName.trim() === '') {
            toast.error('Project name cannot be empty');
            return;
        }

        setProjectName(tempProjectName);
        setIsRenaming(false);

        // Save the project with the new name to localStorage
        if (projectId && user) {
            // Get current diagram XML and SVG preview
            const saveCurrentProject = async () => {
                try {
                    const { xml } = await modeler.saveXML({ format: true });
                    const { svg } = await modeler.saveSVG();

                    // Save project with the new name
                    saveProject({
                        id: projectId,
                        name: tempProjectName,
                        lastEdited: new Date().toISOString().split('T')[0],
                        xml,
                        preview: svg
                    }, user.id, user.role);
                } catch (err) {
                    console.error('Error saving renamed project:', err);
                }
            };

            saveCurrentProject();
        }

        toast.success('Project renamed successfully!');
    };

    // Function to cancel renaming
    const handleCancelRename = () => {
        setIsRenaming(false);
    };

    // Handle keyboard events for the rename input
    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSaveRename();
        } else if (e.key === 'Escape') {
            handleCancelRename();
        }
    };

    // Toggle the export dropdown
    const toggleExportDropdown = () => {
        setShowExportDropdown(!showExportDropdown);
        setShowImportDropdown(false); // Close import dropdown when opening export dropdown
    };

    // Toggle the import dropdown
    const toggleImportDropdown = () => {
        setShowImportDropdown(!showImportDropdown);
        setShowExportDropdown(false); // Close export dropdown when opening import dropdown
    };

    // Close the dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.export-dropdown')) {
                setShowExportDropdown(false);
            }
            if (!target.closest('.import-dropdown')) {
                setShowImportDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Function to import JSON file
    const handleJsonImport = async (file: File) => {
        if (!modeler) return;

        try {
            setImportingFile(true);

            // Read the file
            const fileContent = await readFileAsText(file);

            // Parse JSON
            const jsonData = JSON.parse(fileContent);

            // Convert JSON back to XML
            let xmlContent = '';

            // Check if the JSON has the expected structure (from previous export)
            if (jsonData['bpmn:definitions']) {
                try {
                    // Use the XMLBuilder from fast-xml-parser for conversion
                    const { XMLBuilder } = require('fast-xml-parser');

                    const builder = new XMLBuilder({
                        attributeNamePrefix: '@_',
                        textNodeName: '#text',
                        ignoreAttributes: false,
                        format: true,
                        suppressEmptyNode: false
                    });

                    xmlContent = builder.build(jsonData);

                    // Add XML declaration if missing
                    if (!xmlContent.startsWith('<?xml')) {
                        xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent;
                    }

                    // Import the XML into the modeler
                    await modeler.importXML(xmlContent);

                    // Update project name if available
                    const newProjectName = file.name.replace(/\.[^/.]+$/, "");
                    setProjectName(newProjectName);

                    toast.success(`JSON file "${file.name}" imported and converted to BPMN successfully!`);
                } catch (conversionError) {
                    console.error('Error converting JSON to XML:', conversionError);
                    toast.error('Failed to convert JSON to BPMN format. The JSON structure might be incompatible.');
                }
            }
            // Check if this is a BPMN meta-model JSON (company format)
            else if (jsonData.name === "BPMN20" && jsonData.types && Array.isArray(jsonData.types)) {
                try {
                    // Convert the meta-model to BPMN XML
                    const bpmnXml = convertMetaModelToBPMN(jsonData);

                    // Import the XML into the modeler
                    await modeler.importXML(bpmnXml);

                    // Update project name
                    const newProjectName = file.name.replace(/\.[^/.]+$/, "");
                    setProjectName(newProjectName);

                    toast.success(`Company meta-model "${file.name}" imported and converted to BPMN successfully!`);
                } catch (metaModelError) {
                    console.error('Error converting meta-model to BPMN:', metaModelError);
                    toast.error('Failed to convert company meta-model to BPMN format.');
                }
            } else {
                toast.error('Invalid JSON structure for BPMN diagram. Please use a JSON file exported from this editor or a valid company meta-model.');
            }
        } catch (err) {
            console.error('Error importing JSON file:', err);
            toast.error('Failed to import JSON file. Make sure it has a valid JSON format.');
        } finally {
            setImportingFile(false);
        }
    };

    // Function to convert BPMN meta-model to BPMN XML
    const convertMetaModelToBPMN = (metaModel: any): string => {
        // Extract types from the meta-model
        const types = metaModel.types || [];

        // Start building the BPMN XML
        let bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_${Date.now()}" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_${Date.now()}" isExecutable="false">`;

        // Create a map of element types to filter relevant types
        const elementTypeMap: Record<string, string> = {
            'Task': 'task',
            'ServiceTask': 'serviceTask',
            'UserTask': 'userTask',
            'ManualTask': 'manualTask',
            'ScriptTask': 'scriptTask',
            'BusinessRuleTask': 'businessRuleTask',
            'Gateway': 'exclusiveGateway',
            'ExclusiveGateway': 'exclusiveGateway',
            'ParallelGateway': 'parallelGateway',
            'InclusiveGateway': 'inclusiveGateway',
            'ComplexGateway': 'complexGateway',
            'EventBasedGateway': 'eventBasedGateway',
            'StartEvent': 'startEvent',
            'EndEvent': 'endEvent',
            'IntermediateCatchEvent': 'intermediateCatchEvent',
            'IntermediateThrowEvent': 'intermediateThrowEvent',
            'BoundaryEvent': 'boundaryEvent'
        };

        // Get relevant types for creating BPMN elements
        const relevantTypes = types.filter((type: any) =>
            type.name in elementTypeMap ||
            (type.superClass && type.superClass.some((sc: string) => sc in elementTypeMap))
        );

        // For positioning elements
        let startX = 150;
        let startY = 120;
        const xIncrement = 150;
        const taskWidth = 100;
        const taskHeight = 80;
        const eventSize = 36;

        // Add a start event
        const startEventId = `StartEvent_${Date.now()}`;
        bpmnXml += `\n    <bpmn:startEvent id="${startEventId}" name="Start">`;
        bpmnXml += `\n      <bpmn:outgoing>Flow_1</bpmn:outgoing>`;
        bpmnXml += `\n    </bpmn:startEvent>`;

        // Track the last created element ID for connecting flows
        let lastElementId = startEventId;
        let flowIndex = 1;

        // Process relevant types and create BPMN elements
        const diagramElements: string[] = [];
        const diagramConnections: string[] = [];

        // Add start event to diagram elements
        diagramElements.push(`
      <bpmndi:BPMNShape id="${startEventId}_di" bpmnElement="${startEventId}">
        <dc:Bounds x="${startX}" y="${startY}" width="${eventSize}" height="${eventSize}" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${startX}" y="${startY + eventSize + 5}" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`);

        // Update x position after start event
        startX += xIncrement;

        // Create elements for each relevant type
        let elementCount = 0;
        const maxElements = Math.min(relevantTypes.length, 8); // Limit to 8 elements for visual clarity

        for (let i = 0; i < maxElements; i++) {
            const type = relevantTypes[i];
            let elementType = 'task'; // default

            // Determine the BPMN element type
            if (type.name in elementTypeMap) {
                elementType = elementTypeMap[type.name];
            } else if (type.superClass) {
                for (const sc of type.superClass) {
                    if (sc in elementTypeMap) {
                        elementType = elementTypeMap[sc];
                        break;
                    }
                }
            }

            // Create a unique ID for this element
            const elementId = `${elementType.charAt(0).toUpperCase() + elementType.slice(1)}_${Date.now() + i}`;

            // Add the element to XML
            bpmnXml += `\n    <bpmn:${elementType} id="${elementId}" name="${type.name}">`;
            bpmnXml += `\n      <bpmn:incoming>Flow_${flowIndex}</bpmn:incoming>`;

            // Prepare for the next element or end event
            if (i < maxElements - 1) {
                bpmnXml += `\n      <bpmn:outgoing>Flow_${flowIndex + 1}</bpmn:outgoing>`;
            } else {
                // Last element connects to end event
                bpmnXml += `\n      <bpmn:outgoing>Flow_${flowIndex + 1}</bpmn:outgoing>`;
            }

            bpmnXml += `\n    </bpmn:${elementType}>`;

            // Add sequence flow from previous element
            bpmnXml += `\n    <bpmn:sequenceFlow id="Flow_${flowIndex}" sourceRef="${lastElementId}" targetRef="${elementId}" />`;

            // Add to diagram elements
            diagramElements.push(`
      <bpmndi:BPMNShape id="${elementId}_di" bpmnElement="${elementId}">
        <dc:Bounds x="${startX}" y="${startY - taskHeight / 2}" width="${taskWidth}" height="${taskHeight}" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>`);

            // Add flow to diagram connections
            diagramConnections.push(`
      <bpmndi:BPMNEdge id="Flow_${flowIndex}_di" bpmnElement="Flow_${flowIndex}">
        <di:waypoint x="${startX - xIncrement + (lastElementId.includes('Event') ? eventSize : taskWidth)}" y="${startY}" />
        <di:waypoint x="${startX}" y="${startY}" />
      </bpmndi:BPMNEdge>`);

            // Update for next iteration
            lastElementId = elementId;
            flowIndex++;
            startX += xIncrement;
            elementCount++;
        }

        // Add end event
        const endEventId = `EndEvent_${Date.now()}`;
        bpmnXml += `\n    <bpmn:endEvent id="${endEventId}" name="End">`;
        bpmnXml += `\n      <bpmn:incoming>Flow_${flowIndex}</bpmn:incoming>`;
        bpmnXml += `\n    </bpmn:endEvent>`;

        // Add final sequence flow to end event
        bpmnXml += `\n    <bpmn:sequenceFlow id="Flow_${flowIndex}" sourceRef="${lastElementId}" targetRef="${endEventId}" />`;

        // Add end event to diagram elements
        diagramElements.push(`
      <bpmndi:BPMNShape id="${endEventId}_di" bpmnElement="${endEventId}">
        <dc:Bounds x="${startX}" y="${startY}" width="${eventSize}" height="${eventSize}" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${startX}" y="${startY + eventSize + 5}" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`);

        // Add final flow to diagram connections
        diagramConnections.push(`
      <bpmndi:BPMNEdge id="Flow_${flowIndex}_di" bpmnElement="Flow_${flowIndex}">
        <di:waypoint x="${startX - xIncrement + taskWidth}" y="${startY}" />
        <di:waypoint x="${startX}" y="${startY}" />
      </bpmndi:BPMNEdge>`);

        // Close the process tag
        bpmnXml += `\n  </bpmn:process>`;

        // Add diagram information
        bpmnXml += `\n  <bpmndi:BPMNDiagram id="BPMNDiagram_1">`;
        bpmnXml += `\n    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_${Date.now()}">`;

        // Add all diagram elements and connections
        diagramElements.forEach(element => {
            bpmnXml += element;
        });

        diagramConnections.forEach(connection => {
            bpmnXml += connection;
        });

        // Close diagram tags
        bpmnXml += `\n    </bpmndi:BPMNPlane>`;
        bpmnXml += `\n  </bpmndi:BPMNDiagram>`;

        // Add metadata about the original file as an extension element
        bpmnXml += `\n  <bpmn:extensionElements>`;
        bpmnXml += `\n    <custom:metaModelSource xmlns:custom="http://custom.org/bpmn">`;
        bpmnXml += `\n      <custom:name>${metaModel.name}</custom:name>`;
        bpmnXml += `\n      <custom:uri>${metaModel.uri}</custom:uri>`;
        bpmnXml += `\n      <custom:prefix>${metaModel.prefix}</custom:prefix>`;
        bpmnXml += `\n    </custom:metaModelSource>`;
        bpmnXml += `\n  </bpmn:extensionElements>`;

        // Close definitions tag
        bpmnXml += `\n</bpmn:definitions>`;

        return bpmnXml;
    };

    // Function to import XML file
    const handleXmlImport = async (file: File) => {
        if (!modeler) return;

        try {
            setImportingFile(true);

            // Read the file
            const fileContent = await readFileAsText(file);

            // Import the XML directly into the modeler
            await modeler.importXML(fileContent);

            // Update project name
            const newProjectName = file.name.replace(/\.[^/.]+$/, "");
            setProjectName(newProjectName);

            toast.success(`BPMN file "${file.name}" imported successfully!`);

        } catch (err) {
            console.error('Error importing BPMN file:', err);
            toast.error('Failed to import BPMN file. The file might be corrupted or invalid.');
        } finally {
            setImportingFile(false);
        }
    };

    // Helper function to read file contents
    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    // Handle Excel import
    const handleExcelImport = async (file: File) => {
        try {
            setImportingFile(true);
            toast.loading('Importing Excel file...', { id: 'importing' });

            // Get file name without extension to use as project name
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            setProjectName(fileName);

            // Read the Excel file
            const data = await readExcelFile(file);
            if (!data || data.length === 0) {
                toast.error('Excel file is empty or invalid', { id: 'importing' });
                setImportingFile(false);
                return;
            }

            console.log("Excel data:", data); // Log the data for debugging

            // Initialize a basic BPMN structure
            let processId = 'Process_' + Math.random().toString(36).substr(2, 9);

            // Extract process name from the Excel data
            let processName = fileName || 'Excel Generated Process';

            // Check if all rows have the same process_name value
            if (data.length > 0) {
                // Try these column names in order
                const nameColumns = ['process_name', 'Process_name', 'ProcessName', 'process name',
                    'Process Name', 'process', 'Process'];

                for (const column of nameColumns) {
                    if (data[0][column] && typeof data[0][column] === 'string') {
                        const value = data[0][column];
                        // Check if this value is consistent across all rows
                        if (data.every(row => row[column] === value)) {
                            processName = value;
                            break;
                        }
                    }
                }
            }

            const collaborationId = 'Collaboration_' + Math.random().toString(36).substr(2, 9);
            const participantId = 'Participant_' + Math.random().toString(36).substr(2, 9);

            // Define interfaces for diagram elements and flows
            interface DiagramElement {
                id: string;
                type: string;
                x: number;
                y: number;
                width: number;
                height: number;
            }

            interface DiagramFlow {
                id: string;
                sourceRef: string;
                targetRef: string;
                sourceX: number;
                sourceY: number;
                targetX: number;
                targetY: number;
                waypoints?: any[];
            }

            // If no specific actors are provided in Excel, create default swimlanes
            // based on the number of tasks (one swimlane for each task)
            let actors: string[] = [];

            // First, try to extract actors from the Excel data
            const uniqueActors = new Set<string>();
            data.forEach(row => {
                const actor = row['Actor'] || row['actor'] || '';
                if (actor) uniqueActors.add(actor);
            });

            // If we have unique actors from data, use them
            if (uniqueActors.size > 0) {
                actors = Array.from(uniqueActors);
            }
            // Otherwise, create one swimlane for each task (or use a minimum of 3)
            else {
                // Create a numbered lane for each task
                const numLanes = Math.max(data.length, 3);
                for (let i = 0; i < numLanes; i++) {
                    actors.push(`Lane ${i + 1}`);
                }
            }

            console.log("Generated actors for swimlanes:", actors);

            // Create a map to store lane IDs for each actor
            const laneIds: { [key: string]: string } = {};

            // Function to get task info from each row
            const getProcessInfo = (row: any, index: number) => {
                const processNo = row['process_no'] || row['Process_no'] || '';
                const processName = row['Process Name'] || row['process_name'] || row['process'] || '';
                const actor = row['Actor'] || row['actor'] || '';
                const action = row['Action'] || row['action'] || '';

                // Create task name based on available data
                let taskName = '';
                if (processNo && action) {
                    taskName = `${processNo}: ${action}`;
                } else if (action) {
                    taskName = action;
                } else {
                    taskName = `Task ${index + 1}`;
                }

                return { processNo, processName, actor, action, taskName };
            };

            // Start building the BPMN XML
            let bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_${processId}" 
                  targetNamespace="http://bpmn.io/schema/bpmn"
                  exporter="Excel to BPMN Converter"
                  exporterVersion="1.0">
  <bpmn:collaboration id="${collaborationId}">
    <bpmn:participant id="${participantId}" name="${processName}" processRef="${processId}" />
  </bpmn:collaboration>
  <bpmn:process id="${processId}" name="${processName}" isExecutable="false">`;

            // Add lanes for each actor
            if (actors.length > 0) {
                const laneSetId = 'LaneSet_' + Math.random().toString(36).substr(2, 9);
                bpmnXml += `
    <bpmn:laneSet id="${laneSetId}">`;

                // Create a lane for each actor and store their IDs
                actors.forEach((actor, index) => {
                    const laneId = 'Lane_' + Math.random().toString(36).substr(2, 9);
                    laneIds[actor] = laneId; // Store lane ID for this actor

                    bpmnXml += `
      <bpmn:lane id="${laneId}" name="${actor}">`;

                    // Reference start event in the first lane
                    if (index === 0) {
                        bpmnXml += `
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>`;
                    }

                    // Assign each task to the corresponding lane based on index
                    // This places each task in its own swimlane sequentially
                    data.forEach((row, taskIndex) => {
                        // Use the task index modulo actors.length to assign tasks to lanes
                        // This will distribute tasks across lanes if there are more tasks than lanes
                        if (index === taskIndex % actors.length) {
                            bpmnXml += `
        <bpmn:flowNodeRef>Task_${taskIndex}</bpmn:flowNodeRef>`;
                        }
                    });

                    // Place end event in the last lane
                    if (index === actors.length - 1) {
                        bpmnXml += `
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>`;
                    }

                    bpmnXml += `
      </bpmn:lane>`;
                });

                bpmnXml += `
    </bpmn:laneSet>`;
            }

            // Calculate standard positions and dimensions
            const laneHeight = 120; // Lane height
            const taskWidth = 100;
            const taskHeight = 80;
            const eventSize = 36;

            // Start position
            const startEventX = 225;
            const taskX = 300; // Fixed horizontal position for all tasks (vertically aligned)
            const endEventX = 550; // Fixed position for end event

            // Calculate the lane center points for vertical positioning
            const getLaneY = (laneIndex: number) => {
                return 60 + (laneIndex * laneHeight) + (laneHeight / 2);
            };

            // Place start event in the first lane
            const startY = getLaneY(0) - (eventSize / 2);

            // Add start event
            bpmnXml += `
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_0</bpmn:outgoing>
    </bpmn:startEvent>`;

            // Track elements and flows for DI section
            const elements: DiagramElement[] = [{
                id: 'StartEvent_1',
                type: 'startEvent',
                x: startEventX,
                y: startY,
                width: eventSize,
                height: eventSize
            }];

            const flows: DiagramFlow[] = [];

            // Previous element tracking for connections
            let previousElementId = 'StartEvent_1';

            // Add all tasks from Excel data
            data.forEach((row, index) => {
                const taskId = `Task_${index}`;
                const flowId = `Flow_${index}`;

                // Extract task info
                const { taskName } = getProcessInfo(row, index);

                // Determine which lane this task belongs to (based on task index)
                const laneIndex = index % actors.length;
                const laneY = getLaneY(laneIndex);

                // Calculate task position - vertically in the center of the lane
                const taskY = laneY - (taskHeight / 2);

                // Add task to BPMN
                bpmnXml += `
    <bpmn:task id="${taskId}" name="${taskName}">
      <bpmn:incoming>${flowId}</bpmn:incoming>`;

                // Determine outgoing flow
                if (index === data.length - 1) {
                    // Last task connects to end event
                    bpmnXml += `
      <bpmn:outgoing>Flow_End</bpmn:outgoing>
    </bpmn:task>`;
                } else {
                    // Connect to next task
                    bpmnXml += `
      <bpmn:outgoing>Flow_${index + 1}</bpmn:outgoing>
    </bpmn:task>`;
                }

                // Add sequence flow
                bpmnXml += `
    <bpmn:sequenceFlow id="${flowId}" sourceRef="${previousElementId}" targetRef="${taskId}" />`;

                // Add element to diagram
                elements.push({
                    id: taskId,
                    type: 'task',
                    x: taskX,
                    y: taskY,
                    width: taskWidth,
                    height: taskHeight
                });

                // Calculate flow connection points
                if (index === 0) {
                    // First task: connect from start event horizontally
                    flows.push({
                        id: flowId,
                        sourceRef: previousElementId,
                        targetRef: taskId,
                        sourceX: startEventX + eventSize,
                        sourceY: startY + (eventSize / 2),
                        targetX: taskX,
                        targetY: taskY + (taskHeight / 2)
                    });
                } else {
                    // Get previous task's lane index and coordinates
                    const prevTaskLaneIndex = (index - 1) % actors.length;
                    const prevTaskY = getLaneY(prevTaskLaneIndex) - (taskHeight / 2);

                    // Create diagonal connection - straight line connecting bottom-right of previous task
                    // to top-left of current task
                    flows.push({
                        id: flowId,
                        sourceRef: previousElementId,
                        targetRef: taskId,
                        sourceX: taskX + (taskWidth / 2), // Center of previous task
                        sourceY: prevTaskY + taskHeight,  // Bottom of previous task
                        targetX: taskX + (taskWidth / 2), // Center of current task
                        targetY: taskY,                  // Top of current task
                        waypoints: [
                            { x: taskX + (taskWidth / 2), y: prevTaskY + taskHeight }, // From bottom of previous
                            { x: taskX + (taskWidth / 2), y: taskY }                  // To top of current
                        ]
                    });
                }

                // Update previous element ID for next iteration
                previousElementId = taskId;
            });

            // Add end event in the last lane
            const endY = getLaneY(actors.length - 1) - (eventSize / 2);

            bpmnXml += `
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_End</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_End" sourceRef="${previousElementId}" targetRef="EndEvent_1" />`;

            // Add end event to elements
            elements.push({
                id: 'EndEvent_1',
                type: 'endEvent',
                x: endEventX,
                y: endY,
                width: eventSize,
                height: eventSize
            });

            // Add connection from last task to end event (horizontal)
            const lastTaskLaneIndex = (data.length - 1) % actors.length;
            const lastTaskY = getLaneY(lastTaskLaneIndex) - (taskHeight / 2);

            flows.push({
                id: 'Flow_End',
                sourceRef: previousElementId,
                targetRef: 'EndEvent_1',
                sourceX: taskX + taskWidth,
                sourceY: lastTaskY + (taskHeight / 2),
                targetX: endEventX,
                targetY: endY + (eventSize / 2)
            });

            // Close process tag
            bpmnXml += `
  </bpmn:process>`;

            // Calculate diagram dimensions
            const diagramWidth = endEventX + 100;
            const diagramHeight = (actors.length * laneHeight) + 80;

            // Add BPMNDI section
            bpmnXml += `
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${collaborationId}">`;

            // Add participant shape
            bpmnXml += `
      <bpmndi:BPMNShape id="${participantId}_di" bpmnElement="${participantId}" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="${diagramWidth}" height="${diagramHeight}" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>`;

            // Add lanes
            actors.forEach((actor, index) => {
                const laneId = laneIds[actor];
                bpmnXml += `
      <bpmndi:BPMNShape id="${laneId}_di" bpmnElement="${laneId}" isHorizontal="true">
        <dc:Bounds x="150" y="${60 + (index * laneHeight)}" width="${diagramWidth - 30}" height="${laneHeight}" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>`;
            });

            // Add elements (start event, tasks, end event)
            elements.forEach(el => {
                if (el.type === 'startEvent' || el.type === 'endEvent') {
                    bpmnXml += `
      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}">
        <dc:Bounds x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${el.x}" y="${el.y + el.height + 5}" width="${el.width}" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`;
                } else {
                    bpmnXml += `
      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}">
        <dc:Bounds x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>`;
                }
            });

            // Add flows
            flows.forEach(flow => {
                if (flow.waypoints && Array.isArray(flow.waypoints) && flow.waypoints.length > 0) {
                    // Flow with waypoints (for diagonal connections)
                    bpmnXml += `
      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">`;

                    // Add all waypoints
                    flow.waypoints.forEach(point => {
                        bpmnXml += `
        <di:waypoint x="${point.x}" y="${point.y}" />`;
                    });

                    bpmnXml += `
      </bpmndi:BPMNEdge>`;
                } else {
                    // Standard straight connection
                    bpmnXml += `
      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
        <di:waypoint x="${flow.sourceX}" y="${flow.sourceY}" />
        <di:waypoint x="${flow.targetX}" y="${flow.targetY}" />
      </bpmndi:BPMNEdge>`;
                }
            });

            // Close diagram tags
            bpmnXml += `
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

            console.log("Generated BPMN XML:", bpmnXml);
            await modeler.importXML(bpmnXml);

            // Fit the diagram to the viewport
            modeler.get('canvas').zoom('fit-viewport');

            toast.success('Excel file imported successfully!', { id: 'importing' });
            setImportingFile(false);
        } catch (error) {
            console.error('Error importing Excel file:', error);
            toast.error('Failed to import Excel file', { id: 'importing' });
            setImportingFile(false);
        }
    };

    // Read Excel file and return data
    const readExcelFile = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    let jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

                    // Sort data by process_no if it exists
                    if (jsonData.length > 0 &&
                        ('process_no' in jsonData[0] || 'Process_no' in jsonData[0])) {
                        jsonData = jsonData.sort((a, b) => {
                            const aNo = Number(a.process_no || a.Process_no || 0);
                            const bNo = Number(b.process_no || b.Process_no || 0);
                            return aNo - bNo;
                        });
                    }

                    console.log("Sorted Excel data:", jsonData); // Log the sorted data
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsBinaryString(file);
        });
    };

    // Convert Excel data to BPMN XML
    const convertExcelToBpmn = (data: any[], fileName?: string): string => {
        console.log("Converting Excel data to BPMN XML:", data);

        // Validate that we have data to process
        if (!data || data.length === 0) {
            toast.error("No data found in Excel file");
            return INITIAL_DIAGRAM;
        }

        // Initialize a basic BPMN structure
        let processId = 'Process_' + Math.random().toString(36).substr(2, 9);

        // Extract process name from the Excel data
        let processName = fileName || 'Excel Generated Process';

        // Check if all rows have the same process_name value
        if (data.length > 0) {
            // Try these column names in order
            const nameColumns = ['process_name', 'Process_name', 'ProcessName', 'process name',
                'Process Name', 'process', 'Process'];

            for (const column of nameColumns) {
                if (data[0][column] && typeof data[0][column] === 'string') {
                    const value = data[0][column];
                    // Check if this value is consistent across all rows
                    if (data.every(row => row[column] === value)) {
                        processName = value;
                        break;
                    }
                }
            }
        }

        const collaborationId = 'Collaboration_' + Math.random().toString(36).substr(2, 9);
        const participantId = 'Participant_' + Math.random().toString(36).substr(2, 9);

        // Define interfaces for diagram elements and flows
        interface DiagramElement {
            id: string;
            type: string;
            x: number;
            y: number;
            width: number;
            height: number;
        }

        interface DiagramFlow {
            id: string;
            sourceRef: string;
            targetRef: string;
            sourceX: number;
            sourceY: number;
            targetX: number;
            targetY: number;
            waypoints?: any[];
        }

        // If no specific actors are provided in Excel, create default swimlanes
        // based on the number of tasks (one swimlane for each task)
        let actors: string[] = [];

        // First, try to extract actors from the Excel data
        const uniqueActors = new Set<string>();
        data.forEach(row => {
            const actor = row['Actor'] || row['actor'] || '';
            if (actor) uniqueActors.add(actor);
        });

        // If we have unique actors from data, use them
        if (uniqueActors.size > 0) {
            actors = Array.from(uniqueActors);
        }
        // Otherwise, create one swimlane for each task (or use a minimum of 3)
        else {
            // Create a numbered lane for each task
            const numLanes = Math.max(data.length, 3);
            for (let i = 0; i < numLanes; i++) {
                actors.push(`Lane ${i + 1}`);
            }
        }

        console.log("Generated actors for swimlanes:", actors);

        // Create a map to store lane IDs for each actor
        const laneIds: { [key: string]: string } = {};

        // Function to get task info from each row
        const getProcessInfo = (row: any, index: number) => {
            const processNo = row['process_no'] || row['Process_no'] || '';
            const processName = row['Process Name'] || row['process_name'] || row['process'] || '';
            const actor = row['Actor'] || row['actor'] || '';
            const action = row['Action'] || row['action'] || '';

            // Create task name based on available data
            let taskName = '';
            if (processNo && action) {
                taskName = `${processNo}: ${action}`;
            } else if (action) {
                taskName = action;
            } else {
                taskName = `Task ${index + 1}`;
            }

            return { processNo, processName, actor, action, taskName };
        };

        // Start building the BPMN XML
        let bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_${processId}" 
                  targetNamespace="http://bpmn.io/schema/bpmn"
                  exporter="Excel to BPMN Converter"
                  exporterVersion="1.0">
  <bpmn:collaboration id="${collaborationId}">
    <bpmn:participant id="${participantId}" name="${processName}" processRef="${processId}" />
  </bpmn:collaboration>
  <bpmn:process id="${processId}" name="${processName}" isExecutable="false">`;

        // Add lanes for each actor
        if (actors.length > 0) {
            const laneSetId = 'LaneSet_' + Math.random().toString(36).substr(2, 9);
            bpmnXml += `
    <bpmn:laneSet id="${laneSetId}">`;

            // Create a lane for each actor and store their IDs
            actors.forEach((actor, index) => {
                const laneId = 'Lane_' + Math.random().toString(36).substr(2, 9);
                laneIds[actor] = laneId; // Store lane ID for this actor

                bpmnXml += `
      <bpmn:lane id="${laneId}" name="${actor}">`;

                // Reference start event in the first lane
                if (index === 0) {
                    bpmnXml += `
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>`;
                }

                // Assign each task to the corresponding lane based on index
                // This places each task in its own swimlane sequentially
                data.forEach((row, taskIndex) => {
                    // Use the task index modulo actors.length to assign tasks to lanes
                    // This will distribute tasks across lanes if there are more tasks than lanes
                    if (index === taskIndex % actors.length) {
                        bpmnXml += `
        <bpmn:flowNodeRef>Task_${taskIndex}</bpmn:flowNodeRef>`;
                    }
                });

                // Place end event in the last lane
                if (index === actors.length - 1) {
                    bpmnXml += `
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>`;
                }

                bpmnXml += `
      </bpmn:lane>`;
            });

            bpmnXml += `
    </bpmn:laneSet>`;
        }

        // Calculate standard positions and dimensions
        const laneHeight = 120; // Lane height
        const taskWidth = 100;
        const taskHeight = 80;
        const eventSize = 36;

        // Start position
        const startEventX = 225;
        const taskX = 300; // Fixed horizontal position for all tasks (vertically aligned)
        const endEventX = 550; // Fixed position for end event

        // Calculate the lane center points for vertical positioning
        const getLaneY = (laneIndex: number) => {
            return 60 + (laneIndex * laneHeight) + (laneHeight / 2);
        };

        // Place start event in the first lane
        const startY = getLaneY(0) - (eventSize / 2);

        // Add start event
        bpmnXml += `
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_0</bpmn:outgoing>
    </bpmn:startEvent>`;

        // Track elements and flows for DI section
        const elements: DiagramElement[] = [{
            id: 'StartEvent_1',
            type: 'startEvent',
            x: startEventX,
            y: startY,
            width: eventSize,
            height: eventSize
        }];

        const flows: DiagramFlow[] = [];

        // Previous element tracking for connections
        let previousElementId = 'StartEvent_1';

        // Add all tasks from Excel data
        data.forEach((row, index) => {
            const taskId = `Task_${index}`;
            const flowId = `Flow_${index}`;

            // Extract task info
            const { taskName } = getProcessInfo(row, index);

            // Determine which lane this task belongs to (based on task index)
            const laneIndex = index % actors.length;
            const laneY = getLaneY(laneIndex);

            // Calculate task position - vertically in the center of the lane
            const taskY = laneY - (taskHeight / 2);

            // Add task to BPMN
            bpmnXml += `
    <bpmn:task id="${taskId}" name="${taskName}">
      <bpmn:incoming>${flowId}</bpmn:incoming>`;

            // Determine outgoing flow
            if (index === data.length - 1) {
                // Last task connects to end event
                bpmnXml += `
      <bpmn:outgoing>Flow_End</bpmn:outgoing>
    </bpmn:task>`;
            } else {
                // Connect to next task
                bpmnXml += `
      <bpmn:outgoing>Flow_${index + 1}</bpmn:outgoing>
    </bpmn:task>`;
            }

            // Add sequence flow
            bpmnXml += `
    <bpmn:sequenceFlow id="${flowId}" sourceRef="${previousElementId}" targetRef="${taskId}" />`;

            // Add element to diagram
            elements.push({
                id: taskId,
                type: 'task',
                x: taskX,
                y: taskY,
                width: taskWidth,
                height: taskHeight
            });

            // Calculate flow connection points
            if (index === 0) {
                // First task: connect from start event horizontally
                flows.push({
                    id: flowId,
                    sourceRef: previousElementId,
                    targetRef: taskId,
                    sourceX: startEventX + eventSize,
                    sourceY: startY + (eventSize / 2),
                    targetX: taskX,
                    targetY: taskY + (taskHeight / 2)
                });
            } else {
                // Get previous task's lane index and coordinates
                const prevTaskLaneIndex = (index - 1) % actors.length;
                const prevTaskY = getLaneY(prevTaskLaneIndex) - (taskHeight / 2);

                // Create diagonal connection - straight line connecting bottom-right of previous task
                // to top-left of current task
                flows.push({
                    id: flowId,
                    sourceRef: previousElementId,
                    targetRef: taskId,
                    sourceX: taskX + (taskWidth / 2), // Center of previous task
                    sourceY: prevTaskY + taskHeight,  // Bottom of previous task
                    targetX: taskX + (taskWidth / 2), // Center of current task
                    targetY: taskY,                  // Top of current task
                    waypoints: [
                        { x: taskX + (taskWidth / 2), y: prevTaskY + taskHeight }, // From bottom of previous
                        { x: taskX + (taskWidth / 2), y: taskY }                  // To top of current
                    ]
                });
            }

            // Update previous element ID for next iteration
            previousElementId = taskId;
        });

        // Add end event in the last lane
        const endY = getLaneY(actors.length - 1) - (eventSize / 2);

        bpmnXml += `
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_End</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_End" sourceRef="${previousElementId}" targetRef="EndEvent_1" />`;

        // Add end event to elements
        elements.push({
            id: 'EndEvent_1',
            type: 'endEvent',
            x: endEventX,
            y: endY,
            width: eventSize,
            height: eventSize
        });

        // Add connection from last task to end event (horizontal)
        const lastTaskLaneIndex = (data.length - 1) % actors.length;
        const lastTaskY = getLaneY(lastTaskLaneIndex) - (taskHeight / 2);

        flows.push({
            id: 'Flow_End',
            sourceRef: previousElementId,
            targetRef: 'EndEvent_1',
            sourceX: taskX + taskWidth,
            sourceY: lastTaskY + (taskHeight / 2),
            targetX: endEventX,
            targetY: endY + (eventSize / 2)
        });

        // Close process tag
        bpmnXml += `
  </bpmn:process>`;

        // Calculate diagram dimensions
        const diagramWidth = endEventX + 100;
        const diagramHeight = (actors.length * laneHeight) + 80;

        // Add BPMNDI section
        bpmnXml += `
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${collaborationId}">`;

        // Add participant shape
        bpmnXml += `
      <bpmndi:BPMNShape id="${participantId}_di" bpmnElement="${participantId}" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="${diagramWidth}" height="${diagramHeight}" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>`;

        // Add lanes
        actors.forEach((actor, index) => {
            const laneId = laneIds[actor];
            bpmnXml += `
      <bpmndi:BPMNShape id="${laneId}_di" bpmnElement="${laneId}" isHorizontal="true">
        <dc:Bounds x="150" y="${60 + (index * laneHeight)}" width="${diagramWidth - 30}" height="${laneHeight}" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>`;
        });

        // Add elements (start event, tasks, end event)
        elements.forEach(el => {
            if (el.type === 'startEvent' || el.type === 'endEvent') {
                bpmnXml += `
      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}">
        <dc:Bounds x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${el.x}" y="${el.y + el.height + 5}" width="${el.width}" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`;
            } else {
                bpmnXml += `
      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}">
        <dc:Bounds x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>`;
            }
        });

        // Add flows
        flows.forEach(flow => {
            if (flow.waypoints && Array.isArray(flow.waypoints) && flow.waypoints.length > 0) {
                // Flow with waypoints (for diagonal connections)
                bpmnXml += `
      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">`;

                // Add all waypoints
                flow.waypoints.forEach(point => {
                    bpmnXml += `
        <di:waypoint x="${point.x}" y="${point.y}" />`;
                });

                bpmnXml += `
      </bpmndi:BPMNEdge>`;
            } else {
                // Standard straight connection
                bpmnXml += `
      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
        <di:waypoint x="${flow.sourceX}" y="${flow.sourceY}" />
        <di:waypoint x="${flow.targetX}" y="${flow.targetY}" />
      </bpmndi:BPMNEdge>`;
            }
        });

        // Close diagram tags
        bpmnXml += `
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

        console.log("Generated BPMN XML:", bpmnXml);
        return bpmnXml;
    };

    // Update the loading state
    if (!stylesLoaded || loadingProject) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">{loadingProject ? 'Loading project...' : 'Loading BPMN Editor...'}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar with icons */}
            <div className="bg-white border-b px-4 py-2 flex items-center space-x-4">
                {/* Back button */}
                <button
                    onClick={handleBackToDashboard}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
                    title="Back to Dashboard"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Project name (editable or display) */}
                <div className="text-gray-700 font-medium ml-2 flex items-center">
                    {isRenaming ? (
                        <div className="flex items-center">
                            <input
                                ref={projectNameInputRef}
                                type="text"
                                value={tempProjectName}
                                onChange={(e) => setTempProjectName(e.target.value)}
                                onKeyDown={handleRenameKeyDown}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter project name"
                            />
                            <button
                                onClick={handleSaveRename}
                                className="ml-2 p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Save"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={handleCancelRename}
                                className="ml-1 p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Cancel"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <span className="mr-2">
                                {projectName}
                                {projectId ? ` (ID: ${projectId})` : ''}
                            </span>
                            <button
                                onClick={handleStartRename}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                title="Rename Project"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                <div className="h-6 border-l border-gray-300 mx-1"></div>

                {/* New Diagram */}
                <button
                    onClick={handleNew}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
                    title="New Diagram"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
                    </svg>
                </button>

                <div className="h-6 border-l border-gray-300 mx-1"></div>

                {/* Import Dropdown */}
                <div className="relative import-dropdown">
                    <button
                        onClick={toggleImportDropdown}
                        disabled={importingFile}
                        className={`inline-flex items-center justify-center p-2 rounded-md ${importingFile ? 'text-orange-400' : 'text-orange-600 hover:bg-orange-50'} transition-colors focus:outline-none`}
                        title="Import Diagram"
                    >
                        {importingFile ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span className="ml-1 font-medium text-sm">Import</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </button>

                    {showImportDropdown && (
                        <div className="absolute z-10 mt-1 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                                {/* JSON Import Option */}
                                <button
                                    onClick={() => {
                                        const jsonFileInput = document.createElement('input');
                                        jsonFileInput.type = 'file';
                                        jsonFileInput.accept = '.json';
                                        jsonFileInput.onchange = (e: any) => {
                                            const file = e.target.files?.[0];
                                            if (file && modeler) {
                                                handleJsonImport(file);
                                            }
                                        };
                                        jsonFileInput.click();
                                        setShowImportDropdown(false);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    role="menuitem"
                                >
                                    <svg className="h-5 w-5 mr-3 text-orange-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M8 16L10 18L12 16M16 12L14 10L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    JSON File
                                </button>

                                {/* BPMN Option */}
                                <button
                                    onClick={() => {
                                        const bpmnFileInput = document.createElement('input');
                                        bpmnFileInput.type = 'file';
                                        bpmnFileInput.accept = '.bpmn,.xml';
                                        bpmnFileInput.onchange = (e: any) => {
                                            const file = e.target.files?.[0];
                                            if (file && modeler) {
                                                handleXmlImport(file);
                                            }
                                        };
                                        bpmnFileInput.click();
                                        setShowImportDropdown(false);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    role="menuitem"
                                >
                                    <svg className="h-5 w-5 mr-3 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 15L7 12L9 9M15 9L17 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    BPMN/XML File
                                </button>

                                {/* Excel Option */}
                                <button
                                    onClick={() => {
                                        const excelFileInput = document.createElement('input');
                                        excelFileInput.type = 'file';
                                        excelFileInput.accept = '.xlsx';
                                        excelFileInput.onchange = (e: any) => {
                                            const file = e.target.files?.[0];
                                            if (file && modeler) {
                                                handleExcelImport(file);
                                            }
                                        };
                                        excelFileInput.click();
                                        setShowImportDropdown(false);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    role="menuitem"
                                >
                                    <svg className="h-5 w-5 mr-3 text-teal-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 15L7 12L9 9M15 9L17 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Excel File
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-6 border-l border-gray-300 mx-1"></div>

                {/* Save Project button */}
                <button
                    onClick={handleSaveProject}
                    disabled={downloading}
                    className={`inline-flex items-center justify-center p-2 rounded-md ${downloading ? 'text-green-400' : 'text-green-600 hover:bg-green-50'} transition-colors focus:outline-none`}
                    title="Save Project"
                >
                    {downloading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                        </svg>
                    )}
                </button>

                <div className="h-6 border-l border-gray-300 mx-1"></div>

                {/* Export Dropdown */}
                <div className="relative export-dropdown">
                    <button
                        onClick={toggleExportDropdown}
                        disabled={exportingFile}
                        className={`inline-flex items-center justify-center p-2 rounded-md ${exportingFile ? 'text-blue-400' : 'text-blue-600 hover:bg-blue-50'} transition-colors focus:outline-none`}
                        title="Export Diagram"
                    >
                        {exportingFile ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L10 8.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span className="ml-1 font-medium text-sm">Download</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </button>

                    {showExportDropdown && (
                        <div className="absolute z-10 mt-1 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                                {/* SVG Option */}
                                <button
                                    onClick={() => {
                                        handleSaveSVG();
                                        setShowExportDropdown(false);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    role="menuitem"
                                >
                                    <svg className="h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 15.5V12M12 15.5V12M15 15.5V12M9 15.5H15M9 15.5C9 17 10.5 18 12 18C13.5 18 15 17 15 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    SVG
                                </button>

                                {/* JSON Option */}
                                <button
                                    onClick={() => {
                                        handleSaveJSON();
                                        setShowExportDropdown(false);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    role="menuitem"
                                >
                                    <svg className="h-5 w-5 mr-3 text-green-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M8 16L10 18L12 16M16 12L14 10L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    JSON
                                </button>

                                {/* XML Option */}
                                <button
                                    onClick={() => {
                                        handleSaveXML();
                                        setShowExportDropdown(false);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    role="menuitem"
                                >
                                    <svg className="h-5 w-5 mr-3 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 15L7 12L9 9M15 9L17 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    BPMN/XML
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-6 border-l border-gray-300 mx-1"></div>

                {/* Zoom In */}
                <button
                    onClick={() => modeler?.get('canvas').zoom(modeler.get('canvas').zoom() + 0.1)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
                    title="Zoom In"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                </button>

                {/* Zoom Out */}
                <button
                    onClick={() => modeler?.get('canvas').zoom(modeler.get('canvas').zoom() - 0.1)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
                    title="Zoom Out"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                </button>

                {/* Fit to View */}
                <button
                    onClick={() => modeler?.get('canvas').zoom('fit-viewport')}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
                    title="Fit to View"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                </button>

                <div className="flex-1"></div>

                {/* View Diagram */}
                <button
                    onClick={handleOpenViewer}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors focus:outline-none"
                    title="View Diagram"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="font-medium">View Diagram</span>
                </button>

                {/* Send for Approval - only show for regular users */}
                {user && user.role === 'user' && (
                    <button
                        onClick={handleSendForApproval}
                        disabled={sendingForApproval}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-colors focus:outline-none"
                        title="Send for Approval"
                    >
                        {sendingForApproval ? (
                            <>
                                <svg className="animate-spin h-5 w-5 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="font-medium">Sending...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span className="font-medium">Send for Approval</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Main container with editor */}
            <div className="flex flex-1 overflow-hidden">
                {/* Editor Container */}
                <div
                    ref={containerRef}
                    className="flex-1 bg-white"
                    style={{ height: 'calc(100vh - 140px)' }}
                />
            </div>

            {/* BPMN Viewer Modal */}
            {showViewer && (
                <BpmnViewerComponent
                    diagramXML={currentDiagramXML}
                    onClose={() => setShowViewer(false)}
                    title={`BPMN Viewer: ${projectName}`}
                />
            )}
        </div>
    );
};

export default BpmnEditor; 