import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/utils/jwt';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET endpoint to count pending notifications for the current user
export async function GET(request: NextRequest) {
    try {
        // Verify user is authenticated
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.email) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Connect to the database
        await connectDB(true); // Use silent mode for routine polling
        const mongoDb = mongoose.connection.db;

        if (!mongoDb) {
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }

        // Get user information
        const user = await mongoDb.collection('users').findOne({ email: decoded.email });
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        let pendingQuery, approvedQuery, rejectedQuery;

        // Different query based on user role
        if (user.role === 'user') {
            // For regular users, only count:
            // 1. Pending approval requests they've sent (isUserSummary=true)
            // 2. Status updates they've received where the title doesn't contain "approved" or "rejected"
            pendingQuery = {
                $or: [
                    // Pending status updates for the user (excluding approved/rejected ones)
                    {
                        recipientEmail: decoded.email,
                        type: 'status_update',
                        status: 'pending',
                        $and: [
                            { title: { $not: /approved/i } },
                            { title: { $not: /rejected/i } }
                        ]
                    },
                    // User's pending approval requests
                    {
                        senderEmail: decoded.email,
                        type: 'approval_request',
                        status: 'pending',
                        isUserSummary: true
                    }
                ]
            };

            // Approved notifications for users
            approvedQuery = {
                $or: [
                    // Approved status updates for the user or where the title contains "approved"
                    {
                        recipientEmail: decoded.email,
                        type: 'status_update',
                        $or: [
                            { status: 'approved' },
                            { title: { $regex: /approved/i } }
                        ]
                    },
                    // User's approved requests (summary notifications)
                    {
                        senderEmail: decoded.email,
                        type: 'approval_request',
                        status: 'approved',
                        isUserSummary: true
                    }
                ]
            };

            // Rejected notifications for users
            rejectedQuery = {
                $or: [
                    // Rejected status updates for the user or where the title contains "rejected"
                    {
                        recipientEmail: decoded.email,
                        type: 'status_update',
                        $or: [
                            { status: 'rejected' },
                            { title: { $regex: /rejected/i } }
                        ]
                    },
                    // User's rejected requests (summary notifications)
                    {
                        senderEmail: decoded.email,
                        type: 'approval_request',
                        status: 'rejected',
                        isUserSummary: true
                    }
                ]
            };
        } else if (user.role === 'supervisor' || user.role === 'admin') {
            // For supervisors, only count approval requests assigned to them that are pending
            pendingQuery = {
                recipientEmail: decoded.email,
                type: 'approval_request',
                status: 'pending'
            };

            // Approved notifications for supervisors
            approvedQuery = {
                $or: [
                    // Approval requests they've approved
                    {
                        recipientEmail: decoded.email,
                        type: 'approval_request',
                        status: 'approved'
                    },
                    // Status updates they've sent after approving
                    {
                        senderEmail: decoded.email,
                        type: 'status_update',
                        $or: [
                            { status: 'approved' },
                            { title: { $regex: /approved/i } }
                        ]
                    }
                ]
            };

            // Rejected notifications for supervisors
            rejectedQuery = {
                $or: [
                    // Approval requests they've rejected
                    {
                        recipientEmail: decoded.email,
                        type: 'approval_request',
                        status: 'rejected'
                    },
                    // Status updates they've sent after rejecting
                    {
                        senderEmail: decoded.email,
                        type: 'status_update',
                        $or: [
                            { status: 'rejected' },
                            { title: { $regex: /rejected/i } }
                        ]
                    }
                ]
            };
        } else {
            // Fallback for unknown roles
            pendingQuery = {
                recipientEmail: decoded.email,
                status: 'pending'
            };

            approvedQuery = {
                recipientEmail: decoded.email,
                status: 'approved'
            };

            rejectedQuery = {
                recipientEmail: decoded.email,
                status: 'rejected'
            };
        }

        // Count pending, approved, and rejected notifications
        const pendingCount = await mongoDb.collection('notifications').countDocuments(pendingQuery);
        const approvedCount = await mongoDb.collection('notifications').countDocuments(approvedQuery);
        const rejectedCount = await mongoDb.collection('notifications').countDocuments(rejectedQuery);
        const totalCount = pendingCount + approvedCount + rejectedCount;

        return NextResponse.json({
            count: pendingCount, // Keep the count for backward compatibility
            counts: {
                pending: pendingCount,
                approved: approvedCount,
                rejected: rejectedCount,
                total: totalCount
            }
        });
    } catch (error: any) {
        console.error('Error counting notifications:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to count notifications' },
            { status: 500 }
        );
    }
} 