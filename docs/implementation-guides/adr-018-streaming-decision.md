# ADR-018 Streaming Decision - Implementation Guide

**Story Dependency:** Story 19 (Real-time Logs Viewer)
**Owner:** Amelia (Developer)
**Duration:** 8 hours (1 day)
**Priority:** P0 - CRITICAL (BLOCKS Story 19)
**Date Created:** 2025-11-22

## Overview

This guide provides a structured approach to researching, prototyping, and documenting the real-time streaming technology decision for Story 19 (Workers Logs Viewer).

**What We're Deciding:**
- Technology choice: WebSockets vs Server-Sent Events (SSE)
- Integration approach with Next.js 14 App Router
- Performance characteristics for 10-100 logs/sec
- Implementation patterns for Story 19

---

## Table of Contents

1. [Research Phase (4 hours)](#research-phase-4-hours)
2. [Prototype Phase (2 hours)](#prototype-phase-2-hours)
3. [ADR Documentation (2 hours)](#adr-documentation-2-hours)
4. [Decision Criteria](#decision-criteria)

---

## Research Phase (4 hours)

### Hour 1-2: WebSockets Research

#### Core Questions to Answer

1. **Browser Support:**
   - [ ] Native WebSocket API available in all target browsers?
   - [ ] Polyfill needed for older browsers?
   - [ ] Mobile browser support (iOS Safari, Chrome Mobile)?

2. **Next.js 14 Compatibility:**
   - [ ] Can WebSockets work with Next.js App Router?
   - [ ] Requires custom server (Express/Fastify)?
   - [ ] Deployment implications (Vercel, AWS, Docker)?

3. **Libraries:**
   - [ ] `socket.io` - Feature-rich, fallback support, reconnection
   - [ ] `ws` - Lightweight, standard WebSocket
   - [ ] `uWebSockets.js` - High-performance alternative

4. **Scalability:**
   - [ ] Connection pooling strategies
   - [ ] Memory usage per connection
   - [ ] Horizontal scaling (sticky sessions needed?)

5. **Use Case Fit:**
   - [ ] Bidirectional communication needed? (No - logs are server → client only)
   - [ ] Real-time collaboration features? (No)
   - [ ] Chat-like functionality? (No)

#### WebSockets Research Template

```markdown
## WebSockets Research Findings

### Browser Support
- **Native API:** Yes (all modern browsers)
- **Polyfill:** Not required for target browsers (Chrome 90+, Safari 14+, Firefox 88+)
- **Mobile:** Fully supported

### Next.js 14 App Router Compatibility
- **Challenge:** Next.js App Router uses serverless functions (no persistent connections)
- **Solution:** Requires custom server (Express + Socket.io) OR external WebSocket service
- **Deployment Impact:**
  - ❌ Cannot deploy to Vercel (serverless-only)
  - ✅ Can deploy to AWS ECS, Railway, Render (long-running containers)
  - ✅ Works with Docker Compose (current setup)

### Libraries Comparison

| Library | Pros | Cons | Bundle Size |
|---------|------|------|-------------|
| socket.io | Auto-reconnect, fallbacks, rooms | Large bundle (200KB) | 200KB |
| ws | Lightweight, standard | Manual reconnect logic | 50KB |
| native WebSocket | Zero dependencies | Manual reconnect, no fallback | 0KB |

### Code Example

```typescript
// Server: Custom WebSocket server (separate from Next.js)
// server.js
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3000' }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  // Subscribe to worker logs
  socket.on('subscribe:logs', ({ workerId }) => {
    const logStream = subscribeToWorkerLogs(workerId);

    logStream.on('log', (log) => {
      socket.emit('log', log);
    });
  });
});

httpServer.listen(3001);

// Client: React Hook
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useWorkerLogsWebSocket(workerId: string) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      socket.emit('subscribe:logs', { workerId });
    });

    socket.on('log', (log: Log) => {
      setLogs(prev => [...prev, log]);
    });

    return () => socket.disconnect();
  }, [workerId]);

  return logs;
}
```

### Performance Characteristics
- **Throughput:** 1000+ messages/sec per connection
- **Latency:** <10ms (local), 20-100ms (cloud)
- **Memory:** ~50KB per connection (socket.io), ~10KB (native)

### Decision Factors
✅ **Pros:**
- Bidirectional communication (if needed later)
- Mature ecosystem (socket.io)
- High throughput

❌ **Cons:**
- Requires custom server (deployment complexity)
- Larger bundle size (socket.io)
- Sticky sessions needed for horizontal scaling
- Not compatible with Vercel
```

---

### Hour 3-4: Server-Sent Events (SSE) Research

#### Core Questions to Answer

1. **Browser Support:**
   - [ ] EventSource API available?
   - [ ] Polyfill needed?
   - [ ] Mobile browser support?

2. **Next.js 14 Compatibility:**
   - [ ] Works with App Router streaming responses?
   - [ ] Requires custom server?
   - [ ] Deployment-friendly (Vercel)?

3. **Libraries:**
   - [ ] Native EventSource (browser)
   - [ ] `eventsource` (polyfill)
   - [ ] `sse` (server-side)

4. **Scalability:**
   - [ ] HTTP/2 multiplexing support
   - [ ] Memory usage per connection
   - [ ] Horizontal scaling (stateless?)

5. **Use Case Fit:**
   - [ ] Unidirectional communication (server → client) - ✅ PERFECT FIT
   - [ ] Automatic reconnection - ✅ BUILT-IN
   - [ ] Standard HTTP - ✅ FIREWALL-FRIENDLY

#### SSE Research Template

```markdown
## Server-Sent Events Research Findings

### Browser Support
- **Native API:** EventSource API in all modern browsers
- **Polyfill:** `eventsource` for older browsers (optional)
- **Mobile:** Fully supported (iOS Safari, Chrome Mobile)

### Next.js 14 App Router Compatibility
- **Native Support:** ✅ YES! App Router supports streaming responses
- **Custom Server:** ❌ NOT NEEDED
- **Deployment Impact:**
  - ✅ Vercel-compatible (uses standard HTTP streaming)
  - ✅ AWS ECS, Railway, Render (all support)
  - ✅ Docker Compose (current setup)

### Implementation Pattern

```typescript
// Next.js API Route: app/api/workers/[id]/logs/stream/route.ts
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workerId = params.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Subscribe to Celery worker logs
        for await (const log of subscribeToWorkerLogs(workerId)) {
          // SSE format: "data: <json>\n\n"
          const data = `data: ${JSON.stringify(log)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// React Hook: hooks/useWorkerLogsStream.ts
import { useEffect, useState } from 'react';

export interface Log {
  timestamp: string;
  level: string;
  message: string;
  worker_id: string;
}

export function useWorkerLogsStream(workerId: string) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/workers/${workerId}/logs/stream`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      const log: Log = JSON.parse(event.data);
      setLogs(prev => [...prev, log]);
    };

    eventSource.onerror = (err) => {
      setError(new Error('Connection lost'));
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [workerId]);

  return { logs, isConnected, error };
}
```

### Performance Characteristics
- **Throughput:** 100+ messages/sec per connection (sufficient for logs)
- **Latency:** <20ms (local), 50-150ms (cloud)
- **Memory:** ~5KB per connection (very lightweight)
- **HTTP/2:** Multiplexing allows multiple streams per connection

### Reconnection Behavior
- **Automatic:** EventSource API handles reconnection automatically
- **Retry Logic:** Exponential backoff built-in
- **Last-Event-ID:** Can resume from last received event

### Decision Factors
✅ **Pros:**
- Native Next.js App Router support (no custom server)
- Automatic reconnection (built-in)
- Lightweight (minimal bundle size)
- HTTP-based (firewall-friendly)
- Stateless (easy horizontal scaling)
- Perfect fit for logs (unidirectional)
- Vercel-compatible

❌ **Cons:**
- Unidirectional only (not a con for our use case)
- Lower throughput than WebSockets (still sufficient)
- Less mature ecosystem than socket.io
```

---

## Prototype Phase (2 hours)

### Hour 5-6: Build Working SSE Prototype

Create a minimal working prototype to validate SSE approach.

#### Step 1: Create API Route (30 minutes)

```bash
mkdir -p nextjs-ui/app/api/workers/[id]/logs/stream
```

Create `nextjs-ui/app/api/workers/[id]/logs/stream/route.ts`:

```typescript
import { NextRequest } from 'next/server';

// Mock log generator for prototype
async function* generateMockLogs(workerId: string) {
  let count = 0;
  const levels = ['INFO', 'DEBUG', 'WARNING', 'ERROR'];

  while (count < 50) {  // Generate 50 logs for prototype
    yield {
      timestamp: new Date().toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      task_id: `task-${Math.floor(Math.random() * 1000)}`,
      message: `Log message ${count} from ${workerId}`,
      worker_id: workerId,
    };

    count++;
    await new Promise(resolve => setTimeout(resolve, 1000));  // 1 log/sec
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workerId = params.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const log of generateMockLogs(workerId)) {
          const data = `data: ${JSON.stringify(log)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (error) {
        console.error('Stream error:', error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### Step 2: Create React Hook (30 minutes)

Create `nextjs-ui/hooks/useWorkerLogsStream.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react';

export interface WorkerLog {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  task_id?: string;
  message: string;
  worker_id: string;
}

export interface UseWorkerLogsStreamReturn {
  logs: WorkerLog[];
  isConnected: boolean;
  error: Error | null;
  clearLogs: () => void;
}

export function useWorkerLogsStream(
  workerId: string
): UseWorkerLogsStreamReturn {
  const [logs, setLogs] = useState<WorkerLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (!workerId) return;

    const eventSource = new EventSource(
      `/api/workers/${workerId}/logs/stream`
    );

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const log: WorkerLog = JSON.parse(event.data);
        setLogs(prev => [...prev, log]);
      } catch (err) {
        console.error('Failed to parse log:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError(new Error('Connection lost. Reconnecting...'));
      setIsConnected(false);
      // EventSource will automatically try to reconnect
    };

    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
      setIsConnected(false);
    };
  }, [workerId]);

  return { logs, isConnected, error, clearLogs };
}
```

#### Step 3: Create Test Page (30 minutes)

Create `nextjs-ui/app/test-sse/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useWorkerLogsStream } from '@/hooks/useWorkerLogsStream';

export default function TestSSEPage() {
  const [workerId, setWorkerId] = useState('worker-1@hostname');
  const { logs, isConnected, error, clearLogs } = useWorkerLogsStream(workerId);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SSE Prototype Test</h1>

      <div className="mb-4 space-x-2">
        <input
          type="text"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          className="border p-2 rounded"
          placeholder="Worker ID"
        />
        <button
          onClick={clearLogs}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Clear Logs
        </button>
      </div>

      <div className="mb-4">
        <span className="font-semibold">Connection Status: </span>
        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error.message}
        </div>
      )}

      <div className="border rounded-lg p-4 bg-gray-50">
        <h2 className="font-semibold mb-2">Logs ({logs.length})</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`text-sm font-mono ${getLevelColor(log.level)}`}
            >
              <span className="text-gray-500">[{log.timestamp}]</span>{' '}
              <span className="font-semibold">{log.level}</span>{' '}
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getLevelColor(level: string): string {
  switch (level) {
    case 'ERROR':
    case 'CRITICAL':
      return 'text-red-600';
    case 'WARNING':
      return 'text-yellow-600';
    case 'INFO':
      return 'text-blue-600';
    case 'DEBUG':
      return 'text-gray-600';
    default:
      return 'text-black';
  }
}
```

#### Step 4: Test Prototype (30 minutes)

```bash
# Start Next.js dev server
cd nextjs-ui
npm run dev

# Open browser to http://localhost:3000/test-sse

# Verify:
# 1. Logs stream in real-time (1 per second)
# 2. Connection status shows "Connected"
# 3. Logs accumulate in the UI
# 4. Refresh page → auto-reconnects
# 5. Clear logs button works
```

**Performance Test:**
- Monitor network tab → verify `text/event-stream` response
- Check memory usage → should stay under 50MB
- Verify no memory leaks (logs accumulate without browser crash)

---

## ADR Documentation (2 hours)

### Hour 7-8: Write ADR-018

Create `docs/architecture/adr-018-real-time-streaming.md`:

```markdown
# ADR-018: Real-time Log Streaming Technology

**Status:** Accepted
**Date:** 2025-11-22
**Deciders:** Amelia (Developer), Charlie (Senior Dev), Alice (Product Owner)
**Context Owner:** Story 19 (Workers Real-time Logs Viewer)

## Context and Problem Statement

Story 19 requires real-time log streaming from Celery workers to the Next.js dashboard. We need to decide between WebSockets and Server-Sent Events (SSE) for implementing this real-time communication.

**Requirements:**
- Real-time log streaming (10-100 logs/sec)
- Automatic reconnection on connection loss
- Works with Next.js 14 App Router
- Deployable to current infrastructure (Docker + potential Vercel)
- Low latency (<200ms)
- Support 100+ concurrent viewers

## Decision Drivers

1. **Next.js Compatibility** - Must work with App Router without major architecture changes
2. **Deployment Simplicity** - Should not require custom server infrastructure
3. **Use Case Fit** - Logs are unidirectional (server → client only)
4. **Performance** - Must handle 10-100 logs/sec per connection
5. **Developer Experience** - Simple to implement and maintain

## Considered Options

### Option 1: WebSockets (socket.io)

**Pros:**
- Bidirectional communication
- Mature ecosystem (socket.io library)
- High throughput (1000+ msg/sec)
- Built-in reconnection (socket.io)

**Cons:**
- Requires custom server (separate from Next.js)
- ❌ Not compatible with Vercel deployment
- Larger bundle size (~200KB for socket.io)
- Sticky sessions needed for horizontal scaling
- Overkill for unidirectional logs

### Option 2: Server-Sent Events (SSE)

**Pros:**
- ✅ Native Next.js App Router support (no custom server)
- ✅ Automatic reconnection (EventSource API built-in)
- ✅ Lightweight (minimal bundle size)
- ✅ HTTP-based (firewall-friendly, Vercel-compatible)
- ✅ Stateless (easy horizontal scaling)
- ✅ Perfect fit for unidirectional logs
- HTTP/2 multiplexing support

**Cons:**
- Unidirectional only (not a problem for our use case)
- Lower throughput than WebSockets (100 msg/sec - still sufficient)
- Less mature ecosystem

## Decision Outcome

**Chosen option:** Server-Sent Events (SSE)

**Rationale:**
1. **Perfect Use Case Fit:** Logs only flow server → client (no need for bidirectional)
2. **Next.js Native Support:** Works seamlessly with App Router streaming responses
3. **Deployment Flexibility:** Compatible with Vercel, AWS, Docker (all deployment targets)
4. **Automatic Reconnection:** EventSource API handles reconnection out-of-the-box
5. **Simplicity:** No custom server, no additional infrastructure
6. **Performance:** 100 msg/sec throughput is sufficient for log streaming

### Positive Consequences

- Simpler architecture (no WebSocket server needed)
- Faster development (native Next.js support)
- Easier deployment (Vercel-compatible)
- Automatic reconnection (less client-side code)
- Stateless scaling (no sticky sessions)

### Negative Consequences

- Cannot add bidirectional features later without refactoring
- Lower max throughput (acceptable for current requirements)

## Implementation Guidelines

### Server-Side (Next.js API Route)

```typescript
// app/api/workers/[id]/logs/stream/route.ts
export async function GET(request: NextRequest, { params }) {
  const workerId = params.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for await (const log of subscribeToWorkerLogs(workerId)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Client-Side (React Hook)

```typescript
// hooks/useWorkerLogsStream.ts
export function useWorkerLogsStream(workerId: string) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/workers/${workerId}/logs/stream`);
    eventSource.onmessage = (event) => {
      setLogs(prev => [...prev, JSON.parse(event.data)]);
    };
    return () => eventSource.close();
  }, [workerId]);

  return logs;
}
```

## Validation

**Prototype Results:**
- ✅ Successfully streamed 50 mock logs at 1/sec
- ✅ Automatic reconnection on page refresh verified
- ✅ Memory usage <50MB for 1000 logs
- ✅ No memory leaks detected
- ✅ Works in Chrome, Safari, Firefox

**Performance Benchmarks:**
- Latency: 15ms (local), 80ms (staging)
- Throughput: 120 msg/sec (exceeds requirement of 100 msg/sec)
- Memory: ~5KB per connection

## Links

- [MDN: Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Next.js Streaming Guide](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [Story 19: Workers Logs Viewer](../stories/story-19-logs-viewer.md)
- [Prototype Code](../../nextjs-ui/app/test-sse/)

## Alternatives Revisited

If SSE proves insufficient in production (>100 msg/sec sustained), we can revisit WebSockets with:
- External WebSocket service (e.g., Pusher, Ably)
- Custom WebSocket server deployed separately
- Hybrid approach (SSE for logs, WebSocket for future real-time features)
```

---

## Decision Criteria

Use this checklist to validate your decision:

### Technical Criteria

- [ ] **Next.js Compatibility:** Works with App Router without custom server?
- [ ] **Performance:** Handles 10-100 logs/sec per connection?
- [ ] **Latency:** <200ms for log delivery?
- [ ] **Browser Support:** Works in Chrome, Safari, Firefox?
- [ ] **Mobile Support:** Works on iOS Safari, Chrome Mobile?

### Operational Criteria

- [ ] **Deployment:** Compatible with Vercel + Docker?
- [ ] **Horizontal Scaling:** Can scale to 100+ concurrent connections?
- [ ] **Monitoring:** Can instrument with metrics (Prometheus)?
- [ ] **Debugging:** Easy to debug in browser DevTools?

### Developer Experience

- [ ] **Implementation Complexity:** Can be implemented in <2 days?
- [ ] **Bundle Size:** Minimal impact on frontend bundle?
- [ ] **Maintainability:** Easy to understand and modify?
- [ ] **Documentation:** Sufficient examples and resources?

### User Experience

- [ ] **Reliability:** Handles network interruptions gracefully?
- [ ] **Reconnection:** Automatic reconnection without user action?
- [ ] **Real-time:** Logs appear within 200ms of generation?
- [ ] **Stability:** No memory leaks or browser crashes?

---

## Success Criteria

ADR-018 is complete when:

- [ ] Research comparison matrix completed (WebSockets vs SSE)
- [ ] Working prototype demonstrates chosen technology
- [ ] ADR document created following template
- [ ] Prototype tested in 3+ browsers
- [ ] Performance benchmarks documented
- [ ] Code review approved
- [ ] Decision socialized with team (Charlie, Alice)
- [ ] Implementation guidance clear for Story 19

---

**Document Owner:** Amelia (Developer)
**Created:** 2025-11-22
**Last Updated:** 2025-11-22
**Related:** Story 19, Sprint 2 Preparation Plan
