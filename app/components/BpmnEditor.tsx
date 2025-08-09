'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BpmnViewerComponent from './BpmnViewer';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnColorPickerModule from 'bpmn-js-color-picker';
import { BpmnProject, saveProjectToAPI, getProjectByIdFromAPI } from '../utils/projectStorage';
import { 
  updateBpmnNode, 
  createBpmnNode, 
  getBpmnNodeById,
  convertProjectToNode,
  CreateNodeRequest
} from '../utils/bpmnNodeStorage';

import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { XMLParser } from 'fast-xml-parser';
import * as XLSX from 'xlsx';
import dynamic from 'next/dynamic';
import { HiFolder } from 'react-icons/hi';
// Add the DuplicateWarningModal import
const DuplicateWarningModal = dynamic(() => import('./DuplicateWarningModal'), { ssr: false });
// Add the BpmnFileTree import
const BpmnFileTree = dynamic(() => import('./BpmnFileTree'), { ssr: false });
import { convertBpmnToLatex } from '../utils/bpmnToLatex';
import { saveLatexProject, saveLatexProjectToAPI, LatexProject } from '../utils/latexProjectStorage';
import { getLatexFileTree, saveLatexFileTree, saveLatexFileTreeToAPI, FileTreeNode } from '../utils/fileTreeStorage';
import { autoIncrementVersion, getCurrentDateString, getCurrentDateTimeString, createChangeDescription, getUserDisplayName, createInitialAdvancedDetails, formatDateForDisplay, formatDateOnlyForDisplay } from '../utils/versionUtils';

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

// Default BPMN XML template for new diagrams WITH POOL AND LANE
const INITIAL_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="Process Name" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1" name="Actor">
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Activity_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
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
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="600" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true">
        <dc:Bounds x="150" y="60" width="570" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="200" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="200" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="300" y="100" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="450" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="450" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="236" y="138" />
        <di:waypoint x="300" y="138" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="400" y="138" />
        <di:waypoint x="450" y="138" />
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

interface BpmnEditorProps {
    user?: User | null;
    onCreateFileFromEditor?: (project: BpmnProject) => void;
}

const BpmnEditor: React.FC<BpmnEditorProps> = ({ user: propUser, onCreateFileFromEditor }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const containerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
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
    const [user, setUser] = useState<User | null>(propUser || null);
    const [exampleDropdownOpen, setExampleDropdownOpen] = useState(false);
    const [downloadingExample, setDownloadingExample] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [exportingFile, setExportingFile] = useState(false);
    const [importingFile, setImportingFile] = useState(false);
    const [sendingForApproval, setSendingForApproval] = useState(false);
    const [stylesLoaded, setStylesLoaded] = useState<boolean>(false);
    const [loadingProject, setLoadingProject] = useState<boolean>(false);
    // Add state for duplicate warning modal
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState<any>(null);
    const [projectNameMatch, setProjectNameMatch] = useState<any>(null);
    const [pendingXml, setPendingXml] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showFileTree, setShowFileTree] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    // Add state for file tree refresh
    const [fileTreeRefreshTrigger, setFileTreeRefreshTrigger] = useState(0);
    // Add state for table pane
    const [showTablePane, setShowTablePane] = useState(true);
    const [tablePaneCollapsed, setTablePaneCollapsed] = useState(false);
    const [tableFormData, setTableFormData] = useState({
        processName: '',
        description: '',
        processOwner: '',
        processManager: ''
    });
    const [isEditingProcessDetails, setIsEditingProcessDetails] = useState(false);
    const [generatingLatex, setGeneratingLatex] = useState(false);
    const [modelerReady, setModelerReady] = useState(false);
    const [isLoadingFromSession, setIsLoadingFromSession] = useState(false);

    // Add state for process metadata
    const [processMetadata, setProcessMetadata] = useState({
        processName: '',
        description: '',
        processOwner: '',
        processManager: '',
    });

    // Add state for additional details
    const [additionalDetails, setAdditionalDetails] = useState({
        versionNo: '1.0.0',
        processStatus: '',
        classification: '',
        dateOfCreation: '', // Will be populated when file is created
        dateOfReview: '',
        effectiveDate: '',
        modificationDate: '', // Will be populated when file is created
        modifiedBy: '', // Will be populated when file is created
        changeDescription: '',
        createdBy: '', // Will be populated when file is created
    });

    // Add backup state for additional details (for cancel functionality)
    const [additionalDetailsBackup, setAdditionalDetailsBackup] = useState({
        versionNo: '1.0.0',
        processStatus: '',
        classification: '',
        dateOfCreation: '', // Will be populated when file is created
        dateOfReview: '',
        effectiveDate: '',
        modificationDate: '', // Will be populated when file is created
        modifiedBy: '', // Will be populated when file is created
        changeDescription: '',
        createdBy: '', // Will be populated when file is created
    });

    // Add state for editing additional details
    const [isEditingAdditionalDetails, setIsEditingAdditionalDetails] = useState(false);

    // Add state for LaTeX generation popup
    const [showLatexPopup, setShowLatexPopup] = useState(false);
    const [latexTableOptions, setLatexTableOptions] = useState({
        processTable: true,
        processDetailsTable: true,
        signOffTable: true,
        historyTable: true,
        triggerTable: true
    });
    const [selectedLeftOption, setSelectedLeftOption] = useState('tables'); // 'tables', 'signoff', 'history', 'trigger'
    const [signOffData, setSignOffData] = useState({
        responsibility: '',
        date: '',
        name: '',
        designation: '',
        signature: ''
    });
    const [historyData, setHistoryData] = useState({
        versionNo: '',
        date: '',
        statusRemarks: '',
        author: ''
    });
    const [triggerData, setTriggerData] = useState({
        triggers: '',
        inputs: '',
        outputs: ''
    });

    // Check if any table is selected for LaTeX generation
    const isAnyTableSelected = Object.values(latexTableOptions).some(option => option);

    // Function to update version number and modification details
    const updateVersionAndModificationDetails = (changeType: 'diagram' | 'process' | 'advanced' | 'tables', additionalInfo?: string) => {
        const newVersion = autoIncrementVersion(additionalDetails.versionNo, changeType);
        const currentDateTime = getCurrentDateTimeString(); // Use full date and time
        const changeDesc = createChangeDescription(changeType, additionalInfo);
        const userName = getUserDisplayName(user);
        
        setAdditionalDetails(prev => ({
            ...prev,
            versionNo: newVersion,
            modificationDate: currentDateTime, // Actual modification time
            modifiedBy: userName, // Actual modifier
            changeDescription: changeDesc
        }));
        
        console.log(`Version updated to ${newVersion} due to ${changeType} change by ${userName}`);
        return newVersion;
    };

    // Fetch current user on component mount if not provided as prop
    useEffect(() => {
        if (propUser) {
            setUser(propUser);
            return;
        }

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
    }, [propUser]);

    // Handle bpmnFile URL parameter for file selection from list
    useEffect(() => {
        const handleBpmnFileFromUrl = async () => {
            if (!user || !modeler || !modelerReady) return;

            const urlBpmnFile = searchParams.get('bpmnFile');
            if (urlBpmnFile) {
                try {
                    const parsedBpmnFile = JSON.parse(decodeURIComponent(urlBpmnFile));
                    
                    // Set project details
                    setProjectId(parsedBpmnFile.id);
                    setProjectName(parsedBpmnFile.name);
                    setProcessMetadata(parsedBpmnFile.processMetadata || {
                        processName: '',
                        description: '',
                        processOwner: '',
                        processManager: '',
                    });
                    setTableFormData(parsedBpmnFile.processMetadata || {
                        processName: '',
                        description: '',
                        processOwner: '',
                        processManager: '',
                    });

                    // Load the BPMN content into the editor
                    if (parsedBpmnFile.content) {
                        try {
                            // Ensure the container is visible and properly sized
                            if (containerRef.current) {
                                containerRef.current.style.display = 'block';
                                containerRef.current.style.width = '100%';
                                containerRef.current.style.height = '100%';
                            }

                            // Clear any existing content first
                            await modeler.importXML(parsedBpmnFile.content);
                            
                            // Force a re-render of the canvas
                            setTimeout(() => {
                                try {
                                    if (modeler && modeler.get('canvas')) {
                                        const canvas = modeler.get('canvas');
                                        canvas.zoom('fit-viewport');
                                        
                                        // Force a redraw
                                        canvas.viewbox(canvas.viewbox());
                                    }
                                } catch (zoomError) {
                                    console.error('Error zooming to fit viewport:', zoomError);
                                }
                            }, 300);
                            
                            toast.success(`BPMN diagram "${parsedBpmnFile.name}" loaded successfully!`);
                            
                            // Clear the URL parameter after successful load
                            const url = new URL(window.location.href);
                            url.searchParams.delete('bpmnFile');
                            window.history.replaceState({}, '', url.toString());
                            
                        } catch (importError) {
                            console.error('Error importing BPMN content:', importError);
                            toast.error('Failed to load BPMN diagram content');
                        }
                    }
                } catch (error) {
                    console.error('Error parsing bpmnFile parameter:', error);
                    toast.error('Failed to parse BPMN file data');
                }
            }
        };

        handleBpmnFileFromUrl();
    }, [user, modeler, modelerReady, searchParams]);

    // Function to load project from session storage
    const loadProjectFromSession = async () => {
        if (typeof window !== 'undefined' && modeler && user && modelerReady && !loadingRef.current) {
            const savedProjectId = sessionStorage.getItem('currentProject');
            if (savedProjectId) {
                loadingRef.current = true;
                setIsLoadingFromSession(true);
                setProjectId(savedProjectId);
                setLoadingProject(true);

                try {
                    // Import the project from the new API
                    const { getBpmnNodeById, convertNodeToProject } = await import('../utils/bpmnNodeStorage');
                    const node = await getBpmnNodeById(savedProjectId, user.id);
                    
                    if (node) {
                        const project = convertNodeToProject(node);
                        
                        // Set project details
                        setProjectName(project.name);
                        setProcessMetadata(project.processMetadata || {
                            processName: '',
                            description: '',
                            processOwner: '',
                            processManager: '',
                        });
                        setTableFormData(project.processMetadata || {
                            processName: '',
                            description: '',
                            processOwner: '',
                            processManager: '',
                        });

                        // Load the BPMN content into the editor
                        if (project.content) {
                            try {
                                // Ensure the container is visible and properly sized
                                if (containerRef.current) {
                                    containerRef.current.style.display = 'block';
                                    containerRef.current.style.width = '100%';
                                    containerRef.current.style.height = '100%';
                                }

                                // Clear any existing content first
                                await modeler.importXML(project.content);
                                
                                // Force a re-render of the canvas
                                setTimeout(() => {
                                    try {
                                        if (modeler && modeler.get('canvas')) {
                                            const canvas = modeler.get('canvas');
                                            canvas.zoom('fit-viewport');
                                            
                                            // Force a redraw
                                            canvas.viewbox(canvas.viewbox());
                                        }
                                    } catch (zoomError) {
                                        console.error('Error zooming to fit viewport:', zoomError);
                                    }
                                }, 300);
                                
                                toast.success(`Project "${project.name}" loaded successfully!`);
                                
                                // Clear session storage only after successful load
                                setTimeout(() => {
                                    sessionStorage.removeItem('currentProject');
                                    sessionStorage.removeItem('projectUserId');
                                    sessionStorage.removeItem('projectUserRole');
                                }, 1000);
                                
                                // Fallback: if canvas is still not visible after 3 seconds, try to recreate modeler
                                setTimeout(() => {
                                    if (containerRef.current && containerRef.current.children.length === 0) {
                                        console.log('Canvas not visible, attempting to recreate modeler...');
                                        
                                        // Clear the container
                                        if (containerRef.current) {
                                            containerRef.current.innerHTML = '';
                                        }
                                        
                                        // Force a re-render by updating state
                                        setModelerReady(false);
                                        setModeler(null);
                                        
                                        // Recreate the modeler after a short delay
                                        setTimeout(() => {
                                            if (containerRef.current && !loadingRef.current) {
                                                const newModeler = new BpmnModeler({
                                                    container: containerRef.current,
                                                    keyboard: { bindTo: window },
                                                    additionalModules: [BpmnColorPickerModule]
                                                });
                                                
                                                setModeler(newModeler);
                                                
                                                                                                // Import the project content again
                                                if (project.content) {
                                                    newModeler.importXML(project.content)
                                                        .then(() => {
                                                            setModelerReady(true);
                                                            (newModeler.get('canvas') as any).zoom('fit-viewport');
                                                        })
                                                        .catch((err: any) => {
                                                            console.error('Error recreating modeler:', err);
                                                            setModelerReady(true);
                                                        });
                                                } else {
                                                    setModelerReady(true);
                                                }
                                            }
                                        }, 500);
                                    }
                                }, 3000);
                                
                            } catch (error) {
                                console.error('Error importing project XML:', error);
                                toast.error('Failed to load diagram content');
                            }
                    }
                } else {
                    toast.error('Project not found');
                }
                } catch (error) {
                    console.error('Error loading project:', error);
                    toast.error('Failed to load project');
                } finally {
                    setLoadingProject(false);
                    setIsLoadingFromSession(false);
                    loadingRef.current = false;
                }
            }
        }
    };

    // Effect to handle project loading when modeler becomes ready
    useEffect(() => {
        if (modelerReady && modeler && user) {
            const savedProjectId = sessionStorage.getItem('currentProject');
            if (savedProjectId && !projectId) {
                // Add a longer delay to ensure the modeler is fully initialized and stable
                setTimeout(() => {
                    if (modeler && modelerReady && containerRef.current) {
                        // Ensure the container is properly set up
                        containerRef.current.style.display = 'block';
                        containerRef.current.style.width = '100%';
                        containerRef.current.style.height = '100%';
                        
                        loadProjectFromSession();
                    }
                }, 200);
            }
        }
    }, [modelerReady, modeler, user, projectId]);

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
                await import('bpmn-js-color-picker/colors/color-picker.css');
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

        // Don't recreate modeler if we're loading from session
        if (loadingRef.current) {
            return;
        }

        // Create a new modeler instance
        const bpmnModeler = new BpmnModeler({
            container: containerRef.current,
            keyboard: {
                bindTo: window
            },
            additionalModules: [
                BpmnColorPickerModule
            ]
        });

        // Set the modeler state
        setModeler(bpmnModeler);

        // Import the initial diagram
        bpmnModeler.importXML(INITIAL_DIAGRAM)
            .then(() => {
                // Mark modeler as ready after initial diagram is loaded
                setModelerReady(true);
            })
            .catch((err: any) => {
                console.error('Error importing BPMN diagram', err);
                setModelerReady(true); // Still mark as ready even if initial diagram fails
            });

        // Clean up function
        return () => {
            // Only destroy if we're not loading from session
            if (!loadingRef.current) {
                bpmnModeler.destroy();
            }
        };
    }, [stylesLoaded]);

    // Function to refresh file tree
    const refreshFileTree = () => {
        setFileTreeRefreshTrigger(prev => prev + 1);
    };

    // Function to handle creating a file from the editor (for untitled diagrams)
    const handleCreateFileFromEditor = useCallback(async (project: BpmnProject) => {
        try {
            // Save the project to storage
            await saveProjectToAPI(project, user?.id, user?.role);
            
            // Update the current project ID and name
            setProjectId(project.id);
            setProjectName(project.name);
            
            // Refresh the file tree to show the new file
            refreshFileTree();
            
            toast.success(`File "${project.name}" created successfully!`);
        } catch (error) {
            console.error('Error creating file from editor:', error);
            toast.error('Failed to create file');
        }
    }, [user, refreshFileTree]);

    // Function to save the current diagram as a project with improved functionality
    const handleSaveProject = useCallback(async () => {
        if (!modeler || !user) return;

        try {
            setIsSaving(true);

            // Get the current XML
            const { xml } = await modeler.saveXML({ format: true });

            // Get current process metadata from the form
            const currentMetadata = {
                processName: tableFormData.processName,
                description: tableFormData.description,
                processOwner: tableFormData.processOwner,
                processManager: tableFormData.processManager,
            };

            console.log('Saving project with metadata:', currentMetadata);
            console.log('Current project ID:', projectId);

            // Check if this is an untitled diagram (no projectId or default name)
            const isUntitledDiagram = !projectId || projectName === 'Untitled Diagram';

            if (isUntitledDiagram) {
                // Create a new file for untitled diagrams
                const newProjectName = projectName === 'Untitled Diagram' ? 'Untitled' : projectName;
                
                // Populate creation information with actual values when file is created
                const creationAdvancedDetails = {
                    ...additionalDetails,
                    dateOfCreation: getCurrentDateTimeString(), // Actual creation time
                    createdBy: getUserDisplayName(user), // Actual creator
                    modificationDate: getCurrentDateTimeString(), // Initial modification time
                    modifiedBy: getUserDisplayName(user), // Initial modifier
                    changeDescription: 'Initial file creation'
                };
                
                const request: CreateNodeRequest = {
                    userId: user.id,
                    type: 'file',
                    name: newProjectName,
                    content: xml,
                    processMetadata: currentMetadata,
                    advancedDetails: creationAdvancedDetails,
                };

                console.log('Creating new file:', request);

                // Create the file using the new API
                const newNode = await createBpmnNode(request);

                // Update the current project state
                setProjectId(newNode.id);
                setProjectName(newProjectName);
                setProcessMetadata(currentMetadata);

                // Create the file in the file tree
                if (onCreateFileFromEditor) {
                    const newProject: BpmnProject = {
                        id: newNode.id,
                        name: newNode.name,
                        content: newNode.content || '',
                        processMetadata: newNode.processMetadata || currentMetadata,
                    };
                    await onCreateFileFromEditor(newProject);
            }

                toast.success(`File "${newProjectName}" created and saved successfully!`);
            } else {
                // Update existing file
                console.log('Updating existing file with ID:', projectId);
                
                // Update version for diagram change
                updateVersionAndModificationDetails('diagram', `Diagram elements modified in ${projectName}`);
                
                await updateBpmnNode({
                    nodeId: projectId!,
                    userId: user.id,
                    name: projectName,
                    content: xml,
                    processMetadata: currentMetadata,
                    advancedDetails: additionalDetails,
                });

                // Update local metadata state
                setProcessMetadata(currentMetadata);

                toast.success(`File "${projectName}" updated successfully!`);
            }
        } catch (error) {
            console.error('Error saving project:', error);
            toast.error('Failed to save project');
        } finally {
            setIsSaving(false);
        }
    }, [modeler, projectName, projectId, user, tableFormData, onCreateFileFromEditor]);

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

    // Function to toggle edit mode for process details
    const handleToggleProcessDetailsEdit = () => {
        if (!isEditingProcessDetails) {
            // When entering edit mode, save current form data as backup
            setTableFormData({
                processName: processMetadata.processName,
                description: processMetadata.description,
                processOwner: processMetadata.processOwner,
                processManager: processMetadata.processManager
            });
        }
        setIsEditingProcessDetails(!isEditingProcessDetails);
    };

    // Function to save process details
    const handleSaveProcessDetails = async () => {
        if (!user || !projectId) {
            toast.error('No project selected');
            return;
        }

        const updatedMetadata = {
            processName: tableFormData.processName,
            description: tableFormData.description,
            processOwner: tableFormData.processOwner,
            processManager: tableFormData.processManager,
        };
        
        setProcessMetadata(updatedMetadata);
        setIsEditingProcessDetails(false);
        
        // Update version for process details change
        updateVersionAndModificationDetails('process', `Updated process details: ${updatedMetadata.processName}`);
        
        // If we have a current project, save it immediately with the updated metadata
        if (modeler) {
            try {
                setIsSaving(true);
                
                // Get the current XML
                const { xml } = await modeler.saveXML({ format: true });
                
                // Update the file with new metadata and version
                await updateBpmnNode({
                    nodeId: projectId,
                    userId: user.id,
                    name: projectName,
                    content: xml,
                    processMetadata: updatedMetadata,
                    advancedDetails: additionalDetails,
                });
                
                toast.success('Process details saved successfully!');
            } catch (err) {
                console.error('Error saving process details:', err);
                toast.error('Failed to save process details');
            } finally {
                setIsSaving(false);
            }
        } else {
            toast.success('Process details saved successfully!');
        }
    };

    // Function to cancel process details editing (revert to original values)
    const handleCancelProcessDetails = () => {
        setTableFormData({
            processName: processMetadata.processName,
            description: processMetadata.description,
            processOwner: processMetadata.processOwner,
            processManager: processMetadata.processManager
        });
        setIsEditingProcessDetails(false);
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



    // Function to handle project selection from file tree
    const handleProjectSelect = async (project: BpmnProject) => {
        console.log('Loading project:', project);
        console.log('Project metadata:', project.processMetadata);
        console.log('Project table data:', {
            signOffData: project.signOffData,
            historyData: project.historyData,
            triggerData: project.triggerData
        });
        
        setProjectId(project.id);
        setProjectName(project.name);
        
        // Load process metadata if available
        if (project.processMetadata) {
            console.log('Setting process metadata:', project.processMetadata);
            setProcessMetadata(project.processMetadata);
            setTableFormData(project.processMetadata);
        } else {
            console.log('No process metadata found, resetting to empty');
            // Reset to empty if no metadata
            const emptyMetadata = {
                processName: '',
                description: '',
                processOwner: '',
                processManager: '',
            };
            setProcessMetadata(emptyMetadata);
            setTableFormData(emptyMetadata);
        }
        
        // Load table data if available
        if (project.signOffData) {
            console.log('Setting sign off data:', project.signOffData);
            setSignOffData(project.signOffData);
        } else {
            setSignOffData({
                responsibility: '',
                date: '',
                name: '',
                designation: '',
                signature: ''
            });
        }
        
        if (project.historyData) {
            console.log('Setting history data:', project.historyData);
            setHistoryData(project.historyData);
        } else {
            setHistoryData({
                versionNo: '',
                date: '',
                statusRemarks: '',
                author: ''
            });
        }
        
        if (project.triggerData) {
            console.log('Setting trigger data:', project.triggerData);
            setTriggerData(project.triggerData);
        } else {
            setTriggerData({
                triggers: '',
                inputs: '',
                outputs: ''
            });
        }
        
        // Load advanced details if available
        if (project.advancedDetails) {
            console.log('Setting advanced details:', project.advancedDetails);
            setAdditionalDetails(project.advancedDetails);
        } else {
            // Initialize with empty values if no advanced details exist
            const initialAdvancedDetails = createInitialAdvancedDetails(user);
            setAdditionalDetails(initialAdvancedDetails);
        }
        
        if (project.content && modeler) {
            modeler.importXML(project.content)
                .then(() => {
                    toast.success(`Project "${project.name}" loaded successfully!`);
                    setTimeout(() => {
                        modeler.get('canvas').zoom('fit-viewport');
                    }, 100);
                })
                .catch((err: any) => {
                    console.error('Error loading project:', err);
                    toast.error('Failed to load project');
                });
        }
    };

    // Function to handle new project creation from file tree
    const handleNewProject = () => {
        setProjectId(null);
        setProjectName('Untitled Diagram');
        
        // Reset process metadata for new project
        const emptyMetadata = {
            processName: '',
            description: '',
            processOwner: '',
            processManager: '',
        };
        setProcessMetadata(emptyMetadata);
        setTableFormData(emptyMetadata);
        
        // Reset table data for new project
        setSignOffData({
            responsibility: '',
            date: '',
            name: '',
            designation: '',
            signature: ''
        });
        
        setHistoryData({
            versionNo: '',
            date: '',
            statusRemarks: '',
            author: ''
        });
        
        setTriggerData({
            triggers: '',
            inputs: '',
            outputs: ''
        });
        
        // Initialize advanced details for new project with creation information
        const initialAdvancedDetails = createInitialAdvancedDetails(user);
        setAdditionalDetails(initialAdvancedDetails);
        
        if (modeler) {
            modeler.importXML(INITIAL_DIAGRAM).catch((err: any) => {
                console.error('Error importing BPMN diagram', err);
            });
        }
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

            // Check for duplicate diagrams before proceeding
            const checkResponse = await fetch('/api/notifications/check-duplicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bpmnXml: xml,
                    projectName: projectName
                }),
            });

            if (!checkResponse.ok) {
                throw new Error('Failed to check for duplicates');
            }

            const checkData = await checkResponse.json();

            if (checkData.duplicateFound || checkData.projectNameMatch) {
                // Store the XML and information about duplicates for later use
                setPendingXml(xml);
                setDuplicateInfo(checkData.duplicateInfo);
                setProjectNameMatch(checkData.projectNameMatch);
                setShowDuplicateWarning(true);
                setSendingForApproval(false);
                return;
            }

            // If no duplicates, proceed with sending for approval
            await sendDiagramForApproval(xml);

        } catch (error) {
            console.error('Error sending for approval:', error);
            toast.error('Failed to send BPMN for approval');
            setSendingForApproval(false);
        }
    };

    // New function to send the diagram for approval after the duplicate check
    const sendDiagramForApproval = async (xml: string) => {
        try {
            setSendingForApproval(true);

            // Send to the API endpoint
            const response = await fetch('/api/notifications/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: `BPMN Approval: ${projectName}`,
                    message: `${user?.name || user?.email} has requested approval for a BPMN diagram: ${projectName}`,
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

    // Handle proceeding with submission despite duplicate warning
    const handleProceedWithSubmission = async () => {
        if (pendingXml) {
            await sendDiagramForApproval(pendingXml);
            setShowDuplicateWarning(false);
            setPendingXml(null);
            setDuplicateInfo(null);
            setProjectNameMatch(null);
        }
    };

    // Handle canceling the submission
    const handleCancelSubmission = () => {
        setShowDuplicateWarning(false);
        setPendingXml(null);
        setDuplicateInfo(null);
        setProjectNameMatch(null);
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
    const handleSaveRename = async () => {
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

                    // Update version for diagram change (rename)
                    updateVersionAndModificationDetails('diagram', `Project renamed to ${tempProjectName}`);

                    // Save project with the new name
                    await saveProjectToAPI({
                        id: projectId,
                        name: tempProjectName,
                        lastEdited: new Date().toISOString(),
                        xml,
                        preview: svg,
                        advancedDetails: additionalDetails
                    }, user.id, user.role);
                } catch (err) {
                    console.error('Error saving renamed project:', err);
                }
            };

            saveCurrentProject();
        }

        toast.success('Project renamed successfully!');
        
        // Refresh the file tree to show updated data
        refreshFileTree();
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

    // Add keyboard shortcut for Ctrl+S to save project
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if Ctrl+S is pressed and not in rename mode
            if ((event.ctrlKey || event.metaKey) && event.key === 's' && !isRenaming) {
                event.preventDefault(); // Prevent browser's default save behavior
                handleSaveProject();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [modeler, projectName, projectId, user, isRenaming, handleSaveProject]); // Add handleSaveProject to dependencies

    // Function to import JSON file
    const handleJsonImport = async (file: File) => {
        if (!modeler) return;

        try {
            setImportingFile(true);

            // Read the file
            const fileContent = await file.text();

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
            const fileContent = await file.text();

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

    // Enhanced import function that creates file in tree and saves to database
    const handleEnhancedImport = async (file: File, importType: 'json' | 'xml' | 'excel') => {
        if (!modeler || !user) {
            toast.error('Editor or user not available');
            return;
        }

        try {
            setImportingFile(true);
            toast.loading(`Importing ${importType.toUpperCase()} file...`, { id: 'importing' });

            let xmlContent = '';
            let fileName = file.name.replace(/\.[^/.]+$/, "");

            // Process the file based on type
            switch (importType) {
                case 'json':
                    const jsonResult = await processJsonImport(file);
                    xmlContent = jsonResult.xml;
                    fileName = jsonResult.fileName;
                    break;
                case 'xml':
                    const xmlResult = await processXmlImport(file);
                    xmlContent = xmlResult.xml;
                    fileName = xmlResult.fileName;
                    break;
                case 'excel':
                    const excelResult = await processExcelImport(file);
                    xmlContent = excelResult.xml;
                    fileName = excelResult.fileName;
                    break;
            }

            if (!xmlContent) {
                toast.error('Failed to process file', { id: 'importing' });
                setImportingFile(false);
                return;
            }

            // Import the XML into the modeler
            await modeler.importXML(xmlContent);
            
            // Update project name
            setProjectName(fileName);

            // Create new file in database and file tree
            await createImportedFile(fileName, xmlContent, file.name);

            toast.success(`${importType.toUpperCase()} file "${file.name}" imported and saved successfully!`, { id: 'importing' });

        } catch (error) {
            console.error(`Error importing ${importType} file:`, error);
            toast.error(`Failed to import ${importType.toUpperCase()} file`, { id: 'importing' });
        } finally {
            setImportingFile(false);
        }
    };

    // Process JSON import
    const processJsonImport = async (file: File): Promise<{ xml: string; fileName: string }> => {
        const fileContent = await file.text();
        const jsonData = JSON.parse(fileContent);
        let xmlContent = '';
        let fileName = file.name.replace(/\.[^/.]+$/, "");

        // Check if the JSON has the expected structure (from previous export)
        if (jsonData['bpmn:definitions']) {
            const { XMLBuilder } = require('fast-xml-parser');
            const builder = new XMLBuilder({
                attributeNamePrefix: '@_',
                textNodeName: '#text',
                ignoreAttributes: false,
                format: true,
                suppressEmptyNode: false
            });
            xmlContent = builder.build(jsonData);
            if (!xmlContent.startsWith('<?xml')) {
                xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent;
            }
        }
        // Check if this is a BPMN meta-model JSON (company format)
        else if (jsonData.name === "BPMN20" && jsonData.types && Array.isArray(jsonData.types)) {
            xmlContent = convertMetaModelToBPMN(jsonData);
        } else {
            throw new Error('Invalid JSON structure for BPMN diagram');
        }

        return { xml: xmlContent, fileName };
    };

    // Process XML import
    const processXmlImport = async (file: File): Promise<{ xml: string; fileName: string }> => {
        const xmlContent = await file.text();
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        return { xml: xmlContent, fileName };
    };

    // Process Excel import
    const processExcelImport = async (file: File): Promise<{ xml: string; fileName: string }> => {
        const data = await readExcelFile(file);
        if (!data || data.length === 0) {
            throw new Error('Excel file is empty or invalid');
        }

        let fileName = file.name.replace(/\.[^/.]+$/, "");
        let processName = fileName || 'Excel Generated Process';

        // Extract process name from the Excel data
        if (data.length > 0) {
            const nameColumns = ['process_name', 'Process_name', 'ProcessName', 'process name',
                'Process Name', 'process', 'Process'];

            for (const column of nameColumns) {
                if (data[0][column] && typeof data[0][column] === 'string') {
                    const value = data[0][column];
                    if (data.every(row => row[column] === value)) {
                        processName = value;
                        break;
                    }
                }
            }
        }

        const xmlContent = convertExcelToBpmn(data, fileName);
        return { xml: xmlContent, fileName: processName };
    };

    // Create imported file in database and file tree
    const createImportedFile = async (fileName: string, xmlContent: string, originalFileName: string) => {
        if (!user) return;

        try {
            // Create the file using the BPMN node API (this creates it in the file tree)
            const request: CreateNodeRequest = {
                userId: user.id,
                type: 'file',
                name: fileName,
                content: xmlContent,
                processMetadata: {
                    processName: fileName,
                    description: `Imported from ${originalFileName}`,
                    processOwner: '',
                    processManager: '',
                },
                advancedDetails: {
                    versionNo: '1.0.0',
                    processStatus: '',
                    classification: '',
                    dateOfCreation: getCurrentDateTimeString(), // Actual creation time
                    dateOfReview: '',
                    effectiveDate: '',
                    modificationDate: getCurrentDateTimeString(), // Initial modification time
                    modifiedBy: getUserDisplayName(user), // Initial modifier
                    changeDescription: 'Initial file creation from import',
                    createdBy: getUserDisplayName(user), // Actual creator
                }
            };

            // Create the file in the file tree
            const newNode = await createBpmnNode(request);
            
            // Update current project state
            setProjectId(newNode.id);
            
            // Refresh file tree to show the new file
            refreshFileTree();
            
            console.log('Imported file created successfully:', fileName);
        } catch (error) {
            console.error('Error creating imported file:', error);
            throw error;
        }
    };

    // Handle Excel import (legacy - keeping for compatibility)
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

    // Enhanced file upload function that creates file in tree and saves to database
    const handleFileUpload = async (file: File, fileType: 'bpmn' | 'json' | 'excel') => {
        if (!user) {
            toast.error('User not available');
            return;
        }

        try {
            toast.loading(`Uploading ${fileType.toUpperCase()} file...`, { id: 'uploading' });

            let xmlContent = '';
            let fileName = file.name.replace(/\.[^/.]+$/, "");

            // Process the file based on type
            switch (fileType) {
                case 'bpmn':
                    // Read as text and treat as BPMN XML (no conversion needed)
                    xmlContent = await file.text();
                    break;
                case 'json':
                    const jsonResult = await processJsonImport(file);
                    xmlContent = jsonResult.xml;
                    fileName = jsonResult.fileName;
                    break;
                case 'excel':
                    const excelResult = await processExcelImport(file);
                    xmlContent = excelResult.xml;
                    fileName = excelResult.fileName;
                    break;
            }

            if (!xmlContent) {
                toast.error('Failed to process file', { id: 'uploading' });
                return;
            }

            // Create new file in database and file tree
            await createImportedFile(fileName, xmlContent, file.name);

            toast.success(`${fileType.toUpperCase()} file "${file.name}" uploaded and saved successfully!`, { id: 'uploading' });

        } catch (error) {
            console.error(`Error uploading ${fileType} file:`, error);
            toast.error(`Failed to upload ${fileType.toUpperCase()} file`, { id: 'uploading' });
        }
    };

    // Handle Generate LaTeX File
    const handleGenerateLatex = async () => {
        if (!modeler || !user) {
            toast.error('Please ensure you are logged in and the editor is loaded');
            return;
        }

        // Show the LaTeX generation popup instead of directly generating
        setShowLatexPopup(true);
    };

    const handleGenerateLatexWithOptions = async () => {
        if (!modeler || !user) {
            toast.error('Please ensure you are logged in and the editor is loaded');
            return;
        }

        setGeneratingLatex(true);
        
        try {
            // Get current BPMN XML
            const { xml } = await modeler.saveXML({ format: true });
            
            // Use the current project name from state, or get from API if available
            let fileName = projectName;
            let currentProcessMetadata = processMetadata;
            
            // If we have a projectId, try to get the latest metadata from API
            if (projectId) {
                const currentProject = await getProjectByIdFromAPI(projectId);
                if (currentProject) {
                    fileName = currentProject.name;
                    currentProcessMetadata = currentProject.processMetadata || processMetadata;
                }
            }
            
            // Fallback to untitled if no name is set
            if (!fileName || fileName === 'Untitled Diagram') {
                fileName = 'untitled_diagram';
            }
            
            console.log('Generating LaTeX from BPMN:', { fileName, hasMetadata: !!currentProcessMetadata });
            
            // Convert BPMN to LaTeX with table options and data
            const latexContent = convertBpmnToLatex(
                xml, 
                fileName, 
                currentProcessMetadata,
                latexTableOptions,
                signOffData,
                historyData,
                triggerData,
                additionalDetails
            );
            
            // Create LaTeX project
            const latexProject: LatexProject = {
                id: `latex-${Date.now()}`,
                name: `${fileName}.tex`,
                content: latexContent,
                lastEdited: new Date().toISOString().split('T')[0],
                createdBy: user.id,
                role: user.role
            };
            
            console.log('Generated LaTeX project:', latexProject);
            
            // Save to database first
            const saveSuccess = await saveLatexProjectToAPI(latexProject, user.id, user.role);
            
            if (!saveSuccess) {
                console.log('Failed to save to database, saving locally only');
                // Fallback to local storage only
                saveLatexProject(latexProject, user.id, user.role);
                
                // Still update the file tree locally
                const savedTree = getLatexFileTree(user.id, user.role);
                const newFileNode: FileTreeNode = {
                    id: latexProject.id,
                    name: latexProject.name,
                    type: 'file' as const,
                    projectData: latexProject,
                    path: latexProject.name
                };
                const updatedTree = [...savedTree, newFileNode];
                saveLatexFileTree(updatedTree, user.id, user.role);
                
                toast.success(`LaTeX file generated and saved locally: ${latexProject.name}`, {
                    duration: 4000,
                    position: 'bottom-right'
                });
            } else {
                console.log('Successfully saved to database');
                // Also save to localStorage for backward compatibility
                saveLatexProject(latexProject, user.id, user.role);
                
                // Add the new file to the hierarchical tree structure
                try {
                    const newNodeResponse = await fetch('/api/latex-nodes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            type: 'file',
                            name: latexProject.name,
                            parentId: null, // Add to root level
                            content: latexProject.content,
                            documentMetadata: {
                                title: latexProject.name,
                                author: user.name || user.email || '',
                                description: '',
                                tags: [],
                            }
                        })
                    });
                    
                    if (newNodeResponse.ok) {
                        console.log('File added to hierarchical tree successfully');
                    } else {
                        console.log('Failed to add file to hierarchical tree');
                        const errorText = await newNodeResponse.text();
                        console.error('Tree update error:', errorText);
                    }
                } catch (error) {
                    console.error('Error adding file to hierarchical tree:', error);
                }
                
                // Show success message
                toast.success(`LaTeX file generated and saved to database: ${latexProject.name}`, {
                    duration: 4000,
                    position: 'bottom-right'
                });
            }
            
            // Open the LaTeX editor with the generated content
            router.push(`/latex-advanced?content=${encodeURIComponent(latexContent)}&fileName=${encodeURIComponent(latexProject.name)}`);
            
        } catch (error) {
            console.error('Error generating LaTeX file:', error);
            toast.error('Failed to generate LaTeX file. Please try again.');
        } finally {
            setGeneratingLatex(false);
        }
    };

    // Function to create a new file with proper metadata
    const createNewFileWithMetadata = async (fileName: string) => {
        if (!modeler || !user) return;

        try {
            setIsSaving(true);

            // Get the current XML
            const { xml } = await modeler.saveXML({ format: true });
            const { svg } = await modeler.saveSVG();

            // Create a new project with empty metadata
            const newProjectId = uuidv4();
            const newProject: BpmnProject = {
                id: newProjectId,
                name: fileName,
                lastEdited: new Date().toISOString(),
                createdBy: getUserDisplayName(user),
                role: user.role,
                xml,
                preview: svg,
                processMetadata: {
                    processName: '',
                    description: '',
                    processOwner: '',
                    processManager: '',
                },
                signOffData: {
                    responsibility: '',
                    date: '',
                    name: '',
                    designation: '',
                    signature: ''
                },
                historyData: {
                    versionNo: '',
                    date: '',
                    statusRemarks: '',
                    author: ''
                },
                triggerData: {
                    triggers: '',
                    inputs: '',
                    outputs: ''
                },
                advancedDetails: {
                    versionNo: '1.0.0',
                    processStatus: '',
                    classification: '',
                    dateOfCreation: getCurrentDateTimeString(), // Actual creation time
                    dateOfReview: '',
                    effectiveDate: '',
                    modificationDate: getCurrentDateTimeString(), // Initial modification time
                    modifiedBy: getUserDisplayName(user), // Initial modifier
                    changeDescription: 'Initial file creation',
                    createdBy: getUserDisplayName(user), // Actual creator
                }
            };

            // Create the file using the BPMN node API
            const request: CreateNodeRequest = {
                userId: user.id,
                type: 'file',
                name: fileName,
                content: xml,
                processMetadata: {
                    processName: '',
                    description: '',
                    processOwner: '',
                    processManager: '',
                },
                signOffData: {
                    responsibility: '',
                    date: '',
                    name: '',
                    designation: '',
                    signature: ''
                },
                historyData: {
                    versionNo: '',
                    date: '',
                    statusRemarks: '',
                    author: ''
                },
                triggerData: {
                    triggers: '',
                    inputs: '',
                    outputs: ''
                },
                advancedDetails: {
                    versionNo: '1.0.0',
                    processStatus: '',
                    classification: '',
                    dateOfCreation: getCurrentDateTimeString(), // Actual creation time
                    dateOfReview: '',
                    effectiveDate: '',
                    modificationDate: getCurrentDateTimeString(), // Initial modification time
                    modifiedBy: getUserDisplayName(user), // Initial modifier
                    changeDescription: 'Initial file creation',
                    createdBy: getUserDisplayName(user), // Actual creator
                }
            };

            const newNode = await createBpmnNode(request);
            
            // Update the current project state
            setProjectId(newNode.id);
            setProjectName(fileName);
            
            // Reset metadata to empty
            const emptyMetadata = {
                processName: '',
                description: '',
                processOwner: '',
                processManager: '',
            };
            setProcessMetadata(emptyMetadata);
            setTableFormData(emptyMetadata);

            // Create the file in the file tree
            if (onCreateFileFromEditor) {
                const newProject: BpmnProject = {
                    id: newNode.id,
                    name: newNode.name,
                    content: newNode.content || '',
                    processMetadata: newNode.processMetadata || emptyMetadata,
                    advancedDetails: newNode.advancedDetails,
                };
                await onCreateFileFromEditor(newProject);
            }

            toast.success(`File "${fileName}" created successfully!`);
        } catch (err) {
            console.error('Error creating new file:', err);
            toast.error('Failed to create file');
        } finally {
            setIsSaving(false);
        }
    };

    // Add handlers for additional details
    const handleToggleAdditionalDetailsEdit = () => {
        if (!isEditingAdditionalDetails) {
            // When entering edit mode, save current additional details as backup
            setAdditionalDetailsBackup({ ...additionalDetails });
        }
        setIsEditingAdditionalDetails(!isEditingAdditionalDetails);
    };

    const handleSaveAdditionalDetails = async () => {
        if (!user || !projectId) {
            toast.error('No project selected');
            return;
        }

        try {
            // Update version for advanced details change
            updateVersionAndModificationDetails('advanced', 'Advanced details modified');
            
            // Get the updated additional details after the version update
            const updatedAdditionalDetails = {
                ...additionalDetails,
                versionNo: autoIncrementVersion(additionalDetails.versionNo, 'advanced'),
                modificationDate: getCurrentDateTimeString(),
                modifiedBy: getUserDisplayName(user),
                changeDescription: createChangeDescription('advanced', 'Advanced details modified')
            };
            
            console.log('Saving additional details:', updatedAdditionalDetails);
            setIsEditingAdditionalDetails(false);
            
            // Save to database with updated details
            await updateBpmnNode({
                nodeId: projectId,
                userId: user.id,
                advancedDetails: updatedAdditionalDetails
            });
            
            toast.success('Additional details saved successfully!');
        } catch (error) {
            console.error('Error saving additional details:', error);
            toast.error('Failed to save additional details');
        }
    };

    const handleCancelAdditionalDetails = () => {
        setAdditionalDetails(additionalDetailsBackup);
        setIsEditingAdditionalDetails(false);
    };

    // Save handlers for individual table data
    const handleSaveSignOffData = async () => {
        console.log('Saving Sign Off Data:', { projectId, user, signOffData });
        
        if (!projectId || !user) {
            toast.error('No project selected or user not logged in');
            return;
        }

        try {
            // Update version for table data change
            updateVersionAndModificationDetails('tables', `Updated sign off data: ${signOffData.responsibility || 'Sign off data modified'}`);
            
            const requestBody = {
                nodeId: projectId,
                userId: user.id,
                signOffData: signOffData,
                advancedDetails: additionalDetails
            };
            
            console.log('Sending request:', requestBody);
            
            const response = await fetch('/api/bpmn-nodes', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('Response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Save successful:', result);
                toast.success('Sign OFF data saved successfully!');
            } else {
                const errorText = await response.text();
                console.error('Save failed:', errorText);
                toast.error('Failed to save Sign OFF data');
            }
        } catch (error) {
            console.error('Error saving Sign OFF data:', error);
            toast.error('Failed to save Sign OFF data');
        }
    };

    const handleSaveHistoryData = async () => {
        console.log('Saving History Data:', { projectId, user, historyData });
        
        if (!projectId || !user) {
            toast.error('No project selected or user not logged in');
            return;
        }

        try {
            // Update version for table data change
            updateVersionAndModificationDetails('tables', `Updated history data: ${historyData.statusRemarks || 'History data modified'}`);
            
            const requestBody = {
                nodeId: projectId,
                userId: user.id,
                historyData: historyData,
                advancedDetails: additionalDetails
            };
            
            console.log('Sending request:', requestBody);
            
            const response = await fetch('/api/bpmn-nodes', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('Response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Save successful:', result);
                toast.success('History data saved successfully!');
            } else {
                const errorText = await response.text();
                console.error('Save failed:', errorText);
                toast.error('Failed to save History data');
            }
        } catch (error) {
            console.error('Error saving History data:', error);
            toast.error('Failed to save History data');
        }
    };

    const handleSaveTriggerData = async () => {
        console.log('Saving Trigger Data:', { projectId, user, triggerData });
        
        if (!projectId || !user) {
            toast.error('No project selected or user not logged in');
            return;
        }

        try {
            // Update version for table data change
            updateVersionAndModificationDetails('tables', `Updated trigger data: ${triggerData.triggers || 'Trigger data modified'}`);
            
            const requestBody = {
                nodeId: projectId,
                userId: user.id,
                triggerData: triggerData,
                advancedDetails: additionalDetails
            };
            
            console.log('Sending request:', requestBody);
            
            const response = await fetch('/api/bpmn-nodes', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('Response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Save successful:', result);
                toast.success('Trigger data saved successfully!');
            } else {
                const errorText = await response.text();
                console.error('Save failed:', errorText);
                toast.error('Failed to save Trigger data');
            }
        } catch (error) {
            console.error('Error saving Trigger data:', error);
            toast.error('Failed to save Trigger data');
        }
    };

    return (
        <div className="flex h-full relative">
            {/* File Tree Sidebar - Left Side */}
            {showFileTree && !sidebarCollapsed && (
                <div className="relative w-64 flex-shrink-0 bg-white border-r order-first">
                    <BpmnFileTree
                        key={fileTreeRefreshTrigger}
                        user={user}
                        onProjectSelect={handleProjectSelect}
                        onNewProject={handleNewProject}
                        onFileUpload={handleFileUpload}
                        currentProjectId={projectId}
                        onCreateFileFromEditor={handleCreateFileFromEditor}
                    />
                    {/* Collapse Arrow */}
                    <button
                        onClick={() => setSidebarCollapsed(true)}
                        className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full shadow p-1 z-10 hover:bg-gray-100"
                        title="Collapse Sidebar"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
            )}
            {/* Expand Arrow when sidebar is collapsed */}
            {sidebarCollapsed && (
                <div className="absolute top-1/2 left-0 z-20 flex flex-col items-center" style={{ transform: 'translateY(-50%)' }}>
                    <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 shadow-md px-3 py-4" style={{ minWidth: 48 }}>
                        <button
                            className="flex items-center justify-center w-8 h-8 rounded focus:outline-none hover:bg-gray-100 mb-2"
                            onClick={() => setSidebarCollapsed(false)}
                            aria-label="Expand sidebar"
                        >
                            <HiFolder className="w-7 h-7 text-gray-500" />
                        </button>
                        <button
                            className="flex items-center justify-center w-6 h-6 rounded focus:outline-none hover:bg-gray-100"
                            onClick={() => setSidebarCollapsed(false)}
                            aria-label="Expand sidebar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Table Pane Sidebar - Right Side */}
            {showTablePane && !tablePaneCollapsed && (
                <div className="relative w-80 flex-shrink-0 bg-white border-l border-gray-200 order-last">
                    <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Process Details</h3>
                            <button
                                onClick={() => setTablePaneCollapsed(true)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                title="Collapse Table Pane"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Process Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    1. Process Name
                                </label>
                                {isEditingProcessDetails ? (
                                <input
                                    type="text"
                                    value={tableFormData.processName}
                                    onChange={(e) => setTableFormData(prev => ({ ...prev, processName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter process name"
                                />
                                ) : (
                                    <div className="text-gray-700 min-h-[24px] flex items-center">
                                        {tableFormData.processName || 'No process name entered'}
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    2. Description
                                </label>
                                {isEditingProcessDetails ? (
                                <textarea
                                    value={tableFormData.description}
                                    onChange={(e) => setTableFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter description"
                                    rows={3}
                                />
                                ) : (
                                    <div className="text-gray-700 min-h-[24px] whitespace-pre-wrap">
                                        {tableFormData.description || 'No description entered'}
                                    </div>
                                )}
                            </div>

                            {/* Process Owner */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    3. Process Owner
                                </label>
                                {isEditingProcessDetails ? (
                                <textarea
                                    value={tableFormData.processOwner}
                                    onChange={(e) => setTableFormData(prev => ({ ...prev, processOwner: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter process owner"
                                    rows={4}
                                />
                                ) : (
                                    <div className="text-gray-700 min-h-[24px] whitespace-pre-wrap">
                                        {tableFormData.processOwner || 'No process owner entered'}
                                    </div>
                                )}
                            </div>

                            {/* Process Manager */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    4. Process Manager
                                </label>
                                {isEditingProcessDetails ? (
                                <textarea
                                    value={tableFormData.processManager}
                                    onChange={(e) => setTableFormData(prev => ({ ...prev, processManager: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter process manager"
                                    rows={3}
                                />
                                ) : (
                                    <div className="text-gray-700 min-h-[24px] whitespace-pre-wrap">
                                        {tableFormData.processManager || 'No process manager entered'}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-2 pt-4">
                                {isEditingProcessDetails ? (
                                    <>
                                <button
                                            onClick={handleSaveProcessDetails}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    Save
                                </button>
                                <button
                                            onClick={handleCancelProcessDetails}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Cancel
                                </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleToggleProcessDetailsEdit}
                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Advanced Details Section */}
                        <div className="border-t border-gray-200 pt-6 mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800">Advanced Details</h3>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Version No */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        1. Version No
                                    </label>
                                    <div className="text-gray-700 min-h-[24px] flex items-center bg-gray-50 px-3 py-2 rounded-md">
                                        {additionalDetails.versionNo}
                                    </div>
                                </div>

                                {/* Process Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        2. Process Status
                                    </label>
                                    {isEditingAdditionalDetails ? (
                                        <select
                                            value={additionalDetails.processStatus}
                                            onChange={(e) => setAdditionalDetails(prev => ({ ...prev, processStatus: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Status</option>
                                            <option value="draft">Draft</option>
                                            <option value="review">Under Review</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    ) : (
                                        <div className="text-gray-700 min-h-[24px] flex items-center">
                                            {additionalDetails.processStatus || 'No status selected'}
                                        </div>
                                    )}
                                </div>

                                {/* Classification */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        3. Classification
                                    </label>
                                    {isEditingAdditionalDetails ? (
                                        <select
                                            value={additionalDetails.classification}
                                            onChange={(e) => setAdditionalDetails(prev => ({ ...prev, classification: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Classification</option>
                                            <option value="public">Public</option>
                                            <option value="internal">Internal</option>
                                            <option value="confidential">Confidential</option>
                                            <option value="restricted">Restricted</option>
                                        </select>
                                    ) : (
                                        <div className="text-gray-700 min-h-[24px] flex items-center">
                                            {additionalDetails.classification || 'No classification selected'}
                                        </div>
                                    )}
                                </div>

                                {/* Date of Creation */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        4. Date of Creation
                                    </label>
                                    <div className="text-gray-700 min-h-[24px] flex items-center bg-gray-50 px-3 py-2 rounded-md">
                                        {formatDateForDisplay(additionalDetails.dateOfCreation)}
                                    </div>
                                </div>

                                {/* Date of Review */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        5. Date of Review
                                    </label>
                                    <div className="text-gray-700 min-h-[24px] flex items-center bg-gray-50 px-3 py-2 rounded-md">
                                        {additionalDetails.dateOfReview || 'Not reviewed yet'}
                                    </div>
                                </div>

                                {/* Effective Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        6. Effective Date
                                    </label>
                                    {isEditingAdditionalDetails ? (
                                        <input
                                            type="date"
                                            value={additionalDetails.effectiveDate}
                                            onChange={(e) => setAdditionalDetails(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            title="Select effective date (no time component)"
                                        />
                                    ) : (
                                        <div className="text-gray-700 min-h-[24px] flex items-center">
                                            {additionalDetails.effectiveDate ? formatDateOnlyForDisplay(additionalDetails.effectiveDate) : 'No effective date set'}
                                        </div>
                                    )}
                                </div>

                                {/* Modification Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        7. Modification Date
                                    </label>
                                    <div className="text-gray-700 min-h-[24px] flex items-center bg-gray-50 px-3 py-2 rounded-md">
                                        {formatDateForDisplay(additionalDetails.modificationDate)}
                                    </div>
                                </div>

                                {/* Modified By */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        8. Modified By
                                    </label>
                                    <div className="text-gray-700 min-h-[24px] flex items-center bg-gray-50 px-3 py-2 rounded-md">
                                        {additionalDetails.modifiedBy || 'Not modified yet'}
                                    </div>
                                </div>

                                {/* Change Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        9. Change Description
                                    </label>
                                    <div className="text-gray-700 min-h-[24px] whitespace-pre-wrap bg-gray-50 px-3 py-2 rounded-md">
                                        {additionalDetails.changeDescription || 'No change description entered'}
                                    </div>
                                </div>

                                {/* Created By */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        10. Created By
                                    </label>
                                    <div className="text-gray-700 min-h-[24px] flex items-center bg-gray-50 px-3 py-2 rounded-md">
                                        {additionalDetails.createdBy || 'Not specified'}
                                    </div>
                                </div>

                                {/* Action Buttons for Additional Details */}
                                <div className="flex space-x-2 pt-4">
                                    {isEditingAdditionalDetails ? (
                                        <>
                                            <button
                                                onClick={handleSaveAdditionalDetails}
                                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelAdditionalDetails}
                                                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleToggleAdditionalDetailsEdit}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Collapse Arrow - Left side of the right pane */}
                    <button
                        onClick={() => setTablePaneCollapsed(true)}
                        className="absolute top-1/2 -left-3 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full shadow p-1 z-10 hover:bg-gray-100"
                        title="Collapse Table Pane"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l7-7-7-7" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Expand Arrow when table pane is collapsed */}
            {tablePaneCollapsed && (
                <div className="absolute top-1/2 right-0 z-20 flex flex-col items-center" style={{ transform: 'translateY(-50%)' }}>
                    <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 shadow-md px-3 py-4" style={{ minWidth: 48 }}>
                        <button
                            className="flex items-center justify-center w-8 h-8 rounded focus:outline-none hover:bg-gray-100 mb-2"
                            onClick={() => setTablePaneCollapsed(false)}
                            aria-label="Expand table pane"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                            </svg>
                        </button>
                        <button
                            className="flex items-center justify-center w-6 h-6 rounded focus:outline-none hover:bg-gray-100"
                            onClick={() => setTablePaneCollapsed(false)}
                            aria-label="Expand table pane"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Editor Container - Middle */}
            <div className={`flex flex-1 flex-col min-w-0 overflow-hidden order-2${sidebarCollapsed ? ' ml-14' : ''}${tablePaneCollapsed ? ' mr-14' : ''}`}>
                {/* Toolbar with icons */}
                <div className="bg-white border-b px-2 py-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    {/* Project name (display only, no rename) */}
                    <div className="text-gray-700 font-medium ml-2 flex items-center overflow-hidden">
                            <div className="flex items-center truncate max-w-md">
                                <span className="mr-2 truncate">
                                    {projectName}
                                    {projectId ? ` (ID: ${projectId})` : ''}
                                </span>
                            </div>
                    </div>

                    <div className="h-6 border-l border-gray-300 mx-1"></div>

                    {/* Middle section buttons */}
                    <div className="flex items-center space-x-4 flex-grow">

                        {/* Import Dropdown */}
                        <div className="relative import-dropdown">
                            <button
                                onClick={toggleImportDropdown}
                                disabled={importingFile}
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 whitespace-nowrap min-w-[140px] ${
                                    importingFile 
                                        ? 'bg-orange-100 border-orange-200 text-orange-400 cursor-not-allowed' 
                                        : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300 focus:ring-orange-500 shadow-sm'
                                }`}
                                title="Import Diagram"
                            >
                                {importingFile ? (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <span className="ml-2 font-medium text-sm">Import</span>
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
                                                        handleEnhancedImport(file, 'json');
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
                                                        handleEnhancedImport(file, 'xml');
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
                                                        handleEnhancedImport(file, 'excel');
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
                            className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 whitespace-nowrap min-w-[140px] ${
                                downloading 
                                    ? 'bg-green-100 border-green-200 text-green-400 cursor-not-allowed' 
                                    : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 focus:ring-green-500 shadow-sm'
                            }`}
                            title="Save Project (Ctrl+S)"
                        >
                            {downloading ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                                    </svg>
                                    <span className="ml-1 font-medium text-sm">Save</span>
                                </div>
                            )}
                        </button>
                        
                        {/* Save status indicator */}
                        {isSaving && (
                            <div className="flex items-center text-green-600 text-sm">
                                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-1"></div>
                                <span>Saving...</span>
                            </div>
                        )}

                        <div className="h-6 border-l border-gray-300 mx-1"></div>

                        {/* Export Dropdown */}
                        <div className="relative export-dropdown">
                            <button
                                onClick={toggleExportDropdown}
                                disabled={exportingFile}
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 whitespace-nowrap min-w-[140px] ${
                                    exportingFile 
                                        ? 'bg-blue-100 border-blue-200 text-blue-400 cursor-not-allowed' 
                                        : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 focus:ring-blue-500 shadow-sm'
                                }`}
                                title="Export Diagram"
                            >
                                {exportingFile ? (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
                            className="inline-flex items-center justify-center p-1 rounded focus:outline-none"
                            title="Zoom In"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                        </button>

                        {/* Zoom Out */}
                        <button
                            onClick={() => modeler?.get('canvas').zoom(modeler.get('canvas').zoom() - 0.1)}
                            className="inline-flex items-center justify-center p-1 rounded focus:outline-none"
                            title="Zoom Out"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                            </svg>
                        </button>

                        {/* Fit to View */}
                        <button
                            onClick={() => modeler?.get('canvas').zoom('fit-viewport')}
                            className="inline-flex items-center justify-center p-1 rounded focus:outline-none"
                            title="Fit to View"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                            </svg>
                        </button>
                    </div>

                    {/* Right-side action buttons with fixed width */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* View Diagram */}
                        <button
                            onClick={handleOpenViewer}
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 whitespace-nowrap min-w-[140px] bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 focus:ring-purple-500 shadow-sm"
                            title="View Diagram"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="font-medium">View Diagram</span>
                        </button>
                        {/* Generate LaTeX File Button */}
                        <button
                            onClick={handleGenerateLatex}
                            disabled={generatingLatex}
                            className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 whitespace-nowrap min-w-[140px] ${
                                generatingLatex 
                                    ? 'bg-yellow-100 border-yellow-200 text-yellow-400 cursor-not-allowed opacity-50' 
                                    : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300 focus:ring-yellow-500 shadow-sm'
                            }`}
                            title="Generate LaTeX File"
                        >
                            {generatingLatex ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="font-medium">Generating...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-8a2 2 0 00-2-2H7a2 2 0 00-2 2v8" />
                                    </svg>
                                    <span className="font-medium">Generate LaTeX File</span>
                                </>
                            )}
                        </button>

                        {/* Send for Approval - only show for regular users */}
                        {user && user.role === 'user' && (
                            <button
                                onClick={handleSendForApproval}
                                disabled={sendingForApproval}
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 whitespace-nowrap min-w-[140px] ${
                                    sendingForApproval 
                                        ? 'bg-green-100 border-green-200 text-green-400 cursor-not-allowed opacity-50' 
                                        : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 focus:ring-green-500 shadow-sm'
                                }`}
                                title="Send for Approval"
                            >
                                {sendingForApproval ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="font-medium">Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        <span className="font-medium">Send for Approval</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Main container with editor */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Editor Container */}
                    <div
                        ref={containerRef}
                        className="flex-1 min-w-0 bg-white relative"
                        style={{ 
                            height: 'calc(100vh - 140px)',
                            minHeight: '500px',
                            display: 'block',
                            position: 'relative'
                        }}
                    />
                </div>

                {/* BPMN Viewer Modal */}
                {showViewer && (
                    <BpmnViewerComponent
                        diagramXML={currentDiagramXML}
                        onClose={() => setShowViewer(false)}
                        title={`BPMN Viewer: ${projectName}`}
                        projectId={projectId === null ? undefined : projectId}
                        userId={user?.id}
                        userRole={user?.role}
                    />
                )}

                {/* Add the duplicate warning modal */}
                <DuplicateWarningModal
                    isOpen={showDuplicateWarning}
                    onClose={handleCancelSubmission}
                    onProceed={handleProceedWithSubmission}
                    duplicateInfo={duplicateInfo}
                    projectNameMatch={projectNameMatch}
                />

                {/* LaTeX Generation Popup Modal */}
                {showLatexPopup && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-overlay">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden relative modal-content">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900">Generate LaTeX Document</h2>
                                <button
                                    onClick={() => setShowLatexPopup(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex h-[calc(90vh-140px)]">
                                {/* Left Side - Options */}
                                <div className="w-1/3 p-6 border-r border-gray-200 bg-gray-50">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Options</h3>
                                    
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setSelectedLeftOption('tables')}
                                            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                                                selectedLeftOption === 'tables'
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="text-sm font-medium">Tables to Include</span>
                                        </button>
                                        
                                        <button
                                            onClick={() => setSelectedLeftOption('signoff')}
                                            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                                                selectedLeftOption === 'signoff'
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="text-sm font-medium">Sign OFF Table</span>
                                        </button>
                                        
                                        <button
                                            onClick={() => setSelectedLeftOption('history')}
                                            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                                                selectedLeftOption === 'history'
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="text-sm font-medium">History Table</span>
                                        </button>
                                        
                                        <button
                                            onClick={() => setSelectedLeftOption('trigger')}
                                            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                                                selectedLeftOption === 'trigger'
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="text-sm font-medium">Trigger Table</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Right Side - Dynamic Content */}
                                <div className="w-2/3 p-6 overflow-y-auto">
                                    {selectedLeftOption === 'tables' && (
                                        <div className="space-y-6">
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Tables to Include</h3>
                                            
                                            <div className="p-4 border border-gray-200 rounded-lg">
                                                {!isAnyTableSelected && (
                                                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                                        <p className="text-sm text-yellow-800">
                                                            ⚠️ Please select at least one table to include in the LaTeX document.
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={latexTableOptions.processTable}
                                                            onChange={(e) => setLatexTableOptions(prev => ({
                                                                ...prev,
                                                                processTable: e.target.checked
                                                            }))}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm font-medium text-gray-700">Process Table</span>
                                                    </label>
                                                    
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={latexTableOptions.processDetailsTable}
                                                            onChange={(e) => setLatexTableOptions(prev => ({
                                                                ...prev,
                                                                processDetailsTable: e.target.checked
                                                            }))}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm font-medium text-gray-700">Process Details Table</span>
                                                    </label>
                                                    
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={latexTableOptions.signOffTable}
                                                            onChange={(e) => setLatexTableOptions(prev => ({
                                                                ...prev,
                                                                signOffTable: e.target.checked
                                                            }))}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm font-medium text-gray-700">Sign OFF Table</span>
                                                    </label>
                                                    
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={latexTableOptions.historyTable}
                                                            onChange={(e) => setLatexTableOptions(prev => ({
                                                                ...prev,
                                                                historyTable: e.target.checked
                                                            }))}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm font-medium text-gray-700">History Table</span>
                                                    </label>
                                                    
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={latexTableOptions.triggerTable}
                                                            onChange={(e) => setLatexTableOptions(prev => ({
                                                                ...prev,
                                                                triggerTable: e.target.checked
                                                            }))}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm font-medium text-gray-700">Trigger Table</span>
                                                    </label>
                                                </div>
                                            </div>
                                            
                                            {/* Action Buttons - Positioned within Tables to Include section */}
                                            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                                                <button
                                                    onClick={() => setShowLatexPopup(false)}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleGenerateLatexWithOptions}
                                                    disabled={generatingLatex || !isAnyTableSelected}
                                                    className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                                                        generatingLatex || !isAnyTableSelected 
                                                            ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                                                            : 'bg-blue-600 hover:bg-blue-700'
                                                    }`}
                                                >
                                                    {generatingLatex ? 'Generating...' : 'Generate LaTeX'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {selectedLeftOption === 'signoff' && (
                                        <div className="space-y-6">
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Sign OFF Table Configuration</h3>
                                            
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <h4 className="text-md font-medium text-gray-900 mb-3">Sign OFF Table</h4>
                                                
                                                {/* Table Header */}
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full border border-gray-300">
                                                        <thead>
                                                            <tr className="bg-gray-50">
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Responsibility</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Designation</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Signature</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={signOffData.responsibility}
                                                                        onChange={(e) => setSignOffData(prev => ({
                                                                            ...prev,
                                                                            responsibility: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter responsibility"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="date"
                                                                        value={signOffData.date}
                                                                        onChange={(e) => setSignOffData(prev => ({
                                                                            ...prev,
                                                                            date: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={signOffData.name}
                                                                        onChange={(e) => setSignOffData(prev => ({
                                                                            ...prev,
                                                                            name: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter name"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={signOffData.designation}
                                                                        onChange={(e) => setSignOffData(prev => ({
                                                                            ...prev,
                                                                            designation: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter designation"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={signOffData.signature}
                                                                        onChange={(e) => setSignOffData(prev => ({
                                                                            ...prev,
                                                                            signature: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter signature"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                
                                                {/* Save Button */}
                                                <div className="mt-4 flex justify-end">
                                                    <button
                                                        onClick={handleSaveSignOffData}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                                    >
                                                        Save Sign OFF Data
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {selectedLeftOption === 'history' && (
                                        <div className="space-y-6">
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">History Table Configuration</h3>
                                            
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <h4 className="text-md font-medium text-gray-900 mb-3">History Table</h4>
                                                
                                                {/* Table Header */}
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full border border-gray-300">
                                                        <thead>
                                                            <tr className="bg-gray-50">
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Version No</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Status/Remarks</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Author</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={historyData.versionNo}
                                                                        onChange={(e) => setHistoryData(prev => ({
                                                                            ...prev,
                                                                            versionNo: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter version number"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="date"
                                                                        value={historyData.date}
                                                                        onChange={(e) => setHistoryData(prev => ({
                                                                            ...prev,
                                                                            date: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={historyData.statusRemarks}
                                                                        onChange={(e) => setHistoryData(prev => ({
                                                                            ...prev,
                                                                            statusRemarks: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter status or remarks"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={historyData.author}
                                                                        onChange={(e) => setHistoryData(prev => ({
                                                                            ...prev,
                                                                            author: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter author"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                
                                                {/* Save Button */}
                                                <div className="mt-4 flex justify-end">
                                                    <button
                                                        onClick={handleSaveHistoryData}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                                    >
                                                        Save History Data
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {selectedLeftOption === 'trigger' && (
                                        <div className="space-y-6">
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Trigger Table Configuration</h3>
                                            
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <h4 className="text-md font-medium text-gray-900 mb-3">Trigger Table</h4>
                                                
                                                {/* Table Header */}
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full border border-gray-300">
                                                        <thead>
                                                            <tr className="bg-gray-50">
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Triggers</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Inputs</th>
                                                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Outputs</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={triggerData.triggers}
                                                                        onChange={(e) => setTriggerData(prev => ({
                                                                            ...prev,
                                                                            triggers: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter triggers"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={triggerData.inputs}
                                                                        onChange={(e) => setTriggerData(prev => ({
                                                                            ...prev,
                                                                            inputs: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter inputs"
                                                                    />
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={triggerData.outputs}
                                                                        onChange={(e) => setTriggerData(prev => ({
                                                                            ...prev,
                                                                            outputs: e.target.value
                                                                        }))}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        placeholder="Enter outputs"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                
                                                {/* Save Button */}
                                                <div className="mt-4 flex justify-end">
                                                    <button
                                                        onClick={handleSaveTriggerData}
                                                        className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                                    >
                                                        Save Trigger Data
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    

                                </div>
                            </div>


                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BpmnEditor; 