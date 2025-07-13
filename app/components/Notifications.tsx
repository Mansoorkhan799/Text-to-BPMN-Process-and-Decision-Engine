'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Import BPMN Viewer dynamically
const BpmnViewer = dynamic(() => import('./BpmnViewer'), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading BPMN diagram...</p>
        </div>
    ),
});

interface Notification {
    id: string;
    type: 'approval_request' | 'status_update';
    title: string;
    message: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
    bpmnXml?: string;
    senderName: string;
    senderEmail: string;
    senderRole: string;
    recipientEmail: string;
}

interface NotificationCounts {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
}

interface NotificationsProps {
    userRole?: string;
}

// Global event for notification changes
export const notifyNotificationChange = () => {
    // Create and dispatch a custom event
    const event = new CustomEvent('notificationsChanged');
    window.dispatchEvent(event);
};

const Notifications = ({ userRole = 'user' }: NotificationsProps) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [showBpmnViewer, setShowBpmnViewer] = useState(false);
    const [currentTab, setCurrentTab] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
    const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });
    const [processingState, setProcessingState] = useState<{ id: string, action: 'approved' | 'rejected' } | null>(null);
    const router = useRouter();

    // Check if user is supervisor or admin
    const canApproveReject = userRole === 'supervisor' || userRole === 'admin';

    // Fetch notifications on component mount and when made active
    useEffect(() => {
        // Initial fetch when component mounts
        fetchNotifications();
        fetchNotificationCounts();

        // Fetch when window becomes visible again (user returns to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchNotifications();
                fetchNotificationCounts();
            }
        };

        // Listen for custom notification change events
        const handleNotificationChange = () => {
            // Remove fetching here to prevent double refresh
            // The global event should only be used for other components like the sidebar badge
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('notificationsChanged', handleNotificationChange);

        // Clean up
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('notificationsChanged', handleNotificationChange);
        };
    }, []);

    const fetchNotificationCounts = async () => {
        try {
            const response = await fetch('/api/notifications/count');
            if (response.ok) {
                const data = await response.json();
                if (data.counts) {
                    setNotificationCounts(data.counts);
                }
            }
        } catch (error) {
            console.error('Error fetching notification counts:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/notifications');

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();
            // Ensure the notifications have an id property that corresponds to MongoDB's _id
            const formattedNotifications = data.notifications.map((notification: any) => ({
                ...notification,
                id: notification._id || notification.id
            }));
            setNotifications(formattedNotifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveReject = async (notificationId: string, decision: 'approved' | 'rejected') => {
        try {
            // Set the processing state for this notification
            setProcessingState({ id: notificationId, action: decision });

            // Prompt for feedback for both approved and rejected items
            let feedback = '';
            if (decision === 'rejected') {
                feedback = prompt('Please provide feedback for rejection (optional):') || '';
            } else if (decision === 'approved') {
                feedback = prompt('Please provide feedback for approval (optional):') || '';
            }

            // Call the API to process the notification
            const response = await fetch('/api/notifications/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notificationId,
                    decision,
                    feedback
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to process notification');
            }

            toast.success(`Notification ${decision} successfully`);

            // Close BPMN viewer if open
            if (showBpmnViewer) {
                setShowBpmnViewer(false);
                setSelectedNotification(null);
            }

            // Refresh notification counts and update UI
            refreshNotificationState();
        } catch (error) {
            console.error('Error processing notification:', error);
            toast.error(`Failed to ${decision} notification`);
        } finally {
            // Clear the processing state
            setProcessingState(null);
        }
    };

    const handleViewBpmn = (notification: Notification) => {
        setSelectedNotification(notification);
        setShowBpmnViewer(true);
    };

    const handleCloseViewer = () => {
        setShowBpmnViewer(false);
        setSelectedNotification(null);
    };

    // This function will be called after any operation that changes notifications
    const refreshNotificationState = async () => {
        await fetchNotifications();
        await fetchNotificationCounts();
        // Always notify other components (like the sidebar badge) about the change
        notifyNotificationChange();
    };

    const handleDeleteNotification = async (notificationId: string) => {
        try {
            // Show confirmation dialog
            if (!confirm('Are you sure you want to delete this notification?')) {
                return;
            }

            const response = await fetch('/api/notifications/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notificationId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }

            toast.success('Notification deleted successfully');

            // Refresh all notification state
            refreshNotificationState();
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Failed to delete notification');
        }
    };

    const getFilteredNotifications = () => {
        // First deduplicate notifications by title and status to avoid showing duplicates
        const uniqueNotifications = notifications.reduce((acc, notification) => {
            const status = getNotificationStatus(notification);
            // Changed from title+status key to id as unique identifier to show all notifications
            // This will fix the issue where multiple approved notifications are filtered out
            const key = notification.id;

            // If we haven't seen this notification ID before, add it
            if (!acc.some(n => n.id === key)) {
                acc.push(notification);
            }
            return acc;
        }, [] as Notification[]);

        if (currentTab === 'pending') {
            return uniqueNotifications.filter(notification =>
                getNotificationStatus(notification) === 'pending'
            );
        } else if (currentTab === 'approved') {
            return uniqueNotifications.filter(notification =>
                getNotificationStatus(notification) === 'approved'
            );
        } else if (currentTab === 'rejected') {
            return uniqueNotifications.filter(notification =>
                getNotificationStatus(notification) === 'rejected'
            );
        }
        return uniqueNotifications;
    };

    const getNotificationStatus = (notification: Notification) => {
        // For status update notifications, extract the status from the title if possible
        if (notification.type === 'status_update') {
            // First check the status field directly (most reliable)
            if (notification.status === 'approved' || notification.status === 'rejected') {
                return notification.status;
            }

            // Then check the title as a fallback
            if (notification.title) {
                if (notification.title.toLowerCase().includes('approved')) {
                    return 'approved';
                } else if (notification.title.toLowerCase().includes('rejected')) {
                    return 'rejected';
                }
            }
        }

        // For approval_request type, rely on the stored status field
        if (notification.type === 'approval_request') {
            return notification.status;
        }

        // Default to the notification's status field
        return notification.status;
    };

    const renderNotificationItem = (notification: Notification) => {
        const displayStatus = getNotificationStatus(notification);
        const isApprovalRequest = notification.type === 'approval_request';
        const isPending = displayStatus === 'pending';

        const statusColors = {
            pending: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800', badge: 'bg-amber-100' },
            approved: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', badge: 'bg-emerald-100' },
            rejected: { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-800', badge: 'bg-rose-100' }
        };

        const currentColor = statusColors[displayStatus] || statusColors.pending;

        return (
            <div
                key={notification.id}
                className={`${currentColor.bg} rounded-lg shadow-sm p-5 mb-4 border ${currentColor.border} transition-all duration-300 hover:shadow-md`}
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{notification.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${currentColor.badge} ${currentColor.text}`}>
                                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                            </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                            {notification.type === 'status_update'
                                ? `From: ${notification.senderName} (${notification.senderEmail})`
                                : `From: ${notification.senderName || notification.senderEmail}`
                            }
                        </p>
                        <p className="text-gray-700 mb-3">{notification.message}</p>
                        <div className="text-xs text-gray-500 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(notification.createdAt).toLocaleString()}
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                        title="Delete notification"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                <div className="mt-4 flex gap-2">
                    {/* Always show View BPMN if there's BPMN XML available */}
                    {notification.bpmnXml && (
                        <button
                            onClick={() => handleViewBpmn(notification)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm transition-colors shadow-sm hover:shadow"
                        >
                            <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View BPMN
                            </span>
                        </button>
                    )}

                    {/* Only show approve/reject for supervisors on pending approval requests */}
                    {canApproveReject && isPending && isApprovalRequest && (
                        <>
                            <button
                                onClick={() => handleApproveReject(notification.id, 'approved')}
                                disabled={processingState !== null}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 text-sm flex items-center transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingState?.id === notification.id && processingState.action === 'approved' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <span className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Approve
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => handleApproveReject(notification.id, 'rejected')}
                                disabled={processingState !== null}
                                className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 text-sm flex items-center transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingState?.id === notification.id && processingState.action === 'rejected' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <span className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Reject
                                    </span>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto py-6 px-4 max-w-5xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="relative pb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x">
                                Notifications & Alerts
                            </span>
                        </h1>
                    </div>
                    <div className="absolute -bottom-1 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full opacity-70"></div>
                    <div className="absolute -bottom-1 left-0 w-1/3 h-1.5 bg-white/30 rounded-full animate-pulse"></div>
                </div>
                <div className="flex flex-wrap gap-2 bg-gradient-to-br from-blue-50 to-indigo-50/70 p-2 rounded-lg shadow-sm w-full md:w-auto border border-blue-100/50">
                    <button
                        onClick={() => setCurrentTab('pending')}
                        className={`px-4 py-2 rounded-md flex items-center text-sm transition-all ${currentTab === 'pending'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100/80'
                            }`}
                    >
                        <span>Pending</span>
                        {notificationCounts.pending > 0 && (
                            <span className="ml-2 bg-yellow-200 text-yellow-800 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {notificationCounts.pending}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setCurrentTab('approved')}
                        className={`px-4 py-2 rounded-md flex items-center text-sm transition-all ${currentTab === 'approved'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100/80'
                            }`}
                    >
                        <span>Approved</span>
                        {notificationCounts.approved > 0 && (
                            <span className="ml-2 bg-green-200 text-green-800 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {notificationCounts.approved}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setCurrentTab('rejected')}
                        className={`px-4 py-2 rounded-md flex items-center text-sm transition-all ${currentTab === 'rejected'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100/80'
                            }`}
                    >
                        <span>Rejected</span>
                        {notificationCounts.rejected > 0 && (
                            <span className="ml-2 bg-red-200 text-red-800 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {notificationCounts.rejected}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setCurrentTab('all')}
                        className={`px-4 py-2 rounded-md flex items-center text-sm transition-all ${currentTab === 'all'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100/80'
                            }`}
                    >
                        <span>All</span>
                        {notificationCounts.total > 0 && (
                            <span className="ml-2 bg-blue-200 text-blue-800 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {notificationCounts.total}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            fetchNotifications();
                            fetchNotificationCounts();
                        }}
                        className="px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-sm flex items-center transition-all"
                        title="Refresh notifications"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-100 border-t-blue-500"></div>
                    <span className="ml-3 text-gray-600 font-medium">Loading notifications...</span>
                </div>
            ) : getFilteredNotifications().length === 0 ? (
                <div className="bg-white rounded-lg p-10 text-center border-2 border-dashed border-gray-300">
                    <div className="bg-blue-50 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <svg
                            className="h-8 w-8 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-1">No notifications</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        {currentTab === 'pending'
                            ? 'You have no pending notifications at the moment.'
                            : currentTab === 'approved'
                                ? 'You have no approved notifications at the moment.'
                                : currentTab === 'rejected'
                                    ? 'You have no rejected notifications at the moment.'
                                    : 'You have no notifications at the moment.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {getFilteredNotifications().map(renderNotificationItem)}
                </div>
            )}

            {/* BPMN Viewer */}
            {showBpmnViewer && selectedNotification && selectedNotification.bpmnXml && (
                <BpmnViewer
                    diagramXML={selectedNotification.bpmnXml}
                    onClose={() => {
                        setShowBpmnViewer(false);
                        setSelectedNotification(null);
                    }}
                    title={selectedNotification.title}
                    userId={selectedNotification.recipientEmail}
                    userRole={userRole}
                    isApprovalView={true}
                />
            )}
        </div>
    );
};

export default Notifications; 
