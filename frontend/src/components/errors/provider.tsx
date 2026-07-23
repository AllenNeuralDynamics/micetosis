import type { FallbackProps } from 'react-error-boundary';

/********************************************************************************
 * PROVIDER-LEVEL Error Component
 ********************************************************************************
 *
 * Rendered when something within the app providers throws an error (Mantine,
 * QueryClient, etc.).
 *
 * Uses plain HTML + inline styles so it has no dependency on any provider or
 * design-system CSS that might be broken.
 *
 */

export const ProviderErrorComponent = ({ error, resetErrorBoundary }: FallbackProps) => {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        color: '#111',
        background: '#fff',
      }}
    >
      <div style={{ maxWidth: 600, width: '100%' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
          An error occurred in the application provider
        </h1>
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            border: '1px solid #f5c2c2',
            background: '#fdecec',
            color: '#7a1f1f',
            borderRadius: 4,
            fontSize: 14,
            overflow: 'auto',
          }}
        >
          {message}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={resetErrorBoundary}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              background: '#f5f5f5',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            Refresh page
          </button>
        </div>
      </div>
    </div>
  );
};
