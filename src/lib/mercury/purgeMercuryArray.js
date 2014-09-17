module.exports = purgeMercuryArray;

// TODO(alexfandrianto): When mercury's observ-array is updated to use set, we
// should remove this workaround.
function purgeMercuryArray(o) {
  o.splice(0, o.getLength());
}