'use client';

import React, { useState, useEffect } from 'react';
import { 
    FaHistory, 
    FaUndo, 
    FaEye, 
    FaTimes, 
    FaCheck, 
    FaClock,
    FaUser,
    FaFileAlt,
    FaPlus,
    FaMinus,
    FaEdit,
    FaCode,
    FaEyeSlash
} from 'react-icons/fa';
import { LatexVersion, getLatexProjectVersions, revertToLatexVersion, formatTimestamp, getChangeDescription, compareLatexVersions } from '../utils/latexVersions';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ChangesTrackerProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onRevert: (content: string) => void;
    currentContent: string;
    userId?: string;
    userRole?: string;
}

const ChangesTracker: React.FC<ChangesTrackerProps> = ({
    projectId,
    isOpen,
    onClose,
    onRevert,
    currentContent,
    userId,
    userRole
}) => {
    const [versions, setVersions] = useState<LatexVersion[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<LatexVersion | null>(null);
    const [showDiff, setShowDiff] = useState(false);
    const [diffData, setDiffData] = useState<{ added: string[]; removed: string[]; modified: string[] } | null>(null);
    const [isReverting, setIsReverting] = useState(false);
    const [showRawCode, setShowRawCode] = useState(false);

    useEffect(() => {
        if (isOpen && projectId) {
            loadVersions();
        }
    }, [isOpen, projectId]);

    const loadVersions = () => {
        const projectVersions = getLatexProjectVersions(projectId);
        setVersions(projectVersions);
    };

    const handleRevert = async (version: LatexVersion) => {
        if (!confirm(`Are you sure you want to revert to version ${version.version}? This will create a new version with the reverted content.`)) {
            return;
        }

        setIsReverting(true);
        try {
            const revertedVersion = revertToLatexVersion(projectId, version.version);
            if (revertedVersion) {
                onRevert(revertedVersion.content);
                loadVersions(); // Reload versions
                setSelectedVersion(null);
                setShowDiff(false);
                setDiffData(null);
                
                // Show success message without blocking UI
                const successMessage = document.createElement('div');
                successMessage.className = 'fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg';
                successMessage.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <div class="w-2 h-2 bg-white rounded-full"></div>
                        <span>Successfully reverted to version ${version.version}!</span>
                    </div>
                `;
                document.body.appendChild(successMessage);
                
                // Remove the message after 3 seconds
                setTimeout(() => {
                    if (document.body.contains(successMessage)) {
                        document.body.removeChild(successMessage);
                    }
                }, 3000);
            }
        } catch (error) {
            console.error('Error reverting version:', error);
            alert('Failed to revert to the selected version.');
        } finally {
            setIsReverting(false);
        }
    };

    const handleShowDiff = (version: LatexVersion) => {
        if (selectedVersion && selectedVersion.version !== version.version) {
            const diff = compareLatexVersions(projectId, selectedVersion.version, version.version);
            setDiffData(diff);
            setShowDiff(true);
        }
    };

    const getChangeIcon = (changeType?: string) => {
        switch (changeType) {
            case 'insertion':
                return <FaPlus className="text-green-500" size={12} />;
            case 'deletion':
                return <FaMinus className="text-red-500" size={12} />;
            case 'modification':
                return <FaEdit className="text-yellow-500" size={12} />;
            case 'save':
                return <FaFileAlt className="text-blue-500" size={12} />;
            default:
                return <FaClock className="text-gray-500" size={12} />;
        }
    };

    const getChangeColor = (changeType?: string) => {
        switch (changeType) {
            case 'insertion':
                return 'border-l-green-500';
            case 'deletion':
                return 'border-l-red-500';
            case 'modification':
                return 'border-l-yellow-500';
            case 'save':
                return 'border-l-blue-500';
            default:
                return 'border-l-gray-500';
        }
    };

    // Function to render LaTeX content as visual preview
    const renderLatexPreview = (latexContent: string): string => {
        try {
            // Extract content between \begin{document} and \end{document}
            const documentContent = latexContent.split('\\begin{document}')[1]?.split('\\end{document}')[0] || '';

            // Get the title, author, and date if present
            const titleMatch = latexContent.match(/\\title{(.*?)}/);
            const authorMatch = latexContent.match(/\\author{(.*?)}/);
            const dateMatch = latexContent.match(/\\date{(.*?)}/);

            const title = titleMatch ? titleMatch[1] : '';
            const author = authorMatch ? authorMatch[1] : '';
            const date = dateMatch ? (dateMatch[1] === '\\today' ? new Date().toLocaleDateString() : dateMatch[1]) : '';

            // Process maketitle command
            let processedContent = documentContent;
            let hasTitleSection = false;

            if (processedContent.includes('\\maketitle')) {
                hasTitleSection = true;
                processedContent = processedContent.replace('\\maketitle', '');
            }

            // Process sections
            processedContent = processedContent.replace(/\\section{([^}]+)}/g, '<h2 class="text-xl font-bold mt-6 mb-3 text-white">$1</h2>');
            processedContent = processedContent.replace(/\\subsection{([^}]+)}/g, '<h3 class="text-lg font-bold mt-4 mb-2 text-white">$1</h3>');
            processedContent = processedContent.replace(/\\subsubsection{([^}]+)}/g, '<h4 class="text-md font-bold mt-3 mb-2 text-white">$1</h4>');
            processedContent = processedContent.replace(/\\paragraph{([^}]+)}/g, '<h5 class="text-sm font-bold mt-2 mb-1 text-white">$1</h5>');
            processedContent = processedContent.replace(/\\subparagraph{([^}]+)}/g, '<h6 class="text-xs font-bold mt-1 mb-1 text-white">$1</h6>');

            // Process bold text
            processedContent = processedContent.replace(/\\textbf{([^}]+)}/g, '<strong class="font-bold">$1</strong>');
            processedContent = processedContent.replace(/\\textbf{([^}]+)}/g, '<strong class="font-bold">$1</strong>');

            // Process italic text
            processedContent = processedContent.replace(/\\textit{([^}]+)}/g, '<em class="italic">$1</em>');
            processedContent = processedContent.replace(/\\textit{([^}]+)}/g, '<em class="italic">$1</em>');

            // Process underline text
            processedContent = processedContent.replace(/\\underline{([^}]+)}/g, '<u class="underline">$1</u>');

            // Process inline math
            processedContent = processedContent.replace(/\$([^$]+)\$/g, (match, mathContent) => {
                try {
                    return katex.renderToString(mathContent, { throwOnError: false });
                } catch (e) {
                    return `<span class="text-red-500">${mathContent}</span>`;
                }
            });

            // Process display math
            processedContent = processedContent.replace(/\$\$([^$]+)\$\$/g, (match, mathContent) => {
                try {
                    return `<div class="text-center my-4">${katex.renderToString(mathContent, { displayMode: true, throwOnError: false })}</div>`;
                } catch (e) {
                    return `<div class="text-center my-4 text-red-500">${mathContent}</div>`;
                }
            });

            // Process itemize lists
            processedContent = processedContent.replace(
                /\\begin{itemize}([\s\S]*?)\\end{itemize}/g,
                (match, listContent) => {
                    const items = listContent.split('\\item')
                        .map((item: string) => item.trim())
                        .filter((item: string) => item.length > 0);

                    return `
                        <ul class="list-disc ml-6 my-3 text-white">
                            ${items.map((item: string) => `<li>${item}</li>`).join('')}
                        </ul>
                    `;
                }
            );

            // Process enumerate lists
            processedContent = processedContent.replace(
                /\\begin{enumerate}([\s\S]*?)\\end{enumerate}/g,
                (match, listContent) => {
                    const items = listContent.split('\\item')
                        .map((item: string) => item.trim())
                        .filter((item: string) => item.length > 0);

                    return `
                        <ol class="list-decimal ml-6 my-3 text-white">
                            ${items.map((item: string) => `<li>${item}</li>`).join('')}
                        </ol>
                    `;
                }
            );

            // Process paragraphs
            processedContent = processedContent.replace(/\n\n/g, '</p><p class="text-white mb-3">');
            processedContent = processedContent.replace(/\n/g, '<br>');

            // Wrap in paragraphs
            processedContent = `<p class="text-white mb-3">${processedContent}</p>`;

            // Add title section if present
            let finalContent = '';
            if (hasTitleSection && (title || author || date)) {
                finalContent += `
                    <div class="text-center mb-8">
                        ${title ? `<h1 class="text-3xl font-bold text-white mb-2">${title}</h1>` : ''}
                        ${author ? `<p class="text-xl text-gray-300 mb-1">${author}</p>` : ''}
                        ${date ? `<p class="text-lg text-gray-300">${date}</p>` : ''}
                    </div>
                `;
            }

            finalContent += processedContent;

            return finalContent;
        } catch (error) {
            console.error('Error rendering LaTeX preview:', error);
            return `<div class="text-red-500">Error rendering LaTeX content</div>`;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] text-white rounded-lg shadow-xl w-11/12 max-w-4xl h-5/6 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                        <FaHistory className="text-blue-500" />
                        <h2 className="text-lg font-semibold">Document Changes History</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Versions List */}
                    <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
                        <div className="p-4">
                            <h3 className="text-md font-medium mb-4 flex items-center">
                                <FaClock className="mr-2" />
                                Version History ({versions.length} versions)
                            </h3>
                            
                            {versions.length === 0 ? (
                                <div className="text-gray-400 text-center py-8">
                                    No version history available
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {versions.map((version, index) => (
                                        <div
                                            key={version.version}
                                            className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:bg-gray-800 ${
                                                selectedVersion?.version === version.version 
                                                    ? 'bg-gray-800 border-l-blue-500' 
                                                    : getChangeColor(version.changeType)
                                            }`}
                                            onClick={() => setSelectedVersion(version)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    {getChangeIcon(version.changeType)}
                                                    <span className="font-medium">Version {version.version}</span>
                                                    {index === 0 && (
                                                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                                                            Current
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleShowDiff(version);
                                                        }}
                                                        className="p-1 hover:bg-gray-700 rounded"
                                                        title="Show differences"
                                                    >
                                                        <FaEye size={12} />
                                                    </button>
                                                    {index > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRevert(version);
                                                            }}
                                                            className="p-1 hover:bg-gray-700 rounded text-yellow-500"
                                                            title="Revert to this version"
                                                            disabled={isReverting}
                                                        >
                                                            <FaUndo size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="text-sm text-gray-400 mb-1">
                                                {formatTimestamp(version.timestamp)}
                                            </div>
                                            
                                            <div className="text-sm text-gray-300">
                                                {getChangeDescription(version)}
                                            </div>
                                            
                                            {version.notes && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {version.notes}
                                                </div>
                                            )}
                                            
                                            {version.userId && (
                                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                                    <FaUser size={10} className="mr-1" />
                                                    {version.userRole || 'User'} {version.userId}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Version Details */}
                    <div className="w-1/2 flex flex-col">
                        {selectedVersion ? (
                            <>
                                {/* Version Info */}
                                <div className="p-4 border-b border-gray-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-md font-medium">
                                            Version {selectedVersion.version} Details
                                        </h3>
                                        {versions.indexOf(selectedVersion) > 0 && (
                                            <button
                                                onClick={() => handleRevert(selectedVersion)}
                                                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition flex items-center space-x-1"
                                                disabled={isReverting}
                                            >
                                                <FaUndo size={12} />
                                                <span>Revert to This Version</span>
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">Timestamp:</span>
                                            <div className="text-white">{formatTimestamp(selectedVersion.timestamp)}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Change Type:</span>
                                            <div className="text-white flex items-center">
                                                {getChangeIcon(selectedVersion.changeType)}
                                                <span className="ml-1">{getChangeDescription(selectedVersion)}</span>
                                            </div>
                                        </div>
                                        {selectedVersion.userId && (
                                            <div>
                                            <span className="text-gray-400">User:</span>
                                            <div className="text-white">{selectedVersion.userRole || 'User'} {selectedVersion.userId}</div>
                                        </div>
                                        )}
                                        {selectedVersion.notes && (
                                            <div className="col-span-2">
                                                <span className="text-gray-400">Notes:</span>
                                                <div className="text-white">{selectedVersion.notes}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content Preview */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium">Content Preview</h4>
                                        <button
                                            onClick={() => setShowRawCode(!showRawCode)}
                                            className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                                            title={showRawCode ? "Show Visual Preview" : "Show Raw LaTeX Code"}
                                        >
                                            {showRawCode ? (
                                                <>
                                                    <FaEyeSlash size={10} />
                                                    <span>Visual</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaCode size={10} />
                                                    <span>Code</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="bg-[#2a2a2a] rounded p-3 text-sm max-h-96 overflow-y-auto">
                                        {showRawCode ? (
                                            <div className="font-mono whitespace-pre-wrap text-gray-300">
                                                {selectedVersion.content}
                                            </div>
                                        ) : (
                                            <div 
                                                className="text-white"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: renderLatexPreview(selectedVersion.content) 
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                Select a version to view details
                            </div>
                        )}
                    </div>
                </div>

                {/* Diff Modal */}
                {showDiff && diffData && selectedVersion && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
                        <div className="bg-[#1e1e1e] text-white rounded-lg shadow-xl w-11/12 max-w-4xl h-4/5 flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                                <h3 className="text-lg font-semibold">Differences Between Versions</h3>
                                <button
                                    onClick={() => {
                                        setShowDiff(false);
                                        setDiffData(null);
                                    }}
                                    className="p-2 hover:bg-gray-700 rounded transition-colors"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Added */}
                                    <div>
                                        <h4 className="text-green-500 font-medium mb-2 flex items-center">
                                            <FaPlus className="mr-1" />
                                            Added ({diffData.added.length})
                                        </h4>
                                        <div className="bg-[#2a2a2a] rounded p-3 text-sm max-h-64 overflow-y-auto">
                                            {diffData.added.length > 0 ? (
                                                diffData.added.map((line, index) => (
                                                    <div key={index} className="text-green-400 mb-1">
                                                        + {line}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-gray-500">No additions</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Removed */}
                                    <div>
                                        <h4 className="text-red-500 font-medium mb-2 flex items-center">
                                            <FaMinus className="mr-1" />
                                            Removed ({diffData.removed.length})
                                        </h4>
                                        <div className="bg-[#2a2a2a] rounded p-3 text-sm max-h-64 overflow-y-auto">
                                            {diffData.removed.length > 0 ? (
                                                diffData.removed.map((line, index) => (
                                                    <div key={index} className="text-red-400 mb-1">
                                                        - {line}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-gray-500">No removals</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Modified */}
                                    <div>
                                        <h4 className="text-yellow-500 font-medium mb-2 flex items-center">
                                            <FaEdit className="mr-1" />
                                            Modified ({diffData.modified.length})
                                        </h4>
                                        <div className="bg-[#2a2a2a] rounded p-3 text-sm max-h-64 overflow-y-auto">
                                            {diffData.modified.length > 0 ? (
                                                diffData.modified.map((line, index) => (
                                                    <div key={index} className="text-yellow-400 mb-1 text-xs">
                                                        {line}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-gray-500">No modifications</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangesTracker; 