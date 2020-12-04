import { connect } from "./Networking";
import { TranscriptionService } from "./TranscriptionService";
import { MicMonitor } from "./MicMonitor";

let transcriptionService: TranscriptionService;
let micMonitor: MicMonitor;

function onInit() {
    console.log("onInit");

    connect().then(() => {
        transcriptionService = new TranscriptionService();

        micMonitor = new MicMonitor(D34, (values: Uint8Array) => {
            processData(values);
        });

        micMonitor.start();
    });
}

function processData(values: Uint8Array) {
    if (!transcriptionService.connected) {
        return;
    }

    transcriptionService.send(values.toString());
}

process.on('uncaughtException', (ex: any) => {
    console.log(ex)
});