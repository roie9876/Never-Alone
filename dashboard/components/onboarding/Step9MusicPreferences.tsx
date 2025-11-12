/**
 * Step 9: Music Preferences (Optional)
 * Configure therapeutic music playback for the patient
 */

'use client';

import { useFormContext } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/lib/validation';

export default function Step9MusicPreferences() {
  const { register, watch, formState: { errors } } = useFormContext<OnboardingFormSchema>();
  
  const musicEnabled = watch('musicPreferences.enabled');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🎵 Music Preferences</h2>
        <p className="mt-2 text-gray-600">
          Music can help improve mood and trigger positive memories. Configure the patient&apos;s preferred music here.
        </p>
      </div>

      {/* Enable Music Feature */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-start">
          <input
            {...register('musicPreferences.enabled')}
            type="checkbox"
            id="musicEnabled"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="musicEnabled" className="ml-3">
            <span className="block text-sm font-medium text-gray-900">
              Enable music playback
            </span>
            <span className="block text-sm text-gray-600 mt-1">
              Allow the AI to play music during conversations (optional feature)
            </span>
          </label>
        </div>
      </div>

      {musicEnabled && (
        <>
          {/* Music Service Info */}
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>MVP uses YouTube Music (free tier)</strong>
                  <br />
                  Post-MVP: Spotify Premium and Apple Music integration will be available.
                </p>
              </div>
            </div>
          </div>

          {/* Preferred Artists */}
          <div>
            <label htmlFor="musicPreferences.preferredArtists" className="block text-sm font-medium text-gray-700">
              Preferred Artists
            </label>
            <input
              {...register('musicPreferences.preferredArtists')}
              type="text"
              placeholder="e.g., Naomi Shemer, Arik Einstein, The Beatles"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter artist names separated by commas. These artists will be used to enhance search results.
            </p>
            {errors.musicPreferences?.preferredArtists && (
              <p className="mt-1 text-sm text-red-600">{errors.musicPreferences.preferredArtists.message}</p>
            )}
          </div>

          {/* Preferred Songs */}
          <div>
            <label htmlFor="musicPreferences.preferredSongs" className="block text-sm font-medium text-gray-700">
              Preferred Songs
            </label>
            <input
              {...register('musicPreferences.preferredSongs')}
              type="text"
              placeholder="e.g., ירושלים של זהב, אני ואתה, Imagine"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              dir="auto"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter song titles separated by commas. Hebrew and English songs are supported.
            </p>
            {errors.musicPreferences?.preferredSongs && (
              <p className="mt-1 text-sm text-red-600">{errors.musicPreferences.preferredSongs.message}</p>
            )}
          </div>

          {/* Music Genres */}
          <div>
            <label htmlFor="musicPreferences.preferredGenres" className="block text-sm font-medium text-gray-700">
              Music Genres
            </label>
            <input
              {...register('musicPreferences.preferredGenres')}
              type="text"
              placeholder="e.g., Israeli classics, 1960s folk, Classical"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter music genres separated by commas.
            </p>
            {errors.musicPreferences?.preferredGenres && (
              <p className="mt-1 text-sm text-red-600">{errors.musicPreferences.preferredGenres.message}</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Behavior Settings</h3>
            
            {/* Allow Auto-Play */}
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  {...register('musicPreferences.allowAutoPlay')}
                  type="checkbox"
                  id="allowAutoPlay"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="allowAutoPlay" className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">
                    Allow AI to suggest music automatically
                  </span>
                  <span className="block text-sm text-gray-600 mt-1">
                    If disabled, AI will only play music when explicitly asked by the patient.
                  </span>
                </label>
              </div>

              {/* Play on Sadness */}
              <div className="flex items-start">
                <input
                  {...register('musicPreferences.playOnSadness')}
                  type="checkbox"
                  id="playOnSadness"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="playOnSadness" className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">
                    Play calming music when patient seems sad or anxious
                  </span>
                  <span className="block text-sm text-gray-600 mt-1">
                    AI will detect emotional cues and suggest therapeutic music.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Max Songs Per Session */}
          <div>
            <label htmlFor="musicPreferences.maxSongsPerSession" className="block text-sm font-medium text-gray-700">
              Maximum songs per conversation
            </label>
            <input
              {...register('musicPreferences.maxSongsPerSession', { valueAsNumber: true })}
              type="number"
              min="1"
              max="5"
              defaultValue="3"
              className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
            <p className="mt-1 text-sm text-gray-500">
              Limit to avoid overwhelming the patient (1-5 songs recommended).
            </p>
            {errors.musicPreferences?.maxSongsPerSession && (
              <p className="mt-1 text-sm text-red-600">{errors.musicPreferences.maxSongsPerSession.message}</p>
            )}
          </div>

          {/* Example Usage */}
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">Example Conversation:</h4>
            <div className="text-sm text-green-800 space-y-2">
              <p><strong>Patient:</strong> &quot;אני מרגיש עצוב&quot; (I feel sad)</p>
              <p><strong>AI:</strong> &quot;אני שומע שאתה עצוב. אולי מוזיקה תעזור? יש לי &apos;ירושלים של זהב&apos; של נעמי שמר.&quot;</p>
              <p className="text-xs italic">(I hear you&apos;re sad. Maybe music would help? I have &apos;Jerusalem of Gold&apos; by Naomi Shemer.)</p>
              <p><strong>Patient:</strong> &quot;כן, בבקשה&quot; (Yes, please)</p>
              <p><strong>AI:</strong> [Plays music] 🎵</p>
            </div>
          </div>
        </>
      )}

      {!musicEnabled && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600">
            Music is disabled. You can enable it anytime in settings after onboarding.
          </p>
        </div>
      )}
    </div>
  );
}
