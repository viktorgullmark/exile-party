using System;
using System.IO;
using K4os.Compression.LZ4.Encoders;
using K4os.Compression.LZ4.Internal;
using K4os.Compression.LZ4.Streams.Test.Internal;
using Xunit;

namespace K4os.Compression.LZ4.Streams.Test
{
	public class DecoderTests
	{
		[Theory]
		[InlineData("reymont", "-1 -BD -B4", Mem.K8)]
		[InlineData("reymont", "-9 -BD -B4", Mem.K8)]
		[InlineData("xml", "-1 -BD -B4", Mem.K8)]
		[InlineData("xml", "-9 -BD -B4", Mem.K8)]
		[InlineData("x-ray", "-1 -BD -B4", Mem.K8)]
		[InlineData("x-ray", "-9 -BD -B4", Mem.K8)]
		public void SmallBlockSize(string filename, string options, int chunkSize)
		{
			TestDecoder($".corpus/{filename}", options, chunkSize);
		}

		[Theory]
		[InlineData("reymont", "-1 -BD -B4 --content-size", Mem.K8)]
		[InlineData("xml", "-1 -BD -B4 --content-size", Mem.K8)]
		[InlineData("x-ray", "-1 -BD -B4 --content-size", Mem.K8)]
		public void LengthAndPositionInStream(string filename, string options, int chunkSize)
		{
			var original = Tools.FindFile($".corpus/{filename}");
			var expectedLength = new FileInfo(original).Length;
			var expectedPosition = 0L;
			var encoded = Path.GetTempFileName();

			try
			{
				ReferenceLZ4.Encode(options, original, encoded);

				using (var stream = LZ4Stream.Decode(File.OpenRead(encoded)))
				{
					var random = new Random(0);
					Assert.Equal(expectedLength, stream.Length);

					var buffer = new byte[chunkSize];
					while (true)
					{
						var read = stream.Read(buffer, 0, random.Next(1, chunkSize));
						if (read == 0)
							break;

						expectedPosition += read;
						Assert.Equal(expectedPosition, stream.Position);
					}

					Assert.Equal(expectedLength, stream.Position);
				}
			}
			finally
			{
				File.Delete(encoded);
			}
		}

		[Fact]
		public void DecodeFromSlowStream()
		{
			var original = Tools.FindFile($".corpus/reymont");

			var encoded = Path.GetTempFileName();
			try

			{
				ReferenceLZ4.Encode("-1 -BD -B4", original, encoded);
				var origStream = File.OpenRead(encoded);
				// We need this to work even if the stream gives us only a single byte at a time
				var slowStream = new FakeNetworkStream(origStream);
				using (var input = LZ4Stream.Decode(slowStream, Mem.M1))
				{
					var buffer = new byte[0x80000];
					Assert.Equal(5000, input.Read(buffer, 0, 5000));
					Assert.Equal(0x10000 - 5000, input.Read(buffer, 0, 0x10000));
				}
			}
			finally
			{
				File.Delete(encoded);
			}
		}

		[Fact]
		public void InteractiveReadingReturnsBytesAsSoonAsTheyAreAvailable()
		{
			var original = Tools.FindFile($".corpus/reymont");

			var encoded = Path.GetTempFileName();
			try

			{
				ReferenceLZ4.Encode("-1 -BD -B4", original, encoded);
				using (var input = LZ4Stream.Decode(File.OpenRead(encoded), Mem.M1))
				{
					var buffer = new byte[0x80000];
					Assert.Equal(5000, input.Read(buffer, 0, 5000));
					Assert.Equal(0x10000 - 5000, input.Read(buffer, 0, 0x10000));
				}
			}
			finally
			{
				File.Delete(encoded);
			}
		}

		[Theory]
		[InlineData("-1 -BD -B4 -BX", Mem.K64)]
		[InlineData("-1 -BD -B4 -BX", 1337)]
		[InlineData("-1 -BD -B4 -BX", Mem.K64 + 1337)]
		[InlineData("-9 -BD -B7", Mem.K8)]
		public void HighEntropyData(string options, int chunkSize)
		{
			var filename = Path.GetTempFileName();
			try

			{
				Tools.WriteRandom(filename, 10 * Mem.M1 + 1337);
				TestDecoder(filename, options, chunkSize);
			}
			finally
			{
				File.Delete(filename);
			}
		}

		[Theory]
		[InlineData("reymont", "-1 -B4 -BX")]
		[InlineData("xml", "-1 -B4 -BX")]
		[InlineData("x-ray", "-1 -B4 -BX")]
		[InlineData("mozilla", "-9 -B7")]
		public void IndependentBlockDecoder(string filename, string options)
		{
			var original = Tools.FindFile($".corpus/{filename}");
			var encoded = Path.GetTempFileName();
			var decoded = Path.GetTempFileName();

			try
			{
				ReferenceLZ4.Encode(options, original, encoded);
				using (var decoder = new LZ4DecoderStream(
					File.OpenRead(encoded), 
					fi => new LZ4BlockDecoder(fi.BlockSize))) 
				using (var writer = File.OpenWrite(decoded))
				{
					decoder.CopyTo(writer);
				}

				Tools.SameFiles(original, decoded);
			}
			finally
			{
				File.Delete(encoded);
				File.Delete(decoded);
			}
		}

#if DEBUG
		[Theory(Skip = "Too long")]
#else
		[Theory]
		#endif
		[InlineData("-1 -BD -B4 -BX", Mem.K8)]
		[InlineData("-1 -BD -B5", Mem.K8)]
		[InlineData("-1 -BD -B6 -BX", Mem.K8)]
		[InlineData("-1 -BD -B7", Mem.K8)]
		[InlineData("-9 -BD -B4", Mem.K8)]
		[InlineData("-9 -BD -B5 -BX", Mem.K8)]
		[InlineData("-9 -BD -B6", Mem.K8)]
		[InlineData("-9 -BD -B7 -BX", Mem.K8)]
		[InlineData("-1 -B4", Mem.K8)]
		[InlineData("-1 -B7", Mem.K8)]
		[InlineData("-9 -B7 -BX", Mem.K8)]
		public void WholeCorpus(string options, int chunkSize)
		{
			foreach (var filename in Tools.CorpusNames)
			{
				try
				{
					TestDecoder($".corpus/{filename}", options, chunkSize);
				}
				catch (Exception e)
				{
					throw new Exception($"Failed to process: {filename} @ {options}", e);
				}
			}
		}

		private static void TestDecoder(string original, string options, int chunkSize)
		{
			original = Tools.FindFile(original);
			var encoded = Path.GetTempFileName();
			var decoded = Path.GetTempFileName();
			try
			{
				ReferenceLZ4.Encode(options, original, encoded);
				TestedLZ4.Decode(encoded, decoded, chunkSize);
				Tools.SameFiles(original, decoded);
			}
			finally
			{
				File.Delete(encoded);
				File.Delete(decoded);
			}
		}
	}
}
