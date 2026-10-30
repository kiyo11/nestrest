# Google OAuth Setup Guide for NestRest

## Step 1: Get Your Google Cloud Credentials

### If you already have credentials, skip to Step 2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Enable the **People API**:
   - Click "Enable APIs and Services" → Search for "Google People API" → Enable
4. Configure OAuth consent screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill in required fields (app name, user support email, developer contact)
   - Add scopes: `email`, `profile`
5. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (for development)
   - Copy the **Client ID** and **Client Secret**

### For Production

Add your production URL to authorized redirect URIs:
- `https://yourdomain.com/api/auth/callback/google`

## Step 2: Add Credentials to Environment Variables

Open `apps/web/.env.local` and replace the placeholder values:

```bash
# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here

# Generate a secure secret for NextAuth
NEXTAUTH_SECRET="your-generated-secret-here"
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure random secret:

```bash
openssl rand -base64 32
```

Or use the helper script I created:

```bash
cd nestrest && chmod +x scripts/generate-secret.sh && ./scripts/generate-secret.sh
```

## Step 3: Configure Google Cloud Authorized Redirect URIs

In your Google Cloud Console, under OAuth 2.0 Client ID → Edit:

**Development:**
- Add: `http://localhost:3000/api/auth/callback/google`

**Production (when deploying):**
- Add: `https://yourdomain.com/api/auth/callback/google`

## Step 4: Verify Configuration

After adding your credentials, verify they're loaded correctly by running:

```bash
cd apps/web && pnpm dev
```

You should see the login page with a "Sign in with Google" button.

## Troubleshooting

### "Invalid Client" Error
- Check that `GOOGLE_CLIENT_ID` is correct (ends with `.apps.googleusercontent.com`)
- Verify redirect URI matches exactly in both `.env.local` and Google Cloud Console

### "Access Blocked" Error
- Ensure the OAuth consent screen is published (not in testing mode) for production
- For development, add your email to the test users list in Google Cloud Console

### CORS Errors
- Make sure `NEXT_PUBLIC_API_URL` points to the correct backend URL
- Verify the API server is running on port 3001

## Testing OAuth Flow

1. Start both apps:
   ```bash
   cd nestrest && pnpm dev
   ```

2. Navigate to http://localhost:3000/login

3. Click "Sign in with Google"

4. You should be redirected back to the app, authenticated!

## Next Steps After OAuth Setup

1. **Set up Stripe** for payment processing
2. **Configure database** connection string
3. **Run migrations**: `cd apps/api && pnpm db:push`
4. **Seed sample data**: `cd apps/api && pnpm db:seed`
