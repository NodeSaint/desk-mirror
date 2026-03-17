/** Connection management — daemon slot + client pool. */

import type { WebSocket } from "ws";
import { logger } from "./logger.ts";

export interface Rooms {
  daemon: WebSocket | null;
  clients: Set<WebSocket>;
  /** Maps commandId → client WebSocket for routing acks back. */
  pendingCommands: Map<string, WebSocket>;
  startTime: number;
  lastDaemonPing: number;
  /** Time between the two most recent daemon messages (ms). */
  lastRoundTrip: number;
}

export function createRooms(): Rooms {
  return {
    daemon: null,
    clients: new Set(),
    pendingCommands: new Map(),
    startTime: Date.now(),
    lastDaemonPing: 0,
    lastRoundTrip: 0,
  };
}

export function setDaemon(rooms: Rooms, ws: WebSocket): boolean {
  if (rooms.daemon !== null) {
    logger.warn("Daemon connection rejected — one already connected");
    return false;
  }
  rooms.daemon = ws;
  rooms.lastDaemonPing = Date.now();
  logger.info("Daemon connected");
  return true;
}

export function removeDaemon(rooms: Rooms): void {
  rooms.daemon = null;
  logger.info("Daemon disconnected");
}

export function addClient(rooms: Rooms, ws: WebSocket): void {
  rooms.clients.add(ws);
  logger.info("Client connected", { clientCount: rooms.clients.size });
}

export function removeClient(rooms: Rooms, ws: WebSocket): void {
  rooms.clients.delete(ws);
  // Clean up any pending commands from this client
  for (const [cmdId, client] of rooms.pendingCommands) {
    if (client === ws) {
      rooms.pendingCommands.delete(cmdId);
    }
  }
  logger.info("Client disconnected", { clientCount: rooms.clients.size });
}

/** Send a JSON message to all connected clients. */
export function broadcastToClients(rooms: Rooms, data: string): void {
  for (const client of rooms.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

/** Send a JSON message to the daemon. */
export function sendToDaemon(rooms: Rooms, data: string): boolean {
  if (rooms.daemon && rooms.daemon.readyState === rooms.daemon.OPEN) {
    rooms.daemon.send(data);
    return true;
  }
  return false;
}

/** Track a command so the ack can be routed back to the right client. */
export function trackCommand(rooms: Rooms, commandId: string, client: WebSocket): void {
  rooms.pendingCommands.set(commandId, client);
}

/** Route a command:ack to the client that issued the command. Returns true if delivered. */
export function routeAck(rooms: Rooms, commandId: string, data: string): boolean {
  const client = rooms.pendingCommands.get(commandId);
  rooms.pendingCommands.delete(commandId);
  if (client && client.readyState === client.OPEN) {
    client.send(data);
    return true;
  }
  return false;
}

export function uptimeSeconds(rooms: Rooms): number {
  return Math.floor((Date.now() - rooms.startTime) / 1000);
}

export function updateDaemonPing(rooms: Rooms): void {
  const now = Date.now();
  if (rooms.lastDaemonPing > 0) {
    rooms.lastRoundTrip = now - rooms.lastDaemonPing;
  }
  rooms.lastDaemonPing = now;
}

export function latencyMs(rooms: Rooms): number {
  if (!rooms.daemon) return -1;
  return rooms.lastRoundTrip;
}
