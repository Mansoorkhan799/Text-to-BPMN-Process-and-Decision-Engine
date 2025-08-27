import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ROLES } from '@/app/utils/permissions';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper function to read the users file
async function readUsersFile() {
  const filePath = path.join(process.cwd(), 'data', 'users.json');
  const fileData = await fs.readFile(filePath, 'utf8');
  return JSON.parse(fileData);
}

// Helper function to write to the users file
async function writeUsersFile(data: any) {
  const filePath = path.join(process.cwd(), 'data', 'users.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Function to check authorization
function checkAuthorization(request: Request): { authorized: boolean; userRole: string } {
  // Get token from cookies
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return { authorized: false, userRole: '' };
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { role?: string };
    const userRole = decoded?.role || 'user';

    // Check if user has sufficient permissions
    const hasPermission = userRole === ROLES.ADMIN || userRole === ROLES.SUPERVISOR;
    return { authorized: hasPermission, userRole };
  } catch (error) {
    return { authorized: false, userRole: '' };
  }
}

// GET /api/users
export async function GET(request: Request) {
  // Check authorization
  const { authorized, userRole } = checkAuthorization(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
  }

  try {
    const data = await readUsersFile();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users
export async function POST(request: Request) {
  // Check authorization
  const { authorized, userRole } = checkAuthorization(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
  }

  try {
    const newUser = await request.json();
    const data = await readUsersFile();
    
    // Generate a unique ID
    const id = Date.now().toString();
    const userWithId = { id, ...newUser };
    
    data.users.push(userWithId);
    await writeUsersFile(data);
    
    return NextResponse.json(userWithId, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT /api/users
export async function PUT(request: Request) {
  try {
    const updatedUser = await request.json();
    const data = await readUsersFile();
    
    const index = data.users.findIndex((user: any) => user.id === updatedUser.id);
    if (index === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    data.users[index] = updatedUser;
    await writeUsersFile(data);
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users
export async function DELETE(request: Request) {
  // Check authorization
  const { authorized, userRole } = checkAuthorization(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    const data = await readUsersFile();
    
    const index = data.users.findIndex((user: any) => user.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    data.users.splice(index, 1);
    await writeUsersFile(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 