'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Error Boundary for Create User Page
 * Provides detailed error logging to debug page issues
 */
export default function CreateUserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Detailed console logging
    console.error('=== CREATE USER PAGE ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error digest:', error.digest);
    console.error('Full error object:', error);
    console.error('=============================');
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border-2 border-red-500 rounded-lg p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 rounded-full">
            <AlertTriangle size={48} className="text-red-600" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
          Create User Page Error
        </h1>

        {/* Error Message */}
        <p className="text-center text-gray-600 mb-6">
          Failed to load the Create User page. Check console for details.
        </p>

        {/* Error Details */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Error Details:
          </div>
          <div className="text-xs font-mono text-red-600 whitespace-pre-wrap break-words">
            <strong>Type:</strong> {error.name}
            <br />
            <strong>Message:</strong> {error.message}
          </div>
          {error.digest && (
            <div className="mt-2 text-xs text-gray-500">
              Error Digest: {error.digest}
            </div>
          )}
          {error.stack && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Full Stack Trace
              </summary>
              <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-words max-h-64 overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} variant="primary">
            <RefreshCw size={18} className="mr-2" />
            Try Again
          </Button>
          <Button onClick={() => (window.location.href = '/dashboard/users')} variant="secondary">
            <Home size={18} className="mr-2" />
            Back to Users
          </Button>
        </div>

        {/* Development Help */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-900 mb-2">
            Debugging Tips:
          </div>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Check browser console for detailed error logs</li>
            <li>Verify all imports are correct</li>
            <li>Check that useAuth, useTenants, and useCreateUser hooks are available</li>
            <li>Ensure all UI components (Button, Input, Label, Select) exist</li>
            <li>Check Next.js server logs for build/compilation errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
