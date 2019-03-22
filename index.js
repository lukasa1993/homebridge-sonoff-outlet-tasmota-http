var Service,
    Characteristic;
var request = require('request');

module.exports = function (homebridge) {
  Service        = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-sonoff-tasmota-http', 'SonoffTasmotaHTTP', SonoffTasmotaHTTPAccessory);
};

function SonoffTasmotaHTTPAccessory(log, config) {
  this.log      = log;
  this.config   = config;
  this.name     = this.config['name'];
  this.relay    = this.config['relay'] || '';
  this.hostname = this.config['hostname'] || 'sonoff';
  this.user     = this.config['user'] || 'admin';
  this.pass     = this.config['pass'] || '';
  this.auth_url = '?user=' + this.user + '&password=' + this.pass;
  this.service  = new Service.Outlet(this.name);

  this.service
      .getCharacteristic(Characteristic.On)
      .on('get', this.getState.bind(this))
      .on('set', this.setState.bind(this));

  this.service
      .getCharacteristic(Characteristic.OutletInUse)
      .on('get', this.getInUse.bind(this));

  this.log('Sonoff Tasmota HTTP Initialized');
}

SonoffTasmotaHTTPAccessory.prototype = {
  _request(cmd, cb) {
    const url = 'http://' + this.hostname + '/cm' + this.auth_url + '&cmnd=' + cmd;
    this.log('requesting: ' + url);
    request({
      uri:     url,
      timeout: this.timeout,
    }, cb);
  },

  getState:    function (callback) {
    var self = this;
    this._request('Power' + self.relay, function (error, response, body) {
      if (error) {
        self.log('error: ' + error);
        return callback(error);
      }
      var sonoff_reply = JSON.parse(body); // {"POWER":"ON"}
      self.log('Sonoff HTTP: ' + self.hostname + ', Relay ' + self.relay + ', Get State: ' + JSON.stringify(sonoff_reply));
      switch (sonoff_reply['POWER' + self.relay]) {
        case 'ON':
          callback(null, 1);
          break;
        case 'OFF':
          callback(null, 0);
          break;
      }
    });
  },
  getInUse:    function (callback) {
    this.log('getInUse');
    this.getState(function (error, inuse) {
      if (error) {
        callback(error);
      } else {
        callback(null, Boolean(inuse));
      }
    });
  },
  setState:    function (toggle, callback) {
    var newstate = '%20Off';
    if (toggle) {
      newstate = '%20On';
    }
    var self = this;

    this._request('Power' + self.relay + newstate, function (error, response, body) {
      if (error) {
        self.log('error: ' + error);
        return callback(error);
      }
      var sonoff_reply = JSON.parse(body); // {"POWER":"ON"}
      self.log('Sonoff HTTP: ' + self.hostname + ', Relay ' + self.relay + ', Set State: ' + JSON.stringify(sonoff_reply));
      switch (sonoff_reply['POWER' + self.relay]) {
        case 'ON':
          callback();
          break;
        case 'OFF':
          callback();
          break;
      }
    });
  },
  getServices: function () {
    return [this.service];
  },
};

