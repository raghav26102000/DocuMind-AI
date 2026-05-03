// hooks/useWebSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketHookOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  shouldReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  protocols?: string | string[];
}

export interface WebSocketHookReturn {
  ws: WebSocket | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectCount: number;
  sendMessage: (data: any) => boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocket = (
  url: string | null,
  options: WebSocketHookOptions = {}
): WebSocketHookReturn => {
  const {
    onOpen,
    onMessage,
    onError,
    onClose,
    shouldReconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    protocols
  } = options;

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const urlRef = useRef(url);
  const mountedRef = useRef(true);

  // Update URL ref when URL changes
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!urlRef.current || !mountedRef.current) return;
    
    cleanup();
    setConnecting(true);
    setError(null);

    try {
      const websocket = new WebSocket(urlRef.current, protocols);
      wsRef.current = websocket;
      setWs(websocket);

      websocket.onopen = (event) => {
        if (!mountedRef.current) return;
        
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        setReconnectCount(0);
        onOpen?.(event);
      };

      websocket.onmessage = (event) => {
        if (!mountedRef.current) return;
        onMessage?.(event);
      };

      websocket.onerror = (event) => {
        if (!mountedRef.current) return;
        
        setError('WebSocket connection error');
        setConnecting(false);
        onError?.(event);
      };

      websocket.onclose = (event) => {
        if (!mountedRef.current) return;

        setConnected(false);
        setConnecting(false);
        setWs(null);
        wsRef.current = null;

        onClose?.(event);

        // Attempt to reconnect if it wasn't a normal closure and reconnect is enabled
        if (
          shouldReconnect && 
          event.code !== 1000 && 
          reconnectAttemptsRef.current < reconnectAttempts
        ) {
          const timeout = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
            30000 // Max 30 seconds
          );
          
          setError(`Connection lost. Reconnecting in ${timeout/1000} seconds...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              reconnectAttemptsRef.current++;
              setReconnectCount(reconnectAttemptsRef.current);
              connect();
            }
          }, timeout);
        } else if (reconnectAttemptsRef.current >= reconnectAttempts) {
          setError('Maximum reconnection attempts reached');
        }
      };

    } catch (err) {
      setError('Failed to create WebSocket connection');
      setConnecting(false);
      console.error('WebSocket creation failed:', err);
    }
  }, [url, protocols, onOpen, onMessage, onError, onClose, shouldReconnect, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    cleanup();
    setConnected(false);
    setConnecting(false);
    setWs(null);
    setError(null);
    reconnectAttemptsRef.current = reconnectAttempts; // Prevent auto-reconnection
  }, [reconnectAttempts]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        wsRef.current.send(message);
        return true;
      } catch (err) {
        console.error('Failed to send WebSocket message:', err);
        return false;
      }
    }
    return false;
  }, []);

  // Auto-connect when URL is provided
  useEffect(() => {
    if (url) {
      connect();
    } else {
      disconnect();
    }
  }, [url, connect, disconnect]);

  return {
    ws,
    connected,
    connecting,
    error,
    reconnectCount,
    sendMessage,
    connect,
    disconnect
  };
};