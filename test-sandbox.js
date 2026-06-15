const fs = require('fs');
const vm = require('vm');
const text = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity-ide/brain/f59852c2-210d-410d-a4a3-434f61bfd0bc/.system_generated/steps/5/content.md', 'utf8');

const nuxtMatch = text.match(/window\.__NUXT__=(.*?);?<\/script>/s);
if (nuxtMatch) {
  const code = nuxtMatch[1];
  try {
    const sandbox = { window: {}, document: { querySelector: () => null } };
    vm.createContext(sandbox);
    const result = vm.runInContext(code, sandbox);
    fs.writeFileSync('nuxt-data.json', JSON.stringify(result, null, 2));
    console.log("Wrote nuxt-data.json");
  } catch (e) {
    console.error(e);
  }
}
