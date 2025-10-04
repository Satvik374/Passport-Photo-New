# Passport Photo Generator Application

## Overview

This is a full-stack web application for generating passport-sized photos. The application allows users to upload images and automatically arrange them into a printable layout with customizable dimensions and quantities. Built with a modern React frontend and Express.js backend, it provides an intuitive interface for creating professional passport photos.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clear separation between client and server code:

- **Frontend**: React application with TypeScript, built with Vite
- **Backend**: Express.js server with TypeScript 
- **Database**: PostgreSQL with Drizzle ORM (configured but not yet implemented)
- **UI Framework**: Shadcn/ui components with Tailwind CSS styling
- **State Management**: TanStack Query for server state management

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom design system variables
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query for API state, React hooks for local state

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **File Handling**: Multer for multipart file uploads
- **Image Processing**: Sharp for image manipulation and resizing
- **PDF Generation**: jsPDF for creating printable layouts
- **Validation**: Zod schemas shared between client and server

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM (fully implemented and active)
- **File Storage**: Local filesystem storage for uploaded images
- **Session Storage**: In-memory storage with plans for PostgreSQL sessions
- **Temporary Storage**: Multer uploads directory for processing

## Data Flow

1. **Image Upload**: User selects image files through drag-and-drop interface
2. **File Processing**: Multer handles file upload, Sharp processes images
3. **Layout Generation**: Server calculates optimal photo arrangement based on settings
4. **Preview Generation**: Processed layout returned to client for preview
5. **PDF Export**: Client can request PDF generation for printing

### API Endpoints
- `POST /api/upload` - Handle image file uploads
- `POST /api/generate-layout` - Process images with user settings
- `POST /api/generate-pdf` - Create printable PDF layouts
- `DELETE /api/images/:id` - Remove uploaded images

## External Dependencies

### Production Dependencies
- **UI & Styling**: @radix-ui components, tailwindcss, class-variance-authority
- **Data Handling**: @tanstack/react-query, react-hook-form, zod
- **Server**: express, multer, sharp, jspdf
- **Database**: @neondatabase/serverless, drizzle-orm
- **Utilities**: date-fns, clsx, lucide-react

### Development Dependencies
- **Build Tools**: vite, esbuild, typescript
- **Replit Integration**: @replit/vite-plugin-runtime-error-modal

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

### Build Process
- **Development**: `npm run dev` - Runs TSX server with hot reload
- **Production Build**: `npm run build` - Vite builds client, esbuild bundles server
- **Production Start**: `npm run start` - Runs compiled server from dist directory

### Environment Configuration
- **Database**: Configured for PostgreSQL via DATABASE_URL environment variable
- **File Storage**: Uploads directory with automatic creation
- **Static Assets**: Vite builds to dist/public for production serving

### Database Setup
- **Active Database**: PostgreSQL database fully implemented and running
- **Schema Management**: Drizzle ORM with tables for uploaded images and layout results
- **Data Models**: 
  - `uploaded_images` table storing image metadata and files
  - `layout_results` table storing photo arrangement settings and results
- **Relations**: Proper foreign key relationships between images and their layouts
- **Migration**: Applied via `npm run db:push` command

## Recent Changes (January 2025)

### Database Implementation
- ✓ Added PostgreSQL database with Drizzle ORM
- ✓ Created database tables for uploaded images and layout results
- ✓ Implemented DatabaseStorage class replacing in-memory storage
- ✓ Added proper TypeScript types and Zod validation schemas
- ✓ Established foreign key relationships between tables
- ✓ Successfully migrated schema to production database

### Background Removal & Download Options (January 28, 2025)
- ✓ Integrated custom background remover API with color customization
- ✓ Added automatic background removal workflow with user's custom API
- ✓ Layout generation now prioritizes background-removed images when available
- ✓ Added PNG and JPG download options alongside existing PDF generation
- ✓ Implemented high-resolution image generation using Sharp library
- ✓ Enhanced UI with multiple download format options and helpful descriptions
- ✓ Background-removed images automatically trigger layout regeneration

### Border Processing & File Naming (January 29, 2025)
- ✓ Fixed preview quantity display to show exact number of photos set by user
- ✓ Added black border processing for all photo outputs (preview, PNG, JPG, PDF)
- ✓ Implemented proper Sharp image processing with error handling and fallbacks
- ✓ Enhanced filename generation with descriptive details including dimensions, quantity, and border settings
- ✓ Added timestamp and photo settings to downloaded file names for better organization
- ✓ Fixed layout calculation logic to respect user's quantity setting instead of hardcoded layouts

### Background Removal Integration (January 29, 2025)
- ✓ Integrated Remove.bg API for professional background removal
- ✓ Added support for custom background color selection
- ✓ Maintained existing UI and workflow with reliable cloud service
- ✓ Background removal with automatic layout regeneration
- ✓ Fallback from custom API to Remove.bg for reliability
- ✓ Implemented multiple API key fallback system with 10 Remove.bg keys
- ✓ Automatic failover when API keys hit limits or fail
- ✓ Robust error handling and logging for API key cycling

### User Experience Improvements (January 29, 2025)
- ✓ Real-time preview is now permanently enabled for instant feedback
- ✓ Removed manual preview toggle to simplify interface
- ✓ Save cropped photo functionality now replaces original in preview instead of downloading
- ✓ Streamlined UI with automatic preview updates on all setting changes
- ✓ Enhanced crop and position tools with instant visual feedback

### Theme System Implementation (January 29, 2025)
- ✓ Added comprehensive light and dark theme support with smooth transitions
- ✓ Created attractive animated theme toggle with sun/moon icons and glow effects
- ✓ Implemented ThemeProvider with localStorage persistence across sessions
- ✓ Enhanced all UI components with proper dark mode styling
- ✓ Added gradient backgrounds that adapt beautifully to both themes

### Authentication & Data Persistence (January 30, 2025)
- ✓ Implemented Google login using Replit Auth with OpenID Connect integration
- ✓ Added comprehensive user authentication with session management  
- ✓ Created secure user-specific data storage for presets and image history
- ✓ Built elegant landing page for non-authenticated users with feature highlights
- ✓ Added user profile display and logout functionality in main application header
- ✓ Enhanced error handling with automatic redirection for authentication failures
- ✓ Optimized performance by simplifying intro animations and reducing heavy transitions
- ✓ Enhanced Google login branding with Google icons and clear call-to-action buttons
- ✓ Integrated multiple Remove.bg API keys for robust background removal service
- ✓ Database schema successfully migrated and user authentication fully operational

The application now features complete Google authentication through Replit's secure OpenID Connect system. Users can sign in with their Google accounts, save custom presets, access their image processing history, and maintain their data across sessions. The interface includes prominent Google branding to make the authentication method clear to users, optimized for better performance while maintaining a professional, polished appearance.

### Comprehensive Secrets Management System (January 30, 2025)
- ✓ Created automated secrets management system that initializes on first run
- ✓ Automatically detects and configures available environment variables (DATABASE_URL)
- ✓ Saves all secrets to .secrets file with automatic .gitignore integration
- ✓ Provides helpful setup instructions when required secrets are missing
- ✓ Pre-configured with 10 Remove.bg API keys for robust background removal
- ✓ Graceful fallbacks when optional services (Google Auth, Mailjet) aren't configured
- ✓ Real-time validation and status reporting of all configured secrets
- ✓ Auto-generated session secrets and Replit URL detection for seamless setup

### Email Verification Without API Dependencies (January 30, 2025)
- ✓ Built free email service using nodemailer with Gmail SMTP and generic SMTP support
- ✓ Console-based fallback for development (verification codes display in terminal)
- ✓ Automatic email service with graceful degradation when SMTP isn't configured
- ✓ Added email verification endpoints (/api/test-email) for instant testing
- ✓ Created elegant email templates with professional styling and branding
- ✓ Integrated email service into existing authentication workflow
- ✓ Frontend test interface available at /test-email route for demonstration
- ✓ Zero external dependencies - works immediately on project remix

### Two-Step Registration Process & OTP Flow Fix (August 11, 2025)
- ✓ Implemented secure two-step registration preventing premature account creation
- ✓ Added `pending_registrations` table to temporarily store unverified signup data
- ✓ User accounts are now created only AFTER successful OTP verification
- ✓ Fixed issue where incomplete registrations left "ghost" accounts in the database
- ✓ Enhanced registration flow prevents "account already exists" errors for unverified emails
- ✓ Users can re-attempt registration if they didn't complete OTP verification
- ✓ Proper cleanup of pending registrations after successful verification
- ✓ Maintained backwards compatibility with existing verified user accounts

The registration system now follows a proper two-step process:
1. User submits registration → Data stored in `pending_registrations` table + OTP sent
2. User verifies OTP → Actual user account created in `users` table + pending record deleted

This prevents the previous issue where users would see "account already exists" if they didn't complete OTP verification on their first attempt. Users can now safely re-register with the same email if their previous attempt was not completed, and only verified accounts are considered "existing" for duplicate prevention.

The email system works instantly when someone remixes this project. Users can configure Gmail or SMTP credentials for real emails, or rely on console output for development. The system includes beautiful HTML email templates and graceful fallbacks, ensuring verification codes are always accessible whether through email delivery or console logs.

The secrets management system ensures new users can run the project immediately on first startup, with automatic configuration of all available services and clear guidance for optional features. When someone remixes this project, all core secrets (database, session, Remove.bg API keys) are automatically configured, making the application instantly functional.

## Environment Variables Configuration (January 30, 2025)

### Current Setup Status
- ✅ **Database**: PostgreSQL fully configured and operational
- ✅ **Authentication**: Guest login working, Google OAuth credentials provided
- ✅ **Background Removal**: 10 Remove.bg API keys configured with failover
- ✅ **Email Service**: Gmail SMTP configured for verification emails
- ✅ **Session Management**: Secure session secrets auto-generated
- ✅ **Mobile Responsive**: Header buttons optimized for mobile devices
- ❌ **Mailjet Service**: Removed per user request - using Gmail SMTP only

### Complete Environment Variables List
The application uses the following environment variables (see .env.example for full configuration):

**Core Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key (auto-generated)
- `REPLIT_APP_URL` - Application URL for OAuth redirects

**Background Removal (10 keys for redundancy):**
- `REMOVE_BG_API_KEY_1` through `REMOVE_BG_API_KEY_10`

**Authentication:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

**Email Service:**
- `GMAIL_USER` - Gmail address for SMTP
- `GMAIL_APP_PASSWORD` - Gmail app-specific password

All secrets are managed through Replit's secure environment system with automatic fallbacks and graceful degradation when optional services aren't configured.