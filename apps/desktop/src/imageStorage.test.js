const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  getLocalImagePath,
  persistCalendarImage,
  removeCalendarImage,
} = require('./imageStorage');

const ONE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('persists and removes a local calendar image', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pie-images-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));

  const imageURL = await persistCalendarImage(
    ONE_PIXEL_PNG,
    '2026-07-30',
    directory
  );
  const imagePath = getLocalImagePath(imageURL, directory);

  assert.match(imageURL, /^calendar-image:\/\/local\//);
  assert.ok(imagePath);
  assert.equal((await fs.stat(imagePath)).isFile(), true);
  assert.equal(await removeCalendarImage(imageURL, directory), true);
  await assert.rejects(fs.stat(imagePath));
});

test('does not resolve paths outside the image directory', () => {
  assert.equal(
    getLocalImagePath('calendar-image://local/../secret.png', '/tmp/images'),
    null
  );
});
