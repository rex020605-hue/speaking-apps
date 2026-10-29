/* Audio stays in the current tab. This worklet never makes a network request. */
class MalloPcm extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = true;
    this.buffer = new Float32Array(2048);
    this.offset = 0;
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        if (this.offset) this.port.postMessage(this.buffer.slice(0, this.offset));
        this.offset = 0;
        this.recording = false;
        this.port.postMessage({ stopped: true });
      }
    };
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!this.recording || !channel) return true;
    for (const value of channel) {
      this.buffer[this.offset++] = value;
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer.slice());
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('mallo-pcm', MalloPcm);
