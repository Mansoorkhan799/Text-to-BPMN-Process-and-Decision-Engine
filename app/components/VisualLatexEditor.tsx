'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createEditor, Descendant, Element as SlateElement, Transforms, Editor, Text, BaseEditor, NodeEntry, Node, Range, Point } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { HistoryEditor, withHistory } from 'slate-history';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
    FaBold, FaItalic, FaList, FaPlay, FaTable, FaImage,
    FaFont, FaListOl, FaIndent, FaOutdent, FaFileAlt,
    FaHeading, FaUnderline, FaRulerHorizontal, FaCode,
    FaFileWord, FaFileImport, FaFileUpload, FaEye, FaHistory
} from 'react-icons/fa';
import { Switch } from './ui/Switch';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import EditorModeSwitch from './ui/EditorModeSwitch';
import ChangesTracker from './ChangesTracker';
import { 
    addLatexProjectVersion, 
    hasMeaningfulChanges 
} from '../utils/latexVersions';
import TableGridPicker from './ui/TableGridPicker';

// Define custom types for Slate
type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;

// Define custom Element types
type ParagraphElement = {
    type: 'paragraph';
    children: CustomText[];
};

type HeadingElement = {
    type: 'heading-1' | 'heading-2' | 'heading-3' | 'heading-4' | 'heading-5';
    children: CustomText[];
};

// Add specific paragraph and subparagraph types
type ParagraphSpecificElement = {
    type: 'paragraph-specific' | 'subparagraph-specific';
    children: CustomText[];
};

type DocumentMetadataElement = {
    type: 'document-title' | 'document-author' | 'document-date';
    children: CustomText[];
};

type ListItemElement = {
    type: 'list-item';
    children: CustomText[];
};

type BulletListElement = {
    type: 'bullet-list';
    children: ListItemElement[];
};

type NumberedListElement = {
    type: 'numbered-list';
    children: ListItemElement[];
};

type TableCellElement = {
    type: 'table-cell';
    children: CustomText[];
};

type TableRowElement = {
    type: 'table-row';
    children: TableCellElement[];
};

type TableElement = {
    type: 'table';
    rows?: number;
    cols?: number;
    colSpec?: string; // Store the original column specification
    children: TableRowElement[];
};

type ImageElement = {
    type: 'image';
    url?: string;
    caption?: string;
    children: { text: string }[];
};

type EquationElement = {
    type: 'equation';
    formula?: string;
    children: { text: string }[];
};

type CustomElement =
    | ParagraphElement
    | HeadingElement
    | ParagraphSpecificElement
    | DocumentMetadataElement
    | ListItemElement
    | BulletListElement
    | NumberedListElement
    | TableElement
    | TableRowElement
    | TableCellElement
    | ImageElement
    | EquationElement;

// Define custom Text types
type CustomText = {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    code?: boolean;
    fontFamily?: string;
};

// Extend the Slate types
declare module 'slate' {
    interface CustomTypes {
        Editor: CustomEditor;
        Element: CustomElement;
        Text: CustomText;
    }
}

// Define props interface for VisualLatexEditor
interface VisualLatexEditorProps {
    initialLatexContent?: string;
    onContentChange?: (content: string) => void;
    editorMode?: 'code' | 'visual';
    onEditorModeChange?: (mode: 'code' | 'visual') => void;
    isSaving?: boolean;
    onManualSave?: () => void;
    projectId?: string;
    user?: { id: string; role: string; name?: string; email?: string };
    onSaveComplete?: () => void; // Callback when save completes
    // Template protection properties
    templateName?: string;
    templateId?: string;
    isTemplateProtected?: boolean;
}

// Custom Slate elements rendering
// Placeholder for Element component - will be defined inside the main component

// Custom Slate leaf rendering
const Leaf = ({ attributes, children, leaf }: any) => {
    let formattedChildren = children;

    if (leaf.bold) {
        formattedChildren = <strong>{formattedChildren}</strong>;
    }

    if (leaf.italic) {
        formattedChildren = <em>{formattedChildren}</em>;
    }

    if (leaf.underline) {
        formattedChildren = <u>{formattedChildren}</u>;
    }

    if (leaf.code) {
        formattedChildren = <code className="bg-gray-100 px-1 rounded">{formattedChildren}</code>;
    }

    if (leaf.fontFamily) {
        formattedChildren = <span style={{ fontFamily: leaf.fontFamily }}>{formattedChildren}</span>;
    }

    return <span {...attributes}>{formattedChildren}</span>;
};

// LaTeX to Slate converter
const latexToSlate = (latexContent: string): Descendant[] => {
    const elements: Descendant[] = [];

    try {
        console.log('Converting LaTeX to Slate:', latexContent.substring(0, 50) + '...');

        // Preprocessing step to clean up LaTeX content
        // Replace escaped LaTeX commands that might appear in the text
        let cleanedContent = latexContent;

        // Replace any raw LaTeX commands that might have been incorrectly preserved
        const rawCommandsToClean = [
            { pattern: /\\subsubsection\{([^}]*)\}/g, replacement: (_: string, title: string) => `\\subsubsection{${title}}` },
            { pattern: /\\subsection\{([^}]*)\}/g, replacement: (_: string, title: string) => `\\subsection{${title}}` },
            { pattern: /\\paragraph\{([^}]*)\}/g, replacement: (_: string, title: string) => `\\paragraph{${title}}` },
            { pattern: /\\subparagraph\{([^}]*)\}/g, replacement: (_: string, title: string) => `\\subparagraph{${title}}` }
        ];

        // Apply the cleanups
        rawCommandsToClean.forEach(({ pattern, replacement }) => {
            cleanedContent = cleanedContent.replace(pattern, replacement);
        });

        // Extract metadata before content processing
        let title = "LaTeX Document";
        let author = "Author";
        let date = new Date().toLocaleDateString();

        // Extract title
        const titleMatch = cleanedContent.match(/\\title\{(.*?)\}/);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
        }

        // Extract author
        const authorMatch = cleanedContent.match(/\\author\{(.*?)\}/);
        if (authorMatch && authorMatch[1]) {
            author = authorMatch[1];
        }

        // Extract date
        const dateMatch = cleanedContent.match(/\\date\{(.*?)\}/);
        if (dateMatch && dateMatch[1]) {
            // Handle \today command
            if (dateMatch[1] === '\\today') {
                date = new Date().toLocaleDateString();
            } else {
                date = dateMatch[1];
            }
        }

        // Add document metadata elements to the Slate structure
        elements.push({
            type: 'document-title',
            children: [{ text: title }]
        } as DocumentMetadataElement);

        elements.push({
            type: 'document-author',
            children: [{ text: author }]
        } as DocumentMetadataElement);

        elements.push({
            type: 'document-date',
            children: [{ text: date }]
        } as DocumentMetadataElement);

        // Split content between begin and end document if they exist
        let contentToProcess = cleanedContent;

        // Extract document content
        if (cleanedContent.includes('\\begin{document}') && cleanedContent.includes('\\end{document}')) {
            const beginDocIndex = cleanedContent.indexOf('\\begin{document}');
            const endDocIndex = cleanedContent.lastIndexOf('\\end{document}');

            if (beginDocIndex !== -1 && endDocIndex !== -1) {
                contentToProcess = cleanedContent.substring(beginDocIndex + 16, endDocIndex);
            }
        }

        // Remove \maketitle if present, as we handle the title separately
        contentToProcess = contentToProcess.replace('\\maketitle', '');

        // Process formatting in paragraphs
        const processFormattedText = (text: string): CustomText[] => {
            // Special case for LaTeX commands that should be handled differently
            if (text.startsWith('\\subsubsection{')) {
                const match = text.match(/^\\subsubsection\{([^}]*)\}(.*?)$/);
                if (match) {
                    // Return empty array as this will be handled separately
                    return [{ text: '' }];
                }
            }

            if (text.startsWith('\\subsection{')) {
                const match = text.match(/^\\subsection\{([^}]*)\}(.*?)$/);
                if (match) {
                    // Return empty array as this will be handled separately
                    return [{ text: '' }];
                }
            }

            if (text.startsWith('\\paragraph{')) {
                const match = text.match(/^\\paragraph\{([^}]*)\}(.*?)$/);
                if (match) {
                    // Return empty array as this will be handled separately
                    return [{ text: '' }];
                }
            }

            if (text.startsWith('\\subparagraph{')) {
                const match = text.match(/^\\subparagraph\{([^}]*)\}(.*?)$/);
                if (match) {
                    // Return empty array as this will be handled separately
                    return [{ text: '' }];
                }
            }

            let result: CustomText[] = [];
            let currentPos = 0;

            // Process font family
            const fontFamilyRegex = /\\fontfamily\{([^{}]*)\}\\selectfont\s+([^\\]*)/g;
            let fontFamilyMatch;

            while ((fontFamilyMatch = fontFamilyRegex.exec(text)) !== null) {
                // Add text before the font family part
                if (fontFamilyMatch.index > currentPos) {
                    result.push({ text: text.substring(currentPos, fontFamilyMatch.index) });
                }

                // Map LaTeX font family to CSS font family
                let fontFamily = "Arial, sans-serif"; // Default
                switch (fontFamilyMatch[1].toLowerCase()) {
                    case "times":
                        fontFamily = "'Times New Roman', serif";
                        break;
                    case "courier":
                        fontFamily = "'Courier New', monospace";
                        break;
                    case "georgia":
                        fontFamily = "Georgia, serif";
                        break;
                    case "verdana":
                        fontFamily = "Verdana, sans-serif";
                        break;
                    case "trebuchet":
                        fontFamily = "'Trebuchet MS', sans-serif";
                        break;
                    default:
                        fontFamily = "Arial, sans-serif";
                }

                // Add the text with font family
                result.push({
                    text: fontFamilyMatch[2],
                    fontFamily: fontFamily
                });

                // Update current position
                currentPos = fontFamilyMatch.index + fontFamilyMatch[0].length;
            }

            // Process bold text
            const boldRegex = /\\textbf\{([^{}]*)\}/g;
            let boldMatch;

            while ((boldMatch = boldRegex.exec(text)) !== null) {
                // Add text before the bold part
                if (boldMatch.index > currentPos) {
                    result.push({ text: text.substring(currentPos, boldMatch.index) });
                }

                // Add the bold text
                result.push({ text: boldMatch[1], bold: true });

                // Update current position
                currentPos = boldMatch.index + boldMatch[0].length;
            }

            // Process remaining text for italic and underline
            let remainingText = text.substring(currentPos);

            // Process italic text
            const processedItalic = processItalicText(remainingText);
            if (processedItalic.nodes.length > 0) {
                result = [...result, ...processedItalic.nodes];
                remainingText = processedItalic.remainingText;
            }

            // Process underlined text
            const processedUnderline = processUnderlineText(remainingText);
            if (processedUnderline.nodes.length > 0) {
                result = [...result, ...processedUnderline.nodes];
                remainingText = processedUnderline.remainingText;
            } else if (remainingText.length > 0) {
                result.push({ text: remainingText });
            }

            // If no formatting was found, return the original text
            if (result.length === 0) {
                result.push({ text });
            }

            return result;
        };

        // Helper function to process italic text
        const processItalicText = (text: string): { nodes: CustomText[], remainingText: string } => {
            let nodes: CustomText[] = [];
            let currentPos = 0;
            const italicRegex = /\\textit\{([^{}]*)\}/g;
            let italicMatch;

            while ((italicMatch = italicRegex.exec(text)) !== null) {
                // Add text before the italic part
                if (italicMatch.index > currentPos) {
                    nodes.push({ text: text.substring(currentPos, italicMatch.index) });
                }

                // Add the italic text
                nodes.push({ text: italicMatch[1], italic: true });

                // Update current position
                currentPos = italicMatch.index + italicMatch[0].length;
            }

            return {
                nodes,
                remainingText: text.substring(currentPos)
            };
        };

        // Helper function to process underlined text
        const processUnderlineText = (text: string): { nodes: CustomText[], remainingText: string } => {
            let nodes: CustomText[] = [];
            let currentPos = 0;
            const underlineRegex = /\\underline\{([^{}]*)\}/g;
            let underlineMatch;

            while ((underlineMatch = underlineRegex.exec(text)) !== null) {
                // Add text before the underlined part
                if (underlineMatch.index > currentPos) {
                    nodes.push({ text: text.substring(currentPos, underlineMatch.index) });
                }

                // Add the underlined text - make sure to use underline property, not code
                nodes.push({ text: underlineMatch[1], underline: true });

                // Update current position
                currentPos = underlineMatch.index + underlineMatch[0].length;
            }

            return {
                nodes,
                remainingText: text.substring(currentPos)
            };
        };





                        // Simple sequential processing to maintain document order
        let processedContent = contentToProcess;

        // Process content line by line to maintain order
        const lines = processedContent.split('\n');
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            if (!line) {
                i++;
                continue;
            }
            
            // Check for section commands
            const sectionMatch = line.match(/^\\section\{([^}]*)\}$/);
            if (sectionMatch) {
            elements.push({
                type: 'heading-1',
                    children: [{ text: sectionMatch[1].trim() }]
                });
                i++;
                continue;
            }

            // Check for subsection commands
            const subsectionMatch = line.match(/^\\subsection\{([^}]*)\}$/);
            if (subsectionMatch) {
            elements.push({
                type: 'heading-2',
                    children: [{ text: subsectionMatch[1].trim() }]
                });
                i++;
                continue;
            }
            
            // Check for subsubsection commands
            const subsubsectionMatch = line.match(/^\\subsubsection\{([^}]*)\}$/);
            if (subsubsectionMatch) {
            elements.push({
                type: 'heading-3',
                    children: [{ text: subsubsectionMatch[1].trim() }]
                });
                i++;
                continue;
            }
            
            // Check for itemize lists
            if (line.includes('\\begin{itemize}')) {
                const listItems: any[] = [];
                i++; // Skip the begin line
                
                while (i < lines.length && !lines[i].includes('\\end{itemize}')) {
                    const itemLine = lines[i].trim();
                    if (itemLine.startsWith('\\item')) {
                        const itemContent = itemLine.replace(/^\\item\s*/, '').trim();
                        if (itemContent) {
                            listItems.push({
                                type: 'list-item' as const,
                                children: processFormattedText(itemContent)
                            });
                        }
                    }
                    i++;
                }
                
                if (listItems.length > 0) {
                    elements.push({
                        type: 'bullet-list',
                        children: listItems
                    });
                }
                i++; // Skip the end line
                continue;
            }
            
            // Check for enumerate lists
            if (line.includes('\\begin{enumerate}')) {
                const listItems: any[] = [];
                i++; // Skip the begin line
                
                while (i < lines.length && !lines[i].includes('\\end{enumerate}')) {
                    const itemLine = lines[i].trim();
                    if (itemLine.startsWith('\\item')) {
                        const itemContent = itemLine.replace(/^\\item\s*/, '').trim();
                        if (itemContent) {
                            listItems.push({
                                type: 'list-item' as const,
                                children: processFormattedText(itemContent)
                            });
                        }
                    }
                    i++;
                }
                
                if (listItems.length > 0) {
                    elements.push({
                        type: 'numbered-list',
                        children: listItems
                    });
                }
                i++; // Skip the end line
                continue;
            }
            
            // Check for description lists
            if (line.includes('\\begin{description}')) {
                i++; // Skip the begin line
                
                while (i < lines.length && !lines[i].includes('\\end{description}')) {
                    const itemLine = lines[i].trim();
                    if (itemLine.startsWith('\\item')) {
                        const itemContent = itemLine.replace(/^\\item\s*/, '').trim();
                        if (itemContent) {
                            const termMatch = itemContent.match(/^\[([^\]]*)\]\s*(.*)$/);
                            if (termMatch) {
                                const term = termMatch[1].trim();
                                const definition = termMatch[2].trim();
                                
                    elements.push({
                        type: 'paragraph-specific',
                                    children: [{ text: term }]
                    });

                                if (definition) {
                        elements.push({
                            type: 'paragraph',
                                        children: processFormattedText(definition)
                                    });
                                }
                            } else {
                        elements.push({
                            type: 'paragraph',
                                    children: processFormattedText(itemContent)
                        });
                    }
                }
                    }
                    i++;
                }
                i++; // Skip the end line
                continue;
            }
            
            // Check for tabular tables
            if (line.includes('\\begin{tabular}')) {
                const tableRows: TableRowElement[] = [];
                
                // Extract column specification from the begin{tabular} line
                const colSpecMatch = line.match(/\\begin{tabular}\{([^}]+)\}/);
                const colSpec = colSpecMatch ? colSpecMatch[1] : '|c|';
                
                i++; // Skip the begin line
                
                while (i < lines.length && !lines[i].includes('\\end{tabular}')) {
                    const tableLine = lines[i].trim();
                    
                    // Skip empty lines and hline commands
                    if (tableLine && !tableLine.startsWith('\\hline')) {
                        // Split the row by & and trim each cell
                        const cells = tableLine.split('&').map(cell => cell.trim());
                        const tableCells: TableCellElement[] = [];
                        
                        cells.forEach(cell => {
                            // Remove trailing \\ if present
                            const cleanCell = cell.replace(/\\\\$/, '').trim();
                            // Always create a cell, even if empty
                            tableCells.push({
                                type: 'table-cell',
                                children: cleanCell ? processFormattedText(cleanCell) : [{ text: '' }]
                            });
                        });
                        
                        if (tableCells.length > 0) {
                            tableRows.push({
                                type: 'table-row',
                                children: tableCells
                            });
                        }
                    }
                    i++;
                }
                
                if (tableRows.length > 0) {
                    // Determine table dimensions
                    const maxCols = Math.max(...tableRows.map(row => row.children.length));
                    elements.push({
                        type: 'table',
                        rows: tableRows.length,
                        cols: maxCols,
                        colSpec: colSpec, // Store the original column specification
                        children: tableRows
                    });
                }
                i++; // Skip the end line
                continue;
            }
            
            // Regular paragraph content
            if (line) {
                elements.push({
                    type: 'paragraph',
                    children: processFormattedText(line)
                });
            }
            
            i++;
        }



        // If no elements were created, provide default
        if (elements.length === 0) {
            elements.push({
                type: 'paragraph',
                children: [{ text: '' }]
            });
        }

        // Debug output of parsed elements
        console.log('Converted to Slate elements:', JSON.stringify(elements).substring(0, 100) + '...');
    } catch (error) {
        console.error('Error converting LaTeX to Slate:', error);
        // Provide fallback in case of parsing error
        elements.push({
            type: 'paragraph',
            children: [{ text: 'Error parsing LaTeX content' }]
        });
    }

    return elements;
};

// Slate to LaTeX converter
const slateToLatex = (elements: Descendant[]): string => {
    let latex = '';

    // Extract document metadata
    const title = elements.find(el => 'type' in el && el.type === 'document-title');
    const author = elements.find(el => 'type' in el && el.type === 'document-author');
    const date = elements.find(el => 'type' in el && el.type === 'document-date');

    // Add preamble
    latex += '\\documentclass{article}\n';
    latex += '\\usepackage{amsmath}\n';
    latex += '\\usepackage{amssymb}\n';
    latex += '\\usepackage{graphicx}\n';
    latex += '\\usepackage{hyperref}\n\n';

    // Add title, author, date
    if (title && 'type' in title && title.type === 'document-title') {
        latex += `\\title{${Node.string(title)}}\n`;
    } else {
        latex += '\\title{LaTeX Document}\n';
    }

    if (author && 'type' in author && author.type === 'document-author') {
        latex += `\\author{${Node.string(author)}}\n`;
    } else {
        latex += '\\author{Author}\n';
    }

    if (date && 'type' in date && date.type === 'document-date') {
        latex += `\\date{${Node.string(date)}}\n`;
    } else {
        latex += '\\date{\\today}\n';
    }

    latex += '\n\\begin{document}\n\n';
    latex += '\\maketitle\n\n';

    // Process document body
    let body = '';

    // Skip the first three elements (title, author, date)
    for (let i = 3; i < elements.length; i++) {
        const element = elements[i];
        if (!('type' in element)) continue;

        // Helper function to convert text nodes to LaTeX
        const textToLatex = (node: CustomText): string => {
            let text = node.text;

            // Apply formatting
            if (node.bold) text = `\\textbf{${text}}`;
            if (node.italic) text = `\\textit{${text}}`;
            if (node.underline) text = `\\underline{${text}}`;

            // Apply font family if specified
            if (node.fontFamily) {
                let fontCommand = '';
                switch (node.fontFamily) {
                    case 'Arial, sans-serif':
                        fontCommand = '\\sffamily';
                        break;
                    case "'Times New Roman', serif":
                        fontCommand = '\\rmfamily';
                        break;
                    case "'Courier New', monospace":
                        fontCommand = '\\ttfamily';
                        break;
                    case "Georgia, serif":
                        text = `\\fontfamily{georgia}\\selectfont ${text}`;
                        break;
                    case "Verdana, sans-serif":
                        text = `\\fontfamily{verdana}\\selectfont ${text}`;
                        break;
                    case "'Trebuchet MS', sans-serif":
                        text = `\\fontfamily{trebuchet}\\selectfont ${text}`;
                        break;
                }

                if (fontCommand) {
                    text = `{${fontCommand} ${text}}`;
                }
            }

            return text;
        };

        // Helper function to convert children to LaTeX
        const childrenToLatex = (children: any[]): string => {
            return children.map(child => {
                if ('text' in child) {
                    return textToLatex(child as CustomText);
                }
                return '';
            }).join('');
        };

        switch (element.type) {
            case 'paragraph':
                body += `${childrenToLatex(element.children)}\n\n`;
                break;
            case 'heading-1':
                body += `\\section{${childrenToLatex(element.children)}}\n\n`;
                break;
            case 'heading-2':
                body += `\\subsection{${childrenToLatex(element.children)}}\n\n`;
                break;
            case 'heading-3':
                body += `\\subsubsection{${childrenToLatex(element.children)}}\n\n`;
                break;
            case 'heading-4':
                body += `\\paragraph{${childrenToLatex(element.children)}}\n\n`;
                break;
            case 'heading-5':
                body += `\\subparagraph{${childrenToLatex(element.children)}}\n\n`;
                break;
            case 'paragraph-specific':
                body += `\\paragraph{${childrenToLatex(element.children)}}\n\n`;
                break;
            case 'subparagraph-specific':
                body += `\\subparagraph{${childrenToLatex(element.children)}}\n\n`;
                break;
            case 'bullet-list':
                body += '\\begin{itemize}\n';
                element.children.forEach((item: any) => {
                    body += `\\item ${childrenToLatex(item.children)}\n`;
                });
                body += '\\end{itemize}\n\n';
                break;
            case 'numbered-list':
                body += '\\begin{enumerate}\n';
                element.children.forEach((item: any) => {
                    body += `\\item ${childrenToLatex(item.children)}\n`;
                });
                body += '\\end{enumerate}\n\n';
                break;
            case 'equation':
                if (element.formula) {
                    body += `\\begin{equation}\n${element.formula}\n\\end{equation}\n\n`;
                }
                break;
            case 'image':
                if (element.url) {
                    body += `\\begin{figure}[h]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{${element.url}}\n`;
                    if (element.caption) {
                        body += `\\caption{${element.caption}}\n`;
                    }
                    body += '\\end{figure}\n\n';
                }
                break;
            case 'table':
                // Convert table to LaTeX tabular environment (inline, not floating)
                // Use stored column specification if available, otherwise determine from content
                let colSpec = element.colSpec;
                if (!colSpec) {
                    const firstRow = element.children?.[0];
                    const numCols = firstRow?.children?.length || 3;
                    // Create column specification - use |c| for centered columns with borders
                    colSpec = '|';
                    for (let i = 0; i < numCols; i++) {
                        colSpec += 'c|';
                    }
                }
                
                body += `\\begin{tabular}{${colSpec}}\n\\hline\n`;
                
                // Process each row
                element.children?.forEach((row: any, rowIndex: number) => {
                    if (row.type === 'table-row') {
                        row.children?.forEach((cell: any, cellIndex: number) => {
                            if (cell.type === 'table-cell') {
                                const cellContent = childrenToLatex(cell.children);
                                body += cellContent;
                                if (cellIndex < row.children.length - 1) {
                                    body += ' & ';
                                }
                            }
                        });
                        body += ' \\\\\n\\hline\n';
                    }
                });
                
                body += '\\end{tabular}\n\n';
                break;
            default:
                // Handle other element types if needed
                break;
        }
    }

    latex += body;
    latex += '\n\\end{document}';

    return latex;
};

const VisualLatexEditor = ({ initialLatexContent, onContentChange, editorMode, onEditorModeChange, isSaving, onManualSave, projectId, user, onSaveComplete, templateName, templateId, isTemplateProtected }: VisualLatexEditorProps = {}) => {
    // Key for forcing Slate editor re-render - declare first
    const [editorKey, setEditorKey] = useState<number>(0);
    
    // Template protection helper functions - define these BEFORE editor creation
    const isProtectedElement = useCallback((element: any): boolean => {
        if (!isTemplateProtected) return false;
        
        // Check if element is a heading that should be protected
        return element.type === 'heading-1' || 
               element.type === 'heading-2' || 
               element.type === 'heading-3' || 
               element.type === 'heading-4' || 
               element.type === 'heading-5';
    }, [isTemplateProtected]);

    const showProtectionMessage = useCallback((message: string) => {
        setProtectionMessage(message);
        setShowTemplateProtectionMessage(true);
        setTimeout(() => setShowTemplateProtectionMessage(false), 3000);
    }, []);

    const handleProtectedElementClick = useCallback(() => {
        showProtectionMessage("This is a template section and cannot be changed");
        jumpToNextEditable();
    }, [showProtectionMessage]);
    
    // Create a Slate editor that is memorized - recreate when key changes to reset all state
    const editor = useMemo(() => {
        const baseEditor = withHistory(withReact(createEditor()));
        
        // Add template protection normalization
        const { normalizeNode } = baseEditor;
        baseEditor.normalizeNode = ([node, path]) => {
            // Check if this is a protected element that was modified
            if (isTemplateProtected && node && typeof node === 'object' && 'type' in node) {
                const element = node as any;
                if (isProtectedElement(element)) {
                    // Prevent any changes to protected elements
                    // This will be handled by the renderElement function
                    return;
                }
            }
            
            // Call the original normalizeNode
            normalizeNode([node, path]);
        };
        
        return baseEditor;
    }, [editorKey, isTemplateProtected, isProtectedElement]);

    // Update jumpToNextEditable with proper implementation now that editor exists
    const jumpToNextEditable = useCallback(() => {
        if (!editor) return;
        
        try {
            // Ensure editor has valid content
            if (!editor.children || editor.children.length === 0) {
                console.log('Editor has no content, cannot navigate');
                return;
            }
            
            const { selection } = editor;
            if (!selection) return;

            // Find the current protected element
            const matches = Array.from(Editor.nodes(editor, {
                match: (n) => {
                    // Type guard to ensure n is an element
                    if (!SlateElement.isElement(n)) return false;
                    return isProtectedElement(n);
                },
            }));
            const match = matches[0];

            if (!match) return;

            const [, path] = match;

            // Find the next non-protected element
            const next = Editor.next(editor, {
                at: path,
                match: (n) => {
                    // Type guard to ensure n is an element
                    if (!SlateElement.isElement(n)) return false;
                    return !isProtectedElement(n);
                },
            });

            if (next) {
                const [, nextPath] = next;
                
                // Validate that the next path exists and has content
                try {
                    if (Editor.hasPath(editor, nextPath)) {
                        // Try to get the start point safely
                        const startPoint = Editor.start(editor, nextPath);
                        if (startPoint) {
                            Transforms.select(editor, startPoint);
                            ReactEditor.focus(editor);
                        }
                    }
                } catch (nodeError) {
                    console.log('Could not navigate to next node, trying alternative approach');
                    // Fallback: try to select the first editable element
                    try {
                        const firstEditable = Array.from(Editor.nodes(editor, {
                            match: (n) => {
                                // Type guard to ensure n is an element
                                if (!SlateElement.isElement(n)) return false;
                                return !isProtectedElement(n) && Editor.isBlock(editor, n);
                            },
                        }))[0];
                        
                        if (firstEditable) {
                            const [, firstPath] = firstEditable;
                            const startPoint = Editor.start(editor, firstPath);
                            if (startPoint) {
                                Transforms.select(editor, startPoint);
                                ReactEditor.focus(editor);
                            }
                        }
                    } catch (fallbackError) {
                        console.log('Fallback navigation also failed, keeping current selection');
                        // Final fallback: just focus the editor
                        try {
                            ReactEditor.focus(editor);
                        } catch (focusError) {
                            console.log('Could not focus editor');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error jumping to next editable:', error);
            // Final fallback: just focus the editor
            try {
                ReactEditor.focus(editor);
            } catch (focusError) {
                console.log('Could not focus editor');
            }
        }
    }, [editor, isProtectedElement]);

    // Process initialLatexContent if provided
    const initialValue: Descendant[] = useMemo(() => {
        if (initialLatexContent) {
            return latexToSlate(initialLatexContent);
        }
        return [
            {
                type: 'heading-1',
                children: [{ text: 'LaTeX Document' }],
            },
            {
                type: 'paragraph',
                children: [
                    { text: 'This is a sample document. You can edit it in the visual editor.' }
                ],
            },
        ];
    }, [initialLatexContent]);

    // State for editor content - ensure it always has a valid value
    const [value, setValue] = useState<Descendant[]>(() => {
        if (initialValue && initialValue.length > 0) {
            return initialValue;
        }
        return [
            {
                type: 'paragraph',
                children: [{ text: 'Loading...' }],
            },
        ];
    });

    // Always use dark theme
    const editorTheme = 'dark';

    // State for LaTeX code
    const [latexCode, setLatexCode] = useState<string>("");

    // State for preview
    const [showPreview, setShowPreview] = useState<boolean>(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

    // State for rendered preview - set to true by default
    const [showRenderedPreview, setShowRenderedPreview] = useState<boolean>(true);

    // State for rendered output HTML
    const [renderOutput, setRenderOutput] = useState<string>("");

    // State for auto-compile
    const [autoCompile, setAutoCompile] = useState<boolean>(true);

    // Reference for the preview container
    const previewRef = useRef<HTMLDivElement>(null);

    // Reference for the editor container
    const editorRef = useRef<HTMLDivElement>(null);

    // Track empty lines for list handling
    const emptyLineRef = useRef<boolean>(false);

    // Add a ref to track external updates to prevent recursive loops
    const isExternalUpdateRef = useRef<boolean>(false);

    // Add a ref to track the last content to prevent unnecessary updates
    const lastContentRef = useRef<string>('');

    // Add a ref to the text style dropdown
    const textStyleDropdownRef = useRef<HTMLSelectElement>(null);

    // Add state for custom dropdown
    const [showTextStyleDropdown, setShowTextStyleDropdown] = useState(false);
    const customDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0);
    const dropdownItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

    // Changes tracker state
    const [showChangesTracker, setShowChangesTracker] = useState(false);
    const [lastSavedContent, setLastSavedContent] = useState<string>('');
    const [changeTrackingEnabled, setChangeTrackingEnabled] = useState(true);
    
    // Table grid picker popup state
    const [showTableGrid, setShowTableGrid] = useState(false);
    const [tableGridPosition, setTableGridPosition] = useState<{ top: number; left: number } | null>(null);

    // Template protection state
    const [showTemplateProtectionMessage, setShowTemplateProtectionMessage] = useState(false);
    const [protectionMessage, setProtectionMessage] = useState('');

    // Custom Slate elements rendering with template protection
    const Element = useCallback((props: any) => {
        const { attributes, children, element } = props;
        
        // Check if this element should be protected
        const isProtected = isProtectedElement(element);
        
        // If protected, render with protection styling and click handler
        if (isProtected) {
            const baseProps = {
                ...attributes,
                contentEditable: false,
                onClick: handleProtectedElementClick,
                style: { 
                    backgroundColor: "#f0f0f0", 
                    fontWeight: "bold", 
                    cursor: "not-allowed",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    margin: "2px 0",
                    position: "relative"
                }
            };

            switch (element.type) {
                case 'heading-1':
                    return <h1 {...baseProps} className="text-2xl font-bold mt-6 mb-4 text-black">{children}</h1>;
                case 'heading-2':
                    return <h2 {...baseProps} className="text-xl font-bold mt-5 mb-3 text-black">{children}</h2>;
                case 'heading-3':
                    return <h3 {...baseProps} className="text-lg font-bold mt-4 mb-2 text-black">{children}</h3>;
                case 'heading-4':
                    return <h4 {...baseProps} className="text-md font-bold mt-3 mb-2 text-black">{children}</h4>;
                case 'heading-5':
                    return <h5 {...baseProps} className="text-sm font-bold mt-2 mb-1 text-black">{children}</h5>;
                default:
                    return <div {...baseProps} className="text-black">{children}</div>;
            }
        }
        
        // Regular element rendering for non-protected elements
        switch (element.type) {
            case 'heading-1':
                return <h1 {...attributes} className="text-2xl font-bold mt-6 mb-4 text-black">{children}</h1>;
            case 'heading-2':
                return <h2 {...attributes} className="text-xl font-bold mt-5 mb-3 text-black">{children}</h2>;
            case 'heading-3':
                return <h3 {...attributes} className="text-lg font-bold mt-4 mb-2 text-black">{children}</h3>;
            case 'heading-4':
                return <h4 {...attributes} className="text-md font-bold mt-3 mb-2 text-black">{children}</h4>;
            case 'heading-5':
                return <h5 {...attributes} className="text-sm font-bold mt-2 mb-1 text-black">{children}</h5>;
            case 'paragraph-specific':
                return <p {...attributes} className="text-base font-semibold mt-3 mb-1 text-black">{children}</p>;
            case 'subparagraph-specific':
                return <p {...attributes} className="text-sm font-semibold mt-2 mb-1 text-black pl-4">{children}</p>;
            case 'document-title':
                return <h1 {...attributes} className="text-3xl font-bold text-center mt-8 mb-4 text-black">{children}</h1>;
            case 'document-author':
                return <p {...attributes} className="text-xl text-center mb-2 text-black">{children}</p>;
            case 'document-date':
                return <p {...attributes} className="text-lg text-center mb-8 text-black">{children}</p>;
            case 'bullet-list':
                return <ul {...attributes} className="list-disc ml-6 my-3 text-black">{children}</ul>;
            case 'numbered-list':
                return <ol {...attributes} className="list-decimal ml-6 my-3 text-black">{children}</ol>;
            case 'list-item':
                return <li {...attributes} className="text-black">{children}</li>;
            case 'equation':
                return (
                    <div {...attributes} contentEditable={false} className="py-2 text-center">
                        <div
                            className="latex-equation"
                            dangerouslySetInnerHTML={{
                                __html: katex.renderToString(element.formula || '', { throwOnError: false })
                            }}
                        />
                        <span style={{ userSelect: 'none' }}>{children}</span>
                    </div>
                );
            case 'image':
                return (
                    <div {...attributes} contentEditable={false} className="my-4">
                        <div>
                            <img
                                src={element.url}
                                className="max-w-full h-auto"
                                alt={element.caption || "Image"}
                            />
                            <div className="text-sm text-center text-black mt-1">{element.caption || ''}</div>
                        </div>
                        <span style={{ userSelect: 'none' }}>{children}</span>
                    </div>
                );
            case 'table':
                return (
                    <div {...attributes} className="my-4 overflow-x-auto">
                        <table className="border-collapse w-full text-black border border-gray-300 bg-white">
                            <tbody>{children}</tbody>
                        </table>
                    </div>
                );
            case 'table-row':
                return <tr {...attributes} className="border-b border-gray-300 hover:bg-gray-100">{children}</tr>;
            case 'table-cell':
                return <td {...attributes} className="border border-gray-300 px-3 py-2 text-sm align-top text-black">{children}</td>;
            default:
                return <p {...attributes} className="my-2 text-black">{children}</p>;
        }
    }, [isProtectedElement, handleProtectedElementClick]);

    // Reset editor selection when key changes (after revert)
    useEffect(() => {
        if (editorKey > 0) {
            // Reset selection to the beginning of the document
            setTimeout(() => {
                try {
                    if (editor && editor.children.length > 0) {
                        Transforms.select(editor, [0, 0]);
                    }
                } catch (error) {
                    console.log('Error resetting editor selection:', error);
                }
            }, 100);
        }
    }, [editorKey, editor]);

    // Text style options array for dropdown
    const textStyleOptions = [
        { value: 'paragraph', label: 'Normal text', className: 'text-sm' },
        { value: 'heading-2', label: 'Section', className: 'font-bold text-base' },
        { value: 'heading-3', label: 'Subsection', className: 'font-bold text-sm' },
        { value: 'heading-4', label: 'Subsubsection', className: 'font-semibold text-sm' },
        { value: 'paragraph-specific', label: 'Paragraph', className: 'font-medium text-sm' },
        { value: 'subparagraph-specific', label: 'Subparagraph', className: 'font-medium text-xs' },
        { value: 'equation', label: 'Equation', className: 'font-mono text-sm' },
        { value: 'table', label: 'Table', className: 'text-sm' },
        { value: 'bullet-list', label: 'Bullet List', className: 'text-sm' },
        { value: 'numbered-list', label: 'Numbered List', className: 'text-sm' }
    ];

    // Load MathJax if needed
    useEffect(() => {
        if (!window.MathJax) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            script.async = true;
            document.head.appendChild(script);

            return () => {
                // Clean up if component unmounts before script loads
                document.head.removeChild(script);
            };
        }
    }, []);

    // Update editor content when initialLatexContent prop changes
    useEffect(() => {
        if (initialLatexContent) {
            console.log('VisualLatexEditor: initialLatexContent prop changed, updating editor');
            isExternalUpdateRef.current = true; // Mark this as an external update
            const newValue = latexToSlate(initialLatexContent);
            setValue(newValue);
            // Reset the flag after a longer delay to ensure the state update completes
            setTimeout(() => {
                isExternalUpdateRef.current = false;
            }, 200);
        }
    }, [initialLatexContent]);

    // Initial compile on component mount
    useEffect(() => {
        // Compile the document on initial render to display the preview
        compileDocument();
    }, []);

    // Update LaTeX code when content changes
    useEffect(() => {
        const latex = slateToLatex(value);
        console.log('VisualLatexEditor: slateToLatex result:', latex.substring(0, 100) + '...');
        setLatexCode(latex);

        // Call the onContentChange prop if provided, but only if this is not an external update
        // and the content has actually changed
        if (onContentChange && !isExternalUpdateRef.current && latex !== lastContentRef.current) {
            console.log('VisualLatexEditor calling onContentChange with:', latex.substring(0, 100) + '...');
            lastContentRef.current = latex;
            onContentChange(latex);
        } else if (isExternalUpdateRef.current) {
            console.log('VisualLatexEditor skipping onContentChange due to external update');
            lastContentRef.current = latex; // Update the ref even for external updates
        } else if (latex === lastContentRef.current) {
            console.log('VisualLatexEditor skipping onContentChange due to no content change');
        } else {
            console.log('VisualLatexEditor onContentChange prop is not provided');
        }
    }, [value]); // Removed onContentChange dependency to prevent recursive loops

    // Compile the document and update the preview when autoCompile is enabled
    useEffect(() => {
        if (autoCompile && !showPreview) {
            compileDocument();
        }
    }, [latexCode, autoCompile, showPreview]);

    // Track changes when document is saved (either auto-save or manual save)
    useEffect(() => {
        if (isSaving === false && lastContentRef.current && projectId && latexCode) {
            // Only track if we have meaningful changes
            if (hasMeaningfulChanges(projectId, latexCode)) {
                console.log('Document was saved with meaningful changes, tracking version');
                trackSaveEvent();
            } else {
                console.log('Document was saved but no meaningful changes detected');
            }
            // Notify parent component that save is complete
            if (onSaveComplete) {
                onSaveComplete();
            }
        }
    }, [isSaving, onSaveComplete]);

    // Override the onManualSave prop to include change tracking
    const handleManualSave = () => {
        if (onManualSave) {
            onManualSave();
            // Track the save event after a short delay to ensure the save completes
            // Only track if there are meaningful changes
            setTimeout(() => {
                if (changeTrackingEnabled && projectId && latexCode && hasMeaningfulChanges(projectId, latexCode)) {
                    console.log('Manual save completed with meaningful changes, tracking version');
                    trackSaveEvent();
                } else {
                    console.log('Manual save completed but no meaningful changes to track');
                }
            }, 100);
        }
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                if (editor) {
                    try {
                        const { selection } = editor;
                        if (selection) {
                            const domSelection = window.getSelection();
                            if (domSelection && domSelection.rangeCount > 0) {
                                const range = domSelection.getRangeAt(0);
                                const rect = range.getBoundingClientRect();
                                const dropdownHeight = 220; // Estimated height

                                let top = rect.bottom;
                                if (top + dropdownHeight > window.innerHeight) {
                                    top = rect.top - dropdownHeight;
                                }
                                setDropdownPosition({ top, left: rect.left });
                            }
                        }
                    } catch (error) {
                        // Fallback if editor is not focused
                    }
                }
                setShowTextStyleDropdown(true);
                setSelectedDropdownIndex(0);
            }
        };
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [editor]);

    // Handle dropdown keyboard navigation
    useEffect(() => {
        const handleDropdownKeyDown = (e: KeyboardEvent) => {
            if (!showTextStyleDropdown) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedDropdownIndex(prev =>
                        prev < textStyleOptions.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedDropdownIndex(prev =>
                        prev > 0 ? prev - 1 : textStyleOptions.length - 1
                    );
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedDropdownIndex >= 0 && selectedDropdownIndex < textStyleOptions.length) {
                        applyTextStyle(textStyleOptions[selectedDropdownIndex].value);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setShowTextStyleDropdown(false);
                    break;
            }
        };

        if (showTextStyleDropdown) {
            document.addEventListener('keydown', handleDropdownKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleDropdownKeyDown);
        };
    }, [showTextStyleDropdown, selectedDropdownIndex, textStyleOptions.length]);

    // Focus the selected item when selectedDropdownIndex changes
    useEffect(() => {
        if (showTextStyleDropdown && dropdownItemsRef.current[selectedDropdownIndex]) {
            dropdownItemsRef.current[selectedDropdownIndex]?.focus();
        }
    }, [selectedDropdownIndex, showTextStyleDropdown]);

    // Initialize dropdown items ref array when dropdown opens
    useEffect(() => {
        if (showTextStyleDropdown) {
            dropdownItemsRef.current = Array(textStyleOptions.length).fill(null);
        }
    }, [showTextStyleDropdown, textStyleOptions.length]);

    // Handle click outside to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customDropdownRef.current && !customDropdownRef.current.contains(event.target as HTMLElement)) {
                setShowTextStyleDropdown(false);
            }
        };

        if (showTextStyleDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTextStyleDropdown]);

    // Function to apply text style from custom dropdown
    const applyTextStyle = (style: string) => {
        if (style === 'bullet-list') {
            insertList('bullet-list');
            setShowTextStyleDropdown(false);
            return;
        }
        if (style === 'numbered-list') {
            insertList('numbered-list');
            setShowTextStyleDropdown(false);
            return;
        }
        if (style === 'table') {
            insertTable(3, 3); // Default 3x3 table
            setShowTextStyleDropdown(false);
            return;
        }
        toggleBlock(style as CustomElement['type']);
        setShowTextStyleDropdown(false);
    };

    // Process LaTeX content for HTML preview
    const processLatexContent = useCallback((latex: string) => {
        try {
            // Extract content between \begin{document} and \end{document}
            const documentContent = latex.split('\\begin{document}')[1]?.split('\\end{document}')[0] || '';

            // Get the title, author, and date if present
            const titleMatch = latex.match(/\\title{(.*?)}/);
            const authorMatch = latex.match(/\\author{(.*?)}/);
            const dateMatch = latex.match(/\\date{(.*?)}/);

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

            // Process matrices
            processedContent = processedContent.replace(
                /\\begin{pmatrix}([\s\S]*?)\\end{pmatrix}/g,
                (match, matrixContent) => {
                    try {
                        // Format matrix content for KaTeX
                        const formattedMatrix = `\\begin{pmatrix}${matrixContent}\\end{pmatrix}`;
                        return katex.renderToString(formattedMatrix, {
                            displayMode: true,
                            throwOnError: false
                        });
                    } catch (e) {
                        return `<div class="error">Error rendering matrix: ${matrixContent}</div>`;
                    }
                }
            );

            // Process itemize lists
            processedContent = processedContent.replace(
                /\\begin{itemize}([\s\S]*?)\\end{itemize}/g,
                (match, listContent) => {
                    // Extract items
                    const items = listContent.split('\\item')
                        .map((item: string) => item.trim())
                        .filter((item: string) => item.length > 0);

                    // Create HTML list
                    return `
                        <ul class="latex-itemize">
                            ${items.map((item: string) => `<li>${item}</li>`).join('')}
                        </ul>
                    `;
                }
            );

            // Process enumerate lists - improved version
            processedContent = processedContent.replace(
                /\\begin{enumerate}([\s\S]*?)\\end{enumerate}/g,
                (match, listContent) => {
                    try {
                        // Extract items
                        const items = listContent.split('\\item')
                            .map((item: string) => item.trim())
                            .filter((item: string) => item.length > 0);

                        // Create HTML ordered list with proper styling
                        return `
                            <ol class="latex-enumerate" style="list-style-type: decimal; margin-left: 2em; margin-top: 0.5em; margin-bottom: 0.5em;">
                                ${items.map((item: string) => `<li style="margin-bottom: 0.25em;">${item}</li>`).join('')}
                            </ol>
                        `;
                    } catch (e) {
                        console.error("Error processing enumerate list:", e);
                        return match; // Return the original if there's an error
                    }
                }
            );

            // Process equations (simple approach)
            processedContent = processedContent.replace(
                /\$\$(.*?)\$\$/g,
                (match, equation) => {
                    try {
                        return katex.renderToString(equation, {
                            displayMode: true,
                            throwOnError: false
                        });
                    } catch (e) {
                        return match; // Return the original if there's an error
                    }
                }
            );

            // Process LaTeX tables
            processedContent = processedContent.replace(
                /\\begin{tabular}([^}]*)\{([^}]*)\}([\s\S]*?)\\end{tabular}/g,
                (match, tableSpec, columnSpec, tableContent) => {
                    try {
                        // Parse column specification
                        const columns = columnSpec.split('|').filter((col: string) => col.trim() !== '');
                        const columnCount = columns.length;
                        
                        // Clean up table content - handle various row separators
                        let cleanTableContent = tableContent
                            .replace(/\\hline/g, '') // Remove horizontal lines
                            .replace(/\\\s*\\/g, '\\\\') // Fix broken row separators like \ \
                            .replace(/\\\\\s*\\\\/g, '\\\\'); // Remove duplicate separators
                        
                        // Split table content into rows
                        const rows = cleanTableContent.split('\\\\').filter((row: string) => row.trim() !== '');
                        
                        // Process each row
                        const processedRows = rows.map((row: string) => {
                            // Split row by & and filter out empty cells
                            const cells = row.split('&').map(cell => cell.trim()).filter(cell => cell !== '');
                            
                            // Ensure we have the right number of cells
                            while (cells.length < columnCount) {
                                cells.push('');
                            }
                            
                            // Create table row HTML
                            return `<tr>${cells.map(cell => `<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${cell}</td>`).join('')}</tr>`;
                        }).join('');
                        
                        // Create table HTML with proper styling
                        return `
                            <table style="border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid #ddd;">
                                <tbody>
                                    ${processedRows}
                                </tbody>
                            </table>
                        `;
                    } catch (e) {
                        console.error("Error processing table:", e);
                        return `<div class="error">Error rendering table: ${e}</div>`;
                    }
                }
            );

            // Pre-process all text formatting
            processedContent = processedContent
                .replace(/\\textbf{([^}]*)}/g, '<span class="latex-bold">$1</span>')
                .replace(/\\textit{([^}]*)}/g, '<span class="latex-italic">$1</span>')
                .replace(/\\underline{([^}]*)}/g, '<span class="latex-underline">$1</span>')
                .replace(/\\emph{([^}]*)}/g, '<span class="latex-emph">$1</span>')
                .replace(/\\texttt{([^}]*)}/g, '<span class="latex-monospace">$1</span>')
                .replace(/\\textrm{([^}]*)}/g, '<span class="latex-roman">$1</span>')
                .replace(/\\textsf{([^}]*)}/g, '<span class="latex-sans">$1</span>')
                .replace(/\\texttt{([^}]*)}/g, '<span class="latex-typewriter">$1</span>')
                .replace(/\\small{([^}]*)}/g, '<span class="latex-small">$1</span>')
                .replace(/\\normalsize{([^}]*)}/g, '<span class="latex-normalsize">$1</span>')
                .replace(/\\large{([^}]*)}/g, '<span class="latex-large">$1</span>')
                .replace(/\\huge{([^}]*)}/g, '<span class="latex-huge">$1</span>');

            // Process all section types
            processedContent = processedContent.replace(/\\section{([^}]+)}/g, '<h2>$1</h2>');
            processedContent = processedContent.replace(/\\subsection{([^}]+)}/g, '<h3>$1</h3>');
            processedContent = processedContent.replace(/\\subsubsection{([^}]+)}/g, '<h4>$1</h4>');
            processedContent = processedContent.replace(/\\paragraph{([^}]+)}/g, '<h5>$1</h5>');
            processedContent = processedContent.replace(/\\subparagraph{([^}]+)}/g, '<h6>$1</h6>');

            // Create title block if \maketitle was used
            const titleBlock = hasTitleSection ? `
                <div class="latex-title">
                    <h1>${title}</h1>
                    <p class="author">By ${author}</p>
                    ${date ? `<p class="date">${date}</p>` : ''}
                </div>
            ` : '';

            // Process inline math with KaTeX
            processedContent = processedContent.replace(/\$(.+?)\$/g, (match, formula) => {
                try {
                    return katex.renderToString(formula.trim(), { throwOnError: false });
                } catch (e) {
                    return match; // Return the original if there's an error
                }
            });

            // Process common LaTeX commands
            processedContent = processedContent
                .replace(/\\newline/g, '<br>')
                .replace(/\\linebreak/g, '<br>')
                .replace(/\\pagebreak/g, '<div style="page-break-before: always;"></div>')
                .replace(/\\clearpage/g, '<div style="page-break-before: always;"></div>')
                .replace(/\\newpage/g, '<div style="page-break-before: always;"></div>');

            // Combine the title block and processed content
            return titleBlock + processedContent;
        } catch (error) {
            console.error('Error rendering LaTeX:', error);
            return '<div class="error">Error rendering LaTeX</div>';
        }
    }, []);

    // Function to manually compile
    const compileDocument = () => {
        const processedHTML = processLatexContent(latexCode);
        setRenderOutput(processedHTML);

        // Apply MathJax typesetting to the preview after HTML has been updated
        setTimeout(() => {
            if (previewRef.current) {
                if (window.MathJax) {
                    window.MathJax.typesetPromise([previewRef.current]).catch((err) => {
                        console.error('MathJax typesetting error:', err);
                    });
                }
            }
        }, 100);
    };

    // Change tracking functions
    const trackDocumentChange = (content: string) => {
        if (!projectId) return;

        // Determine change type based on content comparison
        let changeType: 'insertion' | 'deletion' | 'modification' | 'save' = 'modification';
        let changeDescription = 'Document modified';

        if (lastSavedContent === '') {
            changeType = 'save';
            changeDescription = 'Document created';
        } else if (content.length > lastSavedContent.length) {
            changeType = 'insertion';
            changeDescription = 'Content added';
        } else if (content.length < lastSavedContent.length) {
            changeType = 'deletion';
            changeDescription = 'Content removed';
        }

        // Add version to tracking
        addLatexProjectVersion(
            projectId,
            content,
            user?.id,
            user?.role,
            `Modified by ${user?.name || user?.email || 'user'}`,
            changeType,
            changeDescription
        );

        // Update last saved content
        setLastSavedContent(content);
    };

    const handleRevertToVersion = (content: string) => {
        console.log('VisualLatexEditor: Reverting to version with content length:', content.length);
        
        // Update the editor with the reverted content
        isExternalUpdateRef.current = true;
        const newValue = latexToSlate(content);
        
        // Update all states immediately for instant feedback
        setValue(newValue);
        setLatexCode(content);
        setLastSavedContent(content);
        lastContentRef.current = content;
        
        // Force Slate editor to re-render by changing the key
        setEditorKey(prev => prev + 1);
        
        // Explicitly notify parent component about the content change
        if (onContentChange) {
            onContentChange(content);
        }
        
        // Force a complete re-render by updating the render output immediately
        if (autoCompile) {
            // Force immediate compilation and preview update
            setTimeout(() => {
                compileDocument();
            }, 0);
        }
        
        // Reset the flag after a longer delay to ensure all updates complete
        setTimeout(() => {
            isExternalUpdateRef.current = false;
        }, 500);
    };

    // Function to track changes when document is saved
    const trackSaveEvent = () => {
        if (changeTrackingEnabled && projectId && latexCode) {
            // Check if there are meaningful changes before creating a version
            if (hasMeaningfulChanges(projectId, latexCode)) {
                console.log('Tracking save event for project:', projectId, 'Content length:', latexCode.length);
                trackDocumentChange(latexCode);
            } else {
                console.log('Skipping version tracking - no meaningful changes detected');
            }
        } else {
            console.log('Skipping version tracking - tracking disabled or no project ID');
        }
    };

    // Format toggling functions
    const toggleFormat = (format: keyof Omit<CustomText, 'text'>) => {
        const isActive = isFormatActive(format);

        if (isActive) {
            Editor.removeMark(editor, format);
        } else {
            Editor.addMark(editor, format, true);
        }
    };

    const isFormatActive = (format: keyof Omit<CustomText, 'text'>) => {
        const marks = Editor.marks(editor);
        return marks ? marks[format] === true : false;
    };

    // Block type functions
    const toggleBlock = (type: CustomElement['type']) => {
        const isActive = isBlockActive(type);

        Transforms.setNodes(
            editor,
            { type: isActive ? 'paragraph' : type } as Partial<SlateElement>,
            { match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n) }
        );
    };

    const isBlockActive = (type: CustomElement['type']) => {
        const [match] = Array.from(Editor.nodes(editor, {
            match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === type,
        }));

        return !!match;
    };

    // Insert functions
    const insertImage = () => {
        const url = window.prompt('Enter image URL:');
        if (!url) return;

        const caption = window.prompt('Enter image caption:');

        Transforms.insertNodes(editor, {
            type: 'image',
            url,
            caption,
            children: [{ text: '' }],
        } as ImageElement);
    };

    const insertTable = (rows: number, cols: number) => {
        const tableRows: TableRowElement[] = [];

        for (let i = 0; i < rows; i++) {
            const tableCells: TableCellElement[] = [];
            for (let j = 0; j < cols; j++) {
                tableCells.push({
                    type: 'table-cell',
                    children: [{ text: '' }],
                });
            }
            tableRows.push({
                type: 'table-row',
                children: tableCells,
            });
        }

        Transforms.insertNodes(editor, {
            type: 'table',
            rows,
            cols,
            children: tableRows,
        } as TableElement);
    };

    // Function to insert process management table template
    const insertProcessTable = () => {
        const tableName = window.prompt('Enter table name (optional):', 'Process Details Table');
        
        // Create header row with process details columns
        const headerRow: TableRowElement = {
            type: 'table-row',
            children: [
                { type: 'table-cell', children: [{ text: 'Process Name', bold: true }] },
                { type: 'table-cell', children: [{ text: 'Description', bold: true }] },
                { type: 'table-cell', children: [{ text: 'Process Owner', bold: true }] },
                { type: 'table-cell', children: [{ text: 'Process Manager', bold: true }] },
            ],
        };

        // Create 1 data row with empty cells
        const dataRow: TableRowElement = {
            type: 'table-row',
            children: [
                { type: 'table-cell', children: [{ text: '' }] },
                { type: 'table-cell', children: [{ text: '' }] },
                { type: 'table-cell', children: [{ text: '' }] },
                { type: 'table-cell', children: [{ text: '' }] },
            ],
        };

        // Combine header and data row
        const allRows = [headerRow, dataRow];

        Transforms.insertNodes(editor, {
            type: 'table',
            rows: 2, // 1 header + 1 data row
            cols: 4,
            children: allRows,
        } as TableElement);
    };

    const insertEquation = () => {
        const formula = window.prompt('Enter LaTeX formula:', 'E = mc^2');
        if (!formula) return;

        Transforms.insertNodes(editor, {
            type: 'equation',
            formula,
            children: [{ text: '' }],
        } as EquationElement);
    };

    // Insert list
    const insertList = (type: 'bullet-list' | 'numbered-list') => {
        // Check if we're already in a list and exit if we are
        const listNodeEntry = Editor.nodes(editor, {
            match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                (n.type === 'bullet-list' || n.type === 'numbered-list')
        });

        // Convert iterator to array to check if there's a match
        const listNode = Array.from(listNodeEntry)[0];

        if (listNode) {
            // If we're already in a list, convert to a paragraph instead
            try {
                Transforms.unwrapNodes(editor, {
                    match: n =>
                        !Editor.isEditor(n) &&
                        SlateElement.isElement(n) &&
                        (n.type === 'bullet-list' || n.type === 'numbered-list'),
                    split: true,
                });

                // Convert list items to paragraphs
                Transforms.setNodes(
                    editor,
                    { type: 'paragraph' },
                    {
                        match: n =>
                            !Editor.isEditor(n) &&
                            SlateElement.isElement(n) &&
                            n.type === 'list-item',
                    }
                );
            } catch (error) {
                console.error("Error unwrapping list:", error);
            }
            return;
        }

        // Get current selection to determine where to insert the list
        const { selection } = editor;

        // Create a new list with a single item
        try {
            // Get the current paragraph text if any
            let initialText = '';
            if (selection) {
                const [start] = Range.edges(selection);
                const nodeEntry = Editor.node(editor, start.path);
                if (nodeEntry) {
                    const [node] = nodeEntry;
                    if (SlateElement.isElement(node) && node.type === 'paragraph') {
                        initialText = Node.string(node);

                        // Delete the current paragraph if it has content
                        if (initialText.trim()) {
                            Transforms.delete(editor, {
                                at: {
                                    anchor: Editor.start(editor, start.path),
                                    focus: Editor.end(editor, start.path)
                                }
                            });
                        }
                    }
                }
            }

            // Use the existing text or default to an empty list item
            const listItemText = initialText.trim() || '';

            // Create the list item
            const listItemElement: ListItemElement = {
                type: 'list-item',
                children: [{ text: listItemText }],
            };

            // Create the appropriate list type
            if (type === 'bullet-list') {
                const bulletList: BulletListElement = {
                    type: 'bullet-list',
                    children: [listItemElement],
                };
                Transforms.insertNodes(editor, bulletList);
            } else {
                const numberedList: NumberedListElement = {
                    type: 'numbered-list',
                    children: [listItemElement],
                };
                Transforms.insertNodes(editor, numberedList);
            }

            // Set cursor at the end of the list item
            if (!listItemText) {
                // If empty, just move to the first list item
                const point = { path: [editor.children.length - 1, 0, 0], offset: 0 };
                Transforms.select(editor, point);
            } else {
                // Move to the end of the text
                const point = { path: [editor.children.length - 1, 0, 0], offset: listItemText.length };
                Transforms.select(editor, point);
            }
        } catch (error) {
            console.error("Error creating list:", error);
        }
    };

    // Export as PDF
    const exportPdf = () => {
        if (editorRef.current) {
            html2canvas(editorRef.current).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF();
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save("latex-document.pdf");
            });
        }
    };

    // Helper UI components
    const ToolbarButton = ({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) => (
        <button
            onClick={onClick}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title={title}
        >
            {icon}
        </button>
    );

    // Apply font family
    const applyFontFamily = (fontFamily: string) => {
        Editor.addMark(editor, 'fontFamily', fontFamily);
    };

    // Style dropdown options
    const handleTextStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const style = e.target.value;
        if (style === 'bullet-list') {
            insertList('bullet-list');
            return;
        }
        if (style === 'numbered-list') {
            insertList('numbered-list');
            return;
        }
        if (style === 'table') {
            insertTable(3, 3); // Default 3x3 table
            return;
        }
        switch (style) {
            case 'paragraph':
                toggleBlock('paragraph');
                break;
            case 'heading-1':
                toggleBlock('heading-1');
                break;
            case 'heading-2':
                toggleBlock('heading-2');
                break;
            case 'heading-3':
                toggleBlock('heading-3');
                break;
            case 'heading-4':
                toggleBlock('paragraph-specific');
                break;
            case 'heading-5':
                toggleBlock('subparagraph-specific');
                break;
            case 'equation':
                insertEquation();
                break;
            default:
                break;
        }
    };

    // Font family dropdown handler
    const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const fontFamily = e.target.value;
        if (fontFamily !== 'default') {
            applyFontFamily(fontFamily);
        }
    };

    // Improve the handleKeyDown function to exit lists on double Enter
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        // Handle Enter key in lists
        if (event.key === 'Enter' && !event.shiftKey) {
            const listItemEntry = Editor.nodes(editor, {
                match: n =>
                    !Editor.isEditor(n) &&
                    SlateElement.isElement(n) &&
                    n.type === 'list-item'
            });

            // Convert iterator to array to check if there's a match
            const listItemArray = Array.from(listItemEntry);

            if (listItemArray.length > 0) {
                const [node, path] = listItemArray[0];
                const isEmpty = Node.string(node).trim() === '';

                // If the current line is empty and the previous line was also empty (double Enter)
                if (isEmpty && emptyLineRef.current) {
                    event.preventDefault();

                    try {
                        // Find the parent list element
                        const listEntry = Editor.nodes(editor, {
                            match: n =>
                                !Editor.isEditor(n) &&
                                SlateElement.isElement(n) &&
                                (n.type === 'bullet-list' || n.type === 'numbered-list'),
                            at: path.slice(0, -1)
                        });

                        const listArray = Array.from(listEntry);

                        if (listArray.length > 0) {
                            // Exit the list
                            Transforms.unwrapNodes(editor, {
                                match: n =>
                                    !Editor.isEditor(n) &&
                                    SlateElement.isElement(n) &&
                                    (n.type === 'bullet-list' || n.type === 'numbered-list'),
                                split: true,
                                at: path
                            });

                            // Convert the empty list item to a paragraph
                            Transforms.setNodes(
                                editor,
                                { type: 'paragraph' },
                                { at: path }
                            );
                        }

                        // Reset the empty line flag
                        emptyLineRef.current = false;
                    } catch (error) {
                        console.error("Error exiting list:", error);
                    }
                    return;
                }

                // Set the empty line flag if the current line is empty
                emptyLineRef.current = isEmpty;
            } else {
                // Reset the empty line flag when not in a list
                emptyLineRef.current = false;
            }
        } else {
            // Reset the empty line flag for non-Enter keys
            emptyLineRef.current = false;
        }

        // Handle Escape key to exit lists
        if (event.key === 'Escape') {
            const listItemEntry = Editor.nodes(editor, {
                match: n =>
                    !Editor.isEditor(n) &&
                    SlateElement.isElement(n) &&
                    n.type === 'list-item'
            });

            const listItemArray = Array.from(listItemEntry);

            if (listItemArray.length > 0) {
                event.preventDefault();

                try {
                    // Exit the list
                    Transforms.unwrapNodes(editor, {
                        match: n =>
                            !Editor.isEditor(n) &&
                            SlateElement.isElement(n) &&
                            (n.type === 'bullet-list' || n.type === 'numbered-list'),
                        split: true,
                    });

                    // Convert all list items to paragraphs
                    Transforms.setNodes(
                        editor,
                        { type: 'paragraph' },
                        {
                            match: n =>
                                !Editor.isEditor(n) &&
                                SlateElement.isElement(n) &&
                                n.type === 'list-item',
                        }
                    );
                } catch (error) {
                    console.error("Error exiting list with Escape:", error);
                }
                return;
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-white text-black">
            {/* Header */}
            <div className="flex items-center px-4 py-2 bg-gray-100 border-gray-300">
                <h2 className="text-lg font-medium flex items-center mr-4 text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-gray-800">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <line x1="10" y1="9" x2="8" y2="9"></line>
                    </svg>
                    Visual Editor
                </h2>

                {/* Editor Mode Switch - moved closer to the title */}
                {onEditorModeChange && (
                    <EditorModeSwitch
                        mode={editorMode || 'visual'}
                        onModeChange={onEditorModeChange}
                    />
                )}

                <div className="ml-auto flex items-center space-x-2">
                    <button
                        onClick={() => {
                            compileDocument();
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
                    >
                        <FaEye className="mr-1" /> Refresh Preview
                    </button>
                    <button
                        onClick={exportPdf}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                        Download PDF
                    </button>
                    <button
                        onClick={() => { }}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center"
                    >
                        <FaFileWord className="mr-1" /> Download Word
                    </button>
                    <button
                        onClick={() => { }}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition flex items-center"
                    >
                        <FaFileImport className="mr-1" /> Import Word
                    </button>
                </div>
            </div>

            {/* Main Toolbar */}
            <div className="toolbar-container bg-gray-50 border-gray-300 flex-shrink-0">
                {/* First row of toolbar */}
                <div className="flex items-center px-3 py-2 flex-wrap gap-2">
                    {/* Text style dropdown */}
                    <div className="toolbar-group flex items-center">
                        <div className="relative">
                            <div className="flex items-center">
                                <select
                                    ref={textStyleDropdownRef}
                                    className="w-32 bg-white text-gray-800 border border-gray-300 rounded py-1 pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    defaultValue="paragraph"
                                    onChange={handleTextStyleChange}
                                >
                                    <option value="paragraph">Normal text</option>
                                    <option value="heading-1">Section</option>
                                    <option value="heading-2">Subsection</option>
                                    <option value="heading-3">Subsubsection</option>
                                    <option value="paragraph-specific">Paragraph</option>
                                    <option value="subparagraph-specific">Subparagraph</option>
                                    <option value="equation">Equation</option>
                                    <option value="table">Table</option>
                                    <option value="bullet-list">Bullet List</option>
                                    <option value="numbered-list">Numbered List</option>
                                </select>
                                {/* Dropdown arrow */}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Custom dropdown menu */}
                            {showTextStyleDropdown && (
                                <div
                                    ref={customDropdownRef}
                                    className="absolute z-50 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg py-1 text-gray-800"
                                    style={{ left: '0', top: '100%' }}
                                >
                                    <div className="py-1 px-2 text-xs text-gray-500 border-b border-gray-300">Text Style (Ctrl+/)</div>
                                    {textStyleOptions.map((option, index) => (
                                        <button
                                            key={index}
                                            ref={el => {
                                                dropdownItemsRef.current[index] = el;
                                                return undefined;
                                            }}
                                            className={`w-full text-left px-4 py-1 hover:bg-gray-100 flex items-center ${selectedDropdownIndex === index ? 'bg-gray-100' : ''} ${option.className}`}
                                            onClick={() => applyTextStyle(option.value)}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Text formatting */}
                    <div className="toolbar-group flex space-x-1">
                        <button
                            onClick={() => toggleFormat('bold')}
                            className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            title="Bold"
                        >
                            <FaBold size={14} />
                        </button>
                        <button
                            onClick={() => toggleFormat('italic')}
                            className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            title="Italic"
                        >
                            <FaItalic size={14} />
                        </button>
                        <button
                            onClick={() => toggleFormat('underline')}
                            className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            title="Underline"
                        >
                            <FaUnderline size={14} />
                        </button>
                    </div>

                    {/* Font family dropdown */}
                    <div className="toolbar-group flex items-center">
                        <div className="relative">
                            <div className="flex items-center">
                                <select
                                    className="w-32 bg-white text-gray-800 border border-gray-300 rounded py-1 pl-8 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    defaultValue="default"
                                    onChange={handleFontFamilyChange}
                                >
                                    <option value="default" disabled>Font</option>
                                    <option value="Arial, sans-serif">Sans Serif</option>
                                    <option value="'Times New Roman', serif">Roman</option>
                                    <option value="'Courier New', monospace">Typewriter</option>
                                    <option value="Georgia, serif">Georgia</option>
                                    <option value="Verdana, sans-serif">Verdana</option>
                                    <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
                                </select>
                                <div className="pointer-events-none absolute left-2 flex items-center">
                                    <FaFont size={14} className="text-gray-600" />
                                </div>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lists */}
                    <div className="toolbar-group flex space-x-1">
                        <button
                            onClick={() => insertList('bullet-list')}
                            className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            title="Bullet List"
                        >
                            <FaList size={14} />
                        </button>
                        <button
                            onClick={() => insertList('numbered-list')}
                            className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            title="Numbered List"
                        >
                            <FaListOl size={14} />
                        </button>
                    </div>

                    {/* Table grid picker button */}
                    <div className="toolbar-group relative">
                    <button
                            onClick={e => {
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setTableGridPosition({
                                    top: rect.bottom + window.scrollY + 4,
                                    left: rect.left + window.scrollX,
                                });
                                setShowTableGrid(true);
                            }}
                        className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                        title="Insert Table"
                    >
                        <FaTable size={14} />
                        </button>
                        {showTableGrid && tableGridPosition && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 40,
                                    left: 0,
                                    zIndex: 1000,
                                }}
                            >
                                <TableGridPicker
                                    onSelect={(rows, cols) => {
                                        insertTable(rows, cols);
                                        setShowTableGrid(false);
                                    }}
                                    onClose={() => setShowTableGrid(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Process Table button */}
                    <button
                        onClick={insertProcessTable}
                        className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                        title="Insert Process Management Table"
                    >
                        📋
                    </button>

                    {/* Image button */}
                    <button
                        onClick={insertImage}
                        className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                        title="Insert Image"
                    >
                        <FaImage size={14} />
                    </button>

                    {/* Equation button */}
                    <button
                        onClick={insertEquation}
                        className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                        title="Insert Equation"
                    >
                        <FaRulerHorizontal size={14} />
                    </button>

                    {/* Changes Tracker button */}
                    <button
                        onClick={() => setShowChangesTracker(true)}
                        className={`p-2 rounded transition ${
                            projectId 
                                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100' 
                                : 'bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed'
                        }`}
                        title={projectId ? "Track Changes History" : "No project selected"}
                        disabled={!projectId}
                    >
                        <FaHistory size={14} />
                    </button>

                    <div className="flex-1"></div>

                    {/* Preview toggles */}
                    <div className="flex items-center space-x-2 mr-3">
                        <button
                            onClick={() => {
                                setShowPreview(!showPreview);
                                if (!showPreview) {
                                    // When switching to rendered preview, refresh it
                                    setTimeout(() => compileDocument(), 0);
                                }
                            }}
                            className="p-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            title={showPreview ? "Show Rendered Preview (PDF-like)" : "Show LaTeX Code"}
                        >
                            {showPreview ? <FaEye size={14} /> : <FaFileAlt size={14} />}
                        </button>

                    </div>

                    {/* Compile controls */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-700 text-sm">Auto-compile</span>
                            <Switch
                                checked={autoCompile}
                                onCheckedChange={setAutoCompile}
                            />
                        </div>

                        {/* Auto-save indicator */}
                        {isSaving && (
                            <div className="flex items-center space-x-2 text-green-600 text-sm">
                                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                                <span>Auto-saving...</span>
                            </div>
                        )}

                        <button
                            onClick={compileDocument}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center space-x-1"
                            disabled={autoCompile}
                        >
                            <FaPlay size={12} />
                            <span>Compile</span>
                        </button>

                        {/* Manual save button */}
                        {onManualSave && (
                            <button
                                onClick={handleManualSave}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center space-x-1"
                                disabled={isSaving}
                            >
                                <FaFileAlt size={12} />
                                <span>Save</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor and Preview */}
            <div className="flex flex-1 overflow-hidden">
                {/* Visual Editor - always take up half the width */}
                <div
                    className="w-1/2 h-full overflow-auto p-6 bg-white text-black"
                    ref={editorRef}
                >
                    <Slate
                        key={editorKey}
                        editor={editor}
                        initialValue={value || [
                            {
                                type: 'paragraph',
                                children: [{ text: 'Loading...' }],
                            },
                        ]}
                        onChange={newValue => setValue(newValue)}
                    >
                        <Editable
                            renderElement={Element}
                            renderLeaf={Leaf}
                            placeholder="Start writing your document..."
                            className="min-h-full outline-none"
                            onKeyDown={handleKeyDown}
                            style={{ caretColor: '#000' }}
                        />
                    </Slate>
                </div>

                {/* LaTeX Code Preview */}
                {showPreview && (
                    <div className={`w-1/2 h-full border-l border-gray-700 overflow-auto p-4 ${editorTheme === 'dark' ? 'bg-[#1e1e1e] text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                            {latexCode}
                        </pre>
                    </div>
                )}

                {/* Rendered Preview */}
                {!showPreview && (
                    <div className="w-1/2 h-full border-l border-gray-700 overflow-auto" ref={previewRef}>
                        <div className="latex-preview bg-white h-full overflow-y-auto overflow-x-auto p-8 custom-scrollbar">
                            <div dangerouslySetInnerHTML={{ __html: renderOutput }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Template Protection Message */}
            {showTemplateProtectionMessage && (
                <div className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-lg max-w-sm">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium">{protectionMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .latex-preview {
                  font-family: 'Times New Roman', Times, serif;
                  line-height: 1.5;
                  color: #333;
                }
                
                .latex-preview h1 {
                  font-size: 24px;
                  text-align: center;
                  margin-bottom: 8px;
                }
                
                .latex-preview .latex-title {
                  text-align: center;
                  margin-bottom: 32px;
                  border-bottom: 1px solid #eee;
                  padding-bottom: 16px;
                }
                
                .latex-preview .author {
                  text-align: center;
                  margin-bottom: 4px;
                }
                
                .latex-preview .date {
                  text-align: center;
                  margin-bottom: 24px;
                  font-style: italic;
                }
                
                .latex-preview h2 {
                  font-size: 24px;
                  font-weight: bold;
                  margin-top: 24px;
                  margin-bottom: 12px;
                  color: #333;
                }
                
                .latex-preview h3 {
                  font-size: 20px;
                  font-weight: bold;
                  margin-top: 20px;
                  margin-bottom: 10px;
                  color: #333;
                }
                
                .latex-preview h4 {
                  font-size: 18px;
                  font-weight: bold;
                  margin-top: 18px;
                  margin-bottom: 9px;
                  color: #333;
                }
                
                .latex-preview h5 {
                  font-size: 16px;
                  font-weight: bold;
                  margin-top: 16px;
                  margin-bottom: 8px;
                  color: #333;
                }
                
                .latex-preview .latex-bold {
                  font-weight: bold;
                }
                
                .latex-preview .latex-italic {
                  font-style: italic;
                }
                
                .latex-preview .latex-underline {
                  text-decoration: underline;
                }
                
                .latex-preview ul, .latex-preview ol {
                  margin-left: 20px;
                  margin-bottom: 16px;
                }
                
                .latex-preview ul li, .latex-preview ol li {
                  margin-bottom: 4px;
                }
                
                .latex-preview table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 20px 0;
                  border: 1px solid #ddd;
                }
                
                .latex-preview table td {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                  vertical-align: top;
                }
                
                .latex-preview table th {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                  font-weight: bold;
                  background-color: #f8f9fa;
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                  height: 8px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #f1f1f1;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #888;
                  border-radius: 4px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #555;
                }
            `}</style>

            {/* Changes Tracker Modal */}
            <ChangesTracker
                projectId={projectId || ''}
                isOpen={showChangesTracker}
                onClose={() => setShowChangesTracker(false)}
                onRevert={handleRevertToVersion}
                currentContent={latexCode}
                userId={user?.id}
                userRole={user?.role}
            />
        </div>
    );
};

export default VisualLatexEditor; 