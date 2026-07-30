const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const LOCAL_IMAGE_ORIGIN = 'calendar-image://local/';

function getLocalImagePath(imageURL, directory) {
  if (typeof imageURL !== 'string' || !imageURL.startsWith(LOCAL_IMAGE_ORIGIN)) {
    return null;
  }

  const encodedFilename = imageURL.slice(LOCAL_IMAGE_ORIGIN.length);
  if (!encodedFilename || encodedFilename.includes('/')) {
    return null;
  }

  const url = new URL(imageURL);
  const filename = decodeURIComponent(encodedFilename);
  if (
    url.hostname !== 'local'
    || !filename
    || filename !== path.basename(filename)
    || !/^[a-zA-Z0-9._-]+$/.test(filename)
  ) {
    return null;
  }

  return path.join(directory, filename);
}

function parseDataURL(source) {
  const match = source.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], 'base64'),
  };
}

function detectImageType(bytes) {
  if (
    bytes.length >= 8
    && bytes.subarray(0, 8).equals(Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]))
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

async function readImageSource(source) {
  const dataImage = typeof source === 'string' ? parseDataURL(source) : null;
  if (dataImage) {
    const detectedType = detectImageType(dataImage.bytes);
    if (!detectedType) throw new Error('Invalid calendar image data');
    return { mimeType: detectedType, bytes: dataImage.bytes };
  }

  const url = new URL(source);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Unsupported calendar image source');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download calendar image: ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error('Calendar image exceeds the 32 MB limit');
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const mimeType = detectImageType(bytes);
  if (!mimeType) throw new Error('Downloaded file is not a supported image');
  return { mimeType, bytes };
}

async function persistCalendarImage(source, label, directory) {
  if (getLocalImagePath(source, directory)) return source;

  const { mimeType, bytes } = await readImageSource(source);
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('Calendar image is empty or exceeds the 32 MB limit');
  }

  await fs.mkdir(directory, { recursive: true });
  const safeLabel = String(label || 'calendar')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 64);
  const filename = `${safeLabel}-${crypto.randomUUID()}.${IMAGE_TYPES[mimeType]}`;
  const finalPath = path.join(directory, filename);
  const temporaryPath = `${finalPath}.tmp`;

  await fs.writeFile(temporaryPath, bytes, { flag: 'wx' });
  await fs.rename(temporaryPath, finalPath);
  return `${LOCAL_IMAGE_ORIGIN}${encodeURIComponent(filename)}`;
}

async function removeCalendarImage(imageURL, directory) {
  const imagePath = getLocalImagePath(imageURL, directory);
  if (!imagePath) return false;

  await fs.rm(imagePath, { force: true });
  return true;
}

module.exports = {
  getLocalImagePath,
  persistCalendarImage,
  removeCalendarImage,
};
