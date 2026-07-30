import { readFile } from 'node:fs/promises';

const packagePaths = [
  'package.json',
  'apps/desktop/package.json',
  'apps/renderer/package.json',
  'packages/core/package.json',
  'packages/storage/package.json',
  'packages/ui/package.json',
];

const packages = await Promise.all(
  packagePaths.map(async (path) => ({
    path,
    data: JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8')),
  }))
);

const expectedVersion = packages[0].data.version;
const mismatches = packages.filter(({ data }) => data.version !== expectedVersion);

if (mismatches.length > 0) {
  const details = mismatches
    .map(({ path, data }) => `${path}: ${data.version}`)
    .join('\n');
  throw new Error(`Package versions must match ${expectedVersion}:\n${details}`);
}

const releaseTag = process.env.RELEASE_TAG;
if (releaseTag && releaseTag !== `v${expectedVersion}`) {
  throw new Error(
    `Release tag ${releaseTag} does not match package version v${expectedVersion}`
  );
}

console.log(`Version check passed: ${expectedVersion}`);
