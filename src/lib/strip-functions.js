// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = stripFunctions;

/*
 * Returns a copy of the input with its functions stripped out.
 * Array entries would be set to null. Object entries are unset.
 * The functions are stripped deeply, also purging from nested objects/arrays.
 */
function stripFunctions(data) {
  if (typeof data === 'function') {
  	return null;
  } else if (typeof data === 'object') {
  	// JSON.parse + stringify deeply purges function properties in objects.
  	return JSON.parse(JSON.stringify(data));
  }
  return data; // primitive type
}