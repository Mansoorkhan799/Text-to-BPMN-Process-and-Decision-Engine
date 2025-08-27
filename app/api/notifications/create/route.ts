import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/utils/jwt';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { sendNotificationEmail } from '@/app/utils/email';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST endpoint to create a notification for BPMN approval
export async function POST(request: NextRequest) {
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
        await connectDB();
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

        // Get request body
        const { title, message, bpmnXml } = await request.json();

        if (!title || !message || !bpmnXml) {
            return NextResponse.json(
                { error: 'Title, message, and BPMN XML are required' },
                { status: 400 }
            );
        }

        // Find all supervisors and admins to notify
        const supervisors = await mongoDb.collection('users').find({
            role: 'supervisor'
        }).toArray();

        if (supervisors.length === 0) {
            return NextResponse.json(
                { error: 'No supervisors found to send approval request' },
                { status: 404 }
            );
        }

        // Create notifications for each supervisor
        const notifications = supervisors.map(supervisor => ({
            type: 'approval_request',
            title,
            message,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bpmnXml,
            senderName: user.name || '',
            senderEmail: user.email,
            senderRole: user.role,
            recipientEmail: supervisor.email
        }));

        // Create a summary notification for the user so they can track their own submission
        const userSummaryNotification = {
            type: 'approval_request',
            title: `${title} (Pending Approval)`,
            message: `You sent this diagram for approval. ${supervisors.length} supervisor(s) have been notified.`,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bpmnXml,
            senderName: user.name || '',
            senderEmail: user.email,
            senderRole: user.role,
            recipientEmail: user.email, // User is both sender and recipient of this summary
            isUserSummary: true // Special flag to identify this as a summary notification
        };

        // Insert all notifications including the user summary
        await mongoDb.collection('notifications').insertMany([...notifications, userSummaryNotification]);

        // Get the application URL from environment variable or use a default
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Send emails to supervisors
        try {
            await Promise.all(supervisors.map(supervisor =>
                sendNotificationEmail(
                    supervisor.email,
                    title,
                    message,
                    user.name || user.email,
                    appUrl
                )
            ));
            console.log('Notification emails sent to supervisors:', supervisors.map(s => s.email));
        } catch (emailError) {
            console.error('Error sending notification emails:', emailError);
            // Continue even if emails fail - the notifications are still created in the database
        }

        return NextResponse.json({
            success: true,
            message: 'Notification created successfully',
            notificationsSent: supervisors.length
        });
    } catch (error: any) {
        console.error('Error creating notification:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create notification' },
            { status: 500 }
        );
    }
} 