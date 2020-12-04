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

const colorPicker = document.getElementById("color") as HTMLInputElement;
const speedSlider = document.getElementById("speed") as HTMLInputElement;
const textPreview = document.getElementById("response");
const submitButton = document.getElementById("button");

ArduinoSimulator.runWithDisplay(new Program(), "lightGrid", {
  width: 32,
  height: 8,
  indexFrom: IndexMode.TopLeft,
  carriageReturnMode: CarriageReturnMode.Snaked
});

const ablyClient = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });

const ledDriver = new RemoteMatrixLedDriver({
  displayConfig: { width: 32, height: 8 },
  deviceAdapter: new ArduinoDeviceAdapter([
    new AblyTransport(ablyClient),
    mqtt_connection.instance
  ])
});

const speech = new AzureCognitiveSpeech("/api/createAzureTokenRequest");

speech.onTextRecognised((text) => {
  const colorValue = colorPicker.value ?? "#ffffff";
  const speedValue = parseInt(speedSlider.value) * -1 ?? 25;

  textPreview.innerHTML += " " + text;
  ledDriver.text.scroll(text, colorValue, speedValue);
});


submitButton.addEventListener("click", () => speech.streamSpeechFromBrowser());