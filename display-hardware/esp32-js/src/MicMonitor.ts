export class MicMonitor {
    private _pin: Pin;
    private _whenDataIsRead: CallableFunction;

    constructor(pin: Pin, whenDataIsRead: CallableFunction) {
        this._pin = pin;
        this._whenDataIsRead = whenDataIsRead;
    }

    start() {
        console.log("Starting to listen on " + this._pin);

        const waveForm = new Waveform(2000, { doubleBuffer: true });

        waveForm.on("buffer", (buf: Uint8Array) => {
            this._whenDataIsRead(buf);
        });

        waveForm.startInput(this._pin, 2000, { repeat: true });
    }
}