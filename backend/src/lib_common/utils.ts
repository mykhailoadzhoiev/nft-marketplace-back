import * as ffmpeg from 'fluent-ffmpeg';
import * as fileType from 'file-type';
import * as hasha from 'hasha';
import { env } from 'process';
import Bs58 from './bs58';
import * as path from 'path';
import * as sharp from 'sharp';

export function getRandomString(len?) {
  let str = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  len = len || 8;

  for (let i = 0; i < len; i++) {
    str += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return str;
}

export function getUid() {
  return Date.now().toString(36) + '.' + this.getRandomString();
}

export async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function shuffle(array: Array<any>) {
  let currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export async function probe(file) {
  return <ffmpeg.FfprobeData>await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export async function getMediaContentProbe(file) {
  const probeFile = await probe(file);

  const result = {
    format: probeFile.format,
    chapters: probeFile.chapters,
  } as {
    format: ffmpeg.FfprobeFormat;
    videoStreams?: ffmpeg.FfprobeStream[];
    audioStreams?: ffmpeg.FfprobeStream[];
    chapters: any[];
  };

  const videoStreams = probeFile.streams.filter((v) => v.codec_type === 'video');
  const audioStreams = probeFile.streams.filter((v) => v.codec_type === 'audio');
  result.videoStreams = videoStreams;
  result.audioStreams = audioStreams;

  return result;
}

export async function getFileInfo(file: string) {
  return fileType.fromFile(file);
}

/*
export function durationFormat (value: number | string) {
  value = typeof value === 'string' ? parseFloat(value) : value;
  value = value * 1000;
  const days = Math.floor(value / 86400000);
  value = value % 86400000;
  const hours = Math.floor(value / 3600000);
  value = value % 3600000;
  const minutes = Math.floor(value / 60000);
  value = value % 60000;
  const seconds = Math.floor(value / 1000);

  function pnx (val: number) {
    if ((val + '').length == 1) {
      return '0' + val;
    } else {
      return val + '';
    }
  }

  const unitsFormat = (days ? days + 'd ' : '') +
    (hours ? hours + 'h ' : '') +
    (minutes ? minutes + 'm ' : '') +
    (seconds ? seconds + 's' : '') +
    (!days && !hours && !minutes && !seconds ? 0 : '');

  const timeFormat = (days ? days + ':' : '') +
    (hours ? pnx(hours) + ':' : '') +
    (minutes ? pnx(minutes) + ':' : '00:') +
    (seconds ? pnx(seconds) : '00') +
    (!days && !hours && !minutes && !seconds ? '00' : '');

  return {
    unitsFormat, timeFormat
  }
}
*/

export async function getFileSha256(filePath: string): Promise<string> {
  await sleep(200);
  return hasha.fromFile(filePath, { algorithm: 'sha256' });
}

export async function convertImageToAvatar(imageFile: string) {
  const tempNewThumbImageFile = path.resolve(env.DIR_TEMP_FILES, Bs58.uuid() + '.thumb.jpg');
  let image = sharp(imageFile);
  const metadata = await image.metadata();

  if (metadata.height > metadata.width) {
    const height = metadata.height > 500 ? 500 : metadata.height;
    await image.resize({ height: height }).jpeg({ quality: 75 }).toFile(tempNewThumbImageFile);
  } else {
    const width = metadata.width > 500 ? 500 : metadata.width;
    await image.resize({ width: width }).jpeg({ quality: 75 }).toFile(tempNewThumbImageFile);
  }

  return tempNewThumbImageFile;
}
