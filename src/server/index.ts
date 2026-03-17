/** Desk Mirror — WebSocket relay server entry point. */

import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage } from "node:http";

import { config } from "./config.ts";
import { logger } from "./logger.ts";
import {
  createRooms,
  setDaemon,
  removeDaemon,
  addClient,
  removeClient,
  broadcastToClients,
  sendToDaemon,
  trackCommand,
  routeAck,
  updateDaemonPing,
  uptimeSeconds,
  latencyMs,
} from "./rooms.ts";
import {
  createState,
  applyFull,
  applyDiff,
  toFullMessage,
} from "./state.ts";
import type {
  LayoutFullMessage,
  LayoutDiffMessage,
  CommandAckMessage,
  ClientCommand,
  StatusMessage,
} from "./types.ts";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const rooms = createRooms();
const state = createState();

// --- Static file serving (production mode) ---

const staticDir = process.env["DESK_MIRROR_SERVE_STATIC"];
if (staticDir) {
  logger.info("Serving static files from", { path: staticDir });
  app.use(express.static(staticDir));
  // SPA fallback — serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    if (req.path === "/health" || req.path === "/daemon" || req.path === "/client") {
      next();
      return;
    }
    res.sendFile("index.html", { root: staticDir });
  });
}

// --- HTTP health endpoint ---

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    daemonConnected: rooms.daemon !== null,
    clientCount: rooms.clients.size,
    uptime: uptimeSeconds(rooms),
  });
});

// --- WebSocket upgrade routing ---

server.on("upgrade", (request: IncomingMessage, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const path = url.pathname;

  if (path === "/daemon" || path === "/client") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    logger.warn("Rejected WebSocket upgrade on unknown path", { path });
    socket.destroy();
  }
});

// --- WebSocket connection handler ---

wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const path = url.pathname;

  if (path === "/daemon") {
    handleDaemonConnection(ws);
  } else if (path === "/client") {
    handleClientConnection(ws);
  }
});

function handleDaemonConnection(ws: WebSocket): void {
  if (!setDaemon(rooms, ws)) {
    ws.close(4000, "Another daemon is already connected");
    return;
  }

  // Notify clients that daemon is connected
  broadcastStatus();

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(String(raw)) as Record<string, unknown>;
      const type = data["type"] as string | undefined;

      if (!type) {
        logger.warn("Daemon sent message without type field");
        return;
      }

      updateDaemonPing(rooms);
      logger.debug("Daemon message", { type });

      switch (type) {
        case "layout:full": {
          const msg = data as unknown as LayoutFullMessage;
          applyFull(state, msg);
          broadcastToClients(rooms, String(raw));
          break;
        }
        case "layout:diff": {
          const msg = data as unknown as LayoutDiffMessage;
          applyDiff(state, msg);
          broadcastToClients(rooms, String(raw));
          break;
        }
        case "command:ack": {
          const msg = data as unknown as CommandAckMessage;
          const delivered = routeAck(rooms, msg.commandId, String(raw));
          logger.debug("Command ack", { commandId: msg.commandId, delivered });
          break;
        }
        default:
          logger.debug("Unknown daemon message type", { type });
      }
    } catch {
      logger.warn("Failed to parse daemon message");
    }
  });

  ws.on("close", () => {
    removeDaemon(rooms);
    broadcastStatus();
  });

  ws.on("error", (err) => {
    logger.error("Daemon WebSocket error", { error: String(err) });
  });
}

function handleClientConnection(ws: WebSocket): void {
  addClient(rooms, ws);

  // Send current layout immediately
  const fullMsg = toFullMessage(state);
  if (fullMsg) {
    ws.send(JSON.stringify(fullMsg));
  }

  // Send current status
  ws.send(JSON.stringify(buildStatus()));

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(String(raw)) as Record<string, unknown>;
      const type = data["type"] as string | undefined;

      if (!type) {
        logger.warn("Client sent message without type field");
        return;
      }

      logger.debug("Client message", { type });

      if (
        type === "command:focus" ||
        type === "command:move" ||
        type === "command:close" ||
        type === "command:space"
      ) {
        const cmd = data as unknown as ClientCommand;
        trackCommand(rooms, cmd.commandId, ws);
        const sent = sendToDaemon(rooms, String(raw));
        if (!sent) {
          // Daemon not connected — send a failure ack back
          ws.send(
            JSON.stringify({
              type: "command:ack",
              commandId: cmd.commandId,
              success: false,
              error: "Daemon not connected",
            }),
          );
        }
      } else {
        logger.debug("Unknown client message type", { type });
      }
    } catch {
      logger.warn("Failed to parse client message");
    }
  });

  ws.on("close", () => {
    removeClient(rooms, ws);
  });

  ws.on("error", (err) => {
    logger.error("Client WebSocket error", { error: String(err) });
  });
}

// --- Status broadcast ---

function buildStatus(): StatusMessage {
  return {
    type: "status",
    daemonConnected: rooms.daemon !== null,
    clientCount: rooms.clients.size,
    latency: latencyMs(rooms),
    uptime: uptimeSeconds(rooms),
  };
}

function broadcastStatus(): void {
  broadcastToClients(rooms, JSON.stringify(buildStatus()));
}

// Broadcast status every 5 seconds
const statusTimer = setInterval(broadcastStatus, config.statusInterval);

// --- Start server ---

server.listen(config.port, () => {
  logger.info("Desk Mirror relay server started", { port: config.port });
  logger.info(`Daemon endpoint: ws://localhost:${config.port}/daemon`);
  logger.info(`Client endpoint: ws://localhost:${config.port}/client`);
});

// --- Graceful shutdown ---

function shutdown(): void {
  logger.info("Shutting down...");
  clearInterval(statusTimer);
  wss.close();
  server.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
