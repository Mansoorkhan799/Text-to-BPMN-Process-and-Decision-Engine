import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/utils/jwt';
import connectDB from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET endpoint to fetch notifications for the current user
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

        let notificationsQuery;

        // For regular users, only show:
        // 1. Status updates about their own submissions (where they are the original sender)
        // 2. Don't show them all the copies of their submissions sent to supervisors
        if (user.role === 'user') {
            notificationsQuery = {
                $or: [
                    // Status updates about their submissions (where they're the recipient)
                    { recipientEmail: decoded.email, type: 'status_update' },
                    // A summary notification of their sent approval requests (one per submission, not one per supervisor)
                    { senderEmail: decoded.email, type: 'approval_request', isUserSummary: true }
                ]
            };
        }
        // For supervisors and admins, show:
        // 1. Approval requests sent to them
        // 2. Status updates about their decisions
        else if (user.role === 'supervisor' || user.role === 'admin') {
            notificationsQuery = {
                $or: [
                    // Approval requests sent to them
                    { recipientEmail: decoded.email },
                    // Updates about their approval decisions
                    { senderEmail: decoded.email, type: 'status_update' }
                ]
            };
        }
        // Fallback for unknown roles
        else {
            notificationsQuery = { recipientEmail: decoded.email };
        }

        // Fetch notifications for this user based on their role
        const notifications = await mongoDb.collection('notifications')
            .find(notificationsQuery)
            .sort({ createdAt: -1 }) // Sort by most recent first
            .toArray();

        return NextResponse.json({ notifications });
    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
} 