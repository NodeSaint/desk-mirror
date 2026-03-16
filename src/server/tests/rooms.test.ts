import { describe, it, expect, vi } from "vitest";
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
  uptimeSeconds,
} from "../rooms.ts";
import type { WebSocket } from "ws";

/** Create a minimal mock WebSocket. */
function mockWs(open = true): WebSocket {
  const ws = {
    readyState: open ? 1 : 3, // 1 = OPEN, 3 = CLOSED
    OPEN: 1,
    send: vi.fn(),
    close: vi.fn(),
  };
  return ws as unknown as WebSocket;
}

describe("rooms — daemon slot", () => {
  it("accepts the first daemon connection", () => {
    const rooms = createRooms();
    const ws = mockWs();
    expect(setDaemon(rooms, ws)).toBe(true);
    expect(rooms.daemon).toBe(ws);
  });

  it("rejects a second daemon connection", () => {
    const rooms = createRooms();
    setDaemon(rooms, mockWs());
    expect(setDaemon(rooms, mockWs())).toBe(false);
  });

  it("allows reconnection after daemon is removed", () => {
    const rooms = createRooms();
    const ws1 = mockWs();
    setDaemon(rooms, ws1);
    removeDaemon(rooms);
    expect(rooms.daemon).toBeNull();

    const ws2 = mockWs();
    expect(setDaemon(rooms, ws2)).toBe(true);
  });
});

describe("rooms — client pool", () => {
  it("tracks multiple clients", () => {
    const rooms = createRooms();
    addClient(rooms, mockWs());
    addClient(rooms, mockWs());
    expect(rooms.clients.size).toBe(2);
  });

  it("removes a client cleanly", () => {
    const rooms = createRooms();
    const ws = mockWs();
    addClient(rooms, ws);
    removeClient(rooms, ws);
    expect(rooms.clients.size).toBe(0);
  });
});

describe("rooms — broadcast", () => {
  it("sends to all open clients", () => {
    const rooms = createRooms();
    const ws1 = mockWs();
    const ws2 = mockWs();
    const ws3 = mockWs(false); // closed
    addClient(rooms, ws1);
    addClient(rooms, ws2);
    addClient(rooms, ws3);

    broadcastToClients(rooms, '{"type":"test"}');

    expect(ws1.send).toHaveBeenCalledWith('{"type":"test"}');
    expect(ws2.send).toHaveBeenCalledWith('{"type":"test"}');
    expect(ws3.send).not.toHaveBeenCalled();
  });
});

describe("rooms — daemon messaging", () => {
  it("sends to connected daemon", () => {
    const rooms = createRooms();
    const ws = mockWs();
    setDaemon(rooms, ws);

    expect(sendToDaemon(rooms, '{"type":"cmd"}')).toBe(true);
    expect(ws.send).toHaveBeenCalledWith('{"type":"cmd"}');
  });

  it("returns false when daemon is not connected", () => {
    const rooms = createRooms();
    expect(sendToDaemon(rooms, '{"type":"cmd"}')).toBe(false);
  });
});

describe("rooms — command tracking and ack routing", () => {
  it("routes ack to the correct client", () => {
    const rooms = createRooms();
    const client = mockWs();
    addClient(rooms, client);

    trackCommand(rooms, "cmd-abc", client);
    const delivered = routeAck(rooms, "cmd-abc", '{"type":"command:ack"}');

    expect(delivered).toBe(true);
    expect(client.send).toHaveBeenCalledWith('{"type":"command:ack"}');
  });

  it("returns false for unknown commandId", () => {
    const rooms = createRooms();
    expect(routeAck(rooms, "cmd-unknown", '{"type":"command:ack"}')).toBe(false);
  });

  it("cleans up pending commands when client disconnects", () => {
    const rooms = createRooms();
    const client = mockWs();
    addClient(rooms, client);
    trackCommand(rooms, "cmd-xyz", client);

    removeClient(rooms, client);

    expect(rooms.pendingCommands.has("cmd-xyz")).toBe(false);
  });
});

describe("rooms — uptime", () => {
  it("returns uptime in seconds", () => {
    const rooms = createRooms();
    rooms.startTime = Date.now() - 5000;
    expect(uptimeSeconds(rooms)).toBeGreaterThanOrEqual(4);
    expect(uptimeSeconds(rooms)).toBeLessThanOrEqual(6);
  });
});
