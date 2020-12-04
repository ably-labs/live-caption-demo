const WebSocket = require("ws");

export class TranscriptionService {
    public connected: boolean = false;
    private _ws: any;

    constructor() {
        this.connectWebSockets();
    }

    connectWebSockets(): void {
        try {

            console.log("Connecting to WebSockets");
            this._ws = new WebSocket("d13dc800c89a.ngrok.io", { path: '/', port: 80, origin: 'Espruino', keepAlive: 60 });

            this._ws.on('open', () => {
                console.log("Connected to server");
                this.connected = true;
            });

            this._ws.on('close', () => {
                console.log("Disconnected from server");
                this.connected = false;
            });

        } catch (ex) {
            console.log("Error connecting web socket " + ex + " - we'll try again in ten seconds...")
            setTimeout(() => { this.connectWebSockets(); }, 10_000);
        }
    }

    send(rawAudioValue: any): void {
        this._ws.send(rawAudioValue);
    }
}