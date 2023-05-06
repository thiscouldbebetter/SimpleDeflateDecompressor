
namespace Deflate
{

export class Decompressor
{
	// Decompresses raw DEFLATE data (without zlib
	// or gzip container) into bytes.

	static decompress(input: BitInputStream): Uint8Array
	{
		// Reads from the given input stream, decompresses the data,
		// and returns a new byte array.
		return new Uint8Array(new Decompressor(input).output);
	}

	private output = new Array<number>();

	private dictionary = new ByteHistory(32 * 1024);

	private constructor(
		private input: BitInputStream
	)
	{
		// Constructor, which immediately performs decompression.

		// Process the stream of blocks
		var isFinal: boolean;
		do
		{
			// Read the block header.
			isFinal = this.input.readUint(1) != 0;  // bfinal
			var type = this.input.readUint(2);  // btype

			// Decompress rest of block based on the type
			if (type == 0)
			{
				this.decompressUncompressedBlock();
			}
			else if (type == 1)
			{
				this.decompressHuffmanBlock
				(
					Decompressor.FIXED_LITERAL_LENGTH_CODE,
					Decompressor.FIXED_DISTANCE_CODE
				);
			}
			else if (type == 2)
			{
				var [litLenCode, distCode]
					= this.decodeHuffmanCodes();
				this.decompressHuffmanBlock(litLenCode, distCode);
			}
			else if (type == 3)
			{
				throw new Error("Reserved block type");
			}
			else
			{
				throw new Error("Unreachable value");
			}
		}
		while (isFinal == false);

		// Discard bits to align to byte boundary.
		while (this.input.getBitPosition() != 0)
		{
			this.input.readUint(1);
		}
	}

	private static FIXED_LITERAL_LENGTH_CODE: CanonicalCode =
		Decompressor.makeFixedLiteralLengthCode();

	private static makeFixedLiteralLengthCode(): CanonicalCode
	{
		var codeLens = new Array<number>();

		for (let i = 0; i < 144; i++)
		{
			codeLens.push(8);
		}
		for (let i = 0; i < 112; i++)
		{
			codeLens.push(9);
		}
		for (let i = 0; i <  24; i++)
		{
			codeLens.push(7);
		}
		for (let i = 0; i <   8; i++)
		{
			codeLens.push(8);
		}

		return new CanonicalCode(codeLens);
	}

	private static FIXED_DISTANCE_CODE: CanonicalCode =
		Decompressor.makeFixedDistanceCode();

	private static makeFixedDistanceCode(): CanonicalCode
	{
		var codeLens = new Array<number>();
		for (var i = 0; i < 32; i++)
		{
			codeLens.push(5);
		}
		return new CanonicalCode(codeLens);
	}

	private decodeHuffmanCodes(): [CanonicalCode,CanonicalCode]
	{
		// Reads from the bit input stream, decodes the Huffman code
		// specifications into code trees, and returns the trees.

		var numLitLenCodes =
			this.input.readUint(5) + 257;  // hlit + 257

		var numDistCodes =
			this.input.readUint(5) + 1; // hdist + 1

		// Read the code length code lengths.

		var numCodeLenCodes = this.input.readUint(4) + 4;   // hclen + 4

		var codeLenCodeLen = new Array<number>();  // This array is filled in a strange order.

		for (var i = 0; i < 19; i++)
		{
			codeLenCodeLen.push(0);
		}

		codeLenCodeLen[16] = this.input.readUint(3);
		codeLenCodeLen[17] = this.input.readUint(3);
		codeLenCodeLen[18] = this.input.readUint(3);
		codeLenCodeLen[ 0] = this.input.readUint(3);

		for (var i = 0; i < numCodeLenCodes - 4; i++)
		{
			var j =
			(
				(i % 2 == 0)
				? (8 + Math.floor(i / 2))
				: (7 - Math.floor(i / 2))
			);
			codeLenCodeLen[j] = this.input.readUint(3);
		}

		// Create the code length code.
		var codeLenCode = new CanonicalCode(codeLenCodeLen);

		// Read the main code lengths and handle runs.
		var codeLens = new Array<number>();
		while (codeLens.length < numLitLenCodes + numDistCodes)
		{
			var sym =
				codeLenCode.decodeNextSymbol(this.input);

			if (0 <= sym && sym <= 15)
			{
				codeLens.push(sym);
			}
			else if (sym == 16)
			{
				if (codeLens.length == 0)
				{
					throw new Error("No code length value to copy");
				}
				var runLen = this.input.readUint(2) + 3;
				for (var i = 0; i < runLen; i++)
				{
					codeLens.push(codeLens[codeLens.length - 1]);
				}
			}
			else if (sym == 17)
			{
				var runLen = this.input.readUint(3) + 3;
				for (let i = 0; i < runLen; i++)
				{
					codeLens.push(0);
				}
			}
			else if (sym == 18)
			{
				var runLen = this.input.readUint(7) + 11;
				for (let i = 0; i < runLen; i++)
				{
					codeLens.push(0);
				}
			}
			else
			{
				throw new Error("Symbol out of range");
			}
		}

		if (codeLens.length > numLitLenCodes + numDistCodes)
		{
			throw new Error("Run exceeds number of codes.");
		}

		// Create literal-length code tree.
		var litLenCodeLen =
			codeLens.slice(0, numLitLenCodes);

		if (litLenCodeLen[256] == 0)
		{
			throw new Error("End-of-block symbol has zero code length.");
		}

		var litLenCode = new CanonicalCode(litLenCodeLen);

		// Create distance code tree with some extra processing.
		var distCodeLen = codeLens.slice(numLitLenCodes);

		var distCode: CanonicalCode;

		if (distCodeLen.length == 1 && distCodeLen[0] == 0)
		{
			distCode = null;  // Empty distance code; the block shall be all literal symbols.
		}
		else
		{
			// Get statistics for upcoming logic.
			var oneCount =
				distCodeLen.filter(x => x == 1).length;
			var otherPositiveCount =
				distCodeLen.filter(x => x > 1).length;

			// Handle the case where only one distance code is defined
			if (oneCount == 1 && otherPositiveCount == 0)
			{
				while (distCodeLen.length < 32)
				{
					distCodeLen.push(0);
				}
				distCodeLen[31] = 1;
			}
			distCode = new CanonicalCode(distCodeLen);
		}
		return [litLenCode, distCode];
	}

	private decompressUncompressedBlock(): void
	{
		// Handles and copies an uncompressed block
		// from the bit input stream.

		// Discard bits to align to byte boundary.
		while (this.input.getBitPosition() != 0)
		{
			this.input.readUint(1);
		}

		// Read length.
		const len = this.input.readUint(16);
		const nlen = this.input.readUint(16);

		if ((len ^ 0xFFFF) != nlen)
		{
			throw new Error("Invalid length in uncompressed block");
		}

		// Copy bytes.
		for (let i = 0; i < len; i++)
		{
			const b = this.input.readUint(8);  // Byte is aligned.
			this.output.push(b);
			this.dictionary.append(b);
		}
	}

	private decompressHuffmanBlock
	(
		litLenCode: CanonicalCode, distCode: CanonicalCode
	): void
	{
		// Decompresses a Huffman-coded block from the
		// bit input stream based on the given Huffman codes.

		while (true)
		{
			var sym = litLenCode.decodeNextSymbol(this.input);
			if (sym == 256)  
			{
				// End of block.
				break;
			}
			else if (sym < 256)
			{ 
				// Literal byte
				this.output.push(sym);
				this.dictionary.append(sym);
			}
			else
			{
				// Length and distance for copying
				var run = this.decodeRunLength(sym);

				if (!(3 <= run && run <= 258))
				{
					throw new Error("Invalid run length");
				}

				if (distCode === null)
				{
					throw new Error("Length symbol encountered with empty distance code");
				}

				var distSym =
					distCode.decodeNextSymbol(this.input);

				var dist = this.decodeDistance(distSym);

				if (!(1 <= dist && dist <= 32768))
				{
					throw new Error("Invalid distance");
				}

				this.dictionary.copy(dist, run, this.output);
			}
		}
	}

	private decodeRunLength(sym: number): number
	{
		// Returns the run length based on the given symbol
		// and possibly reading more bits.

		// Symbols outside the range cannot occur in the bit stream;
		// they would indicate that the decompressor is buggy
		if (!(257 <= sym && sym <= 287))
		{
			throw new RangeError("Invalid run length symbol");
		}

		if (sym <= 264)
		{
			return sym - 254;
		}
		else if (sym <= 284)
		{
			var numExtraBits = Math.floor((sym - 261) / 4);
			var returnValue =
			(
				(
					((sym - 265) % 4 + 4)
					<< numExtraBits
				)
				+ 3
				+ this.input.readUint(numExtraBits)
			);
			return returnValue;
		}
		else if (sym == 285)
		{
			return 258;
		}
		else
		{
			// sym is 286 or 287
			throw new RangeError("Reserved length symbol");
		}
	}


	private decodeDistance(sym: number): number
	{
		// Returns the distance based on the given symbol
		// and possibly reading more bits.

		// Symbols outside the range cannot occur in the bit stream;
		// they would indicate that the decompressor is buggy.
		if (!(0 <= sym && sym <= 31))
		{
			throw new RangeError("Invalid distance symbol");
		}

		if (sym <= 3)
		{
			return sym + 1;
		}
		else if (sym <= 29)
		{
			var numExtraBits = Math.floor(sym / 2) - 1;

			var returnValue =
				((sym % 2 + 2) << numExtraBits)
				+ 1
				+ this.input.readUint(numExtraBits);
			return returnValue;
		}
		else
		{
			// sym is 30 or 31.
			throw new RangeError("Reserved distance symbol");
		}
	}
}

}
