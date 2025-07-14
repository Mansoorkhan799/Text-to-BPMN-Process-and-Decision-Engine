import React from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  bpmnIllustration?: React.ReactNode;
  showFeatures?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  bpmnIllustration,
  showFeatures = true
}) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Branding */}
      <div className="w-full md:w-7/12 bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-6 md:p-8 flex flex-col justify-center relative overflow-hidden">
        {/* Animated Decorative circles */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-700 rounded-full opacity-20 -translate-x-1/3 -translate-y-1/3 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-700 rounded-full opacity-20 translate-x-1/3 translate-y-1/3 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center justify-center">
          {/* Main Title with Gradient - Now bigger and more prominent */}
          <div className="mb-8 w-full self-start">
            <h2
              className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-blue-300 tracking-normal antialiased pb-2 text-left"
              style={{ textRendering: 'geometricPrecision', letterSpacing: '0.01em', lineHeight: '1.2' }}
            >
              Text to BPMN Process and Decision Engine
            </h2>
            <p className="text-xl text-blue-200 mt-3 font-light text-left">Transform plain text into professional diagrams</p>
          </div>

          {/* Only show title/subtitle if they are provided */}
          {title && (
            <h1 className="text-3xl font-extrabold mb-3 self-start text-left">{title}</h1>
          )}
          {subtitle && (
            <p className="text-lg text-indigo-100 mb-5 leading-relaxed max-w-xl self-start text-left">
              {subtitle}
            </p>
          )}

          {/* BPMN Illustration - Enhanced and more prominent */}
          {bpmnIllustration && (
            <div className="w-full mb-8 self-center bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm shadow-lg border border-indigo-300 border-opacity-20 transform hover:scale-105 transition-transform duration-300">
              {bpmnIllustration}
            </div>
          )}

          {/* Features list - more compact and efficient */}
          {showFeatures && (
            <div className="w-full text-left self-start">
              <h3 className="text-xl font-bold mb-4 relative">
                <span className="relative inline-block after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-12 after:h-1 after:bg-blue-400">
                  Powerful features
                </span>
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center transform transition-all duration-300 hover:translate-x-2">
                  <div className="flex-shrink-0 w-10 h-10 mr-3 rounded-lg bg-indigo-800 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white leading-tight">Text to BPMN Diagrams</h4>
                    <p className="text-sm text-indigo-200">Transform text descriptions into professional process models</p>
                  </div>
                </li>
                <li className="flex items-center transform transition-all duration-300 hover:translate-x-2">
                  <div className="flex-shrink-0 w-10 h-10 mr-3 rounded-lg bg-indigo-800 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white leading-tight">Upload documents</h4>
                    <p className="text-sm text-indigo-200">Import existing files and convert them to BPMN format</p>
                  </div>
                </li>
                <li className="flex items-center transform transition-all duration-300 hover:translate-x-2">
                  <div className="flex-shrink-0 w-10 h-10 mr-3 rounded-lg bg-indigo-800 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white leading-tight">Edit your processes</h4>
                    <p className="text-sm text-indigo-200">Modify and fine-tune your diagrams with an intuitive editor</p>
                  </div>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full md:w-5/12 bg-gray-50 p-6 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}; 