/* ------------------------------------------------------------------
* node-beacon-scanner - scanner.js
*
* Copyright (c) 2017-2019, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2019-10-25
* ---------------------------------------------------------------- */
'use strict';
const mBeaconParser = require('./parser.js');

/* ------------------------------------------------------------------
* Constructor: BeaconScanner(params)
* - params:
*     noble  : The Nobel object created by the noble module.
*              This parameter is optional. If you don't specify
*              this parameter, this module automatically creates it.
* ---------------------------------------------------------------- */
const BeaconScanner = function (params) {
	// Plublic properties
	this.noble = null;
	if (params && 'noble' in params) {
		if (typeof (params['noble']) === 'object') {
			this.noble = params['noble'];
		} else {
			throw new Error('The value of the "noble" property is invalid.');
		}
	} else {
		try {
			this.noble = require('@abandonware/noble');
		} catch (e) {
			this.noble = require('noble');
		}
	}
	this.onadvertisement = null;

	// Private properties
	this._initialized = false;
	this._is_scanning = false;
};

/* ------------------------------------------------------------------
* Method: stopScan()
* ---------------------------------------------------------------- */
BeaconScanner.prototype.stopScan = function () {
	this.noble.removeAllListeners('discover');
	if (this._is_scanning === true) {
		this.noble.stopScanning();
		this._is_scanning = false;
	}
};

/* ------------------------------------------------------------------
* Method: startScan()
* ---------------------------------------------------------------- */
BeaconScanner.prototype.startScan = function () {
	let promise = new Promise((resolve, reject) => {
		this._init().then(() => {
			this._prepareScan();
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

BeaconScanner.prototype._prepareScan = function () {
	let promise = new Promise((resolve, reject) => {
		this.noble.startScanning([], true, (error) => {
			if (error) {
				reject(error);
			} else {
				this.noble.on('discover', (peripheral) => {
					if (this.onadvertisement && typeof (this.onadvertisement) === 'function') {
						let parsed = this.parse(peripheral);
						if (parsed) {
							this.onadvertisement(parsed);
						}
					}
				});
				this._is_scanning = true;
				resolve();
			}
		});
	});
	return promise;
};

BeaconScanner.prototype._init = function () {
	let promise = new Promise((resolve, reject) => {
		this._initialized = false;
		if (this.noble.state === 'poweredOn') {
			this._initialized = true;
			resolve();
		} else {
			this.noble.once('stateChange', (state) => {
				if (state === 'poweredOn') {
					this._initialized = true;
					resolve();
				} else {
					let err = new Error('Failed to initialize the Noble object: ' + state);
					reject(err);
				}
			});
		}
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: parse(peripheral)
* - buf: `Peripheral` object of the noble)
* ---------------------------------------------------------------- */
BeaconScanner.prototype.parse = function (peripheral) {
	return mBeaconParser.parse(peripheral);
};

module.exports = BeaconScanner;
