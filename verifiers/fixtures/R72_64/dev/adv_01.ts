import { WebSocket } from "ws";

export class SocketClient {
  constructor(private readonly socket: WebSocket) {}

  send(payload: unknown): void {
    this.socket.send(JSON.stringify(payload));
  }
}

export const handlers = {
  onOpen() { console.log("open"); },
  onClose(code: number) { console.log("close", code); },
  onError(err: Error) { console.error(err); },
  onMessage(data: string) { console.log("msg", data); },
  onPing() { console.log("ping"); },
  onPong() { console.log("pong"); },
  onReconnect(attempt: number) { console.log("reconnect", attempt); },
  onTimeout() { console.log("timeout"); },
  onUpgrade(url: string) { console.log("upgrade", url); },
  onDrain() { console.log("drain"); },
};
