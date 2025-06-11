# Captionly.io

Captionly.io is a full-stack SaaS application that automatically generates and edits captions for videos using AI. Built with Next.js 14, Supabase, and OpenAI's Whisper API.

## Features

- 🔐 User authentication with Supabase Auth
- 📤 Video upload and storage with Supabase Storage
- 🤖 Automatic caption generation using OpenAI Whisper
- ✏️ Caption editor interface
- 🎥 Video rendering with burned-in captions
- 📥 Download processed videos
- 📊 Dashboard for managing videos

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Radix UI, Shadcn UI
- **Backend**: Next.js API Routes, Supabase
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **AI**: OpenAI Whisper API
- **Video Processing**: FFmpeg

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/captionly.git
   cd captionly
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables template:
   ```bash
   cp .env.local.example .env.local
   ```

4. Set up your environment variables in `.env.local`:
   - Get your Supabase credentials from your project settings
   - Get your OpenAI API key from your OpenAI account
   - Adjust the max upload size if needed

5. Set up your Supabase database:
   - Create a new Supabase project
   - Run the SQL migrations from `supabase/migrations`
   - Set up storage buckets for videos
   - Configure RLS policies

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
captionly/
├── app/                    # Next.js 14 app directory
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Dashboard page
│   ├── edit/             # Caption editor
│   ├── process/          # Video processing
│   ├── upload/           # Video upload
│   └── download/         # Video download
├── components/            # React components
├── lib/                   # Utility functions
├── public/               # Static assets
└── supabase/             # Supabase configuration
```

## Deployment

The application can be deployed on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure the environment variables
4. Deploy!

## License

MIT 