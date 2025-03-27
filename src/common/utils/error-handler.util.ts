/**
 * Utilidad para manejar errores de tipo unknown de manera segura
 * Esta función extrae el mensaje de error de cualquier tipo de error
 * y proporciona un mensaje predeterminado si no es posible extraer el mensaje
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  // Si es un objeto con una propiedad message
  if (error && typeof error === 'object' && 'message' in error && 
      typeof error.message === 'string') {
    return error.message;
  }
  
  // Si es una cadena
  if (typeof error === 'string') {
    return error;
  }
  
  // Para cualquier otro tipo
  return 'Error desconocido';
}
