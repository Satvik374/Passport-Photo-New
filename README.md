# Passport Photo Generator

A professional, AI-powered passport photo generation application that creates perfect passport photos with automatic background removal, customizable dimensions, and intelligent layout optimization.

## Features

### 🖼️ Professional Photo Processing
- **AI Background Removal**: Automatic background removal with custom color selection
- **Smart Cropping**: Intelligent crop and position tools with real-time preview
- **Multiple Formats**: Export as PNG, JPG, or PDF for printing
- **Custom Dimensions**: Support for passport, visa, and ID card sizes
- **Batch Generation**: Create multiple photos on a single A4 page

### 🎨 Advanced Customization
- **Photo Settings**: Width, height, quantity, layout position, and spacing controls
- **Border Options**: Adjustable photo border width (0-6mm)
- **Layout Positions**: Auto-layout or manual positioning (top, middle, bottom positions)
- **Distance Controls**: Customizable distance from top (0-20mm) and photo spacing

### 🌙 Modern User Experience
- **Dark/Light Theme**: Beautiful theme toggle with smooth transitions
- **Real-time Preview**: Instant preview updates with debounced controls
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Guest Mode**: Try the app without registration
- **User Accounts**: Save presets and access image history

### 🔐 Authentication & Data
- **Google Login**: Secure authentication via Replit Auth
- **Guest Access**: Full functionality without account requirement
- **Preset Management**: Save and load custom photo settings
- **Image History**: Access previously processed images
- **Secure Storage**: PostgreSQL database with user data protection

## Quick Start

### Option 1: Use on Replit (Recommended)
1. **Fork this Repl** on Replit
2. **Run the project** - all dependencies install automatically
3. **Upload your photo** and adjust settings
4. **Download** your professional passport photos

### Option 2: Local Development
```bash
# Clone the repository
git clone <repository-url>
cd passport-photo-generator

# Install dependencies
npm install

# Set up database (REQUIRED)
# For Windows PowerShell:
powershell -ExecutionPolicy Bypass -File setup-database.ps1

# For other systems:
node setup-database.js

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Fixing "endpoint has been disabled" Error

If you see the error `{"message":"The endpoint has been disabled. Enable it using Neon API and retry."}`, follow these steps:

1. **Go to [Neon Console](https://console.neon.tech)**
2. **Select your database project**
3. **Go to Settings → Compute**
4. **Click "Enable" to activate your database endpoint**
5. **Wait 2-3 minutes for the endpoint to start**
6. **Restart your application**

This error occurs when your Neon database endpoint is in sleep mode and needs to be activated.

## Environment Setup

The application automatically configures most settings, but you can customize:

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL database connection
- `SESSION_SECRET` - Session encryption key (auto-generated)

### Optional Features
- `REMOVE_BG_API_KEY_1` through `REMOVE_BG_API_KEY_10` - Remove.bg API keys for background removal
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - Google OAuth authentication
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` - Email verification service
- `MAILJET_API_KEY` and `MAILJET_SECRET_KEY` - Alternative email service

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Shadcn/ui** components with Radix UI
- **TanStack Query** for server state management
- **Wouter** for lightweight routing

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Sharp** for image processing
- **jsPDF** for PDF generation
- **Multer** for file uploads

### Database & Storage
- **PostgreSQL** with Drizzle ORM
- **Local file storage** for images
- **Session-based authentication**

### APIs & Services
- **Remove.bg API** for background removal
- **Google OAuth** via Replit Auth
- **Email services** (Gmail SMTP, Mailjet, or console fallback)

## Usage Guide

### 1. Upload Your Photo
- Drag and drop or click to select an image
- Supports JPG, PNG, and other common formats
- Works with any photo size or quality

### 2. Customize Settings
- **Photo Size**: Choose from presets (Passport 35×45mm, Visa 51×51mm, ID Card 25×35mm) or set custom dimensions
- **Quantity**: Select 1-20 photos per page
- **Layout**: Auto-layout or choose specific positioning
- **Spacing**: Adjust distance between photos (0-20mm)
- **Border**: Add photo borders (0-6mm thickness)

### 3. Background Removal (Optional)
- Enable AI background removal
- Choose custom background color
- Automatic layout regeneration with processed image

### 4. Download Your Photos
- **PDF**: High-quality printable format
- **PNG**: Transparent background support
- **JPG**: Smaller file size for digital use

## Advanced Features

### Preset Management
Save frequently used settings as presets:
- Custom names and descriptions
- Quick loading of saved configurations
- Personal preset library

### Theme System
- **Light Mode**: Clean, professional appearance
- **Dark Mode**: Easy on the eyes with full dark theme support
- **Auto-switching**: Remembers your preference

### Performance Optimization
- **Debounced Updates**: Smooth editing experience with 3-second preview delays
- **Smart Caching**: Efficient image processing and storage
- **Progressive Enhancement**: Works without JavaScript for basic functionality

## API Documentation

### Upload Endpoint
```
POST /api/upload
Content-Type: multipart/form-data

Response: { id, filename, originalName, mimeType, size }
```

### Layout Generation
```
POST /api/generate-layout
Content-Type: application/json

Body: {
  imageId: string,
  settings: PhotoSettings,
  cropSettings?: CropSettings,
  borderWidth?: number
}
```

### Download Endpoints
```
GET /api/generate-preview/:imageId
POST /api/generate-pdf
POST /api/download-image
```

## Development

### Project Structure
```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Application pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and configurations
├── server/               # Express backend
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry point
├── shared/               # Shared TypeScript types and schemas
└── uploads/              # Image storage directory
```

### Database Schema
- **users**: User accounts and authentication
- **uploaded_images**: Image metadata and file references
- **layout_results**: Generated layout configurations
- **email_verifications**: Email verification tokens

### Adding New Features
1. **Define types** in `shared/schema.ts`
2. **Add API routes** in `server/routes.ts`
3. **Update storage layer** in `server/storage.ts`
4. **Build frontend components** in `client/src/`
5. **Update documentation**

## Deployment

### Replit Deployment (Recommended)
- Fork the project on Replit
- All configuration is automatic
- Database and secrets management included
- Instant HTTPS and custom domains available

### Manual Deployment
```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Environment Setup for Production
- Set `NODE_ENV=production`
- Configure `DATABASE_URL` for PostgreSQL
- Set up `SESSION_SECRET` for security
- Configure optional API keys for features

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@yourapp.com or create an issue on GitHub.

## Acknowledgments

- Remove.bg for AI background removal API
- Replit for hosting and authentication services
- Shadcn/ui for beautiful component library
- All the open-source libraries that make this project possible#   A N D R O I D - - - P a s s p o r t - p h o t o - m a k e r  
 "# Passport-Photo-New" 
