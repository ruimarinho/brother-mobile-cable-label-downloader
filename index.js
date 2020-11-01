/**
 * Module dependencies.
 */

const fs = require('fs');
const fetch = require('node-fetch');
const os = require('os');

/**
 * Mapping of papers:
 *
 * [id]: <description> // [brother label definition enum].
 */

const papers = {
  263: '3.5mm', // W3_5
  257: '6mm', // W6
  258: '9mm', // W9
  259: '12mm', // W12
  260: '18mm', // W18
  261: '24mm', // W24
  264: '38mm', // W38
  415: 'Heat-shrink 5.8mm', // HS_W6
  416: 'Heat-shrink 8.8mm', // HS_W9
  417: 'Heat-shrink 11.7mm', // HS_W12
  418: 'Heat-shrink 17.7mm', // HS_W18
  419: 'Heat-shrink 23.6mm', // HS_W24
  262: '36mm (PT-E8/D8/P9 only)', // W36
  447: 'FLe label 21mm x 45mm (PT-E8/D8/P9 only)', // FLE_W21H45
  269: '17mm x 54mm', // W17H54
  270: '17mm x 87mm', // W17H87
  271: '29mm x 90mm', // W29H90
  272: '38mm x 90mm', // W38H90
  274: '62mm x 29mm', // W62H29
  275: '62mm x 100mm', // W62H100
  358: '29mm x 42mm', // W29H42
  367: '39mm x 48mm', // W39H48
  370: '23mm x 23mm', // W23H23
  374: '52mm x 29mm', // W52H29
  382: '54mm x 29mm (QL-8xx series only)', // W54H29
  383: '60mm x 86mm', // W60H86
};

/**
 * Label downloader.
 */

(async function() {
  const darwinAppDir = `/Applications/Brother P-touch Editor.app/Contents/Resources/Template/en/Label/`;
  let baseDir = `Template/en/Label/`;

  if (os.platform() === 'darwin') {
    try {
      await fs.promises.access('/Applications/Brother P-touch Editor.app', fs.constants.R_OK | fs.constants.W_OK)
      baseDir = appDir;

      console.log('Brother P-Touch Editor.app detected, installing labels in-place...')
    } catch (e) {
      console.log(`
Brother P-Touch Editor.app not installed or not accessible to node process. If installed, you may change ownership permissions and re-run this script:

  sudo chown -R $(whoami):staff '/Applications/P-touch Editor.app'

Otherwise you will need to manually copy files from ./${baseDir} to ${darwinAppDir}.
`)
    }
  }

  console.log('Fetching list of categories (this may take a while)...');

  const categories = await (await fetch(`https://p-touch.brother.com/es-contents/dlc/v10/bil/categoryList`)).json();

  for (category of categories.list) {
    if (['ENU', 'ENG'].includes(category.langId)) {
      console.log(`Fetching content list for category '${category.displayName}'...`);

      // Normalize names like 'CD/DVD Label' to avoid recursive mkdir wrong path.
      category.displayName = category.displayName.replace(/\//g, '-');

      const content = await (await fetch(`https://p-touch.brother.com/es-contents/dlc/v10/bil/contentList?categoryId=${category.categoryId}&langId=${category.langId}`)).json();

      // Fetch thumbnail sample.
      await fs.promises.mkdir(`Template/en/Label/${category.displayName}`, { recursive: true });
      const thumbnail = await fetch(category.thumbnailUrl);
      thumbnail.body.pipe(fs.createWriteStream(`Template/en/Label/${category.displayName}/Sample.bmp`));

      for (label of content.list) {
        console.log(`Fetching label "${label.displayName}" (${category.displayName}) for paper ${papers[label.paperId]}...`);

        // Normalize label file names to remove unnecessary information.
        if (label.displayName.startsWith(`template_${category.langId}_`)) {
          label.displayName = `${label.displayName.replace(`template_${category.langId}_`, '')}.lbx`;
        }

        if (label.displayName.startsWith(`${category.langId}_`)) {
          label.displayName = `${label.displayName.replace(`${category.langId}_`, '')}.lbx`;
        }

        // Some labels do not contain the right extension name.
        if (!label.displayName.endsWith('.lbx')) {
          label.displayName = `${label.displayName}.lbx`;
        }

        const destination = fs.createWriteStream(`${baseDir}${category.displayName}/${label.displayName}`);
        const response = await fetch(`https://p-touch.brother.com/es-contents/dlc/v10/bil/content?id=${label.contentId}`);
        response.body.pipe(destination);
      }
    }
  }
})();
