const { execSync } = require('child_process');

// Puerto que queremos liberar
const PORT = process.env.PORT || 3000;

try {
  // En Windows, usamos netstat para encontrar el PID que está usando el puerto
  const output = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf-8' });
  
  // Extraer el PID del resultado
  const lines = output.split('\n').filter(line => line.includes(`LISTENING`));
  
  if (lines.length > 0) {
    // El PID está en la última columna
    const pid = lines[0].trim().split(/\s+/).pop();
    
    console.log(`Proceso encontrado usando el puerto ${PORT}: PID ${pid}`);
    
    // Matar el proceso
    execSync(`taskkill /F /PID ${pid}`);
    console.log(`Proceso con PID ${pid} terminado exitosamente.`);
  } else {
    console.log(`No se encontró ningún proceso usando el puerto ${PORT}.`);
  }
} catch (error) {
  console.error(`Error al intentar liberar el puerto ${PORT}:`, error.message);
}
