
class BitStream
{
	constructor(bytes)
	{
		this.bytes = bytes;
		this.byteIndex = 0;
		this.bitOffsetWithinByte = 0;
	}

	alignWithByteBoundary()
	{
		if (this.bitOffsetWithinByte != 0)
		{
			this.bitOffsetWithinByte = 0;
			this.byteIndex++;
		}
	}

	hasMoreBits()
	{
		return (this.byteIndex < this.bytes.length);
	}

	readBit()
	{
		var byteCurrent = this.bytes[this.byteIndex];
		var returnValue = (byteCurrent >> (8 - this.bitOffsetWithinByte - 1)) & 0x1;
		this.bitOffsetWithinByte++;
		if (this.bitOffsetWithinByte >= 8)
		{
			this.bitOffsetWithinByte = 0;
			this.byteIndex++;
		}
		return returnValue;
	}

	readBits(numberOfBits)
	{
		var returnValues = [];
		for (var i = 0; i < numberOfBits; i++)
		{
			var bit = this.readBit();
			returnValues.push(bit);
		}
		return returnValues;
	}

	readByte()
	{
		var returnValue = this.bytes[this.byteIndex];
		this.byteIndex++;
		return returnValue;
	}

	readBytes(numberOfBytes)
	{
		var returnValues = [];
		for (var i = 0; i < numberOfBytes; i++)
		{
			var byte = this.bytes[this.byteIndex];
			returnValues.push(byte);
			this.byteIndex++;
		}
		return returnValues;
	}

	readIntegerOfBitWidthLE(numberOfBits)
	{
		var returnValue = 0;

		var bits = this.readBits(numberOfBits);

		for (var i = 0; i < bits.length; i++)
		{
			var bit = bits[i];
			var bitValueInPlace = bit << i;
			returnValue = returnValue | bitValueInPlace;
		}

		return returnValue;
	}

	readInteger16LE()
	{
		// 16-bit, little-endian
		var bytes = this.readBytes(2);
		var returnValue = bytes[0] | (bytes[1] << 8);
		return returnValue;
	}

	readInteger32LE()
	{
		// 32-bit, little-endian
		var bytes = this.readBytes(4);
		var returnValue =
			bytes[0]
			| (bytes[1] << 8)
			| (bytes[2] << 16)
			| (bytes[3] << 24);

		return returnValue;
	}

	writeByte(byte)
	{
		this.bytes.push(byte);
		this.byteIndex = this.bytes.length;
	}

	writeBytes(bytesToWrite)
	{
		for (var i = 0; i < bytesToWrite.length; i++)
		{
			var byte = bytesToWrite[i];
			this.bytes.push(byte);
		}

		this.byteIndex = this.bytes.length;
	}
}
