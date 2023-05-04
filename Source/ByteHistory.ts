
namespace Deflate
{

export class ByteHistory
{
	// Stores a finite recent history of a byte stream.
	// Useful as an implicit dictionary for Lempel-Ziv schemes.

	// Maximum number of bytes stored in this history.
	private size: int;

	// Circular buffer of byte data.
	private data: Array<byte> = [];
	
	// Index of next byte to write to,
	// always in the range [0, data.length).
	private index: int = 0;

	// Constructs a byte history of the given size.
	public constructor(size: int)
	{
		if (size < 1)
		{
			throw new RangeError("Size must be positive");
		}
		this.size = size;
	}

	// Appends the given byte to this history.
	// This overwrites the byte value at `size` positions ago.
	public append(b: byte): void
	{
		if (this.data.length < this.size)
		{
			this.data.push(0);  // Dummy value.
		}

		if (!(0 <= this.index && this.index < this.data.length))
		{
			throw new Error("Unreachable state");
		}

		this.data[this.index] = b;
		this.index = (this.index + 1) % this.size;
	}

	// Copies `len` bytes starting at `dist` bytes ago to the
	// given output array and also back into this buffer itself.
	// Note that if the count exceeds the distance, then some of the output
	// data will be a copy of data that was copied earlier in the process.
	public copy
	(
		dist: int,
		len: int,
		out: Array<byte>
	): void
	{
		if (len < 0 || !(1 <= dist && dist <= this.data.length))
		{
			throw new RangeError("Invalid length or distance");
		}

		let readIndex: int =
			(this.index + this.size - dist) % this.size;

		for (let i = 0; i < len; i++)
		{
			const b: byte = this.data[readIndex];
			readIndex = (readIndex + 1) % this.size;
			out.push(b);
			this.append(b);
		}
	}
}

}
