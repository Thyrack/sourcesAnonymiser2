import { parse } from 'java-parser';

/**
 * Extrait manuellement les commentaires (ligne et bloc) en gérant les chaînes de caractères
 */
function getComments(text) {
  const comments = [];
  let inLineComment = false;
  let inBlockComment = false;
  let inString = false;
  let inChar = false;

  for (let i = 0; i < text.length; i++) {
    if (inString) {
      if (text[i] === '\\') i++;
      else if (text[i] === '"') inString = false;
      continue;
    }
    if (inChar) {
      if (text[i] === '\\') i++;
      else if (text[i] === "'") inChar = false;
      continue;
    }

    if (inLineComment) {
      if (text[i] === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (text[i] === '*' && text[i+1] === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (text[i] === '"') {
      inString = true;
    } else if (text[i] === "'") {
      inChar = true;
    } else if (text[i] === '/' && text[i+1] === '/') {
      inLineComment = true;
      const startOffset = i;
      let j = i + 2;
      while(j < text.length && text[j] !== '\n') j++;
      comments.push({ startOffset: startOffset, endOffset: j - 1 });
      i = j - 1;
    } else if (text[i] === '/' && text[i+1] === '*') {
      inBlockComment = true;
      const startOffset = i;
      let j = i + 2;
      while(j < text.length - 1 && !(text[j] === '*' && text[j+1] === '/')) j++;
      if (j < text.length - 1) {
        comments.push({ startOffset: startOffset, endOffset: j + 1 });
        i = j + 1;
      } else {
        comments.push({ startOffset: startOffset, endOffset: text.length - 1 });
        i = text.length;
      }
    }
  }
  return comments;
}

function traverse(node, cb) {
  if (Array.isArray(node)) {
    node.forEach(child => traverse(child, cb));
  } else if (node && typeof node === 'object') {
    cb(node);
    if (node.children) {
      for (const key in node.children) {
        traverse(node.children[key], cb);
      }
    }
  }
}

/**
 * Offusque le code Java donné
 * @param {string} code Le code source Java original
 * @param {Object} currentMapping Le mapping actuellement dans le localStorage
 * @returns {Object} { obfuscatedCode, newMapping } ou throw une erreur
 */
export function obfuscate(code, currentMapping = {}) {
  let ast;
  try {
    ast = parse(code);
  } catch (error) {
    throw new Error("Erreur de syntaxe Java: " + error.message);
  }

  let isHighSecurity = false;

  // Ensembles pour identifier les déclarations
  const declaredVars = new Set();
  const declaredClasses = new Set();
  const declaredMethods = new Set();

  // 1. Déterminer isHighSecurity
  traverse(ast, node => {
    if (node.name === 'packageDeclaration') {
      if (node.children.Identifier) {
         const pkgName = node.children.Identifier.map(id => id.image).join('.');
         if (pkgName.startsWith('pf.gov')) {
             isHighSecurity = true;
         }
      }
    }
  });

  // 2. Extraire les déclarations
  traverse(ast, node => {
    if (node.name === 'variableDeclaratorId') {
      if (node.children && node.children.Identifier && node.children.Identifier[0]) {
         declaredVars.add(node.children.Identifier[0].image);
      }
    }
    if (isHighSecurity) {
      if (node.name === 'classDeclaration') {
         if (node.children && node.children.normalClassDeclaration && node.children.normalClassDeclaration[0]) {
            const normal = node.children.normalClassDeclaration[0];
            if (normal.children.typeIdentifier && normal.children.typeIdentifier[0] && normal.children.typeIdentifier[0].children.Identifier && normal.children.typeIdentifier[0].children.Identifier[0]) {
               declaredClasses.add(normal.children.typeIdentifier[0].children.Identifier[0].image);
            }
         }
      }
      if (node.name === 'interfaceDeclaration') {
         if (node.children && node.children.normalInterfaceDeclaration && node.children.normalInterfaceDeclaration[0]) {
            const normal = node.children.normalInterfaceDeclaration[0];
            if (normal.children.typeIdentifier && normal.children.typeIdentifier[0] && normal.children.typeIdentifier[0].children.Identifier && normal.children.typeIdentifier[0].children.Identifier[0]) {
               declaredClasses.add(normal.children.typeIdentifier[0].children.Identifier[0].image);
            }
         }
      }
      if (node.name === 'methodDeclaration') {
         if (node.children && node.children.methodHeader && node.children.methodHeader[0] && node.children.methodHeader[0].children.methodDeclarator && node.children.methodHeader[0].children.methodDeclarator[0]) {
             const decl = node.children.methodHeader[0].children.methodDeclarator[0];
             if (decl.children.Identifier && decl.children.Identifier[0]) {
                 declaredMethods.add(decl.children.Identifier[0].image);
             }
         }
      }
    }
  });

  const nodesToReplace = []; // { type: string, startOffset: number, endOffset: number, value: string }

  // 3. Extraire tous les usages et chaînes de caractères
  traverse(ast, node => {
    if (node.tokenType && node.tokenType.name === 'StringLiteral') {
        nodesToReplace.push({ type: 'STR', startOffset: node.startOffset, endOffset: node.endOffset, value: node.image });
    } else if (node.tokenType && node.tokenType.name === 'Identifier') {
        const val = node.image;
        if (declaredVars.has(val)) {
            nodesToReplace.push({ type: 'VAR', startOffset: node.startOffset, endOffset: node.endOffset, value: val });
        } else if (declaredClasses.has(val)) {
            nodesToReplace.push({ type: 'CLASS', startOffset: node.startOffset, endOffset: node.endOffset, value: val });
        } else if (declaredMethods.has(val)) {
            nodesToReplace.push({ type: 'METHOD', startOffset: node.startOffset, endOffset: node.endOffset, value: val });
        }
    }
  });

  // 4. Extraire les commentaires
  const comments = getComments(code);
  for (const c of comments) {
      nodesToReplace.push({ type: 'COMMENT', startOffset: c.startOffset, endOffset: c.endOffset, value: '' });
  }

  // 5. Générer le mapping et préparer les remplacements
  const newMapping = {};
  const localValueToId = {};

  const counters = { VAR: 0, STR: 0, CLASS: 0, METHOD: 0 };
  const currentMappingKeys = Object.keys(currentMapping);

  // Performance optimization: Avoid creating RegExp objects in a double loop
  for (const key of currentMappingKeys) {
      const underIndex = key.indexOf('_');
      if (underIndex > 0) {
          const prefix = key.substring(0, underIndex);
          if (counters[prefix] !== undefined) {
              const countStr = key.substring(underIndex + 1);
              // Basic check if it's a number to avoid matching invalid keys (though rare)
              if (/^\d+$/.test(countStr)) {
                  const count = parseInt(countStr, 10);
                  if (count > counters[prefix]) {
                      counters[prefix] = count;
                  }
              }
          }
      }
  }

  const finalReplacements = [];

  // Performance optimization: Pre-compute reverse mapping for O(1) lookups
  // This avoids O(N*M) where N is nodesToReplace and M is Object.keys(currentMapping)
  const reverseMapping = new Map();
  for (const key of currentMappingKeys) {
      if (!reverseMapping.has(currentMapping[key])) {
          reverseMapping.set(currentMapping[key], key);
      }
  }

  // Assigner les IDs et préparer les remplacements
  for (const n of nodesToReplace) {
      if (n.type === 'COMMENT') {
          finalReplacements.push({ startOffset: n.startOffset, endOffset: n.endOffset, newText: '' });
          continue;
      }

      let id;
      const existingKeyGlobal = reverseMapping.get(n.value);

      if (existingKeyGlobal) {
          id = existingKeyGlobal;
      } else if (localValueToId[n.value]) {
          id = localValueToId[n.value];
      } else {
          counters[n.type]++;
          id = `${n.type}_${counters[n.type]}`;
          localValueToId[n.value] = id;
          newMapping[id] = n.value;
      }

      finalReplacements.push({ startOffset: n.startOffset, endOffset: n.endOffset, newText: id });
  }

  // Trier par index décroissant pour ne pas fausser les offsets
  finalReplacements.sort((a, b) => b.startOffset - a.startOffset);

  // Résolution de conflits d'offsets (si un noeud englobe un autre)
  const resolvedReplacements = [];
  let lastStart = Infinity;
  for (const rep of finalReplacements) {
      if (rep.endOffset < lastStart) {
          resolvedReplacements.push(rep);
          lastStart = rep.startOffset;
      }
  }

  // Appliquer les remplacements
  // Performance optimization: Use array chunking for O(N) reconstruction instead of O(K*N) iterative substring replacements
  const chunks = [];
  let lastIndex = 0;
  // resolvedReplacements is sorted by startOffset descending, so we iterate in reverse
  // to process the string from left to right.
  for (let i = resolvedReplacements.length - 1; i >= 0; i--) {
      const rep = resolvedReplacements[i];
      chunks.push(code.substring(lastIndex, rep.startOffset));
      chunks.push(rep.newText);
      lastIndex = rep.endOffset + 1;
  }
  chunks.push(code.substring(lastIndex));

  const obfuscatedCode = chunks.join('');

  return { obfuscatedCode, newMapping };
}

/**
 * Désoffusque le texte donné (retour de l'IA)
 * @param {string} text Le texte markdown/Java de l'IA
 * @param {Object} mapping Le dictionnaire de correspondance
 * @returns {string} Le texte restauré
 */
export function deobfuscate(text, mapping) {
    if (!text || !mapping) return text;

    const keys = Object.keys(mapping);
    if (keys.length === 0) return text;

    // Trier les clés par longueur décroissante
    // Performance optimization: Single O(L) pass replacement instead of O(N*L)
    // Avoids cascading replacements and reduces garbage collection
    keys.sort((a, b) => b.length - a.length);
    const escapedKeys = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(escapedKeys.join('|'), 'g');

    return text.replace(pattern, matched => mapping[matched]);
}
