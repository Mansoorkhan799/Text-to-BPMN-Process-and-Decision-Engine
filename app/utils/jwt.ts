import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRY = '24h';

// Interface for User type
interface User {
  name: string;
  email: string;
  password: string;
}

// Function to get users from storage
const getStoredUsers = (): User[] => {
  if (typeof window === 'undefined') {
    // Server-side: use in-memory storage
    return (global as any).users || [];
  }
  // Client-side: use localStorage
  const stored = localStorage.getItem('users');
  return stored ? JSON.parse(stored) : [];
};

// Function to save users to storage
const saveUsers = (users: User[]) => {
  if (typeof window === 'undefined') {
    // Server-side: use in-memory storage
    (global as any).users = users;
  } else {
    // Client-side: use localStorage
    localStorage.setItem('users', JSON.stringify(users));
  }
};

// Initialize users array
if (typeof window === 'undefined') {
  (global as any).users = (global as any).users || [];
}

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  phoneNumber?: string;
  address?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  profilePicture?: string;
}

export const createToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const verifyJWT = async (token: string): Promise<JWTPayload | null> => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const setTokenCookie = (token: string) => {
  cookies().set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
};

export const removeTokenCookie = () => {
  cookies().delete('token');
};

export const getTokenFromCookies = (): string | undefined => {
  try {
    return cookies().get('token')?.value;
  } catch (error) {
    return undefined;
  }
};

export const getTokenFromRequest = (request: NextRequest): string | undefined => {
  try {
    return request.cookies.get('token')?.value;
  } catch (error) {
    return undefined;
  }
};

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePasswords = async (password: string, hashedPassword: string) => {
  return bcrypt.compare(password, hashedPassword);
};

export const findUser = (email: string) => {
  const users = getStoredUsers();
  return users.find(user => user.email === email);
};

export const createUser = async (name: string, email: string, password: string) => {
  const hashedPassword = await hashPassword(password);
  const newUser = { name, email, password: hashedPassword };
  const users = getStoredUsers();
  users.push(newUser);
  saveUsers(users);
  return { name, email };
}; 