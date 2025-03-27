/**
 * Script para corregir automáticamente los problemas de manejo de errores en el proyecto
 * 
 * Este script busca patrones como `error.message` en bloques catch donde error es de tipo unknown
 * y los reemplaza con una llamada a la función de utilidad getErrorMessage
 * 
 * Uso: node scripts/fix-error-handling.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directorio raíz del proyecto
const rootDir = path.resolve(__dirname, '..');

// Función para buscar archivos TypeScript recursivamente
function findTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('dist')) {
      // Recursivamente buscar en subdirectorios
      results = results.concat(findTsFiles(filePath));
    } else if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Función para verificar si un archivo necesita la importación de getErrorMessage
function needsImport(fileContent) {
  // Si ya tiene la importación, no es necesario agregarla de nuevo
  if (fileContent.includes("import { getErrorMessage }") || 
      fileContent.includes("import {getErrorMessage}")) {
    return false;
  }
  
  // Buscar patrones de error.message en bloques catch
  const catchBlockRegex = /catch\s*\(\s*error\s*(?::\s*unknown)?\s*\)\s*{[\s\S]*?error\.message/g;
  return catchBlockRegex.test(fileContent);
}

// Función para agregar la importación de getErrorMessage a un archivo
function addImport(fileContent, filePath) {
  // Determinar la ruta relativa a common/utils
  const relativePath = path.relative(path.dirname(filePath), path.join(rootDir, 'src/common/utils'));
  const importPath = relativePath.replace(/\\/g, '/');
  
  // Buscar la última importación en el archivo
  const importRegex = /import.*from.*;/g;
  let lastImportMatch;
  let lastImportIndex = -1;
  
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    lastImportMatch = match;
    lastImportIndex = match.index + match[0].length;
  }
  
  if (lastImportIndex !== -1) {
    // Insertar después de la última importación
    return fileContent.slice(0, lastImportIndex) + 
           `\nimport { getErrorMessage } from '${importPath.startsWith('.') ? importPath : './' + importPath}/error-handler.util';` + 
           fileContent.slice(lastImportIndex);
  } else {
    // Si no hay importaciones, agregar al principio del archivo
    return `import { getErrorMessage } from '${importPath.startsWith('.') ? importPath : './' + importPath}/error-handler.util';\n\n` + fileContent;
  }
}

// Función para reemplazar error.message con getErrorMessage(error)
function replaceErrorMessages(fileContent) {
  // Reemplazar error.message en bloques catch
  return fileContent.replace(
    /(catch\s*\(\s*error\s*(?::\s*unknown)?\s*\)\s*{[\s\S]*?)error\.message/g, 
    '$1getErrorMessage(error)'
  );
}

// Función principal
function main() {
  console.log('Buscando archivos TypeScript en el proyecto...');
  const tsFiles = findTsFiles(rootDir);
  console.log(`Encontrados ${tsFiles.length} archivos TypeScript.`);
  
  let modifiedFiles = 0;
  
  tsFiles.forEach(filePath => {
    try {
      let fileContent = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Verificar si el archivo necesita la importación
      if (needsImport(fileContent)) {
        fileContent = addImport(fileContent, filePath);
        modified = true;
        
        // Reemplazar error.message con getErrorMessage(error)
        const updatedContent = replaceErrorMessages(fileContent);
        if (updatedContent !== fileContent) {
          fileContent = updatedContent;
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(filePath, fileContent);
          modifiedFiles++;
          console.log(`Modificado: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`Error al procesar el archivo ${filePath}:`, error);
    }
  });
  
  console.log(`Proceso completado. Se modificaron ${modifiedFiles} archivos.`);
}

// Ejecutar la función principal
main();
