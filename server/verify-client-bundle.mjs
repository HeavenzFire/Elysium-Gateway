import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const forbidden = [/process\.env\.API_KEY/, /process\.env\.GEMINI_API_KEY/, /AIza[0-9A-Za-z_-]{30,}/];
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else files.push(file);
  }
  return files;
}
for (const file of await walk(root)) {
  const content = await readFile(file, 'utf8').catch(() => '');
  for (const pattern of forbidden) if (pattern.test(content)) throw Error('possible credential leaked into client bundle: ' + file);
}
process.stdout.write('Client bundle secret scan passed.\n');
