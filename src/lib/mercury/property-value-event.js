module.exports = PropertyValueEvent;

function PropertyValueEvent(sink, property, rawTypeIsCustom) {
  if (!(this instanceof PropertyValueEvent)) {
    return new PropertyValueEvent(sink);
  }
  this.sink = sink;
  this.id = sink.id;
  this.property = property;

  // This final value is a sort of Mercury/Polymer capturing mode workaround to
  // avoid handling the same event twice.
  // By setting this to true, we filter out captured DOM Events and can focus
  // on the CustomEvent's fired by Polymer elements.
  this.rawTypeIsCustom = rawTypeIsCustom ? true : false; // optional
}

PropertyValueEvent.prototype.handleEvent = handleEvent;

function handleEvent(ev) {
  if (!this.rawTypeIsCustom || ev._rawEvent instanceof CustomEvent) {
    var data = ev.currentTarget[this.property];
    console.warn(data);
    if (typeof this.sink === 'function') {
      this.sink(data);
    } else {
      this.sink.write(data);
    }
  }
}