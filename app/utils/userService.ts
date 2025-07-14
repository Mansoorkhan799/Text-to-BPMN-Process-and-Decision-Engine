import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  displayName: string;
  email: string;
  address: string;
  city: string;
  contact: string;
}

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

export const userService = {
  getUsers: async (): Promise<User[]> => {
    try {
      const data = await fs.promises.readFile(DATA_FILE_PATH, 'utf8');
      const { users } = JSON.parse(data);
      return users;
    } catch (error) {
      console.error('Error reading users:', error);
      return [];
    }
  },

  addUser: async (user: Omit<User, 'id'>): Promise<User | null> => {
    try {
      const data = await fs.promises.readFile(DATA_FILE_PATH, 'utf8');
      const { users } = JSON.parse(data);
      
      const newUser = {
        ...user,
        id: (users.length + 1).toString(),
      };
      
      users.push(newUser);
      
      await fs.promises.writeFile(
        DATA_FILE_PATH,
        JSON.stringify({ users }, null, 2),
        'utf8'
      );
      
      return newUser;
    } catch (error) {
      console.error('Error adding user:', error);
      return null;
    }
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User | null> => {
    try {
      const data = await fs.promises.readFile(DATA_FILE_PATH, 'utf8');
      const { users } = JSON.parse(data);
      
      const index = users.findIndex((user: User) => user.id === id);
      if (index === -1) return null;
      
      users[index] = { ...users[index], ...updates };
      
      await fs.promises.writeFile(
        DATA_FILE_PATH,
        JSON.stringify({ users }, null, 2),
        'utf8'
      );
      
      return users[index];
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },

  deleteUser: async (id: string): Promise<boolean> => {
    try {
      const data = await fs.promises.readFile(DATA_FILE_PATH, 'utf8');
      const { users } = JSON.parse(data);
      
      const filteredUsers = users.filter((user: User) => user.id !== id);
      
      if (filteredUsers.length === users.length) return false;
      
      await fs.promises.writeFile(
        DATA_FILE_PATH,
        JSON.stringify({ users: filteredUsers }, null, 2),
        'utf8'
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}; 