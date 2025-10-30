# Passport Photo Generator Application

## Overview

This is a full-stack web application designed for generating passport-sized photos. It enables users to upload images, which are then automatically arranged into a printable layout with customizable dimensions and quantities. The application aims to provide an intuitive and efficient tool for creating professional passport photos.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application uses a monorepo structure, separating client and server code, and relies on in-memory storage for all application data to simplify deployment and enhance speed.

### UI/UX Decisions
- **UI Framework**: Shadcn/ui components
- **Styling**: Tailwind CSS with custom design system variables
- **Theming**: Comprehensive light and dark theme support with smooth transitions and `localStorage` persistence.
- **Interaction**: Real-time preview is permanently enabled; save cropped photo functionality replaces the original in preview.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, built with Vite, using Wouter for routing, React Hook Form with Zod for forms, and TanStack Query for server state.
- **Backend**: Node.js with Express.js, TypeScript, Multer for file uploads, Sharp for image manipulation, and jsPDF for PDF generation.
- **Data Storage**: In-memory storage using Maps for all application data (users, images, layouts, presets) and local filesystem for uploaded images. Data is reset on server restart.
- **API Endpoints**:
    - `POST /api/upload`: Handles image file uploads.
    - `POST /api/generate-layout`: Processes images with user settings.
    - `POST /api/generate-pdf`: Creates printable PDF layouts.
    - `DELETE /api/images/:id`: Removes uploaded images.

### Feature Specifications
- **Image Processing**: Automatic arrangement into printable layouts, background removal (with multi-key API fallback system), border processing, and high-resolution image generation.
- **Output Options**: PNG, JPG, and PDF download options.
- **Authentication**: Google login using Replit Auth (OpenID Connect) with secure session management, user-specific data storage for presets and image history.
- **Registration**: Two-step registration process using `pending_registrations` table and OTP verification to prevent "ghost" accounts.
- **Email Service**: In-built email verification service using Nodemailer with Gmail SMTP or generic SMTP support, falling back to console output in development.

### System Design Choices
- **Monorepo Structure**: Clear separation between client (React) and server (Express.js).
- **In-Memory Storage**: Chosen for simplicity, speed, and ease of deployment without external database dependencies.
- **Secrets Management**: Automated system initializes on first run, detects environment variables, saves to `.secrets` file, and provides setup instructions.
- **Deployment**: Configured for Replit, with Vite building the client and esbuild bundling the server for production.

## External Dependencies

- **UI & Styling**: `@radix-ui/react-icons`, `tailwindcss`, `class-variance-authority`
- **Data Handling**: `@tanstack/react-query`, `react-hook-form`, `zod`
- **Server Framework**: `express`, `express-session`
- **File Handling**: `multer`
- **Image Processing**: `sharp`
- **PDF Generation**: `jspdf`
- **Authentication**: Replit Auth (for Google OAuth)
- **Email**: `nodemailer` (for SMTP with Gmail/generic SMTP)
- **Utilities**: `date-fns`, `clsx`, `lucide-react`