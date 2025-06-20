'use client';

import React, { useState, useEffect, useRef } from 'react';
import LatexEditor from './LatexEditor';
import VisualLatexEditor from './VisualLatexEditor';
import EditorModeSwitch from './ui/EditorModeSwitch';
import { cleanLatexContent } from '../utils/latexCleaner';

const CombinedLatexEditor = () => {
    // Initial content for the editor
    const initialContent = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{LaTeX Document}
\\author{Author}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a sample LaTeX document. You can edit it in the editor.

\\end{document}`;

    // Single source of truth for the editor content
    const [latexContent, setLatexContent] = useState<string>(initialContent);

    // Track if the editor has been initialized
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Reference to track the last editor that made changes
    const latestContentRef = useRef(initialContent);

    // State to track which editor is active
    const [activeEditor, setActiveEditor] = useState<'code' | 'visual'>('code');

    // Reference to store code editor instance
    const codeEditorRef = useRef<any>(null);

    // Reference to store visual editor instance
    const visualEditorRef = useRef<any>(null);

    // On component mount, set initialized flag
    useEffect(() => {
        if (!isInitialized) {
            console.log('CombinedLatexEditor: Initializing with content:', initialContent.substring(0, 50) + '...');
            setIsInitialized(true);
        }
    }, []);

    // When content changes in either editor
    const handleCodeEditorChange = (content: string) => {
        console.log('Code editor changed', content.substring(0, 50) + '...');
        latestContentRef.current = content;
        setLatexContent(content);
    };

    const handleVisualEditorChange = (content: string) => {
        console.log('Visual editor changed', content.substring(0, 50) + '...');
        latestContentRef.current = content;
        setLatexContent(content);
    };

    // Keep latestContentRef in sync with latexContent
    useEffect(() => {
        latestContentRef.current = latexContent;
    }, [latexContent]);

    // Store editor instance for code editor
    const handleCodeEditorMount = (editor: any) => {
        console.log('Code editor mounted');
        codeEditorRef.current = editor;
    };

    // Store editor instance for visual editor
    const handleVisualEditorMount = (editor: any) => {
        console.log('Visual editor mounted');
        visualEditorRef.current = editor;
    };

    // When switching editors, ensure we're using the most up-to-date content
    const handleEditorSwitch = (editorType: 'code' | 'visual') => {
        if (editorType === activeEditor) return;

        // Set the active editor immediately for better user feedback
        setActiveEditor(editorType);

        // Clean up LaTeX content when switching to visual editor
        if (editorType === 'visual') {
            // Process the LaTeX content to ensure commands are properly formatted
            const cleanedContent = cleanLatexContent(latexContent);

            // Update the content with the cleaned version
            setLatexContent(cleanedContent);
        }

        // Log for debugging
        console.log(`Switching to ${editorType} editor with content:`, latestContentRef.current.substring(0, 50) + '...');
    };

    return (
        <div className="flex flex-col h-full">
            {/* Editor Container */}
            <div className="flex-1 overflow-hidden">
                {activeEditor === 'code' && (
                    <div className="h-full w-full">
                        <LatexEditor
                            initialContent={latexContent || initialContent}
                            onContentChange={handleCodeEditorChange}
                            key={`latex-editor-${isInitialized}`}
                            editorMode={activeEditor}
                            onEditorModeChange={handleEditorSwitch}
                        />
                    </div>
                )}

                {activeEditor === 'visual' && (
                    <div className="h-full w-full">
                        <VisualLatexEditor
                            initialLatexContent={cleanLatexContent(latexContent) || initialContent}
                            onContentChange={handleVisualEditorChange}
                            key={`visual-editor-${isInitialized}`}
                            editorMode={activeEditor}
                            onEditorModeChange={handleEditorSwitch}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CombinedLatexEditor; 