-- Función para crear la tabla users si no existe
CREATE OR REPLACE FUNCTION public.create_users_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar si la tabla users existe
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'users'
  ) THEN
    -- Crear la tabla users
    CREATE TABLE public.users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Crear índice para búsquedas por email
    CREATE INDEX idx_users_email ON public.users(email);
    
    -- Establecer permisos
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    -- Política para permitir lectura a usuarios autenticados
    CREATE POLICY "Users are viewable by authenticated users" 
      ON public.users FOR SELECT 
      USING (auth.role() = 'authenticated');
    
    -- Política para permitir inserción a usuarios autenticados
    CREATE POLICY "Users can be inserted by authenticated users" 
      ON public.users FOR INSERT 
      WITH CHECK (auth.role() = 'authenticated');
    
    -- Política para permitir actualización a usuarios autenticados que son dueños del registro
    CREATE POLICY "Users can be updated by owner" 
      ON public.users FOR UPDATE 
      USING (auth.uid() = id);
  END IF;
END;
$$;

-- Función para añadir una columna a la tabla users si no existe
CREATE OR REPLACE FUNCTION public.add_column_to_users(column_name TEXT, column_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Verificar si la columna ya existe
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = add_column_to_users.column_name
  ) INTO column_exists;
  
  -- Si la columna no existe, añadirla
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE public.users ADD COLUMN %I %s', column_name, column_type);
  END IF;
END;
$$;

-- Asegurarse de que la extensión uuid-ossp está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear la tabla users si no existe
SELECT create_users_table();

-- Añadir columnas si no existen
SELECT add_column_to_users('first_name', 'VARCHAR(100)');
SELECT add_column_to_users('last_name', 'VARCHAR(100)');
SELECT add_column_to_users('phone', 'VARCHAR(20)');
SELECT add_column_to_users('is_admin', 'BOOLEAN DEFAULT FALSE');
SELECT add_column_to_users('created_at', 'TIMESTAMPTZ DEFAULT NOW()');
SELECT add_column_to_users('updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
