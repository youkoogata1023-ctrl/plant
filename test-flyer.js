const fs = require('fs');
const text = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity-ide/brain/f59852c2-210d-410d-a4a3-434f61bfd0bc/.system_generated/steps/5/content.md', 'utf8');

// The Nuxt object is a large JS code block. Let's just find `flyer_id: <variable>` in ocr_sales_items,
// and `flyers: [...]` array.
// But wait, the variable names change (like flyer_id: o, flyer_id: D).
// It might be easier to use regex directly on the `ocr_sales_items` to capture flyer_id variable name:
const items = [...text.matchAll(/id:"([^"]+)",source:[^,]+,flyer_id:([^,]+),.*?original_name:"([^"]+)",.*?image_url:"([^"]+)"/g)].map(m => ({
  id: m[1],
  flyerVar: m[2],
  name: m[3],
  image: m[4].replace(/\\u002F/g, '/')
}));

// Now let's extract flyers
const flyersTextMatch = text.match(/flyers:\[(.*?)\]/);
let flyerMapping = {};
if (flyersTextMatch) {
  const flyersStr = flyersTextMatch[1];
  const flyerRegex = /{id:([^,]+),.*?title:([^,]+)/g;
  const flyers = [...flyersStr.matchAll(flyerRegex)].map(m => ({
    flyerVar: m[1],
    titleVar: m[2]
  }));
  console.log("Flyers:", flyers);
}

// Wait, the title is a variable like `am` which resolves to "6/13号" somewhere in the arguments list!
// The entire Nuxt function is: `(function(a,b,c,...){return {layout:"widget",...}}(...,"6/13号",...))`
// Parsing the argument list is very hard because it's minified JS.

// An alternative: the DelishKitchen widget page renders `h2.flyer-title` with "6/16号" and "6/13号".
// But we don't have a direct link between the OCR items and the exact title unless we evaluate the JS.
