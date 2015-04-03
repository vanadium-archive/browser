// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = freeze;

/*
 * List of array methods that can't cause mutation
 */
var IMMUTABLE_ARRAY_METHODS = [
'concat', 'slice', 'every', 'filter', 'forEach', 'indexOf',
'join', 'lastIndexOf', 'map', 'reduce', 'reduceRight',
'some', 'toString', 'toLocaleString', 'get'];

/*
 * Makes an observable into an immutable observable.
 */
function freeze(observable) {

  function immutableObservable(fn) {
    return observable(fn);
  }

  if(observable._type === 'observ-array') {
    copyMethods(immutableObservable, observable, IMMUTABLE_ARRAY_METHODS);
  }

  return immutableObservable;
}

function copyMethods(target, source, methods) {
  methods.forEach(function (name) {
    target[name] = function() {
      var result = source[name].apply(source, arguments);
      // If result is an observable itself, freeze it again.
      if( typeof result === 'function' ) {
        result = freeze(result);
      }
      return result;
    };
  });
}