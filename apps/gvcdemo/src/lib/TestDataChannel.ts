import { type RtcDataChannel, type RtcDataChannelMessage } from "@gcorevideo/rtckit"

interface MessageDto<PT = {}> {
  type: MessageType
  data: PT
}

export interface MessagePayload {}

async function unpackMessage(src: RtcDataChannelMessage): Promise<unknown> {
  if (typeof src === "string") {
    return JSON.parse(src)
  }
  if (src instanceof Blob) {
    return JSON.parse(await src.text())
  }
  return JSON.parse(String.fromCharCode(...new Uint8Array(src).values()))
}

class TestMessage {
  constructor(
    public readonly type: string,
    readonly data: unknown = null
  ) {}

  // TODO message parser as separate class
  static async parse(src: RtcDataChannelMessage): Promise<MessageDto> {
    const unpacked = await unpackMessage(src)
    if (!unpacked || typeof unpacked !== "object" || !("type" in unpacked)) {
      throw new Error("Malformed message")
    }
    const { type } = unpacked
    switch (type) {
      case MessageType.Ping:
        return PingMessage.validate(unpacked as MessageDto)
      case MessageType.Pong:
        return PongMessage.validate(unpacked as MessageDto)
      default:
        throw new Error(`Unknown message "${type}"`)
    }
  }

  pack(): string {
    return JSON.stringify({
      type: this.type,
      data: this.data
    })
  }
}

export interface PingMessagePayload extends MessagePayload {
  time: number
}
type PingMessageDto = MessageDto<PingMessagePayload>

interface PongMessagePayload extends MessagePayload {}
type PongMessageDto = MessageDto<PongMessagePayload>

export class PingMessage extends TestMessage {
  constructor() {
    super("ping", {
      time: new Date().getTime()
    })
  }

  static validate(msg: MessageDto): PingMessageDto {
    const { data } = msg
    if ("time" in data && typeof data.time === "number") {
      return msg as PingMessageDto
    }
    throw new Error("Malformed ping message")
  }
}

class PongMessage extends TestMessage {
  constructor() {
    super("pong", {})
  }

  static validate(msg: MessageDto): PongMessageDto {
    return msg as PongMessageDto
  }
}

export enum MessageType {
  Ping = "ping",
  Pong = "pong"
}

type MessageHandler = (data: MessagePayload) => void

export class TestDataChannel implements TestDataChannel {
  private handlers: Map<MessageType, MessageHandler[]> = new Map()

  private ready = false

  constructor(private chan: RtcDataChannel) {
    this.chan.subscribe(async (data: RtcDataChannelMessage) => {
      try {
        const msg = await TestMessage.parse(data)
        this.propagate(msg)
      } catch (e) {
        console.error("TestDataChannel failed to parse message %o", e)
        return
      }
    })
  }

  async ping() {
    await this.chan.send(new PingMessage().pack())
    if (!this.ready) {
      this.chan.requestLoopback()
      this.ready = true
    }
  }

  on(mt: MessageType, handler: MessageHandler) {
    if (!this.handlers.has(mt)) {
      this.handlers.set(mt, [])
    }
    this.handlers.get(mt)!.push(handler)
  }

  private propagate(msg: MessageDto) {
    const hs = this.handlers.get(msg.type)
    if (!hs) {
      return
    }
    hs.forEach((h) => {
      try {
        h(msg.data)
      } catch (e) {
        console.error("propagate handler error msg:%s %o", msg.type, e)
      }
    })
  }
}
