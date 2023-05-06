namespace Deflate
{

export class BitInputStream
{
	// A stream of bits that can be read. Because they come
	// from an underlying byte stream, the total number of bits
	// is always a multiple of 8. Bits are packed in little endian
	// within a byte. For example, the byte 0x87 reads
	// as the sequence of bits [1,1,1,0,0,0,0,1].

	// In the range [0, data.length*8].
	private bitIndex: number = 0;

	public constructor
	(
		private data: Uint8Array
	)
	{
		// Constructs a bit input stream based on the given byte array.
	}

	getBitPosition(): number
	{
		// Returns the current bit position,
		// which ascends from 0 to 7 as bits are read.

		return this.bitIndex % 8;
	}

	hasMoreBits(): boolean
	{
		return (this.bitIndex < this.data.length * 8);
	}

	readBitMaybe(): number
	{
		// Reads a bit from this stream. Returns 0 or 1
		// if a bit is available, or -1 if the end of stream
		// is reached. The end of stream always occurs on a byte boundary.

		var byteIndex = (this.bitIndex >>> 3);
		if (byteIndex >= this.data.length)
		{
			return -1;
		}
		const result =
			((this.data[byteIndex] >>> (this.bitIndex & 7)) & 1);
		this.bitIndex++;
		return result;
	}

	readUint(numBits: number): number
	{
		// Reads the given number of bits from this stream,
		// packing them in little endian as an unsigned integer.

		if (numBits < 0 || numBits > 31)
		{
			throw new RangeError("Number of bits out of range");
		}

		let result = 0;
		for (let i = 0; i < numBits; i++)
		{
			var bit = this.readBitMaybe();
			if (bit == -1)
			{
				throw new Error("Unexpected end of data");
			}
			result |= bit << i;
		}
		return result;
	}

}

}
