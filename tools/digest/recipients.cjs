// Consume private AgentMail message metadata via stdin. Never save that input
// or this command's recipient output in the public repository.
const ADDRESS = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
function address(header) {
  if (typeof header !== 'string' || /[\r\n]/.test(header)) throw new Error('Invalid address header');
  let value = header.trim();
  if (value.includes('<') || value.includes('>')) {
    const match = value.match(/^[^<>]*<([^<>]+)>$/);
    if (!match || /[,;]/.test(match[0].slice(0, match[0].indexOf('<')))) throw new Error('Ambiguous sender');
    value = match[1].trim();
  }
  if (!ADDRESS.test(value)) throw new Error('Invalid email address');
  return value.toLowerCase();
}

function recipients({owner, excluded = [], messages}) {
  if (!Array.isArray(messages)) throw new Error('Expected all paginated subscription-state messages');
  const state = new Map();
  const skip = new Set(excluded.map(address));
  if (owner) state.set(address(owner), {active:true, at:-Infinity});
  for (const message of messages) {
    const labels = new Set(message.labels || []);
    if (!labels.has('received') || ['spam','trash','blocked','unauthenticated'].some(x => labels.has(x))) continue;
    const optedOut = labels.has('rd-unsubscribed');
    if (!optedOut && !labels.has('rd-active')) continue;
    const email = address(message.from);
    const at = Date.parse(message.createdAt); // Do not trust the sender's Date header.
    if (!Number.isFinite(at)) throw new Error('Missing server receipt time');
    const previous = state.get(email);
    if (!previous || at > previous.at || (at === previous.at && optedOut)) {
      state.set(email, {active:!optedOut, at});
    }
  }
  return [...state].filter(([email,s]) => s.active && !skip.has(email)).map(([email]) => email).sort();
}

if (require.main === module) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try { process.stdout.write(JSON.stringify(recipients(JSON.parse(input))) + '\n'); }
    catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
  });
}
module.exports = {address, recipients};
