import { NextResponse } from 'next/server';
import { userService } from '@/app/utils/userService';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
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