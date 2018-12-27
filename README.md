node-beacon-scanner
===============

The node-beacon-scanner is a Node.js module which allows you to scan BLE beacon packets and parse the packet data. This module supports iBeacon, Eddystone, and Estimote.

The supported beacon data formats are as follows:

* iBeacon
* Eddystone-UID
* Eddystone-URL
* Eddystone-TLM (Unencrypted)
* Eddystone-EID
* Estimote-Telemetry
* Estimote-Nearable

## Dependencies

* [Node.js](https://nodejs.org/en/) 6 +
* [noble](https://github.com/sandeepmistry/noble)

See the document of the [noble](https://github.com/sandeepmistry/noble) for details on installing the [noble](https://github.com/sandeepmistry/noble).

Note that the noble has to be run as root on most of Linux environments. Though the default user of Raspbian `pi` can run the noble on Raspbian, normal users can not access the BLE using the noble generally. See the document of the [noble](https://github.com/sandeepmistry/noble) for details.

## Installation

```
$ cd ~
$ npm install noble
$ npm install node-beacon-scanner
```

---------------------------------------
## Table of Contents

* [Quick Start](#Quick-Start)
* [`BeaconScanner` object](#BeaconScanner-object)
  * [scartScan() method](#BeaconScanner-startScan-method)
  * [stopScan() method](#BeaconScanner-stopScan-method)
  * [`onadvertisement` event handler](#BeaconScanner-onadvertisement-event-handler)
* [`BeaconScannerAdvertisement` object](#BeaconScannerAdvertisement-object)
* [Release Note](#Release-Note)
* [References](#References)
* [License](#License)

---------------------------------------
## <a id="Quick-Start">Quick Start</a>

This sample code shows how to start scanning and how to get parsed packets.

```JavaScript
const BeaconScanner = require('node-beacon-scanner');
const scanner = new BeaconScanner();

// Set an Event handler for becons
scanner.onadvertisement = (ad) => {
  console.log(JSON.stringify(ad, null, '  '));
};

// Start scanning
scanner.startScan().then(() => {
  console.log('Started to scan.')  ;
}).catch((error) => {
  console.error(error);
});
```

The sample code above will output the result as follows:

```
Started to scan.
{
  "id": "c7dfbfd9f64a",
  "address": "c7:df:bf:d9:f6:4a",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "iBeacon",
  "iBeacon": {
    "uuid": "B9407F30-F5F8-466E-AFF9-25556B57FE6D",
    "major": 21983,
    "minor": 57807,
    "txPower": 180
  }
}
...
```

### <a id="surviving-restart">Surviving Bluetooth service restart</a>

This sample code shows how to start scanning in a manner which will work even after the Bluetooth service restarts.

```JavaScript
const BeaconScanner = require('node-beacon-scanner');
const noble = require('noble');
const scanner = new BeaconScanner({'noble': noble});

// Set an Event handler for the Bluetooth service
noble.on('stateChange', (state) => {
  if (state === "poweredOff") {
    scanner.stopScan()
  } else if (state === "poweredOn") {
    scanner.startScan()
  }
});

// Set an Event handler for becons
scanner.onadvertisement = (ad) => {
  console.log(JSON.stringify(ad, null, '  '));
};

// Start scanning
scanner.startScan().then(() => {
  console.log('Started to scan.')  ;
}).catch((error) => {
  console.error(error);
});
```

---------------------------------------
## <a id="BeaconScanner-object">`BeaconScanner` object</a>

In order to use the node-beacon-scanner, you have to load the node-beacon-scanner module as follows:

```JavaScript
const BeaconScanner = require('node-beacon-scanner');
```

You can get an `BeaconScanner` constructor from the code above. Then you have to create an `BeaconScanner` object from the `BeaconScanner` constructor as follows:

```JavaScript
const scanner = new BeaconScanner();
```

The `BeaconScanner` constructor takes an argument optionally. It must be a hash object containing the properties as follows:

Property | Type   | Required | Description
:--------|:-------|:---------|:-----------
`noble`  | Noble  | option   | a Noble object of the [`noble`](https://www.npmjs.com/package/noble) module

The node-beacon-scanner module uses the [`noble`](https://www.npmjs.com/package/noble) module in order to scan the beacons coming from the BLE beacon device(s). If you want to interact other BLE devices using the noble module, you can create an `Noble` object by yourself, then pass it to this module. If you don't specify a `Noble` object to the `noble` property, this module automatically create a `Noble` object internally.

The sample code below shows how to pass a `Nobel` object to the `Linking` constructor.

```JavaScript
// Create a Noble object
const noble = require('noble');

// Create a Linking object
const BeaconScanner = require('node-beacon-scanner');
const scanner = new BeaconScanner({'noble': noble});
```

In the code snippet above, the variable `scanner` is a `BeaconScanner` object. The `BeaconScanner` object has methods as described in sections below.

### <a id="BeaconScanner-startScan-method">scartScan() method</a>

The `startScan()` method starts to scan advertising packets from BLE beacon devices. This method returns a `Promise` object.

Whenever a packet is received, the callback function set to the [`onadvertisement`](#BeaconScanner-onadvertisement-event-handler) property of the `BeaconScanner` object will be called. When a packet is received, an [`BeaconScannerAdvertisement`](#BeaconScannerAdvertisement-object) object will be passed to the callback function.

```JavaScript
// Set an Event handler for becons
scanner.onadvertisement = (ad) => {
  console.log(JSON.stringify(ad, null, '  '));
};

// Start scanning
scanner.startScan().then(() => {
  console.log('Started to scan.')  ;
}).catch((error) => {
  console.error(error);
});
```

### <a id="BeaconScanner-stopScan-method">stopScan() method</a>

The `stopScan()` method stops to scan advertising packets from BLE beacon devices. See the section "[`startScan()` method](#BeaconScanner-startScan-method)" for details.

### <a id="BeaconScanner-onadvertisement-event-handler">`onadvertisement` event handler</a>

If a callback function is set to the `onadvertisement` property, the callback function will be called whenever an advertising packet is received from a BLE beacon device during the scan is active (from the moment when the `startScan()` method is called, to the moment when the `stopScan()` method is called).

See the section "[`startScan()` method](#BeaconScanner-startScan-method)" for details.

---------------------------------------
## <a id="BeaconScannerAdvertisement-object">`BeaconScannerAdvertisement` object</a>

The `BeaconScannerAdvertisement` object represents an advertising data coming from the BLE beacon device. This object is just a hash object containing properties as follows. Note that the structure varies depending on the format of the beacon. You can know the format of the beacon from the value of the `beaconType` property.

### iBeacon

```JavaScript
{
  "id": "c7dfbfd9f64a",
  "address": "c7:df:bf:d9:f6:4a",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "iBeacon",
  "iBeacon": {
    "uuid": "B9407F30-F5F8-466E-AFF9-25556B57FE6D",
    "major": 21983,
    "minor": 57807,
    "txPower": 180
  }
}
```

The value of the `iBeacon` property contains the properties as follows:

Property  |Type    |Description
:---------|:-------|:----------
`uuid`    | String | Proximity UUID
`major`   | Number | Major
`minor`   | Number | Minor
`txPower` | Number | Measured Power (dBm)

### Eddystone-UID

```JavaScript
{
  "id": "c6debed8f549",
  "address": "c6:de:be:d8:f5:49",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "eddystoneUid",
  "eddystoneUid": {
    "txPower": -35,
    "namespece": "EDD1EBEAC04E5DEFA017",
    "instance": "2D3EA3203B6B"
  }
}
```

The value of the `eddystoneUid` property contains the properties as follows:

Property     |Type    |Description
:------------|:-------|:----------
`namespece`  | String | Namespace ID
`instance`   | String | Instance ID
`txPower`    | Number | Calibrated Tx power (dBm)


### Eddystone-URL

```JavaScript
{
  "id": "c6debed8f549",
  "address": "c6:de:be:d8:f5:49",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "eddystoneUrl",
  "eddystoneUrl": {
    "txPower": -35,
    "url": "http://go.esti.be/"
  }
}
```

The value of the `eddystoneUrl` property contains the properties as follows:

Property  |Type    |Description
:---------|:-------|:----------
`url`     | String | Decoded URL
`txPower` | Number | Calibrated Tx power (dBm)

### Eddystone-TLM (Unencrypted)

```JavaScript
{
  "id": "c6debed8f549",
  "address": "c6:de:be:d8:f5:49",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "eddystoneTlm",
  "eddystoneTlm": {
    "batteryVoltage": 6059,
    "temperature": 28.59765625,
    "advCnt": 83,
    "secCnt": 361299
  }
}
```

The value of the `eddystoneTlm` property contains the properties as follows:

Property         |Type    |Description
:----------------|:-------|:----------
`batteryVoltage` | Number | Battery voltage (mV)
`temperature`    | Number | Beacon temperature (°C)
`advCnt`         | Number | Advertising PDU count
`secCnt`         | Number | Time since power-on or reboot

### Eddystone-EID

```JavaScript
{
  "id": "d9d9fe86fb61",
  "address": "d9:d9:fe:86:fb:61",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "eddystoneEid",
  "eddystoneEid": {
    "txPower": -35,
    "eid": "79c58b83f198ddbe"
  }
}
```

The value of the `eddystoneEid` property contains the properties as follows:

Property  |Type    |Description
:---------|:-------|:----------
`eid`     | String | Ephemeral Identifier
`txPower` | Number | Calibrated Tx power (dBm)

### Estimote-Telemetry

There are two types in the Estimote Telemetry beacon data: `Type A` and `Type B`. The types can be obtained checking the value of the `subFrameType` property. If the type is `A`, the value is `0`. If the type is `B`, the value is `1`.

*Type A*

```JavaScript
{
  "id": "c9e1c1dbf84c",
  "address": "c9:e1:c1:db:f8:4c",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "estimoteTelemetry",
  "estimoteTelemetry": {
    "frameType": 2,
    "subFrameType": 0,
    "protocolVersion": 2,
    "shortIdentifier": "2d3ea3203b6b2446",
    "acceleration": {
      "x": -0.015748031496062992,
      "y": -0.07874015748031496,
      "z": 0.9921259842519685
    },
    "moving": false,
    "gpio": {
      "pin0": "low",
      "pin1": "low",
      "pin2": "high",
      "pin3": "high"
    },
    "errors": {
      "firmware": false,
      "clock": false
    },
    "pressure": 100304.9765625
  }
}
```

*Type B*

```JavaScript
{
  "id": "c9e1c1dbf84c",
  "address": "c9:e1:c1:db:f8:4c",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "estimoteTelemetry",
  "estimoteTelemetry": {
    "frameType": 2,
    "subFrameType": 1,
    "protocolVersion": 2,
    "shortIdentifier": "2d3ea3203b6b2446",
    "magneticField": {
      "x": 0,
      "y": 0,
      "z": 0
    },
    "light": 80.64,
    "uptime": {
      "unitCode": 1,
      "unitDesc": "minutes",
      "value": 596
    },
    "temperature": 28.75,
    "batteryVoltage": 6059,
    "batteryLevel": 95
  }
}
```



### Estimote-Nearable

```JavaScript
{
  "id": "f8d3c05e8001",
  "address": "f8:d3:c0:5e:80:01",
  "localName": null,
  "txPowerLevel": null,
  "rssi": -59,
  "beaconType": "estimoteNearable",
  "estimoteNearable": {
    "nearableId": "bd20de5cd074de8d",
    "temperature": 25.75,
    "moving": false,
    "acceleration": {
      "x": -15.625,
      "y": -78.125,
      "z": -1031.25
    }
  }
}
```

The value of the `estimoteNearable` property contains the properties as follows:

Property       |     |Type     |Description
:--------------|:----|:--------|:----------
`nearableId`   |     | String  | Nearable identifier
`temperature`  |     | Number  | Temperature (°C)
`moving`       |     | Boolean | Moving state (true: moving)
`acceleration` |     | Object  | Acceleration
--             | `x` | Number  | Acceleration on the X axis (milli G)
--             | `y` | Number  | Acceleration on the Y axis (milli G)
--             | `z` | Number  | Acceleration on the Z axis (milli G)

---------------------------------------
## <a id="Release-Note">Release Note</a>

* v0.1.1 (2018-12-27)
  * Fixed the bug that Eddystone beacons were not discovered if iBeacons were present as well. ([Thanks to @Tiggu](https://github.com/futomi/node-beacon-scanner/pull/8))
* v0.1.0 (2018-07-14)
  * Supported the Eddystone-UID of [Kontakt](https://kontakt.io/). The [spec of the Eddystone-UID](https://github.com/google/eddystone/tree/master/eddystone-uid) defines that the packet size is 20 bytes (the last 2 bytes are RFU). But the size of the packet form Kontakt device is 18 bytes. ([Thanks to @EwaRvr](https://github.com/futomi/node-beacon-scanner/issues/3))
* v0.0.3 (2018-06-24)
  * Fixed a bug that an exception was thrown when an unknown packet came.
* v0.0.2 (2017-09-15)
  * Fixed a bug that an exception was thrown when an unknown packet came.
* v0.0.1 (2017-09-06)
  * First public release

---------------------------------------
## <a id="References">References</a>

* [Eddystone Protocol Specification](https://github.com/google/eddystone/blob/master/protocol-specification.md)
  * [Eddystone-UID](https://github.com/google/eddystone/tree/master/eddystone-uid)
  * [Eddystone-URL](https://github.com/google/eddystone/tree/master/eddystone-url)
  * [Eddystone-TLM](https://github.com/google/eddystone/tree/master/eddystone-tlm)
  * [Eddystone-EID](https://github.com/google/eddystone/tree/master/eddystone-eid)
* [iBeacon - Apple Developer](https://developer.apple.com/ibeacon/)
* [Estimote packet specs](https://github.com/estimote/estimote-specs)

---------------------------------------
## <a id="License">License</a>

The MIT License (MIT)

Copyright (c) 2017-2018 Futomi Hatano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
