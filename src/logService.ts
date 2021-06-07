/**
 * Encapsulates a log message, attaching a source/emitter label to the message.
 * 
 * This can be sent directly through a socket connection, as we've overriden `toString()`
 */
class LogMessage {
    constructor(private source: string, private message: string) {
        this.source = source
        this.message = message
    }

    toString(): string {
        return JSON.stringify(this)
    }
}

/**
 * Sends messages to a collector listening on a websocket
 */
export class LogService {
    private readonly webSock: WebSocket

    private readonly queue: LogMessage[] = []

    constructor(host: string, port: number, private readonly name: string) {
        this.webSock = new WebSocket(`ws://${host}:${port}/log`)
        // once the socket is open, send all logs collected during startup, one by one
        this.webSock.onopen = () => {
            this.queue.forEach(queuedItem => this.webSock.send(<any>queuedItem))
            // clear queue 
            this.queue.splice(0, this.queue.length)
        }

        this.name = name
    }

    sendLog(text: string) {
        const message = new LogMessage(this.name, text)
        // buffer messages to a queue if connection not ready yet
        if (this.webSock.readyState != WebSocket.OPEN) {
            this.queue.push(message)
            return
        }

        // websocket only knows how to send strings, but if supplied an object it will call it's `toString()` method - hence the cast to `any`
        this.webSock.send(<any>message)
    }
}