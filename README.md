# Olimpo Gym Backend

Backend para la aplicación web del gimnasio Olimpo, desarrollado con NestJS y Supabase.

## Requisitos previos

- Node.js (v18 o superior)
- npm o yarn
- Cuenta en Supabase con las tablas necesarias

## Configuración local

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno:

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
# Supabase API (para autenticación)
SUPABASE_URL=tu-url-de-supabase
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_KEY=tu-service-key

# Conexión directa a PostgreSQL (para consultas avanzadas)
DATABASE_URL=postgresql://postgres:tu-contraseña@db.tu-proyecto.supabase.co:5432/postgres

# Puerto del servidor NestJS
PORT=3000
```

## Estructura de la base de datos en Supabase

El backend espera que existan las siguientes tablas en Supabase:

### Tabla `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para crear automáticamente un perfil cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Ejecución local

Para desarrollo:

```bash
npm run start:dev
```

Para producción:

```bash
npm run build
npm run start:prod
```

## Documentación de la API

Una vez que el servidor esté en ejecución, puedes acceder a la documentación Swagger en:

```
http://localhost:3000/api/docs
```

## Despliegue en Render

Este proyecto está configurado para ser desplegado en [Render](https://render.com).

### Pasos para el despliegue

1. Crea una cuenta en Render si aún no tienes una.
2. Conecta tu repositorio de GitHub a Render.
3. Crea un nuevo servicio Web.
4. Selecciona el repositorio que contiene este proyecto.
5. Configura las siguientes opciones:
   - **Nombre**: olimpo-backend (o el nombre que prefieras)
   - **Entorno**: Node
   - **Comando de construcción**: `npm install && npm run build`
   - **Comando de inicio**: `npm run start:prod`
   - **Plan**: Free (o el que necesites)

6. Agrega las siguientes variables de entorno:
   - `NODE_ENV`: production
   - `PORT`: 10000 (Render asignará automáticamente un puerto, pero puedes especificar uno)
   - `SUPABASE_URL`: tu URL de Supabase
   - `SUPABASE_ANON_KEY`: tu clave anónima de Supabase
   - `SUPABASE_SERVICE_KEY`: tu clave de servicio de Supabase
   - `DATABASE_URL`: tu URL de conexión a PostgreSQL

7. Haz clic en "Create Web Service".

### Configuración adicional

Si deseas usar un dominio personalizado, puedes configurarlo en la sección "Settings" de tu servicio en Render.

## Despliegue con Docker

Este proyecto está configurado para ser desplegado utilizando Docker, lo que facilita su ejecución en cualquier entorno.

### Requisitos previos

- Docker
- Docker Compose

### Ejecución local con Docker

1. Construir y levantar los contenedores:

```bash
docker-compose up -d
```

2. Ver los logs:

```bash
docker-compose logs -f
```

3. Detener los contenedores:

```bash
docker-compose down
```

### Despliegue en producción con Docker

1. Construir la imagen para producción:

```bash
docker build -t olimpo-backend:prod --target production .
```

2. Ejecutar el contenedor:

```bash
docker run -p 3000:3000 --env-file .env olimpo-backend:prod
```

### Despliegue en Render con Docker

Render soporta el despliegue de aplicaciones mediante Docker. Para desplegar esta aplicación en Render utilizando Docker:

1. Crea una cuenta en Render si aún no tienes una.
2. Conecta tu repositorio de GitHub a Render.
3. Crea un nuevo servicio Web.
4. Selecciona "Docker" como entorno.
5. Configura las siguientes opciones:
   - **Nombre**: olimpo-backend (o el nombre que prefieras)
   - **Rama**: main (o la rama que desees desplegar)
   - **Plan**: Free (o el que necesites)

6. Agrega las siguientes variables de entorno:
   - `NODE_ENV`: production
   - `PORT`: 10000 (Render asignará automáticamente un puerto, pero puedes especificar uno)
   - `SUPABASE_URL`: tu URL de Supabase
   - `SUPABASE_ANON_KEY`: tu clave anónima de Supabase
   - `SUPABASE_SERVICE_KEY`: tu clave de servicio de Supabase
   - `DATABASE_URL`: tu URL de conexión a PostgreSQL

7. Haz clic en "Create Web Service".

Render detectará automáticamente el Dockerfile en tu repositorio y lo utilizará para construir y desplegar tu aplicación.

## Endpoints principales

### Autenticación

- `POST /api/auth/register` - Registrar un nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener información del usuario actual (requiere token)

### Usuarios

- `GET /api/users` - Obtener todos los usuarios (requiere token de administrador)
- `GET /api/users/:id` - Obtener un usuario por ID (requiere token)
- `POST /api/users` - Crear un nuevo usuario (requiere token de administrador)
- `PATCH /api/users/:id` - Actualizar un usuario (requiere token)
- `DELETE /api/users/:id` - Eliminar un usuario (requiere token de administrador)

## Integración con el Frontend

El backend está configurado para permitir peticiones CORS desde:
- `http://localhost:5173` (desarrollo local)
- `https://olimpo-gym.onrender.com` (producción)
- Cualquier subdominio de `olimpo-gym.com`

Para cambiar esta configuración, modifica el archivo `src/main.ts`.
# OlimpoWEB-Backend
