export function summaryFixture() {
  return {
    text: '',
    written: false,
    addRaw(value) {
      this.text += value;
      return this;
    },
    async write() {
      this.written = true;
      return this;
    },
  };
}
