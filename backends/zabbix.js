//var util = require('util');

function ZabbixBackend(startupTime, config, emitter){
  var self = this;
  this.lastFlush = startupTime;
  this.lastException = startupTime;
  this.config = config.console || {};

  // caches
  this.counters = {};
  this.timers = {};

  // attach
  emitter.on('flush', function(timestamp, metrics) { self.flush(timestamp, metrics); });
  emitter.on('status', function(callback) { self.status(callback); });
};

/**
 * flush() method called by statsd to flush out data each flushInterval
 */
ZabbixBackend.prototype.flush = function(timestamp, metrics) {
  var self = this;

  // gauges are simple
  for (var key in metrics.gauges) {
    this._writeOut('gauge.'+ key, timestamp, metrics.gauges[key]);
  }

  // running totals are easier to handle in zabbix than diffs
  for (var key in metrics.counters) {
    if (!this.counters[key]) {
      this.counters[key] = 0;
    }
    this.counters[key] += metrics.counters[key];
    this._writeOut('count.'+ key, timestamp, this.counters[key]);
  }

  // timer data
  for (var key in metrics.timers) {
    var timerData = this._getStats(metrics.timers[key]);
    for (var timer in timerData) {
      this._writeOut('timer.'+ key +'.'+ timer, timestamp, timerData[timer]);
    }
  }
};


/**
 * _getStats() method used to extract min/max/avg from an array of ints
 */
ZabbixBackend.prototype._getStats = function(values) {
  var out = {};
  out.count = values.length;
  out.avg = out.max = out.min = 0;

  if (out.count > 0) {
    values = values.sort(function (a,b) { return a-b; });
    out.min = values[0];
    out.max = values[out.count - 1];

    var sum=0;
    for (var i=0; i<out.count; i++) {
      sum += values[i];
    }

    out.avg = sum / out.count;
  }
  return out;
};

/**
 * _writeOut() stub method will be used to write out data to a file for
 *   zabbix_sender to then pass onto the Zabbix server
 */
ZabbixBackend.prototype._writeOut = function(key, data, timestamp) {
    var out = "- statsd["+ key +"] "+ timestamp +" "+ data;
    console.log(out);
};

/**
 * TODO create status method
 */
ZabbixBackend.prototype.status = function(write) {
};

exports.init = function(startupTime, config, events) {
  var instance = new ZabbixBackend(startupTime, config, events);
  return true;
};
