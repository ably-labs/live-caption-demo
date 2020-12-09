import Ably from "ably";

const placeholder = document.getElementById("response");

const ably = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });
const channel = ably.channels.get("leds");

channel.subscribe("StreamedText", message => {
    const intBuffer = new Uint8Array(message.data);
    const bytes = [...intBuffer];
    const textBytes = bytes.slice(8, bytes.length - 2);

    let text = "";
    for (let charCode of textBytes) {
        text += String.fromCharCode(charCode);
    }

    placeholder.innerHTML += " " + text;
    placeholder.scrollTop = placeholder.scrollHeight;
});