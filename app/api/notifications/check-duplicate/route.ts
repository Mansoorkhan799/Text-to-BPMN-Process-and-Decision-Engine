import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/utils/jwt';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Function to check similarity between two XML strings
// This is a simple implementation - in a production environment, 
// you might want a more sophisticated comparison algorithm
function checkSimilarity(xml1: string, xml2: string): boolean {
    // Simple approach: normalize whitespace and compare
    const normalizeXml = (xml: string) => xml.replace(/\s+/g, ' ').trim();

    // If they're exactly the same, return true
    if (normalizeXml(xml1) === normalizeXml(xml2)) {
        return true;
    }

    // For a more accurate comparison, you could:
    // 1. Parse both XMLs to get their element structure
    // 2. Compare the number and types of elements
    // 3. Compare process flow and connections

    return false;
}

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

        // Get the BPMN XML to check
        const { bpmnXml, projectName } = await request.json();

        if (!bpmnXml) {
            return NextResponse.json(
                { error: 'BPMN XML is required' },
                { status: 400 }
            );
        }

        // Find the user
        const user = await mongoDb.collection('users').findOne({ email: decoded.email });
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Find pending notifications that contain BPMN XML
        // We only check notifications created by the current user
        const pendingNotifications = await mongoDb.collection('notifications').find({
            type: 'approval_request',
            status: 'pending',
            senderEmail: user.email,
            bpmnXml: { $exists: true }
        }).toArray();

        // Check for similarity with existing diagrams
        let duplicateFound = false;
        let duplicateInfo = null;

        for (const notification of pendingNotifications) {
            if (checkSimilarity(notification.bpmnXml, bpmnXml)) {
                duplicateFound = true;
                duplicateInfo = {
                    title: notification.title,
                    createdAt: notification.createdAt,
                    id: notification._id.toString()
                };
                break;
            }
        }

        // Check for exact project name match (as an additional check)
        const projectNameMatch = pendingNotifications.find(n =>
            n.title.includes(projectName) || n.message.includes(projectName)
        );

        return NextResponse.json({
            duplicateFound,
            duplicateInfo,
            projectNameMatch: projectNameMatch ? {
                title: projectNameMatch.title,
                createdAt: projectNameMatch.createdAt,
                id: projectNameMatch._id.toString()
            } : null
        });
    } catch (error: any) {
        console.error('Error checking for duplicate diagram:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to check for duplicate diagrams' },
            { status: 500 }
        );
    }
} 