# Live Captioning with Ably Realtime and Microsoft Azure Cognitive Services.

[![Ably + Azure Cognitive Services Live Captioning Demo with LED display](https://i.ibb.co/M5gyM4h/video.png)](https://www.youtube.com/watch?v=cxHJnJ8vJ4U)

# Live Captioning with Ably Realtime and Microsoft Azure Cognitive Services.

A live captioning app that translates your speech to a wearable display. Perfect for wearing masks!

URL: https://icy-pond-03bcaa503.azurestaticapps.net/

# What is this?

This is a web app that uses Azure Cognitive Service (ACS) and Ably. It is designed to be run in a browser on your mobile phone while you're wearing mask with a flexible LED display. It uses ACS to perform streaming transcription of your microphone input (ideally from a lapel or headset mic, but will also work with the phone held within a sensible distance), while using the app in a browser. The data returned from ACS is then sent to the display on the mask via Ably. The transcription is also displayed in the browser.

The web app communicates with a physical hardware device to scroll text on an LED display in the real world. It uses an NPM package called `@snakemode/matrix-driver` that was built as part of this project. `matrix-driver` exposes a JavaScript SDK called `RemoteMatrixLedDriver`, which is used to send either text, images or individual pixels displays running on Arduino hardware.

This web app also displays a simulated LED Matrix that comes as part of the `matrix-driver` - it is a debug utility to help us write the Arduino code without being hooked up to a display, but as a fun side effect, it makes it possible to run a close approximation to the Arduino code in the web browser, and replicate what you would see on real hardware. On the actual hardware, this code is translated to C, in the web version we're writing in Typescript.

The `matrix-driver` uses Ably and MQTT to send its messages to the hardware, so while this webapp works as "just" a demo of Voice-to-text using Azure Cognitive Services, when combined with Ably and MQTT, we can trivially drive actual hardware devices.

# How To Run the App Locally

You can run the web app in this repository locally to try out speech recognition/live captioning and the in-browser LED matrix. To run the web app:

1. Clone this repository.
2. In your terminal run `npm install` in the repository root.
3. Create a file called **/api/local.settings.json**.
4. Paste the following into **local.settings.json**:

    ```js
    {
    "IsEncrypted": false,
    "Values": {
        "ABLY_API_KEY": "ably-api-key-goes-here",
        "FUNCTIONS_WORKER_RUNTIME": "node"
    }
    "ConnectionStrings": {}
    }
    ```

5. In your terminal, run `npm run start` in the repository root
6. Enjoy speech to text, and some pretty lights!

# How it works

This readme will walk through:

- Building the static web application
- Adding an API to integrate with Ably token authentication
- Adding an API to integrate with Azure Cognitive Services Token Authentication
- Writing code to transcribe microphone input
- Writing code to display a Virtual LED Matrix display on the screen
- Using the `matrix-driver` to send messages using Ably and MQTT to power physical devices

# Dependencies

- An Ably account and API key
- An Azure Account for hosting on production
- Node 12 (LTS)

To write the code for the hardware portion of this demo (don't panic - you don't need hardware at first):

- Arduino IDE - 1.8.42
- MQTT by Joel Gaehwiler - 2.4.8 (installable from the Library Manager in the Arduino IDE)
- Adafruit NeoPixel - 1.7.0 (installable from the Library Manager in the Arduino IDE)

# Configuration
## Ably Channels for pub/sub

The app uses [Ably](https://www.ably.io/) for [pub/sub messaging](https://www.ably.io/documentation/core-features/pubsub) between the players. Ably is an enterprise-ready pub/sub messaging platform that makes it easy to design, ship, and scale critical realtime functionality directly to your end-users.

[Ably Channels](https://www.ably.io/channels) are multicast (many publishers can publish to many subscribers) and we can use them to build apps.

## Ably channels and API keys

In order to run this app, you will need an Ably API key. If you are not already signed up, you can [sign up now for a free Ably account](https://www.ably.io/signup). Once you have an Ably account:

1. Log into your app dashboard.
2. Under **“Your apps”**, click on **“Manage app”** for any app you wish to use for this tutorial, or create a new one with the “Create New App” button.
3. Click on the **“API Keys”** tab.
4. Copy the secret **“API Key”** value from your Root key, we will use this later when we build the app.

This app is going to use [Ably Channels](https://www.ably.io/channels) and [Token Authentication](https://www.ably.io/documentation/rest/authentication/#token-authentication).

## Local dev pre-requirements

You will need to host the API, and can do so using Azure functions, you will need to install the [Azure functions core tools](https://github.com/Azure/azure-functions-core-tools). In your terminal, run:

```bash
npm install -g azure-functions-core-tools
```

You will also need to set your API key for local development. In your terminal, run:

```bash
cd api
func settings add ABLY_API_KEY Your-Ably-Api-Key
```

Running this command will encrypt your API key into the file `/api/local.settings.json`.
You don't need to check it in to source control, and even if you do, it won't be usable on another machine.

## How authentication with Ably works

Azure static web apps don't run traditional "server side code", but if you include a directory with some Azure functions in your application, Azure's deployment engine will automatically create and manage Azure functions for you, that you can call from your static application.

For local development, you can use the Azure functions SDK to replicate this. For production, use static files (or files created by a static site generator of your choice) and Azure will serve them for you.

## The Azure function

The `/API` folder in this repo contains an Azure functions JavaScript API. It contains some files created by default (package.json, host.json etc) that you don't really need to worry about, they are generated by the Azure Functions SDK. If you wanted to expand the API, you would use npm install and the package.json file to manage dependencies for any additional functionality.

The `api/createTokenRequest` directory is where all of the "server side" code lives. Inside it, there are two files - `index.js` and `function.json`. The function.json file is the Functions binding code that the Azure portal uses for configuration, it is generated by the SDK and you don't really need to pay attention to it. The Ably setup is inside the `index.js` file:

```js
const Ably = require('ably/promises');

module.exports = async function (context, req) {
    const client = new Ably.Realtime(process.env.ABLY_API_KEY);
    const tokenRequestData = await client.auth.createTokenRequest({ clientId: 'ably-livecaption' });
    context.res = { 
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tokenRequestData)
    };
};
```

This code configures this API to be available on `https://azure-url/api/createTokenRequest`. Later on we're going to provide this URL to the Ably SDK in the client to authenticate with Ably.

## Authentication with Azure Cognitive Services

To use Azure Cognitive Services (ACS), you will need to:

- Create an instance of Azure Cognitive Services
- Get an ACS API key
- Create an Azure Functions API to do Token Exchange

## Getting an Azure Cognitive Services Instance up and running and finding your API keys

If you'd rather read the official Microsoft Docs for this, go here - https://azure.microsoft.com/en-gb/services/cognitive-services/

Firstly, you need an Azure Account, if you don't have one, you can [set one up for free](https://azure.microsoft.com/account/free). Once you have an account:

1. Login to your acount and navigate to the **Portal**.
2. Search for "Cognitive Services" in the Azure portal search bar.
3. Click "Add", this will land you in the Marketplace.
4. At the marketplace, search for "Speech"
5. See "Speech" by Microsoft
6. Click "Create" -> "Speech"
7. Give your resources a name, and you can select the F0 free pricing tier, to try this out for free
8. Click "Create".

Once your Cognitive Services instance has been created, you should be able to navigate to it by looking at your Cognitive Services Accounts - https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.CognitiveServices%2Faccounts

Click your running Cognitive Servives instance, and click "Manage keys" to get your API key. From here, click "Show Keys" and copy one of the two keys (it, hilariously, doesn't really matter which, there's just two of them) - and this is your Cognitive Services API key.

# Creating an Azure Function for Cognitive Services Token Authentication

While you **can** just put your API key into the web app, API keys are like passwords - you don't want people copy and pasting them from your source code. If your API key is stolen, especially one that's valid for your Azure account, other people could run up huge resource bills on your behalf.

To protect against this, Azure Cognitive Services offers an [`issueToken` API](https://dev.cognitive.microsoft.com/docs/services/57346a70b4769d2694911369/operations/57346edcb5816c23e4bf7421), that generates time-limited tokens. We can use this by calling the IssueToken API with the API, and subsequently return the token it returns to the client-side code.
These tokens expire very quickly (minutes-to-hours) and we can make the own API to return these tokens to the web app, which will allow users to connect directly to the ACS instances with a token we issue them.

To do this, much like with the Ably API key previously, we're going to use an Azure Function to the `/api` subdirectory.

The code that calls the `issueToken` API is inside the `api/createAzureTokenRequest` directory. It contains two files - `index.js` and `function.json`. The function.json file is the Functions binding code that the Azure portal uses for configuration, it's generated by the SDK and you don't need to pay attention to it.

The Azure code is in the `index.js` file:

```js
const fetch = require('node-fetch');
const atob = require('atob');

const subscriptionKey = process.env.ACS_API_KEY;
const serviceRegion = process.env.ACS_API_REGION;

module.exports = async function (context, req) {
    const result = await fetch(`https://${serviceRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
        method: 'post',
        body:    JSON.stringify({}),
        headers: {
            'Content-Type': 'application/json' ,
            'Ocp-Apim-Subscription-Key' : subscriptionKey
        }
    });

    const responseText = await result.text();
    const token = JSON.parse(atob(responseText.split(".")[1]));

    context.res = {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authorizationToken:responseText, ...token })
    };
};
```

By default, this configures an API to be available on `https://azure-url/api/createAzureTokenRequest`.
The client side code will call this URL to authenticate with ACS.

Notice that it uses two values from `process.env` - this is your Azure key and service region.
To make this code work, you're going to have to edit the `/api/local.settings.json` to look something like this:

```json
{
  "IsEncrypted": false,
  "Values": {
    "ABLY_API_KEY": "ably-api-key",
    "ACS_API_KEY": "azure-api-key",
    "ACS_API_REGION": "azure-service-region", // e.g. westeurope
    "FUNCTIONS_WORKER_RUNTIME": "node"
  },
  "ConnectionStrings": {}
}
```

# The application

The app itself is inside the `/app` directory, it contains:

- `index.html` - the transcription UI
- `view.html` - a sharable UI to see transcription text
- `index.ts` - the entry point
- `style.css` - styles

There's also a `/js` folder that contains:

- `AzureCognitiveSpeech.ts` - a wrapper around the ACS SDK to make it a little easier to use and take care of token exchange
- `microsoft.cognitiveservices.speech.sdk.bundle.js` - The ACS SDK.

In development, the app uses [snowpack](http://snowpack.dev) as a hot-module-reload web server to run the code.

To run the code, you'll need to install the dependencies, then start the application. When you start the app, your browser should open. In your terminal run: 

```bash
npm install
npm run start
```

# The UI

Let's start by taking a look at the `index.html` file.

This contains standard HTML5 boilerplate, it links the styles and imports index.js file as an ES Module

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <title>Live Caption</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta charset="UTF-8">
        <link rel="stylesheet" href="style.css">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/browser/assets/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/browser/assets/favicon-16x16.png">
        <link rel="manifest" href="/browser/assets/site.webmanifest">
        <script src="/index.js" type="module"></script>
    </head>
    <body>
        <h1 class="header">Live Caption Yourself</h1>
            <main>
```

Next we set up the `controls` section - this contains user input forms for controlling LED colours and text scroll speed:

```html

            <section class="controls">
                <button class="button" id="button">Start listening</button>
                <label for="color">LED colour:</label>
                <input type="color" id="color" class="color" value="#ffffff">
                <label for="color">Scroll speed:</label>
                <input type="range" max="-5" min="-250" value="-25" class="speed" id="speed"> 
            </section>
```

A `response-holder` where transcribed audio will appear in real time:

```html
            <section class="response-holder">
                <h2>Your speech as text will show here</h2>
                <div id="response" class="response"></div>
            </section>
```

and finally, a `lightGrid` div, which is used by the `matrix-driver` to display a virtual LED array.

```html
            <div id="lightGrid" class="lightGrid"></div>
```

The UI elements are very light in this demo - a couple of form inputs that are interactive. 
The code starts executing by loading the ES Module `index.js`.
Remember, this `index.js` file is transpiled from `TypeScript` by `snowpack` - so you will notice that there isn't an `index.js` file on the disk, there *is* an `index.ts` file that is converted and server when the browser loads.

# index.ts - the entry point

The application consists of the parts we've seen in the HTML above - some input elements, an LED matrix, and a container for displaying transcribed text. The index.ts file, wires all of these parts together.

First, we'll import all of the dependencies. ES Module loading makes it possible to use the `import` keyword in the browser. It is also worth highlighting that because we're using `snowpack` we can directly reference `npm` modules here, and it will re-bundle them as required, so we can just use them in the code.

```ts
import {
  default as RemoteMatrixLedDriver,
  ArduinoSimulator,
  CarriageReturnMode,
  IndexMode,
  mqtt_connection,
  ArduinoDeviceAdapter,
  Program,
  AblyTransport
} from "@snakemode/matrix-driver";

import Ably from "ably";
import { AzureCognitiveSpeech } from "./js/AzureCognitiveSpeech";
```

Many of these imports from the `matrix-driver` are just debug imports that are used to create the virtual LED matrix.
The Ably SDK is imported, this is what we will use to send MQTT messages, and finally, we're importing the `AzureCognitiveSpeech` wrapper class.

Then, select the input elements for later use, and typing them as `HTMLInputElement` so get slight better IntelliSense.

```ts
const colorPicker = document.getElementById("color") as HTMLInputElement;
const speedSlider = document.getElementById("speed") as HTMLInputElement;
const textPreview = document.getElementById("response");
const submitButton = document.getElementById("button");
```

Now we're ready to use the `ArduinoSimulator`.

This simulator is mostly for debugging Arduino code, but it also allows us to run a `TypeScript` version of the C code we'll run on the physical hardware (imported here as the inconspiciuously named `Program`). The simulator requires a few parameters - the id of the `lightGrid` container `div`, and the dimensions of the virtual display that you'll be using (32x8 in the demo video), along with how the physical display is wired (horizontally, vertically, left to right, snaked etc).

While this may seem like a weird amount of detail, it affects the Id value of each addressable pixel in the matrix, and has to match up with the display that the `Program` instance is expecting in order to display text correctly. 
The code to set this up:

```ts
ArduinoSimulator.runWithDisplay(new Program(), "lightGrid", {
  width: 32,
  height: 8,
  indexFrom: IndexMode.TopLeft,
  carriageReturnMode: CarriageReturnMode.Snaked
});
```

Next we'll create an `AblyClient`, and the `RemoteMatrixLedDriver` instance:

```ts
const ablyClient = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });

const ledDriver = new RemoteMatrixLedDriver({
  displayConfig: { width: 32, height: 8 },
  deviceAdapter: new ArduinoDeviceAdapter([
    new AblyTransport(ablyClient),
    mqtt_connection.instance
  ])
});
```

Since there is a lot of work going on here, let's unpack this constructor call into separate lines to step through what it does:

```ts
// Create the Ably client and wrap it in the `AblyTransport` wrapper
const ablyClient = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });
const transport = new AblyTransport(ablyClient);

// This wrapper provides an interface that the `RemoteMatrixLedDriver` is expecting, that can use Ably
// to send MQTT messages

// Create an array of the two transports we're using in this demo
// The first is the Ably MQTT transport, the second is a stubbed out MQTT implementation for the Arduino Simulator
const transports = [ transport, mqtt_connection.instance ];

// Next we'll create an instance of the Arduino Device Adapter - more on this later
// Passing the collection of transports to its constructor, so it can use them later on.
const deviceAdapter = new ArduinoDeviceAdapter(transports);

// Then we're configuring the display so any pixels or images the device calculates understands the size
// of the physical hardware that it's sending them to.
const displayConfig = { width: 32, height: 8 };

// Finally, we're creating the `RemoteMatrixLedDriver`, passing it both the displayConfig, and the deviceAdapter
// as configuration

const ledDriver = new RemoteMatrixLedDriver({ displayConfig, deviceAdapter });
```

All of the Arduino code / virtual LED matrix setup is now complete, next, we need to create an instance of the `AzureCognitiveSpeech` wrapper. Notice that the path to the `issueToken` API is passed to the constructor - this matches how the `AblyClient` was configured above.

```ts
const speech = new AzureCognitiveSpeech("/api/createAzureTokenRequest");

speech.onTextRecognised((text) => {
  const colorValue = colorPicker.value ?? "#ffffff";
  const speedValue = parseInt(speedSlider.value) * -1 ?? 25;

  textPreview.innerHTML += " " + text;
  ledDriver.text.scroll(text, colorValue, speedValue);
});
```

The `AzureCognitiveSpeech` wrapper contains a callback called `onTextRecognised` which will be called whenever new text is returned from ACS. This callback function reads values from the UI elements for colour and speed, adds the received text into the `textPreview` section, and then uses the `ledDriver` instance to send a `text.scroll` message to the hardware.

Finally, an `EventListener` is added to the submit button. On click it will call the `speech.streamSpeechFromBrowser()` function on the ACS wrapper to start recording:

```ts
submitButton.addEventListener("click", () => speech.streamSpeechFromBrowser());
```

Clicking this button will trigger a browser permission dialogue the first time it is clicked.

# Recognising Speech with Azure Cognitive Services

Tje `AzureCognitiveSpeech` wrapper class, mentioned earlier, is used to record audio and get transcriptions back from the user.

`AzureCognitiveSpeech` uses the Microsoft supplied `microsoft.cognitiveservices.speech.sdk.bundle.js` SDK so the first thing to do is import it:

```ts
import "./microsoft.cognitiveservices.speech.sdk.bundle";
declare const SpeechSDK: any;
```

Next, we're going to define some `TypeScript Types` that represent two things:

1. The token that is returned from the issueToken API.
2. The [call signature](https://www.typescriptlang.org/docs/handbook/2/functions.html#call-signatures) `OnTextRecorded` which gives a typing to the callback to invoke when a voice sample is recognised.

```ts
export type AzureToken = { authorizationToken: string; region: string; }
export type OnTextRecognised = (text: string) => void;
```

Now we define the `AzureCognitiveSpeech` class, and configure two [private class fields](https://www.typescriptlang.org/docs/handbook/classes.html#understanding-typescripts-private) to store the `issueToken` API path, and any configured callback.

```ts
export class AzureCognitiveSpeech {

    private _tokenAuthApiPath: string;
    private _callback: OnTextRecognised;

    constructor(tokenAuthApiPath: string = "/api/createAzureTokenRequest") {
        this._tokenAuthApiPath = tokenAuthApiPath;
        this._callback = (s) => { };
    }
```

`onTextRecognised()` accepts a callback function, that is saved in the class to invoke when new transcriptions are available.

```ts
    public onTextRecognised(callback: OnTextRecognised) {
        this._callback = callback;
    }
```

Next we define the `streamSpeechFromBrowser` function, which is responsible for using the Azure Cognitive Services SDK to record audio. It starts of by calling `this.getConfig()` which uses the browser's [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to call `createAzureTokenRequest` for an API key.

It configures the `SpeechSDK` to record from the user's default microphone.
Then it creates a new recognizer class, providing a `recognized` callback, and starts recording with `startContinuousRecognitionAsync`.

```ts
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
```

The `recognized` callback in this class unpacks the raw text from the ACS response, and calls a callback with that text string.

Below, is the implementation of `getConfig` as it unpacks the API key and creates a valid `SpeechSDK` configuration:

```ts
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
```

This wrapper class makes calling Azure Cognitive Services easier to use in the application code.

# Sending text to the LED Matrix using Ably and the Transports

When we created the `RemoteMatrixLedDriver` we provided it with this configuration:

```ts
// Create the Ably client and wrap it in the `AblyTransport` wrapper
const ablyClient = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });
const transport = new AblyTransport(ablyClient);

// Configured RemoteMatrixLedDriver below...
const transports = [ transport, mqtt_connection.instance ];
const deviceAdapter = new ArduinoDeviceAdapter(transports);
const displayConfig = { width: 32, height: 8 };
const ledDriver = new RemoteMatrixLedDriver({ displayConfig, deviceAdapter });
```

The first two lines create an instance of the `Ably JavaScript SDK` and pass it to the `AblyTransport`.

The `transport` is an abstraction over different communication providers that the `RemoteMatrixLedDriver` uses - the idea is that it could communicate, in theory, over Bluetooth, or over HTTP, but for this example we want to use the `MQTT` protocol because it is designed for IoT and low bandwidth devices.

To use MQTT, you will need an MQTT broker. This demo uses the [Ably Realtime MQTT broker](https://www.ably.io/documentation/mqtt).

## Ably and MQTT

The cool thing about Ably supporting MQTT is that any messages sent in the browser or the Node.js process using the JavaScript SDK, are also sent out over the MQTT protocol automatically.

This means that we can use a lightweight MQTT library on the Feather Huzzah, and a simpler, more standard JavaScript / HTTP SDK in the browser.

MQTT is designed to be fast and responsive to enable communication between multiple devices and the clients with low latency and low bandwidth requirements.

## The AblyTransport

AblyTransport is a wrapper around the Ably SDK that lets the matrix-driver use Ably as a transport.

It doesn't do very much at all - but is a good example of some very simple Ably interaction:

```ts
import { IMessageTransport, WireFormattedMessage } from '../types';
import Ably from "ably";

export class AblyTransport implements IMessageTransport {

    private ably: Ably.Types.RealtimePromise;
    private channelId: string;
    private channel: any;

    constructor(ablyClient: Ably.Types.RealtimePromise, channelId = "leds") {
        this.ably = ablyClient;
        this.channelId = channelId;
        this.channel = this.ably.channels.get(this.channelId);
    }

    public async send(payload: WireFormattedMessage): Promise<void> {
        this.channel.publish({ name: "StreamedText", data: payload });
    }
}
```

In the constructor, we're storing the Ably SDK, the channel ID (which is defaulted to "leds" everywhere) and then using that SDK to `get` the Ably channel (which will create the channel if it does not already exist). This channel, which is stored in the private member variable `channel` is then later used to `publish` an Ably message whenever `send` is called on the transport.

We're setting the data property to be the pre-serialized `WireFormattedMessage` - the bytes serialized by the PixelProtocol serializer.

We need to wrap the Ably SDK in this transport because the matrix-driver expects a valid transport to contain a function called `send` with the signature

```ts
    send(payload: WireFormattedMessage): Promise<void>;
```

The `AblyTransport` acts as an [adapter](https://en.wikipedia.org/wiki/Adapter_pattern) - and lets the `matrix-driver` use Ably.

# A few notes on the simulator

We've skirted over the `ArduinoSimulator` in this guide for two reasons:

1. It's quite complicated and beyond the scope of this walk-through.
2. It's documented in the [`matrix-driver` repository here](https://github.com/snakemode/matrix-driver).

The incredibly abridged version, is that the `matrix-driver` package comes with some code that *simulates* Arduino hardware. What that means, is that we've ported a few of the Arduino libraries (like AdaFruit_NeoPixel) at the *API level only* to TypeScript, and are writing code that calls these "ported" APIs.

In the port, for example, we can write code that appears as though it uses the NeoPixel SDK function:

```ts
    setPixelColor(pixelNumber: number, r: number, g: number, b: number);
```

but what we're actually doing, is finding a `div` in the HTML and setting its background colour (instead of sending data to an actual LED strip).

The `Program` class that the `matrix-driver` exports is a `TypeScript` line-by-line transliteration (a line-by-line software port where the minimum amount of code possible is changed for the source to compile in another language) of the Arduino code written in `C` to run on actual hardware devices.

Please don't mistake this for an `Arduino emulator` - it is a class that runs the Arduino codes `setup` and `loop` functions repeatedly, to mimic what happens on real hardware. It is not an emulator, and its likely not timing-accurate - but it's enough to help us debug and work on the code.

# Running on real hardware

Once messages have been by the software we've just set up, any devices listening for messages over MQTT will be able to receive and process the them.

In the [matrix-driver repository](https://github.com/snakemode/matrix-driver) there are detailed instructions for how to build and deploy the Arduino sketch we've prepared, which is all the code required to receive the messages, unpack the serialized binary messages, and power actual LED displays.

[You can find these instructions here](https://github.com/snakemode/matrix-driver#arduino-hardware).

To make this work in the real world, you'll need some hardware, here is the hardware that was used to develop this application:

- AdaFruit Feather Huzzah / ESP8266 - [AdaFruit](https://www.adafruit.com/category/943), [Amazon](https://www.amazon.co.uk/Feather-HUZZAH-with-ESP8266-WiFi/dp/B019MGW6N6/ref=sr_1_3)
- WS2812B Led Strip Panel Kit 8x32 256 pixels - [Amazon](https://www.amazon.co.uk/gp/product/B07KT1H481/)
- Dupont Wire for connecting the Leds and board - [Amazon](https://www.amazon.co.uk/gp/product/B01EV70C78/)
- A Micro-USB cable

You'll need to clone the `matrix-driver` repository, and follow the instructions to install the `Arduino IDE`, build, and deploy the code provided.

There's some set up to do in that process that is explained in the repository which will configure your *wifi details* and *MQTT credentials*. With these details provided, running the provided Arduino code on physical hardware will work out of the box. The code was written to run on an ESP8266, but should also be compatible with ESP32 boards, and generic Arduino devices, though your milage may vary!

If you buy the LED strip mentioned above, you'll need to configure the Arduino code with the following settings -

```c
const index_mode display_connector_location = index_mode::TOP_LEFT;
const carriage_return_mode line_wrap = carriage_return_mode::SNAKED;
const neoPixelType neopixel_type = NEO_GRB + NEO_KHZ800;
```

Other LED strips may require different configuration, depending on how the LED matrix is wired together.

# Hosting notes

This project is built and hosted on [Azure Static Web Apps](https://azure.microsoft.com/en-us/services/app-service/static/) and uses the Azure Functions SDK locally to emulate that environment.

If you want to host this yourself, there are instructions in [HOSTING.md](HOSTING.md)

You could host this on other platforms, but you would have to port the API code to run on them.
