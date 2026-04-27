import { parse } from 'java-parser';

const SAFE_IDENTIFIERS = new Set([
  'java', 'javax', 'org', 'com', 'sun', 'net',
  'apache', 'commons', 'collections', 'lang', 'util',
  'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Character', 'Byte', 'Short', 'Void',
  'Object', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Collection',
  'System', 'out', 'println', 'print', 'err',
  'StringBuilder', 'StringBuffer', 'Exception', 'RuntimeException', 'Throwable',
  'ListUtils', 'StringUtils', 'EMPTY', 'EMPTY_LIST', 'ArrayList',
  'add', 'isEmpty', 'get', 'set', 'size', 'contains', 'remove', 'clear', 'put', 'values', 'keySet', 'entrySet',
  'append', 'toString', 'substring', 'length', 'equals', 'hashCode', 'valueOf', 'parseInt', 'parseLong',
  'removeEnd', 'format', 'split', 'join', 'replace', 'replaceAll', 'trim', 'toLowerCase', 'toUpperCase',
  'override', 'SuppressWarnings', 'unchecked', 'serial',
  'main', 'args', 'final', 'static', 'public', 'private', 'protected', 'abstract', 'class', 'interface', 'enum',
  'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short'
]);

const SAFE_STRINGS = new Set([
  'unchecked', 'serial', 'unused', 'rawtypes', 'deprecation'
]);

/**
 * Extrait manuellement les commentaires (ligne et bloc) en gérant les chaînes de caractères
 */
function getComments(text) {
  const comments = [];
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

    if (text[i] === '"') {
      inString = true;
    } else if (text[i] === "'") {
      inChar = true;
    } else if (text[i] === '/' && text[i+1] === '/') {
      const startOffset = i;
      let j = i + 2;
      while(j < text.length && text[j] !== '\n') j++;
      comments.push({ startOffset: startOffset, endOffset: j - 1 });
      i = j - 1;
    } else if (text[i] === '/' && text[i+1] === '*') {
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

function traverse(node, cb, path = []) {
  if (Array.isArray(node)) {
    node.forEach(child => traverse(child, cb, path));
  } else if (node && typeof node === 'object') {
    const newPath = node.name ? [...path, node.name] : path;
    cb(node, newPath);
    if (node.children) {
      for (const key in node.children) {
        traverse(node.children[key], cb, newPath);
      }
    }
  }
}

function isConstant(name) {
    return name.length > 1 && name === name.toUpperCase() && /^[A-Z][A-Z0-9_]*$/.test(name);
}

function isClassName(name) {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name) && !isConstant(name);
}

/**
 * Splits the input code into multiple units based on FILE separators or package declarations.
 */
function splitCode(code) {
    const fileSeparator = /\/\/\s*---\s*FILE:\s*.*?\s*---\s*/;
    if (fileSeparator.test(code)) {
        return code.split(/(?=\/\/\s*---\s*FILE:\s*.*?\s*---\s*)/).filter(s => s.trim().length > 0);
    }

    // Split by package, keeping the package keyword in the next part if it's not the first one.
    // We split at positions where a package declaration is preceded by a newline.
    const parts = code.split(/(?=\n\s*package\s+[\w.]+\s*;)/);
    return parts.filter(s => s.trim().length > 0);
}

/**
 * Offuscate a single unit of Java code.
 */
function obfuscateUnit(code, currentMapping, counters) {
  let ast;
  try {
    ast = parse(code);
  } catch (error) {
    throw new Error("Erreur de syntaxe Java: " + error.message);
  }

  let isHighSecurity = false;
  const declaredVars = new Set();
  const declaredClasses = new Set();
  const declaredMethods = new Set();
  const tokensToSkip = new Set();

  traverse(ast, (node) => {
    if (node.name === 'packageDeclaration') {
      const ids = [];
      traverse(node, (n) => {
        if (n.tokenType && n.tokenType.name === 'Identifier') ids.push(n);
      });
      const pkgName = ids.map(id => id.image).join('.');
      if (pkgName.startsWith('pf.gov')) {
          isHighSecurity = true;
      } else {
          ids.forEach(id => tokensToSkip.add(`${id.startOffset}|${id.image}`));
      }
    }

    if (node.name === 'importDeclaration') {
      const actualIds = [];
      traverse(node, (n) => {
          if (n.tokenType && n.tokenType.name === 'Identifier') actualIds.push(n);
      });

      const importName = actualIds.map(id => id.image).join('.');
      if (!importName.startsWith('pf.gov.')) {
          actualIds.forEach(id => tokensToSkip.add(`${id.startOffset}|${id.image}`));
      }
    }

    if (node.name === 'annotation') {
      const actualIds = [];
      const findIds = (n) => {
        if (Array.isArray(n)) {
          n.forEach(findIds);
        } else if (n && typeof n === 'object') {
          if (n.tokenType && n.tokenType.name === 'Identifier') {
            actualIds.push(n);
          }
          if (n.children) {
            for (const key in n.children) {
              findIds(n.children[key]);
            }
          }
        }
      };
      findIds(node);

      const annotName = actualIds.map(id => id.image).join('.');
      if (!annotName.startsWith('pf.gov.')) {
          actualIds.forEach(id => {
              tokensToSkip.add(`${id.startOffset}|${id.image}`);
          });
      }
    }
  });

  traverse(ast, node => {
    if (node.name === 'variableDeclaratorId') {
      if (node.children && node.children.Identifier && node.children.Identifier[0]) {
         declaredVars.add(node.children.Identifier[0].image);
      }
    }

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
  });

  const nodesToReplace = [];

  // Identify nodes that are comments to preserve file separators if they are comments
  const fileSeparatorRegex = /^\/\/\s*---\s*FILE:\s*(.*?)\s*---\s*$/;

  traverse(ast, (node, path) => {
    if (node.tokenType && node.tokenType.name === 'StringLiteral') {
        const val = node.image.substring(1, node.image.length - 1);
        if (isHighSecurity) {
            if (!SAFE_STRINGS.has(val)) {
                nodesToReplace.push({ type: 'STR', startOffset: node.startOffset, endOffset: node.endOffset, value: node.image });
            }
        } else {
            nodesToReplace.push({ type: 'STR', startOffset: node.startOffset, endOffset: node.endOffset, value: node.image });
        }
    } else if (node.tokenType && node.tokenType.name === 'Identifier') {
        if (tokensToSkip.has(`${node.startOffset}|${node.image}`)) return;

        let forceObfuscate = false;
        if (path.includes('annotation')) {
             forceObfuscate = true;
        }

        const val = node.image;
        if (SAFE_IDENTIFIERS.has(val)) return;

        if (isHighSecurity || forceObfuscate) {
            let type = 'VAR';
            if (declaredClasses.has(val) || isClassName(val) || isConstant(val)) {
                type = 'CLASS';
            }
            nodesToReplace.push({ type: type, startOffset: node.startOffset, endOffset: node.endOffset, value: val });
        } else {
            if (declaredVars.has(val)) {
                nodesToReplace.push({ type: 'VAR', startOffset: node.startOffset, endOffset: node.endOffset, value: val });
            } else if (declaredClasses.has(val) || declaredMethods.has(val)) {
                const type = declaredClasses.has(val) ? 'CLASS' : 'VAR';
                nodesToReplace.push({ type: type, startOffset: node.startOffset, endOffset: node.endOffset, value: val });
            }
        }
    }
  });

  const comments = getComments(code);
  for (const c of comments) {
      const commentText = code.substring(c.startOffset, c.endOffset + 1);
      const match = commentText.match(fileSeparatorRegex);
      if (match) {
          // Keep file separators but mark for identifier replacement
          nodesToReplace.push({
              type: 'FILE_SEP',
              startOffset: c.startOffset,
              endOffset: c.endOffset,
              value: commentText,
              filename: match[1]
          });
          continue;
      }
      nodesToReplace.push({ type: 'COMMENT', startOffset: c.startOffset, endOffset: c.endOffset, value: '' });
  }

  const newMappingForUnit = {};
  const localValueToId = Object.create(null);
  const finalReplacements = [];

  const reverseMapping = new Map();
  for (const key in currentMapping) {
      if (!reverseMapping.has(currentMapping[key])) {
          reverseMapping.set(currentMapping[key], key);
      }
  }

  for (const n of nodesToReplace) {
      if (n.type === 'COMMENT') {
          finalReplacements.push({ startOffset: n.startOffset, endOffset: n.endOffset, newText: '' });
          continue;
      }

      if (n.type === 'FILE_SEP') {
          const lastDotIndex = n.filename.lastIndexOf('.');
          let baseName = n.filename;
          let extension = '';
          if (lastDotIndex !== -1) {
              baseName = n.filename.substring(0, lastDotIndex);
              extension = n.filename.substring(lastDotIndex);
          }

          const obfuscatedBaseName = baseName.replace(/[a-zA-Z_$][a-zA-Z\d_$]*/g, (idToken) => {
              if (SAFE_IDENTIFIERS.has(idToken)) return idToken;

              const existingKeyGlobal = reverseMapping.get(idToken);
              if (existingKeyGlobal) return existingKeyGlobal;
              if (localValueToId[idToken]) return localValueToId[idToken];

              // Guess type based on naming convention
              let type = (declaredClasses.has(idToken) || isClassName(idToken) || isConstant(idToken)) ? 'CLASS' : 'VAR';
              let prefix = type === 'CLASS' ? 'Class' : 'Var';

              counters[prefix]++;
              const id = `${prefix}_${counters[prefix]}`;
              localValueToId[idToken] = id;
              newMappingForUnit[id] = idToken;
              currentMapping[id] = idToken;
              reverseMapping.set(idToken, id);
              return id;
          });
          const newText = n.value.replace(n.filename, obfuscatedBaseName + extension);
          finalReplacements.push({ startOffset: n.startOffset, endOffset: n.endOffset, newText: newText });
          continue;
      }

      let id;
      const existingKeyGlobal = reverseMapping.get(n.value);

      if (existingKeyGlobal) {
          id = existingKeyGlobal;
      } else if (localValueToId[n.value]) {
          id = localValueToId[n.value];
      } else {
          let prefix = 'Var';
          if (n.type === 'CLASS' || n.type === 'CONSTANT') {
              prefix = 'Class';
          } else if (n.type === 'STR') {
              prefix = 'STR';
          }

          counters[prefix]++;
          id = `${prefix}_${counters[prefix]}`;
          localValueToId[n.value] = id;
          newMappingForUnit[id] = n.value;
          // Important: also add to currentMapping and reverseMapping so it can be reused in the same unit or next units
          currentMapping[id] = n.value;
          reverseMapping.set(n.value, id);
      }

      finalReplacements.push({ startOffset: n.startOffset, endOffset: n.endOffset, newText: id });
  }

  finalReplacements.sort((a, b) => b.startOffset - a.startOffset);

  const resolvedReplacements = [];
  let lastStart = Infinity;
  for (const rep of finalReplacements) {
      if (rep.endOffset < lastStart) {
          resolvedReplacements.push(rep);
          lastStart = rep.startOffset;
      }
  }

  const chunks = [];
  let lastIndex = 0;
  for (let i = resolvedReplacements.length - 1; i >= 0; i--) {
      const rep = resolvedReplacements[i];
      chunks.push(code.substring(lastIndex, rep.startOffset));
      chunks.push(rep.newText);
      lastIndex = rep.endOffset + 1;
  }
  chunks.push(code.substring(lastIndex));

  return { obfuscatedCode: chunks.join(''), newMapping: newMappingForUnit };
}

/**
 * Offusque le code Java donné (supporte plusieurs classes/fichiers)
 * @param {string} code Le code source Java original
 * @param {Object} currentMapping Le mapping actuellement dans le localStorage
 * @returns {Object} { obfuscatedCode, newMapping } ou throw une erreur
 */
export function obfuscate(code, currentMapping = {}) {
  const units = splitCode(code);
  const totalNewMapping = {};
  const cumulativeMapping = { ...currentMapping };
  const counters = { Var: 0, Class: 0, STR: 0 };

  const currentMappingKeys = Object.keys(cumulativeMapping);
  for (const key of currentMappingKeys) {
      const underIndex = key.indexOf('_');
      if (underIndex > 0) {
          const prefix = key.substring(0, underIndex);
          if (counters[prefix] !== undefined) {
              const countStr = key.substring(underIndex + 1);
              if (/^\d+$/.test(countStr)) {
                  const count = parseInt(countStr, 10);
                  if (count > counters[prefix]) {
                      counters[prefix] = count;
                  }
              }
          }
      }
  }

  const obfuscatedUnits = units.map(unit => {
      const { obfuscatedCode, newMapping } = obfuscateUnit(unit, cumulativeMapping, counters);
      Object.assign(totalNewMapping, newMapping);
      // cumulativeMapping is already updated inside obfuscateUnit (passed by reference)
      return obfuscatedCode;
  });

  return {
      obfuscatedCode: obfuscatedUnits.join(''),
      newMapping: totalNewMapping
  };
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
    keys.sort((a, b) => b.length - a.length);
    const escapedKeys = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(escapedKeys.join('|'), 'g');

    return text.replace(pattern, matched => mapping[matched]);
}
