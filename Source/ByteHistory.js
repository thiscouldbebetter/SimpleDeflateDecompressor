"use strict";
var Deflate;
(function (Deflate) {
    class ByteHistory {
        constructor(size) {
            // Circular buffer of byte data.
            this.data = [];
            // Index of next byte to write to,
            // always in the range [0, data.length).
            this.index = 0;
            if (size < 1) {
                throw new RangeError("Size must be positive");
            }
            this.size = size;
        }
        append(b) {
            // Appends the given byte to this history.
            // This overwrites the byte value at `size` positions ago.
            if (this.data.length < this.size) {
                this.data.push(0); // Dummy value.
            }
            if (!(0 <= this.index && this.index < this.data.length)) {
                throw new Error("Unreachable state");
            }
            this.data[this.index] = b;
            this.index = (this.index + 1) % this.size;
        }
        copy(dist, len, out) {
            // Copies `len` bytes starting at `dist` bytes ago to the
            // given output array and also back into this buffer itself.
            // Note that if the count exceeds the distance, then some of the output
            // data will be a copy of data that was copied earlier in the process.
            if (len < 0 || !(1 <= dist && dist <= this.data.length)) {
                throw new RangeError("Invalid length or distance");
            }
            let readIndex = (this.index + this.size - dist) % this.size;
            for (let i = 0; i < len; i++) {
                var b = this.data[readIndex];
                readIndex = (readIndex + 1) % this.size;
                out.push(b);
                this.append(b);
            }
        }
    }
    Deflate.ByteHistory = ByteHistory;
})(Deflate || (Deflate = {}));
