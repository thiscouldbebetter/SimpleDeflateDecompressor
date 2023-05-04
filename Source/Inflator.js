
class Inflator
{
	decompressBytes(fileContentsAsBytes)
	{
		// var fileContentsAsUint8Array = new Uint8Array(fileContentsAsBytes);

		var input =
			new BitStream(fileContentsAsBytes);
			// new Deflate.BitInputStream(fileContentsAsBytes);

		let magicNumberForGZIP = input.readInteger16LE();
		if (magicNumberForGZIP != 35615)
		{
			throw "Invalid GZIP magic number";
		}
		var compressionMethodCode = input.readByte();
		if (compressionMethodCode != 8)
		{
			throw "Unsupported compression method: " + (compressionMethodCode & 0xFF);
		}
		var flags = input.readByte(); // Reserved flags
		if ((flags & 0xE0) != 0)
		{
			throw "Reserved flags are set";
		}
		// Modification time.
		var mtime = input.readInteger32LE();
		if (mtime != 0)
		{
			console.log
			(
				"Last modified: " + "todo" // new Date(1970, 0, 1).add(mtime * 1000000)
			);
		}
		else
		{
			console.log("Last modified: N/A");
		}

		var extraFlags = input.readByte();
		// Extra flags
		switch (extraFlags)
		{
			case 2:
				console.log("Extra flags: Maximum compression");
				break;
			case 4:
				console.log("Extra flags: Fastest compression");
				break;
			default:
				console.log("Extra flags: Unknown");
				break;
		}

		// Operating system
		var osCode = input.readByte();
		var os;
		switch (osCode & 0xFF)
		{
			case 0:
				os = "FAT";
				break;
			case 1:
				os = "Amiga";
				break;
			case 2:
				os = "VMS";
				break;
			case 3:
				os = "Unix";
				break;
			case 4:
				os = "VM/CMS";
				break;
			case 5:
				os = "Atari TOS";
				break;
			case 6:
				os = "HPFS";
				break;
			case 7:
				os = "Macintosh";
				break;
			case 8:
				os = "Z-System";
				break;
			case 9:
				os = "CP/M";
				break;
			case 10:
				os = "TOPS-20";
				break;
			case 11: os = "NTFS"; break;
			case 12: os = "QDOS"; break;
			case 13: os = "Acorn RISCOS"; break;
			case 255: os = "Unknown"; break;
			default : os = "Really unknown"; break;
		}
		console.log("Operating system: " + os);

		// Text flag
		if ((flags & 0x01) != 0)
		{
			console.log("Flag: Text");
		}

		// Extra flag
		if ((flags & 0x04) != 0)
		{
			console.log("Flag: Extra");
			var len = input.readInteger16LE();
			input.readBytes(len);
			// Skip extra data
		}
	
		// File name flag
		if ((flags & 0x08) != 0)
		{
			var sb = "";
			while (true)
			{
				var temp = input.readByte();
				if (input.hasMoreBits() == false)
				{
					throw "EOFException";
				}
				else if (temp == 0)
				{
					// Null-terminated string
					break;
				}
				else
				{
					sb += String.fromCharCode(temp);
				}
			}

			console.log("File name: " + sb);
		}

		// Header CRC flag
		if ((flags & 0x02) != 0)
		{
			var crc = input.readInteger16LE(2);
			console.log("Header CRC-16: %04X%n", crc);
		}

		// Comment flag
		if ((flags & 0x10) != 0)
		{
			var sb = "";
			while (true)
			{
				var temp = input.readByte();
				if (input.hasMoreBits() == false)
				{
					throw "EOFException"; 
				}
				else if (temp == 0)
				{
					// Null-terminated string
					break;
				}
				else
				{
					sb += String.fromCharCode(temp);
				}
			}
			console.log("Comment: " + sb);
		}

		// Decompress
		var bytesDecompressed = Deflate.Decompressor.decompress(input);
		return bytesDecompressed;
	}
}
