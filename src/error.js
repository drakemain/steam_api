"use strict";

var util = require('util');
var exports = module.exports;

function Validation() {
  Error.captureStackTrace(this, this.constructor);
  this.message = "Could not validate vanity name.";
}

util.inherits(Validation, Error);

exports.Validation = Validation;

function TimeOut() {
  Error.captureStackTrace(this, this.constructor);
  this.message = "Timed out while waiting for a Steam response."
}

util.inherits(TimeOut, Error);

exports.TimeOut = TimeOut;