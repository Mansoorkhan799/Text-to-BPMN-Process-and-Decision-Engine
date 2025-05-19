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

        // Set up periodic refresh every 30 seconds
        const refreshInterval = setInterval(() => {
            fetchNotifications();
            fetchNotificationCounts();
        }, 30000);

        // Fetch when window becomes visible again (user returns to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchNotifications();
                fetchNotificationCounts();
            }
        };

        // Listen for custom notification change events
        const handleNotificationChange = () => {
            fetchNotifications();
            fetchNotificationCounts();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('notificationsChanged', handleNotificationChange);

        // Clean up
        return () => {
            clearInterval(refreshInterval);
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

            // Optional: prompt for feedback for rejected items
            let feedback = '';
            if (decision === 'rejected') {
                feedback = prompt('Please provide feedback for rejection (optional):') || '';
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
        notifyNotificationChange(); // Trigger global event to update sidebar badge
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

            // Remove the notification from state
            setNotifications(prevNotifications =>
                prevNotifications.filter(notification => notification.id !== notificationId)
            );

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

        return (
            <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 ${displayStatus === 'pending' ? 'border-yellow-400' :
                    displayStatus === 'approved' ? 'border-green-500' : 'border-red-500'
                    }`}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-lg">{notification.title}</h3>
                        <p className="text-gray-600 text-sm mb-2">
                            {notification.type === 'status_update'
                                ? `From: ${notification.senderName} (${notification.senderEmail})`
                                : `From: ${notification.senderName || notification.senderEmail}`
                            }
                        </p>
                        <p className="text-gray-700 mb-3">{notification.message}</p>
                        <div className="text-xs text-gray-500">
                            {new Date(notification.createdAt).toLocaleString()}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${displayStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            displayStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                            }}
                            className="text-gray-500 hover:text-red-600"
                            title="Delete notification"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    {/* Always show View BPMN if there's BPMN XML available */}
                    {notification.bpmnXml && (
                        <button
                            onClick={() => handleViewBpmn(notification)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                        >
                            View BPMN
                        </button>
                    )}

                    {/* Only show approve/reject for supervisors on pending approval requests */}
                    {canApproveReject && isPending && isApprovalRequest && (
                        <>
                            <button
                                onClick={() => handleApproveReject(notification.id, 'approved')}
                                disabled={processingState !== null}
                                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm flex items-center"
                            >
                                {processingState?.id === notification.id && processingState.action === 'approved' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    'Approve'
                                )}
                            </button>
                            <button
                                onClick={() => handleApproveReject(notification.id, 'rejected')}
                                disabled={processingState !== null}
                                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm flex items-center"
                            >
                                {processingState?.id === notification.id && processingState.action === 'rejected' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    'Reject'
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto py-6 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Notifications & Alerts</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentTab('pending')}
                        className={`px-4 py-2 rounded-md flex items-center ${currentTab === 'pending'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                        className={`px-4 py-2 rounded-md flex items-center ${currentTab === 'approved'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                        className={`px-4 py-2 rounded-md flex items-center ${currentTab === 'rejected'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                        className={`px-4 py-2 rounded-md flex items-center ${currentTab === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Loading notifications...</span>
                </div>
            ) : getFilteredNotifications().length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
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
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No notifications</h3>
                    <p className="mt-1 text-gray-500">
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
                <div>
                    {getFilteredNotifications().map(renderNotificationItem)}
                </div>
            )}

            {/* Modified BPMN Viewer - Remove the redundant modal wrapper */}
            {showBpmnViewer && selectedNotification && selectedNotification.bpmnXml && (
                <BpmnViewer
                    diagramXML={selectedNotification.bpmnXml}
                    onClose={() => {
                        setShowBpmnViewer(false);
                        setSelectedNotification(null);
                    }}
                    title={selectedNotification.title}
                />
            )}
        </div>
    );
};

export default Notifications; 
