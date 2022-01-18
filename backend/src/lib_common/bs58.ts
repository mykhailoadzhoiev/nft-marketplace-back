import * as basex from 'base-x';

// base58 (bitcoint, IPFS) (https://en.wikipedia.org/wiki/Base58)
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const bs58 = basex(ALPHABET);

let pid = process.pid;
let addressInt = 0;
let mac = '',
  networkInterfaces = require('os').networkInterfaces();
for (let interface_key in networkInterfaces) {
  const networkInterface = networkInterfaces[interface_key];
  const length = networkInterface.length;
  for (var i = 0; i < length; i++) {
    if (networkInterface[i].mac && networkInterface[i].mac != '00:00:00:00:00:00') {
      mac = networkInterface[i].mac;
      break;
    }
  }
}
addressInt = mac ? parseInt(mac.replace(/\:|\D+/gi, '')) : 0;

export default class Bs58 {
  static getRandomBs58String(length?) {
    length = length || 8;
    let text = '';
    for (let i = 0; i < length; i++) {
      text += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return text;
  }

  static intToHex(intNum) {
    var hex = intNum.toString(16);
    if (hex.length % 2 > 0) {
      hex = '0' + hex;
    }
    return hex;
  }

  static fromInt(intNum) {
    let hex = this.intToHex(intNum);
    const bytes = Buffer.from(hex, 'hex');
    const res = bs58.encode(bytes);
    return res;
  }

  static toInt(bs58String: string) {
    const hex = bs58.decode(bs58String).toString('hex');
    return parseInt(hex, 16);
  }

  static toHex(bs58String: string) {
    return bs58.decode(bs58String).toString('hex');
  }

  static uuid(randChars = 4) {
    const pid58 = this.fromInt(pid);
    const addres58 = this.fromInt(addressInt);
    const ts58 = this.fromInt(Date.now());
    const rnd58Chars = this.getRandomBs58String(randChars);
    const cryptoInt = Date.now() % 58;
    const cryptoChar = this.fromInt(cryptoInt);
    const bs58str = rnd58Chars + ts58 + pid58 + addres58;
    let res = cryptoChar;
    for (let i = 0; i < bs58str.length; i++) {
      const char = bs58str[i];
      const charIndex = ALPHABET.indexOf(char);
      res = res + ALPHABET[(charIndex + cryptoInt + i * 3) % 58];
    }
    return res;
  }
}
