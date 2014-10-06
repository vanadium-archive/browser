module.exports = setMercuryArray;

// TODO(alexfandrianto): observ-array's set() method works properly in 3.0.0,
// but mercury doesn't depend on that version yet. Use set() when it is.
function setMercuryArray(o, newArray) {
  o.splice(0, o.getLength());
  newArray.forEach(function(entry) {
    o.push(entry);
  });
}