# Live Caption

A live captioning app that translates your speech to a wearable display. Perfect for wearing masks!

URL: https://icy-pond-03bcaa503.azurestaticapps.net/

# What is this

This application is a webapp, that uses Azure Cognitive Service (ACS), designed to be run from your mobile phone, while you're wearing a wearable display.

It uses ACS to perform streaming transcription of your microphone input - ideally from a lapel or headset mic, connected to your mobile device, while using the app in a browser / PWA.

The transcription is then displayed on a virtual LED matrix inside the browser, as well as being output as text.

The WebApp can communicate with a physical hardware device (more on this later) to actually scroll an LED display in the real world. We're using an NPM package called `@snakemode/matrix-driver` that was built as part of this project.
`matrix-driver` exposes a JavaScript SDK called `RemoteMatrixLedDriver`, which we use to send images, pixels and text to displays running on Arduino hardware.

This webapp also uses a Virtual LED Matrix that comes as part of the `matrix-driver` - it's a debug utility to help us write our Arduino code, but as a fun side effect, we can run our Arduino code (or some approximation of it!) in the web browser, and replicate what you would see on real hardware. On the actual hardware, this code is translated to C, but it's still fun to use on the web.

The `matrix-driver` uses Ably and MQTT to send its messages to the hardware, so while this webapp works as "just" a demo of Voice-to-text using Azure Cognitive Services, when combined with Ably and MQTT, we can trivially drive actual hardware devices.

# How do I run it

Without worrying too much about hardware, you can run the web app in this repository to try out Speech recognition/live captioning and lighting up an in-browser LED matrix by:

1. Clone this repository
2. Run npm install in the repository root and API sub-directory
3. Create the file `/api/local.settings.json` and put an `Ably API key` into it (more on this later, if you don't know what that means!)

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

4. npm run start in the repository root

```bash
npm install
npm run start
```

5. Enjoy speech to text, and some pretty lights!

# How it all works

We're going to:

- Build a static web application
- Add an API to integrate with Ably token authentication
- Add an API to integrate with Azure Cognitive Services Token Authentication
- Write code to transcribe microphone input
- Write code to display a Virtual LED Matrix display on the screen
- Use the `matrix-driver` to send messages using Ably and MQTT to power physical devices

# Dependencies

- An Ably API key
- An Azure Account for hosting on production
- Node 12 (LTS)

For the hardware portion of this demo - but don't panic - you don't need hardware at first!

- Arduino IDE - 1.8.42
- MQTT by Joel Gaehwiler - 2.4.8
- Adafruit NeoPixel - 1.7.0

The MQTT library, and the NeoPixel library are both installable from the Library Manager in the Arduino IDE.

Additionally, from Tools -> Boards -> Board Manager, ensure you're running 

- Arduino AVR Boards - 1.8.3
- ESP8266 Community - 2.7.4
- ESP32 - 1.0.4


# Configuring Ably

We're going to need to configure our system for local development, and to do that we need to

- Install the azure-functions-core-tools
- Add our Ably API key to a configuration file
- Configure a function to provide the Ably SDK with `token authentication` credentials

## Ably Channels for pub/sub

The app uses [Ably](https://www.ably.io/) for [pub/sub messaging](https://www.ably.io/documentation/core-features/pubsub) between the players. Ably is an enterprise-ready pub/sub messaging platform that makes it easy to design, ship, and scale critical realtime functionality directly to your end-users.

[Ably Channels](https://www.ably.io/channels) are multicast (many publishers can publish to many subscribers) and we can use them to build apps.

## Ably channels and API keys

In order to run this app, you will need an Ably API key. If you are not already signed up, you can [sign up now for a free Ably account](https://www.ably.io/signup). Once you have an Ably account:

1. Log into your app dashboard.
2. Under **“Your apps”**, click on **“Manage app”** for any app you wish to use for this tutorial, or create a new one with the “Create New App” button.
3. Click on the **“API Keys”** tab.
4. Copy the secret **“API Key”** value from your Root key, we will use this later when we build our app.

This app is going to use [Ably Channels](https://www.ably.io/channels) and [Token Authentication](https://www.ably.io/documentation/rest/authentication/#token-authentication).

## Local dev pre-requirements

We'll use Azure functions for hosting our API, so you'll need the Azure functions core tools.

```bash
npm install -g azure-functions-core-tools
```

You'll also need to set your API key for local dev:

```bash
cd api
func settings add ABLY_API_KEY Your-Ably-Api-Key
```
Running this command will encrypt your API key into the file `/api/local.settings.json`.
You don't need to check it in to source control, and even if you do, it won't be usable on another machine.

## How authentication with Ably works

Azure static web apps don't run traditional "server side code", but if you include a directory with some Azure functions in your application, Azures deployment engine will automatically create and manage Azure functions for you, that you can call from your static application.

For local development, we'll just use the Azure functions SDK to replicate this, but for production, we can use static files (or files created by a static site generator of your choice) and Azure will serve them for us.

## In the Azure function

We have a folder called API which contains an Azure functions JavaScript API. There's a bunch of files created by default (package.json, host.json etc) that you don't really need to worry about, and are created by the Functions SDK. If you wanted to expand the API, you would use npm install and the package.json file to manage dependencies for any additional functions.

There's a directory `api/createTokenRequest` - this is where all our "server side" code lives.

Inside it, there are two files - `index.js` and `function.json`. The function.json file is the Functions binding code that the Azure portal uses for configuration, it's generated by the SDK and you don't need to pay attention to it. Our Ably code is inside the `index.js` file.

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

By default, configures this API to be available on `https://azure-url/api/createTokenRequest`
We're going to provide this URL to the Ably SDK in our client to authenticate with Ably.

## How authentication with Azure Cognitive Services Works

To use Azure Cognitive Services (ACS), we're going to need to

- Create an instance of Azure Cognitive Services
- Get our ACS API key
- Create an Azure Functions API to do Token Exchange

## Getting an Azure Cognitive Services Instance up and running and finding your API keys

If you'd rather read the official Microsoft Docs for this, go here - https://azure.microsoft.com/en-gb/services/cognitive-services/

Firstly, you need an Azure Account
Then login

Search for "Cognitive Services" in the Azure portal search bar.
Click "Add"
At the marketplace search for "Speech"

See "Speech" by Microsoft
Click "Create" -> "Speech"

Give your resources a name, and you can select the F0 free pricing tier, to try this out.
Click "Create".

Once you've created a Cognitive Services instance, you'll need to get your API keys.
Once your Cognitive Services instance has been created, you should be able to navigate to it by looking at your Cognitive Services Accounts - https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.CognitiveServices%2Faccounts

Once you click your running Cognitive Servives instance, you can click "Manage keys".
From here, click "Show Keys" and copy one of the two keys (it, hilariously, doesn't really matter which, there's just two of them) - and this is your Cognitive Services API key.

# Creating an Azure Function for Cognitive Services Token Authentication

https://dev.cognitive.microsoft.com/docs/services/57346a70b4769d2694911369/operations/57346edcb5816c23e4bf7421

While you can just put your API key into the web app, API keys are like passwords and you don't want people copy and pasting them from your source code. If your API key is stolen, especially one that's valid for your Azure account, other people could run up huge resource bills on your behalf.

To protect against this, Azure Cognitive Services offers an `issueToken` API, that generates time-limited tokens. We can use this by calling this API with our normal API, and subsequently return the token it returns to our client-side code.
These tokens expire very quickly (minutes-to-hours) and we can make our own API to return these tokens to our web app, so we can allow our users to connect directly to our ACS instances with a token we issue them.

To do this, much like with our Ably API key previously, we're going to use an Azure Function to our `/api` subdirectory.

There's a directory `api/createAzureTokenRequest` - this will contain the code that calls the `issueToken` API.

Inside it, there are two files - `index.js` and `function.json`. The function.json file is the Functions binding code that the Azure portal uses for configuration, it's generated by the SDK and you don't need to pay attention to it.

Our Azure code is inside the `index.js` file.

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

By default, configures this API to be available on `https://azure-url/api/createAzureTokenRequest`.
Our client side code will call this URL to authenticate with ACS.

You'll notice that we're using two values from `process.env` - this is your Azure key and service reason.
TO make this code work, you're going to have to edit your `/api/local.settings.json` to look something like this:

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

The entire application contains a couple of HTML files

- `index.html` - the transcription UI
- `view.html` - a sharable UI to see transcription text
- `index.ts` - our entry point
- `style.css` - our styles

There's also a `/js` folder that contains:

- `AzureCognitiveSpeech.ts` - a wrapper around the ACS SDK to make it a little easier to use and take care of token exchange
- `microsoft.cognitiveservices.speech.sdk.bundle.js` - The ACS SDK.

In development, we're using [snowpack](http://snowpack.dev) as a hot-module-reload web server to run our code.

To run the code, you'll need to run the following to install our dependencies

```bash
npm install
npm run start
```

To start the application. When you start the app, your browser should open.

# The UI

Let's start by taking a look at our `index.html` file.

First we have the standard HTML5 boilerplate and header, our styles and our index.js file as an ES Module

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

Next we set up our `controls` section - this contains user input forms for controlling LED colours and text scroll speed

```html

            <section class="controls">
                <button class="button" id="button">Start listening</button>
                <label for="color">LED colour:</label>
                <input type="color" id="color" class="color" value="#ffffff">
                <label for="color">Scroll speed:</label>
                <input type="range" max="-5" min="-250" value="-25" class="speed" id="speed"> 
            </section>
```

A `response-holder` where transcribed audio will appear in real time

```html
            <section class="response-holder">
                <h2>Your speech as text will show here</h2>
                <div id="response" class="response"></div>
            </section>
```

and finally, a `lightGrid` div, which is used by our `matrix-driver` to display a virtual LED array.

```html
            <div id="lightGrid" class="lightGrid"></div>
```

(and of course a footer)

```html
            <section class="info-holder">
                <h3>What is this?</h3>
                <p>This web app uses <a href="https://azure.microsoft.com/en-gb/services/cognitive-services/speech-to-text/">Microsoft Azure Cognitive Services</a> to convert speech into text which can be streamed using <a href="https://ably.com">Ably Realtime</a> to another device. It can also stream to IoT LED matrix displays, which could be placed in wearables such as a mask or glasses to display live captions as the wearer speaks.
                </p>
                <p>It uses the browser's <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia">getUserMedia()</a> API to prompt the speaker for permission to use their microphone and stream audio.</p>
                <h3>How do I use it?</h3>
                <p>Click the "start listening" button and allow your browser permission to use your microphone. Speak into the mic and the text of what you say will be displayed both as plain text and as a scrolling graphic on the LED display simulator.</p>
            </section>
            <footer>
                Powered by <a href="https://ably.com">Ably</a> and <a href="https://azure.microsoft.com/en-gb/services/cognitive-services/speech-to-text/">Microsoft Azure Cognitive Services</a>
            </footer>
        </main>
    </body>
</html>
```

Our UI elements are very light in this demo - we really just have a couple of form inputs that are interactive, and our code starts executing by loading the module ES Module `index.js`.
Remember, this `index.js` file is transpiled from `TypeScript` by `snowpack` - so you will notice that there isn't an `index.js` file on the disk, there *is* an `index.ts` file that is converted and server when the browser loads.

# index.ts - our entry point

Our application consists of the parts we've seen in our HTML above - some input elements, an LED matrix, and a div for displaying transcribed text. Our index.ts file, wires all of these parts together.

First, we'll import all of the dependencies we're using. We're using ES Module loading, so we can use the `import` keyword in the browser. It's also worth highlighting that because we're using `snowpack` we can directly reference `npm` modules here, and it will re-bundle them as required, so we can just use them in our code.

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

We're importing loads of bits from the `matrix-driver` - most of them are just debug imports that we're using to create the virtual LED matrix. Next, we're importing the `Ably` SDK that we'll use to send MQTT messages, and finally, we're importing our `AzureCognitiveSpeech` wrapper class.

Next, we're selecting our input elements for later use, and typing them as `HTMLInputElement` so get slight better IntelliSense.

```ts
const colorPicker = document.getElementById("color") as HTMLInputElement;
const speedSlider = document.getElementById("speed") as HTMLInputElement;
const textPreview = document.getElementById("response");
const submitButton = document.getElementById("button");
```

Now we're reading to use our `ArduinoSimulator`.

This simulator is mostly for debugging Arduino code, but what it lets us do, is run a `TypeScript` version of the code we're running on our physical hardware - imported here as the inconspiciuously named `Program`

The simulator requires a few parameters - the id of our `lightGrid` placeholder `div`, and the dimensions of our virtual display - 32x8 in this case, along with how, if it were a real display, it would be physically wired together.

While this may seem like a weird amount of detail, it affects the addressable pixel Ids of each pixel in our virtual matrix, and has to line up with the display that the `Program` instance is expecting.

Don't worry too much about this ;) [ see other readme note]

```ts
ArduinoSimulator.runWithDisplay(new Program(), "lightGrid", {
  width: 32,
  height: 8,
  indexFrom: IndexMode.TopLeft,
  carriageReturnMode: CarriageReturnMode.Snaked
});
```

We're creating an `AblyClient`, and our `RemoteMatrixLedDriver` instance.

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

There's a lot going on here, so let's unpack this constructor call into lots of lines instead.

```ts
// Create the Ably client and wrap it in our `AblyTransport` wrapper
const ablyClient = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });
const transport = new AblyTransport(ablyClient);

// This wrapper provides an interface that the `RemoteMatrixLedDriver` is expecting, that can use Ably
// to send MQTT messages

// Create an array of the two transports we're using in this demo
// The first is our Ably MQTT transport, the second is a stubbed out MQTT implementation for our Arduino Simulator
const transports = [ transport, mqtt_connection.instance ];

// Next we'll create an instance of our Arduino Device Adapter - more on this later
// Passing our collection of transports to its constructor, so it can use them later on.
const deviceAdapter = new ArduinoDeviceAdapter(transports);

// Then we're configuring our display so any pixels or images the device calculates understands the size
// of the physical hardware that it's sending them to.
const displayConfig = { width: 32, height: 8 };

// Finally, we're creating our `RemoteMatrixLedDriver`, passing it both the displayConfig, and the deviceAdapter
// as configuration

const ledDriver = new RemoteMatrixLedDriver({ displayConfig, deviceAdapter });
```

The above code is entire equivalent to the "inlined" version we started with.

All of our Arduino code / virtual LED matrix setup is now complete, we need to create an instance of our `AzureCognitiveSpeech` wrapper. You'll notice we're passing the path to our `issueToken` API to the constructor - this matches the way we configured the `AblyClient` above.

```ts
const speech = new AzureCognitiveSpeech("/api/createAzureTokenRequest");

speech.onTextRecognised((text) => {
  const colorValue = colorPicker.value ?? "#ffffff";
  const speedValue = parseInt(speedSlider.value) * -1 ?? 25;

  textPreview.innerHTML += " " + text;
  ledDriver.text.scroll(text, colorValue, speedValue);
});
```

The `AzureCognitiveSpeech` wrapper contains a callback called `onTextRecognised` which will be called whenever new text is returned from ACS.

In this callback function we read values from our UI elements for colour and speed, add the received text into our `textPreview` section, and then use the `ledDriver` instance to send a `text.scroll` message to our hardware.

Finally, we add an `EventListener` to the submit button click to the `speech.streamSpeechFromBrowser()` function on our ACS wrapper that starts recording.


```ts
submitButton.addEventListener("click", () => speech.streamSpeechFromBrowser());
```

Clicking this button will trigger a browser permission dialogue the first time you click it.

# Recognising Speech with Azure Cognitive Services

We've mentioned the `AzureCognitiveSpeech` wrapper class earlier, let's break down how we use it to record audio and get transcriptions back from the user.

`AzureCognitiveSpeech` uses the Microsoft supplied `microsoft.cognitiveservices.speech.sdk.bundle.js` SDK so the first thing we need to do is import it.

```ts
import "./microsoft.cognitiveservices.speech.sdk.bundle";
declare const SpeechSDK: any;
```

Next, we're going to define some `TypeScript Types` that represent two things

1. The token that is returned from the issueToken API
2. The [call signature](https://www.typescriptlang.org/docs/handbook/2/functions.html#call-signatures) `OnTextRecorded` which gives a typing to the callback we want to invoke when a voice sample is recognised.

```ts
export type AzureToken = { authorizationToken: string; region: string; }
export type OnTextRecognised = (text: string) => void;
```

Now we defined our `AzureCognitiveSpeech` class, and configure two [private class fields](https://www.typescriptlang.org/docs/handbook/classes.html#understanding-typescripts-private) to store our `issueToken` API path, and any configure callback.

```ts
export class AzureCognitiveSpeech {

    private _tokenAuthApiPath: string;
    private _callback: OnTextRecognised;

    constructor(tokenAuthApiPath: string = "/api/createAzureTokenRequest") {
        this._tokenAuthApiPath = tokenAuthApiPath;
        this._callback = (s) => { };
    }
```

onTextRecognised is a function that accepts a callback function, that we save in our class to invoke when new transcriptions are available.

```ts
    public onTextRecognised(callback: OnTextRecognised) {
        this._callback = callback;
    }
```

Next we defining `streamSpeechFromBrowser` which is responsible for using the Azure Cognitive Services SDK to record audio.

It starts of by calling `this,.getConfig()` which uses the browsers [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to call `createAzureTokenRequest` for an API key.

It configures the `SpeechSDK` to record from the users default microphone.
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

The `recognized` callback in this class unpacks the raw text from the ACS response, and calls our own callback with just that text string.

Below, is the implementation of `getConfig` as it unpacks our API key and creates a valid `SpeechSDK` configuration.

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

This wrapper class makes calling Azure Cognitive Services easier to use in our application code.

# Sending text to our LED Matrix using Ably and our Transports

When we created our `RemoteMatrixLedDriver` we provided it with this configuration

```ts
// Create the Ably client and wrap it in our `AblyTransport` wrapper
const ablyClient = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });
const transport = new AblyTransport(ablyClient);

// Configured RemoteMatrixLedDriver below...
const transports = [ transport, mqtt_connection.instance ];
const deviceAdapter = new ArduinoDeviceAdapter(transports);
const displayConfig = { width: 32, height: 8 };
const ledDriver = new RemoteMatrixLedDriver({ displayConfig, deviceAdapter });
```

The first two lines create an instance of the `Ably JavaScript SDK` and pass it to our `AblyTransport`.

Our `transport` is an abstraction over different communication providers that our `RemoteMatrixLedDriver` uses - the idea is that we could communicate, in theory, over Bluetooth, or over HTTP, but for this example we want to use the `MQTT` protocol because it's designed for IoT and low bandwidth devices.

To use MQTT, you're going to need an MQTT broker. You can set one up yourself if you like, but we're going to use Ably for this.

## Ably and MQTT

The cool thing about Ably supporting MQTT is that any messages we send in our browser or our Node.js process using the JavaScript SDK, are also sent out over the MQTT protocol automatically.

This means that we can use a lightweight MQTT library on our Feather Huzzah, and a simpler, more standard JavaScript / HTTP SDK in our browser.

MQTT is designed to be fast and responsive, so we can communicate between multiple devices and our clients with really low latency and low bandwidth requirements.

## The AblyTransport

AblyTransport is a wrapper around the Ably SDK that lets the matrix-driver use Ably as a transport.

It doesn't do very much at all - but is a good example of some very simple Ably interaction.

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

In our constructor, we're storing the Ably SDK, our channel ID (which is defaulted to "leds" everywhere) and then using that that SDK to `get` our Ably channel. This channel, which is stored in the private member variable `channel` is then later used to `publish` an Ably message whenever `send` is called on the transport.

We're setting the data property to be our pre-serialized `WireFormattedMessage` - the bytes serialized by our PixelProtocol serializer.

We need to wrap our Ably SDK in this transport because our matrix-driver expects a valid transport to contain a function called `send` with the signature

```ts
    send(payload: WireFormattedMessage): Promise<void>;
```

The `AblyTransport` acts as an [adapter](https://en.wikipedia.org/wiki/Adapter_pattern) - and lets our `matrix-driver` use Ably.

# A few notes on the simulator

We've skirted over the `ArduinoSimulator` in this guide for two reasons:

1. It's quite complicated and beyond the scope of this walk-through.
2. It's documented in our [`matrix-driver` repository here](https://github.com/snakemode/matrix-driver).

The incredibly abridged version, is that the `matrix-driver` package comes with some code that *simulates* Arduino hardware. What that means, is that we've ported a few of the Arduino libraries (like AdaFruit_NeoPixel) at the *API level only* to TypeScript, and are writing code that calls these "ported" APIs.

In the port, for example, we can write code that appears as though it uses the NeoPixel SDK function

```ts
    setPixelColor(pixelNumber: number, r: number, g: number, b: number);
```

but what we're actually doing, is finding a `div` on our HTML page and setting its background colour - instead of sending data to an actual LED strip.

The `Program` class that the `matrix-driver` exports is a `TypeScript` line-by-line transliteration (a line-by-line software port where the minimum amount of code possible is changed for the source to compile in another language) of the Arduino code written in `C` to run on actual hardware devices.

Please don't mistake this for an `Arduino emulator` - all it really is is a class that runs our Arduino codes `setup` and `loop` functions repeatedly, to mimic what happens on real hardware. It's not an emulator, and its likely not timing-accurate - but it's enough to help us debug and work on the code.

# Running on real hardware

The webapp as described, publishing messages over MQTT via Ably, is all the web software you need to make this project work.
Once these messages have been published, any devices listening for messages over MQTT will be able to receive and process the them.

In the [matrix-driver repository](https://github.com/snakemode/matrix-driver) there are detailed instructions for how to build and deploy the Arduino sketch we've prepared, which is all the code required to receive the messages, unpack the serialized binary messages, and power actual LED displays.

[You can find these instructions here](https://github.com/snakemode/matrix-driver#arduino-hardware).

To make this work in the real world, you'll need some hardware, here is the hardware that was used to develop this application:

- AdaFruit Feather Huzzah / ESP8266 - [AdaFruit](https://www.adafruit.com/category/943), [Amazon](https://www.amazon.co.uk/Feather-HUZZAH-with-ESP8266-WiFi/dp/B019MGW6N6/ref=sr_1_3)
- WS2812B Led Strip Panel Kit 8x32 256 pixels - [Amazon](https://www.amazon.co.uk/gp/product/B07KT1H481/)
- Dupont Wire for connecting the Leds and board - [Amazon](https://www.amazon.co.uk/gp/product/B01EV70C78/)
- A Micro-USB cable

If you just want to play, your life will be much easier if you buy a board with pre-soldered stacking headers.

You'll need to clone the `matrix-driver` repository, and follow the instructions to install the `Arduino IDE`, build, and deploy the code provided.

There's some configuration you'll need to do in that process that's explained in the repository to configure your *wifi details* and *MQTT credentials*.

With your wifi details provided, and your Ably API key used as MQTT credentials, running the provided Arduino code on physical hardware will work out of the box. The code was written to run on an ESP8266, but should also be compatible with ESP32 boards, and generic Arduino devices, though your milage may vary!

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

---



### TODO

- ✔ add controls to web app for text scrolling speed
- ✔ add controls to web app for colour
- ✔ add 'sharable' url creator button
- ✔ publish text from ACS to shared url via Ably
- make it a PWA
- ✔ port to C
