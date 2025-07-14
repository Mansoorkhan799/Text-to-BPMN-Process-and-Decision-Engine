import React from 'react';
import { format } from 'date-fns';

interface DuplicateInfo {
    title: string;
    createdAt: string;
    id: string;
}

interface DuplicateWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    duplicateInfo: DuplicateInfo | null;
    projectNameMatch: DuplicateInfo | null;
}

const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
    isOpen,
    onClose,
    onProceed,
    duplicateInfo,
    projectNameMatch
}) => {
    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM d, yyyy h:mm a');
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
                <div className="flex items-center mb-4">
                    <div className="rounded-full bg-yellow-100 p-2 mr-3">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Potential Duplicate Detected</h3>
                </div>

                <div className="mb-4 text-gray-700">
                    {duplicateInfo ? (
                        <>
                            <p className="mb-2">It appears you have already submitted a very similar diagram for approval:</p>
                            <div className="bg-gray-100 p-3 rounded-lg mb-3">
                                <p className="font-medium">{duplicateInfo.title}</p>
                                <p className="text-sm text-gray-600">Submitted on {formatDate(duplicateInfo.createdAt)}</p>
                            </div>
                        </>
                    ) : projectNameMatch ? (
                        <>
                            <p className="mb-2">A diagram with a similar name is already pending approval:</p>
                            <div className="bg-gray-100 p-3 rounded-lg mb-3">
                                <p className="font-medium">{projectNameMatch.title}</p>
                                <p className="text-sm text-gray-600">Submitted on {formatDate(projectNameMatch.createdAt)}</p>
                            </div>
                        </>
                    ) : (
                        <p className="mb-2">There may be a similar diagram already pending approval.</p>
                    )}

                    <p>Do you still want to proceed with submitting this diagram for approval?</p>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onProceed}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Submit Anyway
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateWarningModal; 