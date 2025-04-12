import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

// GET /api/users
export async function GET() {
  try {
    const data = await readUsersFile();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users
export async function POST(request: Request) {
  try {
    const newUser = await request.json();
    const data = await readUsersFile();
    
    // Generate a unique ID
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userWithId = { ...newUser, id };
    
    data.users.push(userWithId);
    await writeUsersFile(data);
    
    return NextResponse.json(userWithId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add user' }, { status: 500 });
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