// Chemins vers les deux versions construites par `npm run build` (ou `npm test`).
const path = require('node:path');
module.exports = {
  PREVIEW: path.join(__dirname, '..', 'dist', 'preview.html'),   // avec données d'exemple inventées
  FINAL: path.join(__dirname, '..', 'docs', 'index.html')        // version vierge, celle qui est publiée
};
