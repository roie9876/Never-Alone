/**
 * Audio Generation Script
 * Generates pre-recorded Hebrew audio files using Azure Text-to-Speech
 * Reference: docs/technical/reminder-system.md - Pre-Recorded Audio Library
 *
 * Usage: ts-node scripts/generate-audio.ts
 */

import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface AudioScript {
  filename: string;
  hebrewText: string;
  englishDescription: string;
}

// 5 pre-recorded audio files for MVP
const AUDIO_SCRIPTS: AudioScript[] = [
  {
    filename: 'medication-reminder-hebrew.mp3',
    hebrewText: 'שלום! זה הזמן לתרופות שלך. בואו נדבר רגע.',
    englishDescription: 'Medication reminder - "Hello! It\'s time for your medication. Let\'s talk for a moment."',
  },
  {
    filename: 'check-in-hebrew.mp3',
    hebrewText: 'שלום! רציתי לבדוק איך אתה מרגיש היום. יש לך זמן לשיחה קצרה?',
    englishDescription: 'Daily check-in - "Hello! I wanted to check how you\'re feeling today. Do you have time for a short chat?"',
  },
  {
    filename: 'reminder-snoozed-10min-hebrew.mp3',
    hebrewText: 'בסדר, אזכיר לך שוב בעוד עשר דקות.',
    englishDescription: 'Snooze confirmation - "Okay, I\'ll remind you again in ten minutes."',
  },
  {
    filename: 'check-in-declined-hebrew.mp3',
    hebrewText: 'בסדר גמור! נדבר מאוחר יותר.',
    englishDescription: 'Check-in declined - "No problem! We\'ll talk later."',
  },
  {
    filename: 'appointment-30min-hebrew.mp3',
    hebrewText: 'תזכורת חשובה: יש לך פגישה בעוד שלושים דקות. תתכונן בבקשה.',
    englishDescription: 'Appointment reminder - "Important reminder: You have an appointment in thirty minutes. Please prepare."',
  },
];

const TEMP_DIR = path.join(__dirname, '../temp-audio');

/**
 * Generate audio using Azure Text-to-Speech
 */
async function generateAudio(script: AudioScript): Promise<Buffer> {
  const speechKey = process.env.SPEECH_KEY;
  const speechRegion = process.env.SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    throw new Error('SPEECH_KEY and SPEECH_REGION must be set in .env');
  }

  console.log(`\n🎙️  Generating: ${script.filename}`);
  console.log(`   Text: ${script.hebrewText}`);

  const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);

  // Use warm, conversational Hebrew voice (male)
  speechConfig.speechSynthesisVoiceName = 'he-IL-AvriNeural';

  // Output format: MP3, 128 kbps, mono (optimized for elderly hearing)
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;

  // Create temp directory if not exists
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const tempFile = path.join(TEMP_DIR, script.filename);
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(tempFile);

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  return new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(
      script.hebrewText,
      (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log(`   ✅ Audio generated: ${result.audioData.byteLength} bytes`);

          // Read the generated file
          const audioBuffer = fs.readFileSync(tempFile);
          synthesizer.close();
          resolve(audioBuffer);
        } else {
          const errorDetails = result.errorDetails;
          synthesizer.close();
          reject(new Error(`Speech synthesis failed: ${errorDetails}`));
        }
      },
      (error) => {
        synthesizer.close();
        reject(error);
      },
    );
  });
}

/**
 * Upload audio to Azure Blob Storage (using Azure AD)
 */
async function uploadToBlob(filename: string, audioBuffer: Buffer): Promise<string> {
  const storageAccountName = process.env.BLOB_STORAGE_ACCOUNT_NAME || 'neveralone';
  const containerName = process.env.BLOB_CONTAINER_AUDIO || 'audio-files';

  console.log(`   📤 Uploading to Blob Storage: ${containerName}/${filename}`);

  // Use Azure AD authentication
  const credential = new DefaultAzureCredential();
  const blobServiceUrl = `https://${storageAccountName}.blob.core.windows.net`;
  const blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Ensure container exists (no public access - using Azure AD)
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(filename);

  await blockBlobClient.uploadData(audioBuffer, {
    blobHTTPHeaders: {
      blobContentType: 'audio/mpeg',
    },
  });

  const blobUrl = blockBlobClient.url;
  console.log(`   ✅ Uploaded: ${blobUrl}`);

  return blobUrl;
}

/**
 * Main execution
 */
async function main() {
  console.log('🎵 Never Alone - Audio Generation Script');
  console.log('=========================================\n');
  console.log(`Generating ${AUDIO_SCRIPTS.length} Hebrew audio files...\n`);

  const results: { filename: string; url: string; size: number }[] = [];

  for (const script of AUDIO_SCRIPTS) {
    try {
      // Generate audio
      const audioBuffer = await generateAudio(script);

      // Upload to Blob Storage
      const blobUrl = await uploadToBlob(script.filename, audioBuffer);

      results.push({
        filename: script.filename,
        url: blobUrl,
        size: audioBuffer.byteLength,
      });

      console.log(`   📊 Size: ${(audioBuffer.byteLength / 1024).toFixed(2)} KB`);
      console.log(`   📝 Description: ${script.englishDescription}`);

    } catch (error) {
      console.error(`\n❌ Failed to generate ${script.filename}:`, error.message);
      process.exit(1);
    }
  }

  // Cleanup temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
    console.log('\n🧹 Cleaned up temporary files');
  }

  // Summary
  console.log('\n✅ All audio files generated successfully!');
  console.log('==========================================\n');
  console.log('Summary:');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.filename}`);
    console.log(`   Size: ${(result.size / 1024).toFixed(2)} KB`);
    console.log(`   URL: ${result.url}\n`);
  });

  console.log('Total files:', results.length);
  console.log('Total size:', (results.reduce((sum, r) => sum + r.size, 0) / 1024).toFixed(2), 'KB');
}

// Run the script
main()
  .then(() => {
    console.log('\n✨ Audio generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
