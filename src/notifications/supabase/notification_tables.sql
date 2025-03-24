-- Crear tipo de enumeración para el tipo de notificación
CREATE TYPE notification_type AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'PUSH');

-- Crear tipo de enumeración para el estado de la notificación
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- Crear tabla de plantillas de notificación
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type notification_type NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  subject VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  whatsapp_template_name VARCHAR(255),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para la tabla de plantillas
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_default ON notification_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notification_templates(name);

-- Crear tabla de notificaciones (registros de notificaciones enviadas)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  user_id UUID REFERENCES auth.users(id),
  membership_id UUID REFERENCES memberships(id),
  template_id UUID REFERENCES notification_templates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para la tabla de notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_membership_id ON notifications(membership_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Crear políticas de seguridad para la tabla de plantillas
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" 
  ON notification_templates
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE role = 'ADMIN'
    )
  );

-- Crear políticas de seguridad para la tabla de notificaciones
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications" 
  ON notifications
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE role = 'ADMIN'
    )
  );

CREATE POLICY "Users can view their own notifications" 
  ON notifications
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Crear función para actualizar el timestamp de actualización
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar automáticamente el timestamp de actualización
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON notification_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunas plantillas predeterminadas
INSERT INTO notification_templates (
  name, 
  description, 
  type, 
  content, 
  variables, 
  subject, 
  is_default,
  whatsapp_template_name
) VALUES (
  'Expiración de Membresía', 
  'Plantilla para notificar a los usuarios sobre la expiración de su membresía', 
  'EMAIL', 
  'Hola {{nombre}},\n\nTe informamos que tu membresía {{tipo_membresia}} en Olimpo Gym ha expirado el {{fecha_expiracion}}.\n\nPuedes renovarla visitando nuestras instalaciones o desde nuestra página web.\n\n¡Esperamos verte pronto!\n\nSaludos,\nEl equipo de Olimpo Gym', 
  ARRAY['nombre', 'tipo_membresia', 'fecha_expiracion'], 
  'Tu membresía ha expirado', 
  TRUE,
  'expiracion_membresia'
);

INSERT INTO notification_templates (
  name, 
  description, 
  type, 
  content, 
  variables, 
  subject, 
  is_default,
  whatsapp_template_name
) VALUES (
  'Expiración de Membresía WhatsApp', 
  'Plantilla para notificar a los usuarios sobre la expiración de su membresía por WhatsApp', 
  'WHATSAPP', 
  'Hola {{nombre}},\n\nTe informamos que tu membresía {{tipo_membresia}} en Olimpo Gym ha expirado el {{fecha_expiracion}}.\n\nPuedes renovarla visitando nuestras instalaciones o desde nuestra página web.\n\n¡Esperamos verte pronto!\n\nSaludos,\nEl equipo de Olimpo Gym', 
  ARRAY['nombre', 'tipo_membresia', 'fecha_expiracion'], 
  NULL, 
  TRUE,
  'expiracion_membresia'
);

INSERT INTO notification_templates (
  name, 
  description, 
  type, 
  content, 
  variables, 
  subject, 
  is_default,
  whatsapp_template_name
) VALUES (
  'Renovación de Membresía', 
  'Plantilla para notificar a los usuarios sobre la renovación de su membresía', 
  'EMAIL', 
  'Hola {{nombre}},\n\nTe informamos que tu membresía {{tipo_membresia}} en Olimpo Gym ha sido renovada exitosamente.\n\nTu nueva fecha de expiración es el {{nueva_fecha_expiracion}}.\n\n¡Gracias por seguir confiando en Olimpo Gym!\n\nSaludos,\nEl equipo de Olimpo Gym', 
  ARRAY['nombre', 'tipo_membresia', 'nueva_fecha_expiracion'], 
  'Tu membresía ha sido renovada', 
  TRUE,
  'renovacion_membresia'
);

INSERT INTO notification_templates (
  name, 
  description, 
  type, 
  content, 
  variables, 
  subject, 
  is_default,
  whatsapp_template_name
) VALUES (
  'Renovación de Membresía WhatsApp', 
  'Plantilla para notificar a los usuarios sobre la renovación de su membresía por WhatsApp', 
  'WHATSAPP', 
  'Hola {{nombre}},\n\nTe informamos que tu membresía {{tipo_membresia}} en Olimpo Gym ha sido renovada exitosamente.\n\nTu nueva fecha de expiración es el {{nueva_fecha_expiracion}}.\n\n¡Gracias por seguir confiando en Olimpo Gym!\n\nSaludos,\nEl equipo de Olimpo Gym', 
  ARRAY['nombre', 'tipo_membresia', 'nueva_fecha_expiracion'], 
  NULL, 
  TRUE,
  'renovacion_membresia'
);

INSERT INTO notification_templates (
  name, 
  description, 
  type, 
  content, 
  variables, 
  subject, 
  is_default,
  whatsapp_template_name
) VALUES (
  'Expiración Próxima de Membresía', 
  'Plantilla para notificar a los usuarios sobre la próxima expiración de su membresía', 
  'EMAIL', 
  'Hola {{nombre}},\n\nTe recordamos que tu membresía {{tipo_membresia}} en Olimpo Gym expirará en {{dias_restantes}} días ({{fecha_expiracion}}).\n\nPara evitar interrupciones en tu acceso al gimnasio, te recomendamos renovar tu membresía antes de la fecha de expiración.\n\n¡Gracias por ser parte de Olimpo Gym!\n\nSaludos,\nEl equipo de Olimpo Gym', 
  ARRAY['nombre', 'tipo_membresia', 'dias_restantes', 'fecha_expiracion'], 
  'Tu membresía expirará pronto', 
  TRUE,
  'expiracion_proxima'
);

INSERT INTO notification_templates (
  name, 
  description, 
  type, 
  content, 
  variables, 
  subject, 
  is_default,
  whatsapp_template_name
) VALUES (
  'Expiración Próxima de Membresía WhatsApp', 
  'Plantilla para notificar a los usuarios sobre la próxima expiración de su membresía por WhatsApp', 
  'WHATSAPP', 
  'Hola {{nombre}},\n\nTe recordamos que tu membresía {{tipo_membresia}} en Olimpo Gym expirará en {{dias_restantes}} días ({{fecha_expiracion}}).\n\nPara evitar interrupciones en tu acceso al gimnasio, te recomendamos renovar tu membresía antes de la fecha de expiración.\n\n¡Gracias por ser parte de Olimpo Gym!\n\nSaludos,\nEl equipo de Olimpo Gym', 
  ARRAY['nombre', 'tipo_membresia', 'dias_restantes', 'fecha_expiracion'], 
  NULL, 
  TRUE,
  'expiracion_proxima'
);
