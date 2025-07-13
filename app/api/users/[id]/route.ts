import { NextResponse } from 'next/server';
import { userService } from '@/app/utils/userService';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ROLES } from '@/app/utils/permissions';

// Function to check authorization
function checkAuthorization(): { authorized: boolean; userRole: string; userId: string } {
  // Get token from cookies
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return { authorized: false, userRole: '', userId: '' };
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { 
      role?: string;
      userId?: string;
    };
    
    const userRole = decoded?.role || 'user';
    const userId = decoded?.userId || '';

    // Check if user has sufficient permissions (admin/supervisor or accessing own profile)
    const isAdminOrSupervisor = userRole === ROLES.ADMIN || userRole === ROLES.SUPERVISOR;
    
    return { 
      authorized: isAdminOrSupervisor, 
      userRole,
      userId
    };
  } catch (error) {
    return { authorized: false, userRole: '', userId: '' };
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Check authorization
  const { authorized, userRole, userId } = checkAuthorization();
  
  // Allow access if user is admin/supervisor or editing their own profile
  const isSelfEditing = userId === params.id;
  if (!authorized && !isSelfEditing) {
    return NextResponse.json(
      { error: 'Unauthorized access' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    
    // Regular users cannot change their role
    if (userRole === ROLES.USER && isSelfEditing && body.role && body.role !== ROLES.USER) {
      return NextResponse.json(
        { error: 'Not allowed to change role' },
        { status: 403 }
      );
    }
    
    const updatedUser = await userService.updateUser(params.id, body);
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Check authorization - only admins can delete users
  const { authorized, userRole } = checkAuthorization();
  
  // Only allow admins to delete users
  if (!authorized || userRole !== ROLES.ADMIN) {
    return NextResponse.json(
      { error: 'Unauthorized access - admin rights required for deletion' },
      { status: 403 }
    );
  }

  try {
    const success = await userService.deleteUser(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 