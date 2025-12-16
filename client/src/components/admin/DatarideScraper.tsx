import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Terminal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const STREAM_ENDPOINT = '/api/admin/dataride/riders/stream';

type Summary = {
  seasonId: number;
  combosProcessed: number;
  rankingsProcessed: number;
  pagesFetched: number;
  ridersUpserted: number;
  ridersUpdated: number;
  skippedRows: number;
  errors: number;
};

type StreamEvent =
  | { type: 'log'; message: string }
  | { type: 'summary'; summary: Summary }
  | { type: 'error'; message: string }
  | { type: 'done' };

export default function DatarideScraper() {
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const statusText = useMemo(() => {
    if (isRunning) return 'Running Dataride sync...';
    if (error) return 'Sync failed';
    if (summary) return 'Sync completed';
    return 'Idle';
  }, [error, isRunning, summary]);

  const appendLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const parseEventPayload = (payload: string) => {
    try {
      return JSON.parse(payload) as StreamEvent;
    } catch (err) {
      appendLog(`Malformed event: ${payload}`);
      return null;
    }
  };

  const handleStreamEvent = (event: StreamEvent) => {
    if (event.type === 'log' && event.message) {
      appendLog(event.message);
    } else if (event.type === 'summary') {
      setSummary(event.summary);
      appendLog('Sync finished. Summary received.');
    } else if (event.type === 'error') {
      setError(event.message);
      appendLog(`Error: ${event.message}`);
    } else if (event.type === 'done') {
      setIsRunning(false);
      appendLog('Stream closed.');
    }
  };

  const startStream = async () => {
    if (isRunning) return;

    setLogs([]);
    setSummary(null);
    setError(null);
    setIsRunning(true);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch(STREAM_ENDPOINT, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start Dataride stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const dataLine = rawEvent
            .split('\n')
            .find(line => line.trim().startsWith('data:'));

          if (!dataLine) continue;

          const payload = dataLine.replace(/^data:\s*/, '').trim();
          const parsed = parseEventPayload(payload);
          if (parsed) {
            handleStreamEvent(parsed);
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        appendLog('Stream cancelled.');
      } else {
        const message = err instanceof Error ? err.message : 'Unknown stream error';
        setError(message);
        appendLog(`Stream error: ${message}`);
      }
    } finally {
      setIsRunning(false);
      controllerRef.current = null;
    }
  };

  const stopStream = () => {
    controllerRef.current?.abort();
    appendLog('Stream aborted by user.');
    setIsRunning(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          UCI Dataride Scraper
        </CardTitle>
        <CardDescription>
          Run the live Dataride rider sync and watch progress output in real time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button onClick={startStream} disabled={isRunning}>
            <Play className="mr-2 h-4 w-4" />
            Start Sync
          </Button>
          <Button onClick={stopStream} disabled={!isRunning} variant="outline">
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
          <span className="text-sm text-muted-foreground">{statusText}</span>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Console output</div>
          <div
            ref={logRef}
            className="bg-slate-950 text-slate-100 font-mono text-sm rounded-md border border-slate-800 p-3 h-64 overflow-y-auto"
          >
            {logs.length === 0 ? (
              <p className="text-slate-400">No output yet. Start the sync to see logs.</p>
            ) : (
              logs.map((line, idx) => (
                <div key={`${line}-${idx}`} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        {(summary || error) && <Separator />}

        {summary && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Season</div>
              <div className="font-semibold">{summary.seasonId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Combinations</div>
              <div className="font-semibold">{summary.combosProcessed}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Rankings Processed</div>
              <div className="font-semibold">{summary.rankingsProcessed}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Pages Fetched</div>
              <div className="font-semibold">{summary.pagesFetched}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Upserted</div>
              <div className="font-semibold">{summary.ridersUpserted}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Updated</div>
              <div className="font-semibold">{summary.ridersUpdated}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Skipped</div>
              <div className="font-semibold">{summary.skippedRows}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Errors</div>
              <div className="font-semibold text-red-500">{summary.errors}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500">{error}</div>
        )}
      </CardContent>
    </Card>
  );
}
