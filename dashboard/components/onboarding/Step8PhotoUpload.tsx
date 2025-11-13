'use client';

import { useFormContext } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { useState } from 'react';
import type { OnboardingFormData, Photo } from '@/types/onboarding';

export default function Step8PhotoUpload() {
  const { setValue, watch } = useFormContext<OnboardingFormData>();
  const photos = watch('photos') || [];
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true);
    
    for (const file of acceptedFiles) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Max size: 5MB`);
        continue;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        continue;
      }

      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Upload to API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', watch('userId'));

        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          console.error('Upload failed:', response.status, errorData);
          throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
        }

        const uploadedPhoto: Photo = await response.json();
        
        // Add to form data
        setValue('photos', [...photos, uploadedPhoto]);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to upload ${file.name}: ${errorMessage}`);
      }
    }

    setUploading(false);
    setUploadProgress({});
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true,
  });

  const removePhoto = (photoId: string) => {
    setValue('photos', photos.filter(p => p.id !== photoId));
  };

  const updatePhotoTags = (photoId: string, tags: string[]) => {
    setValue('photos', photos.map(p => 
      p.id === photoId ? { ...p, manualTags: tags } : p
    ));
  };

  const updatePhotoCaption = (photoId: string, caption: string) => {
    setValue('photos', photos.map(p => 
      p.id === photoId ? { ...p, caption } : p
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          📷 תמונות משפחה
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          העלה תמונות של בני משפחה, חברים ורגעים חשובים. 
          המערכת תוכל להציג תמונות אלו במהלך השיחה כדי לעודד זיכרונות ולשפר את מצב הרוח.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="mr-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              למה תמונות חשובות?
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pr-5 space-y-1">
                <li>תמונות מעוררות זיכרונות רגשיים חזקים</li>
                <li>עוזרות לזהות בני משפחה וחברים</li>
                <li>משפרות מצב רוח ומפחיתות חרדה</li>
                <li>מעודדות שיחה ומעורבות</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div className="text-gray-600">
            {isDragActive ? (
              <p className="text-lg font-medium">שחרר כדי להעלות...</p>
            ) : (
              <>
                <p className="text-lg font-medium">גרור תמונות לכאן או לחץ לבחירה</p>
                <p className="text-sm text-gray-500 mt-1">
                  תמונות עד 5MB, פורמטים נתמכים: JPG, PNG, GIF, WebP
                </p>
              </>
            )}
          </div>
          {uploading && (
            <div className="text-sm text-blue-600">
              מעלה תמונות...
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{fileName}</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            תמונות שהועלו ({photos.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                {/* Photo Preview */}
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.blobUrl}
                    alt={photo.fileName}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-2 left-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
                    type="button"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Photo Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שמות האנשים בתמונה (מופרדים בפסיק)
                    </label>
                    <input
                      type="text"
                      placeholder="לדוגמה: צביה, מיכל, רחלי"
                      value={tagInputs[photo.id] ?? photo.manualTags.join(', ')}
                      onChange={(e) => {
                        setTagInputs({...tagInputs, [photo.id]: e.target.value});
                      }}
                      onBlur={(e) => {
                        const tags = e.target.value
                          .split(',')
                          .map(t => t.trim())
                          .filter(t => t.length > 0);
                        updatePhotoTags(photo.id, tags);
                        // Clear local state after committing to array
                        const newInputs = {...tagInputs};
                        delete newInputs[photo.id];
                        setTagInputs(newInputs);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      תיאור התמונה (אופציונלי)
                    </label>
                    <input
                      type="text"
                      placeholder="לדוגמה: חתונה של מיכל, 2018"
                      value={photo.caption || ''}
                      onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="text-xs text-gray-500">
                    {(photo.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Photos Message */}
      {photos.length === 0 && !uploading && (
        <div className="text-center text-gray-500 py-8">
          <p>עדיין לא הועלו תמונות</p>
          <p className="text-sm mt-1">תמונות הן אופציונליות, אבל מאוד מומלצות</p>
        </div>
      )}
    </div>
  );
}
