import { readFile, writeFile } from 'node:fs/promises';

const version = process.argv[2]?.replace(/^v/, '');
if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Usage: pnpm version:set <major.minor.patch>');
}

const packagePaths = [
  'package.json',
  'apps/desktop/package.json',
  'apps/renderer/package.json',
  'packages/core/package.json',
  'packages/storage/package.json',
  'packages/ui/package.json',
];

await Promise.all(
  packagePaths.map(async (path) => {
    const url = new URL(`../${path}`, import.meta.url);
    const data = JSON.parse(await readFile(url, 'utf8'));
    data.version = version;
    await writeFile(url, `${JSON.stringify(data, null, 2)}\n`);
  })
);

console.log(`Updated ${packagePaths.length} package versions to ${version}`);
