/* ------------------------------------------------------------------
* node-beacon-scanner - parser-eddystone.js
*
* Copyright (c) 2017-2018, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2018-07-14
* ---------------------------------------------------------------- */
'use strict';

/* ------------------------------------------------------------------
* Constructor: BeaconParserEddystone()
* ---------------------------------------------------------------- */
const BeaconParserEddystone = function() {
	// Private properties
	this._EDDYSTONE_SERVICE_UUID = 'feaa';
	this._EDDYSTONE_URL_SCHEME_PREFIXES = {
		'00': 'http://www.',
		'01': 'https://www.',
		'02': 'http://',
		'03': 'https://'
	};
	this._EDDYSTONE_URL_ENCODINGS = {
		'00': '.com/',
		'01': '.org/',
		'02': '.edu/',
		'03': '.net/',
		'04': '.info/',
		'05': '.biz/',
		'06': '.gov/',
		'07': '.com',
		'08': '.org',
		'09': '.edu',
		'0a': '.net',
		'0b': '.info',
		'0c': '.biz',
		'0d': '.gov'
	};
};

/* ------------------------------------------------------------------
* Method: parse(peripheral)
* - peripheral: `Peripheral` object of the noble
* ---------------------------------------------------------------- */
BeaconParserEddystone.prototype.parse = function(peripheral) {
	let ad = peripheral.advertisement;
	let manu = ad.manufacturerData;
	let eddystone_service = ad.serviceData.find((el) => {
		return el.uuid === this._EDDYSTONE_SERVICE_UUID;
	});
	if(!eddystone_service) {
		return null;
	}
	let data = eddystone_service.data;
	if(!data) {
		return null;
	}

	// https://github.com/google/eddystone/blob/master/protocol-specification.md
	let frame_type = data.readUInt8(0) >>> 4;
	if(frame_type === 0b0000) {
		return this.parseUid(peripheral);
	} else if(frame_type === 0b0001) {
		return this.parseUrl(peripheral);
	} else if(frame_type === 0b0010) {
		return this.parseTlm(peripheral);
	} else if(frame_type === 0b0011) {
		return this.parseEid(peripheral);
	} else {
		return null;
	}
};

/* ------------------------------------------------------------------
* Method: parseUid(peripheral)
* - peripheral: `Peripheral` object of the noble
* ---------------------------------------------------------------- */
BeaconParserEddystone.prototype.parseUid = function(peripheral) {
	let data = this._getServiceData(peripheral);
	if(!data) {
		return null;
	}
	if(data.length !== 20 && data.length !== 18) {
		return null;
	}
	// Eddystone-UID
	// https://github.com/google/eddystone/tree/master/eddystone-uid
	return {
		txPower   : data.readInt8(1),
		namespece : data.slice(2, 12).toString('hex').toUpperCase(),
		instance  : data.slice(12, 18).toString('hex').toUpperCase()
	};
};

/* ------------------------------------------------------------------
* Method: parseUrl(peripheral)
* - peripheral: `Peripheral` object of the noble
* ---------------------------------------------------------------- */
BeaconParserEddystone.prototype.parseUrl = function(peripheral) {
	let data = this._getServiceData(peripheral);
	if(!data) {
		return null;
	}
	// Eddystone-URL
	// https://github.com/google/eddystone/tree/master/eddystone-url
	if(data.length < 4) {
		return null;
	}
	let url = this._EDDYSTONE_URL_SCHEME_PREFIXES[data.slice(2, 3).toString('hex')];
	if(!url) {
		return null;
	}
	let encoded_url_buf = data.slice(3);
	for(let i=0,len=encoded_url_buf.length; i<len; i++) {
		let b = encoded_url_buf.slice(i, i+1);
		let h = b.toString('hex');
		if(this._EDDYSTONE_URL_ENCODINGS[h]) {
			url += this._EDDYSTONE_URL_ENCODINGS[h];
		} else {
			url += b.toString();
		}
	}
	return {
		txPower : data.readInt8(1),
		url     : url
	};
};

/* ------------------------------------------------------------------
* Method: parseTlm(peripheral)
* - peripheral: `Peripheral` object of the noble
* ---------------------------------------------------------------- */
BeaconParserEddystone.prototype.parseTlm = function(peripheral) {
	let data = this._getServiceData(peripheral);
	if(!data) {
		return null;
	}
	// Eddystone-TLM
	// https://github.com/google/eddystone/blob/master/eddystone-tlm/tlm-plain.md
	if(data.length !== 14) {
		return null;
	}
	let version = data.readUInt8(1);
	if(version !== 0x00) {
		return null;
	}
	return {
		batteryVoltage : data.readUInt16BE(2),
		temperature    : data.readInt16BE(4) / 256,
		advCnt         : data.readUInt32BE(6),
		secCnt         : data.readUInt32BE(10)
	};
};

/* ------------------------------------------------------------------
* Method: parseEid(peripheral)
* - peripheral: `Peripheral` object of the noble
* ---------------------------------------------------------------- */
BeaconParserEddystone.prototype.parseEid = function(peripheral) {
	let data = this._getServiceData(peripheral);
	if(!data) {
		return null;
	}
	if(data.length !== 10) {
		return null;
	}
	// Eddystone-EID
	// https://github.com/google/eddystone/tree/master/eddystone-eid
	return {
		txPower: data.readInt8(1),
		eid    : data.slice(2, 10).toString('hex')
	};
};

BeaconParserEddystone.prototype._getServiceData = function(peripheral) {
	let ad = peripheral.advertisement;
	let eddystone_service = ad.serviceData.find((el) => {
		return el.uuid === this._EDDYSTONE_SERVICE_UUID;
	});
	if(!eddystone_service) {
		return null;
	}
	let data = eddystone_service.data || null;
	return data;
};

module.exports = new BeaconParserEddystone();
