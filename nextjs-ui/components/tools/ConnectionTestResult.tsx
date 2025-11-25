'use client';

/**
 * ConnectionTestResult - Displays test connection results (success or error)
 *
 * Features:
 * - Success panel with status code, response time, collapsible headers/body
 * - Error panel with error type badges and troubleshooting tips
 * - JSON syntax highlighting for response bodies
 * - Responsive layout (desktop/tablet/mobile)
 * - Retry and close actions
 */

import { useState } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDown, CheckCircle, XCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import JsonView from '@uiw/react-json-view';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils/cn';

export interface ConnectionTestSuccess {
  success: true;
  status_code: number;
  response_time_ms: number;
  headers?: Record<string, string>;
  body?: string;
  tested_endpoint?: string;
}

export interface ConnectionTestError {
  success: false;
  error: string;
  error_type: 'network' | 'auth' | 'timeout' | 'server' | 'not_found' | 'unknown';
  status_code?: number;
  tested_endpoint?: string;
}

export type ConnectionTestResult = ConnectionTestSuccess | ConnectionTestError;

interface ConnectionTestResultProps {
  result: ConnectionTestResult;
  onClose?: () => void;
  onRetry?: () => void;
}

/**
 * Map error types to user-friendly troubleshooting tips
 */
const ERROR_TIPS: Record<ConnectionTestError['error_type'], string> = {
  auth: 'Check your API credentials. Ensure the API key/token is valid and not expired.',
  network: 'Verify the base URL is correct and the API endpoint is reachable from your network.',
  timeout: 'The API took too long to respond. Try again or check if the endpoint is slow.',
  not_found: 'Endpoint not found. Verify the OpenAPI spec has valid paths.',
  server: 'The API server is experiencing issues. Check the API status page or try again later.',
  unknown: 'An unexpected error occurred. Check the error message for more details.',
};

/**
 * Map error types to badge variants and labels
 */
const ERROR_TYPE_MAP: Record<
  ConnectionTestError['error_type'],
  { label: string; variant: 'error' | 'warning' | 'default' }
> = {
  auth: { label: 'Auth Error', variant: 'error' },
  network: { label: 'Network Error', variant: 'error' },
  timeout: { label: 'Timeout', variant: 'warning' },
  not_found: { label: 'Not Found', variant: 'warning' },
  server: { label: 'Server Error', variant: 'error' },
  unknown: { label: 'Unknown Error', variant: 'default' },
};

/**
 * Format HTTP status code with description
 */
function formatStatusCode(code: number): string {
  const descriptions: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return `${code} ${descriptions[code] || ''}`.trim();
}

/**
 * Try to parse response body as JSON
 */
function parseBodyAsJSON(body: string): object | null {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export function ConnectionTestResult({ result, onClose, onRetry }: ConnectionTestResultProps) {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);

  // Success Panel
  if (result.success) {
    const jsonBody = result.body ? parseBodyAsJSON(result.body) : null;
    const bodyPreview = result.body ? result.body.substring(0, 500) : '';
    const isTruncated = result.body && result.body.length > 500;

    return (
      <Card className="mt-4 border-l-4 border-accent-green" padding="md">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-accent-green flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connection successful!</h3>
              {result.tested_endpoint && (
                <p className="text-sm text-gray-600 mt-0.5">Tested endpoint: {result.tested_endpoint}</p>
              )}
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Status Info */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Status:</span>
            <Badge variant="success">{formatStatusCode(result.status_code)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Response time:</span>
            <Badge variant="info">{result.response_time_ms}ms</Badge>
          </div>
        </div>

        {/* Collapsible Response Headers */}
        {result.headers && Object.keys(result.headers).length > 0 && (
          <Disclosure as="div" className="mt-4" defaultOpen={isDesktop}>
            {({ open }) => (
              <>
                <Disclosure.Button className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors">
                  <span>Response Headers ({Object.keys(result.headers || {}).length})</span>
                  <ChevronDown
                    className={cn('h-5 w-5 text-gray-500 transition-transform', open && 'rotate-180')}
                  />
                </Disclosure.Button>
                <Disclosure.Panel className="mt-2 rounded-lg bg-gray-50 p-4">
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(result.headers, null, 2)}
                  </pre>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        )}

        {/* Collapsible Response Body */}
        {result.body && (
          <Disclosure as="div" className="mt-4" defaultOpen={isDesktop}>
            {({ open }) => (
              <>
                <Disclosure.Button className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors">
                  <span>Response Body</span>
                  <ChevronDown
                    className={cn('h-5 w-5 text-gray-500 transition-transform', open && 'rotate-180')}
                  />
                </Disclosure.Button>
                <Disclosure.Panel className="mt-2 rounded-lg bg-gray-50 p-4 max-h-96 overflow-auto">
                  {jsonBody ? (
                    <JsonView value={jsonBody} displayDataTypes={false} displayObjectSize={false} />
                  ) : (
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                      {bodyPreview}
                      {isTruncated && <span className="text-gray-500 italic ml-2">(truncated)</span>}
                    </pre>
                  )}
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        )}
      </Card>
    );
  }

  // Error Panel
  const errorTypeInfo = ERROR_TYPE_MAP[result.error_type];
  const troubleshootingTip = ERROR_TIPS[result.error_type];

  return (
    <Card className="mt-4 border-l-4 border-red-500" padding="md">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Connection failed</h3>
            {result.tested_endpoint && (
              <p className="text-sm text-gray-600 mt-0.5">Tested endpoint: {result.tested_endpoint}</p>
            )}
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Error Type Badge and Status */}
      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <Badge variant={errorTypeInfo.variant}>{errorTypeInfo.label}</Badge>
        {result.status_code && (
          <Badge variant="error">{formatStatusCode(result.status_code)}</Badge>
        )}
      </div>

      {/* Error Message */}
      <div className="mt-4 rounded-lg bg-red-50 p-4">
        <p className="text-sm text-red-800 font-medium">{result.error}</p>
      </div>

      {/* Troubleshooting Tips */}
      <div className="mt-4 rounded-lg bg-blue-50 p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Troubleshooting</h4>
          <p className="text-sm text-blue-800">{troubleshootingTip}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="secondary" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm">
            Close
          </Button>
        )}
      </div>
    </Card>
  );
}
