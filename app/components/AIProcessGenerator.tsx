'use client';

import { useState, useRef, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineMicrophone, HiOutlineVolumeUp, HiArrowUp, HiOutlinePhotograph, HiOutlineDocumentText, HiOutlineTemplate } from 'react-icons/hi';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIProcessGenerator() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea function
  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // Max height of 200px
    }
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    autoResize();
  };

  // Auto-resize on mount and when inputValue changes
  useEffect(() => {
    autoResize();
  }, [inputValue]);

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);
    setShowQuickPrompts(false); // Hide quick prompts when submitting

    // Simulate AI response (replace with actual API call later)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I understand you want to create a process for: "${inputValue}". I'm analyzing your requirements and will generate a BPMN diagram. This feature is coming soon!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsGenerating(false);
    }, 2000);
  };

  const togglePlusMenu = () => {
    setShowPlusMenu(!showPlusMenu);
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter(opt => opt !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
    setShowPlusMenu(false);
  };

  const removeOption = (option: string) => {
    setSelectedOptions(selectedOptions.filter(opt => opt !== option));
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-r from-pink-100 via-orange-50 to-blue-100">
      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Title Section */}
        <div className="text-center mb-8 max-w-3xl">
                                                                 {/* AI Icon */}
             <div className="flex justify-center mb-4">
                               <div className="p-2 bg-white rounded-xl shadow-lg overflow-hidden">
                  <img 
                    src="/ai-process-generator-icon.png" 
                    alt="AI Process Generator Icon" 
                    className="w-20 h-20 object-cover rounded-xl"
                  />
                </div>
             </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            AI Process Generator
          </h1>
          <p className="text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">
            From idea to BPMN diagram in seconds.
            Just tell us what you need, our AI builds the perfect process flow for you. Fast, smart, and zero drawing required.
          </p>
        </div>

        {/* Chat Messages - Only show if there are messages */}
        {messages.length > 0 && (
          <div className="w-full max-w-3xl mb-6 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xl px-4 py-3 rounded-xl ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-gray-200/50'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-white/80 backdrop-blur-sm text-gray-900 border border-gray-200/50 px-4 py-3 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-sm text-gray-600">Generating process...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Bar */}
        <div className="w-full max-w-3xl">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative">
              {/* Main Input Bar */}
                              <div className="bg-white rounded-3xl shadow-lg border border-gray-200/50 flex items-end px-3 py-3">
                                    {/* Left Side - Plus Icon */}
                    <div className="relative" ref={plusMenuRef}>
                      <button
                        type="button"
                        onClick={togglePlusMenu}
                        className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200 mr-2"
                      >
                        <HiOutlinePlus className="w-5 h-5" />
                      </button>

                      {/* Plus Menu Dropdown */}
                      {showPlusMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200/50 overflow-hidden z-10">
                          {/* Add Photos & Files Option - File Upload */}
                          <div className="px-3 py-2 border-b border-gray-100">
                            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors duration-150">
                              <HiOutlinePhotograph className="w-6 h-6 text-blue-500 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">Add photos & files</div>
                                <div className="text-xs text-gray-500">BPMN 2.0, JSON, Word, PDF, TEX</div>
                              </div>
                              <input
                                type="file"
                                multiple
                                accept=".bpmn,.xml,.json,.doc,.docx,.pdf,.tex,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  // Handle file upload here (frontend only for now)
                                  console.log('Files selected:', e.target.files);
                                }}
                              />
                            </label>
                          </div>

                          {/* Generate BPMN Diagram Option */}
                          <button
                            type="button"
                            onClick={() => handleOptionSelect('Generate BPMN diagram')}
                            className="w-full px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2"
                          >
                            <HiOutlineTemplate className="w-6 h-6 text-green-500 flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-gray-900 text-sm">Generate BPMN diagram</div>
                              <div className="text-xs text-gray-500">AI-powered process flow creation</div>
                            </div>
                          </button>

                          {/* Generate LaTeX Option */}
                          <button
                            type="button"
                            onClick={() => handleOptionSelect('Generate LaTeX')}
                            className="w-full px-3 py-2 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2"
                          >
                            <HiOutlineDocumentText className="w-6 h-6 text-purple-500 flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-gray-900 text-sm">Generate LaTeX</div>
                              <div className="text-xs text-gray-500">AI-powered LaTeX document creation</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                {/* Center - Textarea Field */}
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Describe the process you want to create..."
                  className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none border-none bg-transparent resize-none overflow-hidden min-h-[24px] max-h-[200px]"
                  disabled={isGenerating}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                />

                                    {/* Right Side - Action Icons */}
                    <div className="flex items-center space-x-1.5 ml-3">

                                              {/* Microphone Icon */}
                            <button
                              type="button"
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200"
                            >
                              <HiOutlineMicrophone className="w-5 h-5" />
                            </button>

                                              {/* Sound Level Icon / Send Button - Changes when typing */}
                            <button
                              type={inputValue.trim() ? "submit" : "button"}
                              className={`p-1.5 rounded-full transition-all duration-200 ${
                                inputValue.trim() 
                                  ? 'text-white bg-black hover:bg-gray-800' 
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                              disabled={isGenerating}
                            >
                              {inputValue.trim() ? (
                                // Show up arrow send button when user is typing
                                <HiArrowUp className="w-5 h-5" />
                              ) : (
                                // Show sound bars when input is empty
                                <div className="flex items-center gap-0.5">
                                  <div className="w-0.5 bg-gray-600 rounded-sm h-1.5"></div>
                                  <div className="w-0.5 bg-gray-600 rounded-sm h-3"></div>
                                  <div className="w-0.5 bg-gray-600 rounded-sm h-4"></div>
                                  <div className="w-0.5 bg-gray-600 rounded-sm h-3"></div>
                                  <div className="w-0.5 bg-gray-600 rounded-sm h-1.5"></div>
                                </div>
                              )}
                            </button>
                </div>
              </div>

              {/* Submit Button (Hidden but functional) */}
              <button
                type="submit"
                className="absolute opacity-0 pointer-events-none"
                disabled={!inputValue.trim() || isGenerating}
              >
                Submit
              </button>
            </div>

            {/* Selected Options Tags */}
            {selectedOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedOptions.map((option, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200"
                  >
                    <span>{option}</span>
                    <button
                      type="button"
                      onClick={() => removeOption(option)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-0.5 transition-colors duration-150"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Quick Prompts Section - Only show if showQuickPrompts is true */}
        {showQuickPrompts && (
          <div className="w-full max-w-3xl mt-6">
            <div className="text-center mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Quick Prompts for BPMN Generation
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => {
                    setInputValue("Create a customer order processing workflow");
                    setShowQuickPrompts(false); // Hide quick prompts when a quick prompt is clicked
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-sm rounded-full border border-pink-400/70 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-200"
                >
                  Customer Order Processing
                </button>
                <button
                  onClick={() => {
                    setInputValue("Design an employee onboarding process");
                    setShowQuickPrompts(false); // Hide quick prompts when a quick prompt is clicked
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-sm rounded-full border border-pink-400/70 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-200"
                >
                  Employee Onboarding
                </button>
                <button
                  onClick={() => {
                    setInputValue("Build a product approval workflow");
                    setShowQuickPrompts(false); // Hide quick prompts when a quick prompt is clicked
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-sm rounded-full border border-pink-400/70 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-200"
                >
                  Product Approval
                </button>
                <button
                  onClick={() => {
                    setInputValue("Create an invoice processing system");
                    setShowQuickPrompts(false); // Hide quick prompts when a quick prompt is clicked
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-sm rounded-full border border-pink-400/70 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-200"
                >
                  Invoice Processing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
