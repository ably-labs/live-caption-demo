const wifi = require("Wifi");

//const ssid = "ilikepie";
//const password = "Goldfish54!";

const ssid = "davidw";
const password = "stephens";

wifi.on('disconnected', () => {
    console.log('WIFI disconnected');
    setTimeout(() => { connect(); }, 2_000);
});

wifi.on('connected', () => {
    console.log('WIFI connected');
});

export function connect(): Promise<string> {
    console.log("Connecting to wifi");

    return new Promise((resolve, reject) => {

        wifi.connect(ssid, { password: password }, function (err: any) {
            if (err) {
                reject("Connection error: " + err);
                return;
            }

            console.log("Connected!");
            resolve("connected");
        });
    });
}