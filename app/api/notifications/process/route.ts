import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/utils/jwt';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { sendStatusUpdateEmail } from '@/app/utils/email';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST endpoint to process (approve/reject) a notification
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
        const { notificationId, decision, feedback } = await request.json();

        if (!notificationId || !decision) {
            return NextResponse.json(
                { error: 'Notification ID and decision are required' },
                { status: 400 }
            );
        }

        if (decision !== 'approved' && decision !== 'rejected') {
            return NextResponse.json(
                { error: 'Decision must be either "approved" or "rejected"' },
                { status: 400 }
            );
        }

        // Find the notification
        const notification = await mongoDb.collection('notifications').findOne({
            _id: new ObjectId(notificationId)
        });

        if (!notification) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            );
        }

        // Check if user is authorized to process this notification
        if (notification.recipientEmail !== decoded.email) {
            return NextResponse.json(
                { error: 'You are not authorized to process this notification' },
                { status: 403 }
            );
        }

        // Update the notification status
        await mongoDb.collection('notifications').updateOne(
            { _id: new ObjectId(notificationId) },
            {
                $set: {
                    status: decision,
                    updatedAt: new Date().toISOString(),
                    feedback: feedback || ''
                }
            }
        );

        // Extract the base title without status suffixes
        const baseTitle = notification.title
            .replace(/\(Pending Approval\)$/, '')
            .replace(/\(Approved\)$/, '')
            .replace(/\(Rejected\)$/, '')
            .trim();

        // Find the user's summary notification for this diagram
        const existingSummaryNotification = await mongoDb.collection('notifications').findOne({
            senderEmail: notification.senderEmail,
            type: 'approval_request',
            isUserSummary: true,
            title: { $regex: new RegExp(`^${baseTitle}( \\(Pending Approval\\))?$`, 'i') }
        });

        // Check if there's an existing status update notification to avoid duplicates
        const existingStatusUpdate = await mongoDb.collection('notifications').findOne({
            recipientEmail: notification.senderEmail,
            type: 'status_update',
            relatedNotificationId: notificationId
        });

        // Decide which notification to update/create
        if (existingSummaryNotification) {
            // Update the existing summary notification
            await mongoDb.collection('notifications').updateOne(
                { _id: existingSummaryNotification._id },
                {
                    $set: {
                        status: decision,
                        title: `${baseTitle} (${decision.charAt(0).toUpperCase() + decision.slice(1)})`,
                        message: `Your diagram has been ${decision} by ${user.name || user.email}. ${feedback ? `Feedback: ${feedback}` : ''}`,
                        updatedAt: new Date().toISOString()
                    }
                }
            );
            console.log(`Updated summary notification for user`);

            // If an existing status notification already exists, delete it to avoid duplicates
            if (existingStatusUpdate) {
                await mongoDb.collection('notifications').deleteOne({ _id: existingStatusUpdate._id });
                console.log(`Deleted duplicate status notification`);
            }
        } else if (existingStatusUpdate) {
            // Update the existing status notification
            await mongoDb.collection('notifications').updateOne(
                { _id: existingStatusUpdate._id },
                {
                    $set: {
                        title: `Your BPMN has been ${decision}`,
                        message: `Your BPMN diagram has been ${decision} by ${user.name || user.email}. ${feedback ? `Feedback: ${feedback}` : ''}`,
                        status: decision,
                        updatedAt: new Date().toISOString()
                    }
                }
            );
            console.log('Updated existing status notification');
        } else {
            // Create a new notification for the sender to inform them of the decision
            const statusNotification = {
                type: 'status_update',
                title: `Your BPMN has been ${decision}`,
                message: `Your BPMN diagram has been ${decision} by ${user.name || user.email}. ${feedback ? `Feedback: ${feedback}` : ''}`,
                status: decision,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                senderName: user.name || '',
                senderEmail: user.email,
                senderRole: user.role,
                recipientEmail: notification.senderEmail,
                relatedNotificationId: notificationId,
                bpmnXml: notification.bpmnXml // Include the BPMN XML for viewing
            };

            await mongoDb.collection('notifications').insertOne(statusNotification);
            console.log('Created new status notification');
        }

        // Get the application URL from environment variable or use a default
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Send status update email to the original sender
        try {
            await sendStatusUpdateEmail(
                notification.senderEmail,
                decision as 'approved' | 'rejected',
                notification.title,
                feedback || '',
                user.name || user.email,
                appUrl
            );
            console.log('Status update email sent to:', notification.senderEmail);
        } catch (emailError) {
            console.error('Error sending status update email:', emailError);
            // Continue even if email fails - the notification is still created in the database
        }

        return NextResponse.json({
            success: true,
            message: `Notification ${decision} successfully`
        });
    } catch (error: any) {
        console.error('Error processing notification:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process notification' },
            { status: 500 }
        );
    }
} 