# AI-Powered Text to BPMN Process and Decision Engine

A comprehensive web application that transforms plain text descriptions into professional Business Process Model and Notation (BPMN) diagrams, with integrated LaTeX document generation capabilities. This platform combines AI-powered text analysis with advanced diagramming tools to streamline process documentation and decision modeling.

## 🚀 Key Features

### 🔐 **Authentication & User Management**
- **Secure Authentication System**: JWT-based authentication with email verification
- **Role-Based Access Control**: Three-tier permission system (User, Supervisor, Admin)
- **Google OAuth Integration**: Seamless sign-in with Google accounts
- **Password Management**: Forgot password flow with email verification
- **User Profile Management**: Complete profile editing and management

### 🎯 **BPMN Process Modeling**
- **Advanced BPMN Editor**: Full-featured diagram editor with drag-and-drop functionality
- **Text-to-BPMN Conversion**: AI-powered conversion from natural language to BPMN diagrams
- **Visual Process Design**: Intuitive interface for creating complex business processes
- **Multiple Export Formats**: PNG, SVG, PDF, and XML export options
- **Import Capabilities**: Support for BPMN XML, Excel files, and JSON data
- **Color Customization**: Advanced color picker for diagram elements
- **File Management**: Organized file tree structure for project management

### 📝 **LaTeX Document Generation**
- **Dual Editor Modes**: Code editor and visual editor for LaTeX documents
- **Real-time Preview**: Live rendering of mathematical equations and documents
- **Template System**: Pre-built LaTeX templates for various document types
- **BPMN-to-LaTeX Conversion**: Automatic conversion of BPMN diagrams to LaTeX documentation
- **Export Options**: PDF, DOCX, and HTML export capabilities
- **Mathematical Notation**: Full support for complex mathematical expressions using KaTeX

### 🤖 **AI-Powered Features**
- **Natural Language Processing**: Convert text descriptions to structured BPMN elements
- **Intelligent Element Recognition**: Automatic identification of tasks, gateways, and events
- **Process Flow Analysis**: AI-driven process flow optimization suggestions
- **Smart Templates**: AI-generated templates based on process descriptions

### 📊 **Project Management**
- **File Tree Organization**: Hierarchical file management system
- **Version Control**: Track changes and maintain document history
- **Collaboration Tools**: Multi-user support with role-based permissions
- **Project Templates**: Pre-built templates for common business processes

### 🔧 **Advanced Tools**
- **Excel Integration**: Import process data from Excel spreadsheets
- **JSON Import/Export**: Flexible data interchange formats
- **Change Tracking**: Monitor and review document modifications
- **Duplicate Detection**: Smart duplicate file detection and management

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **React Hook Form**: Form handling and validation

### BPMN & Diagramming
- **bpmn-js**: Professional BPMN modeling library
- **bpmn-js-color-picker**: Advanced color customization
- **bpmn-js-properties-panel**: Element property management

### LaTeX & Document Processing
- **Monaco Editor**: Advanced code editing experience
- **KaTeX**: Fast mathematical typesetting
- **Slate.js**: Rich text editing framework
- **jsPDF**: PDF generation capabilities
- **docx**: Microsoft Word document generation

### Backend & Database
- **Node.js**: Server-side runtime
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT**: Secure authentication tokens
- **Nodemailer**: Email service integration

### AI & Data Processing
- **fast-xml-parser**: XML processing for BPMN
- **xlsx**: Excel file processing
- **uuid**: Unique identifier generation

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **MongoDB**: Database server (local or cloud)
- **Email Service**: SMTP service for email notifications

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/mubashir-ullah/Text-to-BPMN-Process-and-Decision-Engine.git
cd Text-to-BPMN-Process-and-Decision-Engine
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Authentication
JWT_SECRET=your_secure_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here

# Database
MONGODB_URI=your_mongodb_connection_string

# Email Service (for OTP and notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 4. Database Setup
Ensure MongoDB is running and accessible. The application will automatically create necessary collections.

### 5. Seed Templates (Optional)
```bash
node scripts/seed-all-templates.js
```

### 6. Start Development Server
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 User Guide

### 🔐 Getting Started

#### 1. **Account Creation**
1. Navigate to the signup page
2. Enter your name, email, and password
3. Select your role (User, Supervisor, or Admin)
4. Verify your email with the OTP sent to your inbox
5. Complete your profile setup

#### 2. **Sign In**
1. Use your email and password, or
2. Click "Sign in with Google" for OAuth authentication
3. Access your personalized dashboard

### 🎯 Using the BPMN Editor

#### **Creating a New BPMN Diagram**
1. **Access the Editor**: Click "BPMN Editor" in the sidebar
2. **Start with Template**: Choose from pre-built templates or start with a blank canvas
3. **Add Elements**: Use the palette to drag and drop BPMN elements
4. **Connect Elements**: Create sequence flows between elements
5. **Customize**: Use the color picker and properties panel to customize elements

#### **Text-to-BPMN Conversion**
1. **Import Text**: Use the "Import" dropdown → "Text Description"
2. **Enter Process Description**: Describe your business process in natural language
3. **AI Processing**: The system analyzes your text and generates BPMN elements
4. **Review & Edit**: Refine the generated diagram as needed

#### **Importing Data**
- **Excel Files**: Import process data from Excel spreadsheets
- **BPMN XML**: Import existing BPMN diagrams
- **JSON Data**: Import structured process data

#### **Exporting Diagrams**
- **PNG/SVG**: For presentations and documentation
- **PDF**: For formal documentation
- **BPMN XML**: For sharing with other BPMN tools

### 📝 Using the LaTeX Editor

#### **Creating LaTeX Documents**
1. **Access LaTeX Editor**: Click "LaTeX Editor" in the sidebar
2. **Choose Mode**: Select between Code Editor or Visual Editor
3. **Use Templates**: Start with pre-built templates for common document types
4. **Real-time Preview**: See your document rendered in real-time

#### **Visual Editor Features**
- **Rich Text Editing**: WYSIWYG interface for document creation
- **Mathematical Equations**: Insert complex mathematical expressions
- **Tables**: Create and edit tables with the table picker
- **Images**: Insert and manage images in your documents

#### **Code Editor Features**
- **Syntax Highlighting**: Full LaTeX syntax support
- **Auto-completion**: Intelligent code suggestions
- **Error Detection**: Real-time error highlighting
- **Live Preview**: Side-by-side code and preview

#### **BPMN-to-LaTeX Conversion**
1. **Open BPMN Diagram**: Load your BPMN diagram
2. **Convert**: Use the "Convert to LaTeX" feature
3. **Generate Documentation**: Automatically create process documentation
4. **Customize**: Edit the generated LaTeX content as needed

### 📊 Project Management

#### **File Organization**
- **File Tree**: Hierarchical organization of your projects
- **Folders**: Create folders to organize related documents
- **Search**: Quick search through your project files
- **Sorting**: Sort files by name, date, or type

#### **Version Control**
- **Change Tracking**: Monitor document modifications
- **History**: View previous versions of documents
- **Revert**: Restore previous versions if needed
- **Compare**: Compare different versions of documents

### 🔧 Advanced Features

#### **Collaboration**
- **User Management**: Admin can manage user accounts and permissions
- **Role-based Access**: Different features available based on user role
- **Shared Projects**: Collaborate on documents with team members

#### **Templates**
- **BPMN Templates**: Pre-built process templates for common scenarios
- **LaTeX Templates**: Document templates for various academic and business needs
- **Custom Templates**: Create and save your own templates

#### **Export & Sharing**
- **Multiple Formats**: Export in various formats (PDF, DOCX, PNG, SVG)
- **Batch Export**: Export multiple documents at once
- **Sharing Links**: Generate shareable links for documents

## 🏗️ Project Structure

```
Text-to-BPMN-Process-and-Decision-Engine/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── bpmn/                 # BPMN-related APIs
│   │   ├── latex/                # LaTeX-related APIs
│   │   └── users/                # User management APIs
│   ├── components/               # React components
│   │   ├── ui/                   # Reusable UI components
│   │   ├── BpmnEditor.tsx        # BPMN editor component
│   │   ├── LatexEditor.tsx       # LaTeX editor component
│   │   └── ...                   # Other components
│   ├── utils/                    # Utility functions
│   ├── types/                    # TypeScript type definitions
│   └── globals.css               # Global styles
├── models/                       # Database models
├── lib/                          # Library configurations
├── public/                       # Static assets
├── scripts/                      # Utility scripts
└── data/                         # Data files
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password encryption
- **Role-based Access Control**: Granular permission system
- **Protected Routes**: Middleware-based route protection
- **Input Validation**: Comprehensive form validation
- **CSRF Protection**: Cross-site request forgery protection

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
Ensure all environment variables are properly configured for your production environment.

### Database Setup
- Use MongoDB Atlas for cloud database hosting
- Configure proper network access and security rules
- Set up database backups and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for common solutions

## 🔄 Version History

- **v1.0.0**: Initial release with BPMN editor and basic authentication
- **v1.1.0**: Added LaTeX editor and document generation
- **v1.2.0**: Implemented AI-powered text-to-BPMN conversion
- **v1.3.0**: Enhanced collaboration features and user management
- **v1.4.0**: Added advanced export options and template system

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies** 