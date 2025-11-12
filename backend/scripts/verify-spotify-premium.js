#!/usr/bin/env node

/**
 * Verify Spotify Premium Status
 *
 * This script will:
 * 1. Guide you through OAuth authentication
 * 2. Check your account type (Premium, Free, etc.)
 * 3. Save access tokens for future use
 */

const SpotifyWebApi = require('spotify-web-api-node');
const http = require('http');
const { exec } = require('child_process');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

// Spotify scopes needed for full playback
const scopes = [
  'user-read-private',
  'user-read-email',
  'user-modify-playback-state',
  'user-read-playback-state',
  'streaming',
];

// Create Spotify API instance
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'http://127.0.0.1:8000/callback',
});

async function startAuthFlow() {
  console.log('');
  log('🔐', '=== SPOTIFY PREMIUM VERIFICATION ===', colors.magenta);
  console.log('');

  // Generate authorization URL
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'state-' + Date.now());

  log('📋', 'Steps to verify:', colors.blue);
  console.log('  1. A browser window will open automatically');
  console.log('  2. Log in to your Spotify account');
  console.log('  3. Click "Agree" to authorize');
  console.log('  4. You will be redirected back (callback will be captured)');
  console.log('');

  log('🌐', 'Opening browser for authentication...', colors.yellow);
  console.log('');

  // Create a simple HTTP server to capture the callback
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url.startsWith('/callback')) {
        // Extract authorization code from URL
        const url = new URL(req.url, 'http://127.0.0.1:8000');
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>❌ Authorization failed</h1><p>You can close this window.</p>');
          server.close();
          reject(new Error(`Authorization error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>❌ No authorization code received</h1>');
          server.close();
          reject(new Error('No authorization code'));
          return;
        }

        try {
          // Exchange code for access token
          const data = await spotifyApi.authorizationCodeGrant(code);

          spotifyApi.setAccessToken(data.body.access_token);
          spotifyApi.setRefreshToken(data.body.refresh_token);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Success!</title></head>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: green;">✅ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>
          `);

          server.close();
          resolve({
            accessToken: data.body.access_token,
            refreshToken: data.body.refresh_token,
            expiresIn: data.body.expires_in,
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>❌ Token exchange failed</h1>');
          server.close();
          reject(error);
        }
      }
    });

    server.listen(8000, () => {
      log('🚀', 'Callback server started on http://127.0.0.1:8000', colors.green);

      // Open browser after a short delay (macOS)
      setTimeout(() => {
        exec(`open "${authorizeURL}"`, (error) => {
          if (error) {
            log('⚠️', 'Could not open browser automatically', colors.yellow);
            console.log(`Please open this URL manually:`);
            console.log(authorizeURL);
          }
        });
      }, 1000);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timeout - no response within 2 minutes'));
    }, 120000);
  });
}

async function checkUserProfile(tokens) {
  console.log('');
  log('👤', 'Checking your Spotify account...', colors.blue);

  try {
    const me = await spotifyApi.getMe();

    console.log('');
    log('✅', 'Account Information:', colors.green);
    console.log(`  Display Name: ${me.body.display_name || 'N/A'}`);
    console.log(`  Email: ${me.body.email}`);
    console.log(`  Country: ${me.body.country}`);
    console.log(`  Product: ${me.body.product}`);
    console.log('');

    if (me.body.product === 'premium') {
      log('🎉', 'CONFIRMED: You have Spotify Premium!', colors.green);
      console.log('');
      console.log(`${colors.green}You can use full Spotify playback features:${colors.reset}`);
      console.log('  ✅ Full song playback (not just 30-second previews)');
      console.log('  ✅ Control playback (play, pause, skip)');
      console.log('  ✅ Create playlists');
      console.log('  ✅ High quality audio');
      console.log('');

      // Save tokens to .env
      log('💾', 'Saving tokens...', colors.yellow);
      console.log('');
      console.log(`${colors.yellow}Add these to your .env file:${colors.reset}`);
      console.log('');
      console.log(`SPOTIFY_ACCESS_TOKEN=${tokens.accessToken}`);
      console.log(`SPOTIFY_REFRESH_TOKEN=${tokens.refreshToken}`);
      console.log('');

      return true;
    } else {
      log('⚠️', `You have Spotify ${me.body.product.toUpperCase()}`, colors.yellow);
      console.log('');
      console.log(`${colors.yellow}Limitations with Spotify Free:${colors.reset}`);
      console.log('  ❌ Cannot control playback via API');
      console.log('  ❌ Cannot play full songs programmatically');
      console.log('  ⚠️ Can only search and get track info');
      console.log('');
      console.log('To use full music features, upgrade to Spotify Premium:');
      console.log('https://www.spotify.com/premium/');
      console.log('');

      return false;
    }
  } catch (error) {
    log('❌', `Failed to get user profile: ${error.message}`, colors.red);
    return false;
  }
}

async function main() {
  try {
    // Step 1: Authenticate
    const tokens = await startAuthFlow();

    log('✅', 'Authentication successful!', colors.green);
    console.log(`  Access token expires in ${tokens.expiresIn} seconds`);

    // Step 2: Check account type
    const isPremium = await checkUserProfile(tokens);

    if (isPremium) {
      log('📝', 'Next Steps:', colors.blue);
      console.log('  1. Add the tokens above to your .env file');
      console.log('  2. I will implement Spotify Web Playback SDK');
      console.log('  3. Full songs will play in the Flutter app');
      console.log('  4. No ads, no time limits!');
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    log('❌', `Error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

main();
