'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdvancedLatexPage() {
    const router = useRouter();

    useEffect(() => {
        // Set the current view to latex in sessionStorage
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('currentView', 'latex');
        }

        // Redirect to the root URL
        router.push('/');
    }, [router]);

    // Show loading state while redirecting
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Redirecting to LaTeX Editor...</p>
            </div>
        </div>
    );
} 