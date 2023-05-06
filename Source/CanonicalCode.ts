
namespace Deflate
{

export class CanonicalCode
{
	// A canonical Huffman code, where the code values for each symbol is
	// derived from a given sequence of code lengths. This data structure is
	// immutable. This could be transformed into an explicit Huffman code tree.
	// 
	// Example:
	//   Code lengths (canonical code):
	//     Symbol A: 1
	//     Symbol B: 0 (no code)
	//     Symbol C: 3
	//     Symbol D: 2
	//     Symbol E: 3
	//  
	//   Generated Huffman codes:
	//     Symbol A: 0
	//     Symbol B: (Absent)
	//     Symbol C: 110
	//     Symbol D: 10
	//     Symbol E: 111
	//  
	//   Huffman code tree:
	//       .
	//      / \
	//     A   .
	//        / \
	//       D   .
	//          / \
	//         C   E

	// This dictionary maps Huffman codes to symbol values. Each key is the
	// Huffman code padded with a 1 bit at the beginning to disambiguate codes
	// of different lengths (e.g. otherwise we can't distinguish 0b01 from
	// 0b0001). For the example of codeLengths=[1,0,3,2,3], we would have:
	//     0b1_0 -> 0
	//    0b1_10 -> 3
	//   0b1_110 -> 2
	//   0b1_111 -> 4
	private codeBitsToSymbol = new Map<number,number>();

	constructor(codeLengths: Readonly<Array<number>>)
	{
		// Constructs a canonical Huffman code from the given list of symbol code lengths.
		// Each code length must be non-negative. Code length 0 means no code for the symbol.
		// The collection of code lengths must represent a proper full Huffman code tree.
		// Examples of code lengths that result in correct full Huffman code trees:
		// - [1, 1] (result: A=0, B=1)
		// - [2, 2, 1, 0, 0, 0] (result: A=10, B=11, C=0)
		// - [3, 3, 3, 3, 3, 3, 3, 3] (result: A=000, B=001, C=010, ..., H=111)
		// Examples of code lengths that result in under-full Huffman code trees:
		// - [0, 2, 0] (result: B=00, unused=01, unused=1)
		// - [0, 1, 0, 2] (result: B=0, D=10, unused=11)
		// Examples of code lengths that result in over-full Huffman code trees:
		// - [1, 1, 1] (result: A=0, B=1, C=overflow)
		// - [1, 1, 2, 2, 3, 3, 3, 3] (result: A=0, B=1, C=overflow, ...)

		var nextCode = 0;
		for (var codeLength = 1; codeLength <= CanonicalCode.MAX_CODE_LENGTH; codeLength++)
		{
			nextCode <<= 1;
			var startBit = 1 << codeLength;
			codeLengths.forEach((cl: number, symbol: number) =>
			{
				if (cl != codeLength)
				{
					return;
				}
				if (nextCode >= startBit)
				{
					throw new RangeError
					(
						"This canonical code produces an over-full Huffman code tree."
					);
				}
				this.codeBitsToSymbol.set(startBit | nextCode, symbol);
				nextCode++;
			});
		}
		if (nextCode != 1 << CanonicalCode.MAX_CODE_LENGTH)
		{
			throw new RangeError
			(
				"This canonical code produces an under-full Huffman code tree."
			);
		}
	}

	decodeNextSymbol(inp: BitInputStream): number
	{
		// Decodes the next symbol from the given bit input stream
		// based on this canonical code. The returned symbol value
		// is in the range [0, codeLengths.size()).

		var codeBits = 1;
		while (true)
		{
			codeBits = codeBits << 1 | inp.readUint(1);
			var result =
				this.codeBitsToSymbol.get(codeBits);

			if (result !== undefined)
			{
				return result;
			}
		}
	}

	// The maximum Huffman code length allowed in the DEFLATE standard.
	private static readonly MAX_CODE_LENGTH: number = 15;
}

}
