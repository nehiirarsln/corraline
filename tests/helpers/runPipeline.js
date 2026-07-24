// n8n'in $('AI Agent'), $('Extract from File'), $('When chat message received')
// cagrilarini taklit ederek corraline.js'in TAM pipeline'ini (ana mantik dahil)
// gercekten calistirir. AI Agent'in ureteceği 'decision' objesini ve veri
// satirlarini (rows) parametre olarak alir, n8n'in dondurecegi JSON ciktisini verir.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

function runPipeline({ rows, decision, chatInput = '', extractNodeName = 'Extract from File' }) {
  const code = fs.readFileSync(path.join(__dirname, '../../src/corraline.js'), 'utf8');

  const nodeStub = {
    item: { json: { output: decision, chatInput } },
    all: () => rows.map(r => ({ json: r })),
    first: () => ({ json: {} })
  };

  const $ = (name) => {
    if (name === 'Extract from File' && extractNodeName !== 'Extract from File') {
      throw new Error('Extract from File yok, fallback tetiklensin');
    }
    return nodeStub;
  };

  const sandbox = { $, console };
  vm.createContext(sandbox);
  const wrapped = `function __run(){\n${code}\n}\n__run();`;
  const result = vm.runInContext(wrapped, sandbox);
  return result[0].json;
}

module.exports = { runPipeline };
