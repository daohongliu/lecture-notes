// `npm run set-password -- <username>`: turns on sign-in for local/server.mjs (or changes the password).
// Reads the password from stdin (typed without echo in a terminal). Signs out every existing session.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { setPassword } from './auth.mjs';
const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const name = process.argv[2];
if (!name) { console.error('Usage: npm run set-password -- <username>'); process.exit(1); }
async function readPw() {
  if (!process.stdin.isTTY) { let s = ''; for await (const c of process.stdin) s += c; return s.replace(/\r?\n$/, ''); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = s => { if (s.includes('Password')) process.stdout.write(s); };
  const pw = await new Promise(r => rl.question('Password: ', r)); rl.close(); process.stdout.write('\n'); return pw;
}
const pw = await readPw();
if (pw.length < 10) { console.error('Use at least 10 characters.'); process.exit(1); }
setPassword(DATA, name, pw);
console.log(`Sign-in is on for "${name}". Restart the server to apply it.`);
