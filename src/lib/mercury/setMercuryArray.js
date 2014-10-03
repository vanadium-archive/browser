module.exports = setMercuryArray;

// TODO(alexfandrianto): When mercury's observ-array is updated to use set, we
// should remove this workaround.
function setMercuryArray(o, newArray) {
  o.splice(0, o.getLength());
  newArray.forEach(function(entry) {
    o.push(entry);
  });
}