import "./microsoft.cognitiveservices.speech.sdk.bundle";
declare const SpeechSDK: any;

export type AzureToken = { authorizationToken: string; region: string; }
export type OnTextRecognised = (text: string) => void;

export class AzureCognitiveSpeech {

    private _tokenAuthApiPath: string;
    private _callback: OnTextRecognised;

    constructor(tokenAuthApiPath: string = "/api/createAzureTokenRequest") {
        this._tokenAuthApiPath = tokenAuthApiPath;
        this._callback = (s) => { };
    }

    public onTextRecognised(callback: OnTextRecognised) {
        this._callback = callback;
    }

    public async streamSpeechFromBrowser() {
        const speechConfig = await this.getConfig();
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognized = async (_, speechResult) => {
            const text = speechResult.privResult.privText ?? "";
            this._callback(text);
        };

        recognizer.startContinuousRecognitionAsync(
            function () { },
            function (error) { console.log(error); }
        );
    }

    private async getConfig() {
        const azureToken = await this.getToken();

        const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
            azureToken.authorizationToken,
            azureToken.region
        );

        speechConfig.speechRecognitionLanguage = "en-US";
        return speechConfig;
    }

    private async getToken(): Promise<AzureToken> {
        const response = await fetch(this._tokenAuthApiPath);
        const azureToken = await response.json();
        return azureToken as AzureToken;
    }
}
