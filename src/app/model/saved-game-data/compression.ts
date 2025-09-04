

export class Compressor {
  private readonly enc = new TextEncoder();
  private readonly dec = new TextDecoder();


  private async compress(uncompressed: Uint8Array, method: "deflate" | "gzip" | "deflate-raw"): Promise<ArrayBuffer> {
    const stream = new window.CompressionStream(method);
    const writer = stream.writable.getWriter();

    void writer.write(uncompressed as any);
    void writer.close();

    const compressedArrayBuffer = await new Response(stream.readable).arrayBuffer();

    return compressedArrayBuffer;
  }


  private async decompress(compressed: ArrayBuffer, method: "deflate" | "gzip" | "deflate-raw"): Promise<ArrayBuffer> {
    const decompressionStream = new window.DecompressionStream(method);
    const inputStream = new Response(compressed).body;
    const decompressedStream = inputStream.pipeThrough(decompressionStream);
    const decompressedArrayBuffer = await new Response(decompressedStream).arrayBuffer();

    return decompressedArrayBuffer;
  }


  async compressString(input: string): Promise<ArrayBuffer> {
    let compressed = await this.compress(this.enc.encode(input), "deflate-raw");
    return compressed;
  }

  async deCompressString(compressed: ArrayBuffer): Promise<string> {
    let decompressed = await this.decompress(compressed, "deflate-raw");
    return this.dec.decode(decompressed)
  }


  hexString(buffer: ArrayBuffer) {
    const byteArray = new Uint8Array(buffer);
    const hexCodes = [...byteArray].map(value => {
      const hexCode = value.toString(16);
      return hexCode.padStart(2, '0');
    });
    return hexCodes.join('');
  }


  base64UrlString(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  decodeBase64UrlToArrayBuffer(b64: string): ArrayBuffer {
    if (!b64)
      return new ArrayBuffer(0);
    // Convert base64url to base64
    let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    // Pad string to length % 4 === 0
    const pad = base64.length % 4;
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
    else if (pad !== 0 && pad !== 2 && pad !== 3) {
      // If mod 4 is 1, it's invalid
      throw new Error('Invalid base64url string length');
    }

    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }


}
