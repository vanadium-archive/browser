module.exports = PaperInputValueEvent;

function PaperInputValueEvent(sink) {
    if (!(this instanceof PaperInputValueEvent)) {
        return new PaperInputValueEvent(sink)
    }
    this.sink = sink
    this.id = sink.id
}

PaperInputValueEvent.prototype.handleEvent = handleEvent

function handleEvent(ev) {
    var data = ev.currentTarget.value;
    if (typeof this.sink === 'function') {
        this.sink(data)
    } else {
        this.sink.write(data)
    }
}