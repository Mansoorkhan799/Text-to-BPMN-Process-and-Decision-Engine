# Text-to-BPMN Process and Decision Engine

## Authentication System

A complete authentication system built with Next.js that includes:

### Features

- **User Registration**: Secure sign-up with email verification using OTP
- **Login System**: Email/password authentication
- **Password Management**: 
  - Password reset functionality
  - Forgot password flow with email verification
- **Form Validation**: Client-side validation for all forms
- **Security**: 
  - Password hashing
  - JWT based authentication
  - Protected routes
  - Role-based access control (User, Supervisor, Admin roles)

### Technologies Used

- **Frontend**: Next.js with React, TypeScript, Tailwind CSS
- **State Management**: React hooks and context
- **Form Handling**: Custom form components
- **UI Components**: Custom reusable UI components
- **Authentication**: JWT tokens
- **Notifications**: Toast notifications

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Mansoorkhan799/Text-to-BPMN-Process-and-Decision-Engine.git
```

2. Navigate to the project directory:
```bash
cd Text-to-BPMN-Process-and-Decision-Engine
```

3. Install dependencies:
```bash
npm install
# or
yarn install
```

4. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```
JWT_SECRET=your_jwt_secret_key
MONGODB_URI=your_mongodb_connection_string
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email_username
EMAIL_PASS=your_email_password
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/app` - Next.js app router pages and components
- `/app/api` - API routes
- `/app/components` - React components
- `/lib` - Utility functions and database connection
- `/models` - Database models
- `/public` - Static assets

## Authentication Flow

1. **Sign Up**:
   - User enters name, email, and password
   - User selects a role (User, Supervisor, or Admin)
   - System sends OTP to the user's email
   - User verifies with OTP
   - Account is created with the specified role

2. **Sign In**:
   - User enters email and password
   - System validates credentials
   - JWT token is issued upon successful login

3. **Password Reset**:
   - User requests password reset
   - System sends reset link via email
   - User creates new password
   - Password is updated in the database

## Role-Based Permissions

The application implements a role-based access control system with three levels:

1. **User**: Base level access
   - Access to dashboard and personal profile
   - Limited functionality

2. **Supervisor**: Mid-level access
   - All User permissions
   - Access to reports and analytics
   - Ability to approve new users
   - Cannot access admin settings

3. **Admin**: Highest level access
   - All Supervisor permissions
   - User management (create, edit, delete)
   - System configuration and settings
   - Full application control

The permissions are enforced both on the backend via middleware and on the frontend through conditional rendering.

## License

MIT 