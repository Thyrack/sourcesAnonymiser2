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

  for (const key of currentMappingKeys) {
      for (const prefix of ['VAR', 'STR', 'CLASS', 'METHOD']) {
          const match = key.match(new RegExp(`^${prefix}_(\\d+)$`));
          if (match) {
              const count = parseInt(match[1], 10);
              if (count > counters[prefix]) {
                  counters[prefix] = count;
              }
          }
      }
  }

  const finalReplacements = [];

  // Assigner les IDs et préparer les remplacements
  for (const n of nodesToReplace) {
      if (n.type === 'COMMENT') {
          finalReplacements.push({ startOffset: n.startOffset, endOffset: n.endOffset, newText: '' });
          continue;
      }

      let id;
      const existingKeyGlobal = Object.keys(currentMapping).find(k => currentMapping[k] === n.value);

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
  let obfuscatedCode = code;
  for (const rep of resolvedReplacements) {
      obfuscatedCode = obfuscatedCode.substring(0, rep.startOffset) + rep.newText + obfuscatedCode.substring(rep.endOffset + 1);
  }

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

    // Trier les clés par longueur décroissante
    const keys = Object.keys(mapping).sort((a, b) => b.length - a.length);

    let restoredText = text;
    for (const key of keys) {
        // Remplacer toutes les occurrences de la clé par sa valeur
        const value = mapping[key];
        restoredText = restoredText.replaceAll(key, value);
    }

    return restoredText;
}
