# GhostHound - OSINT Intelligence Platform

GhostHound is a comprehensive OSINT (Open Source Intelligence) platform built with Next.js 14, TypeScript, and MongoDB. It provides advanced tools for cybersecurity investigations, including username tracking, domain analysis, data breach detection, and EXIF metadata extraction.

## Features

- **Sherlock**: Search usernames across 20+ social media platforms
- **Domain Analysis**: WHOIS, DNS, geolocation, and port scanning
- **Data Breach**: Check if emails or usernames are compromised
- **EXIF Extractor**: Extract metadata from images locally (GPS, camera, date)
- **Authentication**: JWT-based auth with refresh tokens
- **OAuth Support**: Google and GitHub OAuth integration
- **Internationalization**: Support for Italian and English
- **Dark Mode**: Built-in theme switching
- **Rate Limiting**: API rate limiting for security

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcryptjs
- **OSINT Tools**: axios, cheerio, exif-js, whois
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ghosthound.git
cd ghosthound
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/ghosthound
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

4. Start MongoDB:
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or using local MongoDB
mongod
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ghosthound/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   ├── auth/       # Authentication endpoints
│   │   │   ├── tools/      # OSINT tool endpoints
│   │   │   └── user/       # User endpoints
│   │   ├── auth/           # Auth pages (login, register)
│   │   ├── dashboard/      # Dashboard and tool pages
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── theme-provider.tsx
│   ├── lib/                # Utility functions
│   │   ├── auth.ts         # Authentication utilities
│   │   ├── middleware.ts   # API middleware
│   │   ├── mongodb.ts      # MongoDB connection
│   │   └── utils.ts        # General utilities
│   ├── models/             # Mongoose models
│   │   ├── User.ts
│   │   └── RefreshToken.ts
│   ├── services/           # OSINT services
│   │   ├── sherlockService.ts
│   │   ├── domainService.ts
│   │   └── breachService.ts
│   └── locales/            # i18n translations
│       ├── it/             # Italian translations
│       └── en/             # English translations
├── public/                 # Static assets
├── .env.example           # Environment variables template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── next.config.js         # Next.js configuration
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Tools (Protected)
- `POST /api/v1/tools/sherlock` - Search username
- `POST /api/v1/tools/domain` - Analyze domain/IP
- `POST /api/v1/tools/breach` - Check data breaches

### User (Protected)
- `GET /api/v1/user/profile` - Get user profile
- `PUT /api/v1/user/settings` - Update user settings

## Usage

### Register and Login
1. Navigate to `/auth/register` to create an account
2. Fill in your name, email, and password
3. After registration, you'll be redirected to the dashboard

### Using Sherlock
1. Navigate to `/dashboard/sherlock`
2. Enter a username to search
3. View results across 20+ platforms
4. Export results as JSON

### Domain Analysis
1. Navigate to `/dashboard/domain`
2. Enter a domain or IP address
3. View WHOIS, DNS, geolocation, and port data
4. Export results as JSON

### Data Breach Check
1. Navigate to `/dashboard/breach`
2. Enter an email or username
3. View compromised data if any
4. Get security recommendations

### EXIF Extraction
1. Navigate to `/dashboard/exif`
2. Upload an image
3. View extracted metadata (GPS, camera, date, etc.)
4. All processing is done locally in your browser

## Security

- JWT tokens with short expiration (15 minutes)
- Refresh tokens with 7-day expiration
- Password hashing with bcryptjs
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Environment variable protection

## Deployment

### Vercel
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker
```bash
docker build -t ghosthound .
docker run -p 3000:3000 --env-file .env ghosthound
```

### Manual
```bash
npm run build
npm start
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Disclaimer

GhostHound is intended for educational and legitimate security research purposes only. Users are responsible for ensuring they have proper authorization before conducting any OSINT activities. The authors are not responsible for any misuse of this tool.

## Support

For issues, questions, or contributions, please open an issue on GitHub.
