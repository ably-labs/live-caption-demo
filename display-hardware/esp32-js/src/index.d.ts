declare function require(moduleName: string): any;
declare const D34: Pin;

declare function Waveform(x: number, y: any): void;

declare interface ProcessObject {
    on(eventName: string, callback: CallableFunction): any;
}

declare const process: ProcessObject;