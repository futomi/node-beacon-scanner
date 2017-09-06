/* ------------------------------------------------------------------
* node-beacon-scanner - parser-estimote.js
*
* Copyright (c) 2017, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2017-09-06
* ---------------------------------------------------------------- */
'use strict';

/* ------------------------------------------------------------------
* Constructor: BeaconParserEstimote()
* ---------------------------------------------------------------- */
const BeaconParserEstimote = function() {
	// Private properties
	this._ESTIMOTE_TELEMETRY_SERVICE_UUID = 'fe9a';
	this._ESTIMOTE_COMPANY_ID = 0x015d;
};

/* ------------------------------------------------------------------
* Method: parseTelemetry(peripheral)
* - peripheral: `Peripheral` object of the noble
* ---------------------------------------------------------------- */
BeaconParserEstimote.prototype.parseTelemetry = function(peripheral) {
	let ad = peripheral.advertisement;
	let manu = ad.manufacturerData;
	let telemetry_service = ad.serviceData.find((el) => {
		return el.uuid === this._ESTIMOTE_TELEMETRY_SERVICE_UUID;
	});
	if(!telemetry_service) {
		return null;
	}
	let data = telemetry_service.data;
	if(!data) {
		return null;
	}

	/*
	https://github.com/Estimote/estimote-specs/blob/master/estimote-telemetry.js

	  |  7  |  6  |  5  |  4  |  3  |  2  |  1  |  0  |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	 0| Protocol Version      | Frame Type (0b0010)   |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	 1|                                               |
	--+                                               |
	 2|                                               |
	--+                                               |
	 3|                                               |
	--+                                               |
	 4|                                               |
	--+ First half of identifier of beacon            |
	 5|                                               |
	--+                                               |
	 6|                                               |
	--+                                               |
	 7|                                               |
	--+                                               |
	 8|                                               |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	 9|                                   | Sub type  |
	--+-----+-----+-----+-----+-----+-----+-----+-----+

	###################################################
	- Sub Type A (0b00)

	--+-----+-----+-----+-----+-----+-----+-----+-----+
	10| Acceleration X axis                           |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	11| Acceleration Y axis                           |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	12| Acceleration Z axis                           |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	13| Previous Motion State Duration                |
	  | UNIT      | NUMBER                            |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	14| Current Motion State Duration                 |
	  | UNIT      | NUMBER                            |
	--+-----+-----+-----+-----+-----+-----+-----+-----+

	- Protocol Version 2
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	15| GPIO                  | Errors    | Moving    |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	16|                                               |
	--+                                               |
	17|                                               |
	--+ Atmospheric Pressure                          |
	18|                                               |
	--+                                               |
	19|                                               |
	--+-----+-----+-----+-----+-----+-----+-----+-----+

	- Protocol Version 1 
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	15| GPIO                  |           | Moving    |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	16|                                   | Errors    |
	--+-----+-----+-----+-----+-----+-----+-----+-----+

	- Protocol Version 0 
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	15| GPIO                  |           | Moving    |
	--+-----+-----+-----+-----+-----+-----+-----+-----+

	###################################################
	- Sub Type B (0b01)

	--+-----+-----+-----+-----+-----+-----+-----+-----+
	10| Normalized Magnetic Field X axis              |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	11| Normalized Magnetic Field Y axis              |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	12| Normalized Magnetic Field Z axis              |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	13| Ambient light level                           |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	14| Beacon Uptime                                 |
	--+-----+-----+-----+-----+                       +
	15|           | BU Unit   |                       |
	--+           +-----+-----+-----+-----+-----+-----+
	16|  Ambient Temperature                          |
	--+-----+-----+-----+-----+-----+-----+           +
	17|                                   |           |
	--+                                   +-----+-----+
	18| Battery Voltage                               |
	--+-----+-----+-----+-----+-----+-----+-----+-----+

	- Protocol Version 1/2
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	19| Battery Level                                 |
	--+-----+-----+-----+-----+-----+-----+-----+-----+

	- Protocol Version 0
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	19|                                   | Errors    |
	--+-----+-----+-----+-----+-----+-----+-----+-----+

	*/

	// Frame Type
	let frame_type = data.readUInt8(0) & 0b00001111;
	if(frame_type !== 0b0010) {
		return null;
	}
	// Protocol Version
	let protocol_version = (data.readUInt8(0) & 0b11110000) >> 4;
	if(protocol_version > 2) {
		return null;
	}
	// First half of identifier of beacon
	let short_identifier = data.slice(1, 9).toString('hex');

	// Telemetry subframe type
	let sub_frame_type = data.readUInt8(9) & 0b00000011;
	let res = {
		frameType      : frame_type,
		subFrameType   : sub_frame_type,
		protocolVersion: protocol_version,
		shortIdentifier: short_identifier
	};

	if(sub_frame_type === 0) { // Type A
		// Acceleration
		res['acceleration'] = {
			x: data.readInt8(10) * 2 / 127.0,
			y: data.readInt8(11) * 2 / 127.0,
			z: data.readInt8(12) * 2 / 127.0
		};
		// Moving
		res['moving'] = (data.readUInt8(15) & 0b00000011) ? true : false;
		// GPIO
		res['gpio'] = {
			pin0: (data.readUInt8(15) & 0b00010000) >> 4 ? 'high' : 'low',
			pin1: (data.readUInt8(15) & 0b00100000) >> 5 ? 'high' : 'low',
			pin2: (data.readUInt8(15) & 0b01000000) >> 6 ? 'high' : 'low',
			pin3: (data.readUInt8(15) & 0b10000000) >> 7 ? 'high' : 'low'
		};
		//
		if(protocol_version === 2) {
			res['errors'] = {
				firmware: (data.readUInt8(15) & 0b00000100) ? true : false,
				clock   : (data.readUInt8(15) & 0b00001000) ? true : false
			};
			res['pressure'] = data.readUInt32LE(16) / 256.0;
		} else if(protocol_version === 1) {
			res['errors'] = {
				firmware: (data.readUInt8(16) & 0b00000001) ? true : false,
				clock   : (data.readUInt8(16) & 0b00000010) ? true : false
			};
		}
	} else if(sub_frame_type === 1) { // Type B
		// Normalized Magnetic Field
		res['magneticField'] = {
			x: data.readInt8(10) * 2 / 128.0,
			y: data.readInt8(11) * 2 / 128.0,
			z: data.readInt8(12) * 2 / 128.0
		};
		// Ambient light level
		let ambient_light_upper = (data.readUInt8(13) & 0b11110000) >> 4;
		let ambient_light_lower = data.readUInt8(13) & 0b00001111;
		res['light'] = Math.pow(2, ambient_light_upper) * ambient_light_lower * 0.72;	
		// Beacon Uptime
		let uptime_unit_code = (data.readUInt8(15) & 0b00110000) >> 4;
		let uptime_unit = '';
		if(uptime_unit_code === 0) {
			uptime_unit = 'seconds';
		} else if(uptime_unit_code === 1) {
			uptime_unit = 'minutes';
		} else if(uptime_unit_code === 2) {
			uptime_unit = 'hours';
		} else if(uptime_unit_code === 3) {
			uptime_unit = 'days';
		}
		let uptime = ((data.readUInt8(15) & 0b00001111) << 8) | data.readUInt8(14);
		res['uptime'] = {
			unitCode: uptime_unit_code,
			unitDesc: uptime_unit,
			value   : uptime
		}
		// Ambient Temperature
		let temperature =
			((data.readUInt8(17) & 0b00000011) << 10) |
			( data.readUInt8(16)               <<  2) |
			((data.readUInt8(15) & 0b11000000) >>  6);
		if(temperature > 2047) {
			temperature = temperature - 4096;
		}
		res['temperature'] = temperature / 16.0;
		// Battery Voltage
		let battery_voltage =
			( data.readUInt8(18)               << 6) |
			((data.readUInt8(17) & 0b11111100) >> 2);
		if(battery_voltage == 0b11111111111111) {
			battery_voltage = null;
		}
		res['batteryVoltage'] = battery_voltage;
		//
		if(protocol_version == 0) {
			// Error Codes
			res['errors'] = {
				firmware: (data.readUInt8(19) & 0b00000001) ? true : false,
				clock   : (data.readUInt8(19) & 0b00000010) ? true : false
			};
		} else if(protocol_version >= 1) {
			let battery_level = data.readUInt8(19);
			if(battery_level === 0b11111111) {
				battery_level = null;
			}
			res['batteryLevel'] = battery_level;
		}
	}
	return res;
};

/* ------------------------------------------------------------------
* Method: parseNearable(peripheral)
* - peripheral: `Peripheral` object of the noble
* ---------------------------------------------------------------- */
BeaconParserEstimote.prototype.parseNearable = function(peripheral) {
	let ad = peripheral.advertisement;
	let manu = ad.manufacturerData;
	/*
	https://github.com/Estimote/estimote-specs/blob/master/estimote-nearable.js

	  |  7  |  6  |  5  |  4  |  3  |  2  |  1  |  0  |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	 0|                                               |
	--+ Company ID : 0x015d (\x5D01)                  |
	 1|                                               |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	 2| Frame Type Version : 0x01                     |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	 3|                                               |
	--+                                               |
	 4|                                               |
	--+                                               |
	 5|                                               |
	--+                                               |
	 6|                                               |
	--+ Nearable Identifier (8 bytes)                 |
	 7|                                               |
	--+                                               |
	 8|                                               |
	--+                                               |
	 9|                                               |
	--+                                               |
	10|                                               |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	11|                                               |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	12|                                               |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	13|                                               |
	--+ Temperature           +-----+-----+-----+-----+
	14|                       |                       |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	15|     |  *  | (*) Whether moving or not         |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	16| Acceleration X axis                           |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	17| Acceleration Y axis                           |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	18| Acceleration Z axis                           |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	19| Current Motion State Duration                 |
	  | UNIT      | NUMBER                            |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	20| Previous Motion State Duration                |
	  | UNIT      | NUMBER                            |
	--+-----+-----+-----+-----+-----+-----+-----+-----+
	*/

	// Frame Type Version
	let frame_type = manu.readUInt8(2);
	if(frame_type !== 0x01) {
		return null;
	}
	// Nearable Identifier
	let nearable_id = manu.slice(3, 11).toString('hex');
	// Temperature
	let temperature = manu.readUInt16LE(13) & 0x0fff;
	if(temperature > 2047) {
		temperature = temperature - 4096
	}
	temperature = temperature / 16.0;
	// Moving
	let is_moving = (manu.readUInt8(15) & 0b01000000) ? true : false;
	// Acceleration
	let acc_x = manu.readInt8(16) * 15.625;
	let acc_y = manu.readInt8(17) * 15.625;
	let acc_z = manu.readInt8(18) * 15.625;

	let res = {
		nearableId   : nearable_id,
		temperature  : temperature,
		moving       : is_moving,
		acceleration : {
			x: acc_x,
			y: acc_y,
			z: acc_z
		}
	};
	return res;
};

module.exports = new BeaconParserEstimote();
