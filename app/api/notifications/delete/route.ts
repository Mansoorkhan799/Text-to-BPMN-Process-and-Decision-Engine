import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/utils/jwt';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// DELETE endpoint to delete a notification
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

        // Get notification ID from request body
        const { notificationId } = await request.json();

        if (!notificationId) {
            return NextResponse.json(
                { error: 'Notification ID is required' },
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

        // Check if user is authorized to delete this notification
        // Users can only delete notifications where they are the recipient or sender
        if (notification.recipientEmail !== decoded.email && notification.senderEmail !== decoded.email) {
            return NextResponse.json(
                { error: 'You are not authorized to delete this notification' },
                { status: 403 }
            );
        }

        // Delete the notification
        await mongoDb.collection('notifications').deleteOne({
            _id: new ObjectId(notificationId)
        });

        return NextResponse.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting notification:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete notification' },
            { status: 500 }
        );
    }
} 