-- SIV Huehuetenango - Database Schema

CREATE OR REPLACE FUNCTION trg_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS puesto_salud (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    comunidad VARCHAR(150) NOT NULL,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER
);

CREATE TABLE IF NOT EXISTS perfil (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    permisos JSONB DEFAULT '{}',
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER
);

CREATE TABLE IF NOT EXISTS usuario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    correo VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    perfil_id INTEGER REFERENCES perfil(id),
    puesto_id INTEGER REFERENCES puesto_salud(id),
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS login (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_origen VARCHAR(50),
    resultado VARCHAR(50),
    token_jti VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS perfil_usuario_detalle (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id) UNIQUE,
    telefono VARCHAR(20),
    dpi VARCHAR(20) UNIQUE,
    cargo VARCHAR(100),
    fecha_ingreso DATE,
    idiomas JSONB DEFAULT '[]',
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS tutor (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    parentesco VARCHAR(50),
    telefono VARCHAR(20),
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS nino (
    id SERIAL PRIMARY KEY,
    cui VARCHAR(15) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(20),
    comunidad VARCHAR(150),
    idioma_materno VARCHAR(50),
    tutor_id INTEGER REFERENCES tutor(id),
    puesto_id INTEGER REFERENCES puesto_salud(id),
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS biologico (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    dosis_totales INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS esquema_dosis (
    id SERIAL PRIMARY KEY,
    biologico_id INTEGER REFERENCES biologico(id),
    numero_dosis INTEGER NOT NULL,
    edad_meses_recomendada INTEGER NOT NULL,
    intervalo_minimo_dias INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id),
    UNIQUE (biologico_id, numero_dosis)
);

CREATE TABLE IF NOT EXISTS dosis_aplicada (
    id SERIAL PRIMARY KEY,
    nino_id INTEGER REFERENCES nino(id),
    biologico_id INTEGER REFERENCES biologico(id),
    numero_dosis INTEGER NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    lote VARCHAR(50),
    usuario_id INTEGER REFERENCES usuario(id),
    puesto_id INTEGER REFERENCES puesto_salud(id),
    sincronizado BOOLEAN DEFAULT FALSE,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS alerta_rezago (
    id SERIAL PRIMARY KEY,
    nino_id INTEGER REFERENCES nino(id),
    biologico_id INTEGER REFERENCES biologico(id),
    dias_atraso INTEGER DEFAULT 0,
    prioridad VARCHAR(20) CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Crítica')),
    estado VARCHAR(30) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En seguimiento', 'Resuelta', 'Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS incidente_dosis (
    id SERIAL PRIMARY KEY,
    biologico_id INTEGER REFERENCES biologico(id),
    lote VARCHAR(50) NOT NULL,
    dosis_aplicada_id INTEGER REFERENCES dosis_aplicada(id),
    puesto_id INTEGER REFERENCES puesto_salud(id),
    tipo_incidente VARCHAR(100) NOT NULL,
    descripcion TEXT,
    cantidad_afectada INTEGER,
    fecha_incidente DATE NOT NULL,
    reportado_por INTEGER REFERENCES usuario(id),
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS lote_inventario (
    id SERIAL PRIMARY KEY,
    biologico_id INTEGER REFERENCES biologico(id),
    codigo_lote VARCHAR(100) NOT NULL,
    fecha_fabricacion DATE,
    fecha_vencimiento DATE NOT NULL,
    dosis_recibidas INTEGER NOT NULL DEFAULT 0,
    dosis_disponibles INTEGER NOT NULL DEFAULT 0,
    puesto_id INTEGER REFERENCES puesto_salud(id),
    fabricante_proveedor VARCHAR(150),
    ubicacion_refrigeracion VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Agotado','Vencido','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id),
    CONSTRAINT unique_lote_puesto UNIQUE (codigo_lote, biologico_id, puesto_id)
);

CREATE TABLE IF NOT EXISTS ingreso_vacuna (
    id SERIAL PRIMARY KEY,
    numero_ticket VARCHAR(50) UNIQUE NOT NULL,
    lote_id INTEGER REFERENCES lote_inventario(id),
    biologico_id INTEGER REFERENCES biologico(id),
    codigo_lote VARCHAR(100) NOT NULL,
    cantidad_dosis INTEGER NOT NULL CHECK (cantidad_dosis > 0),
    cantidad_frascos INTEGER DEFAULT 1,
    dosis_por_frasco INTEGER DEFAULT 1,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    proveedor_origen VARCHAR(150),
    documento_referencia VARCHAR(100),
    puesto_id INTEGER REFERENCES puesto_salud(id),
    recibido_por INTEGER REFERENCES usuario(id),
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'Completado' CHECK (estado IN ('Completado','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS salida_vacuna (
    id SERIAL PRIMARY KEY,
    numero_comprobante VARCHAR(50) UNIQUE NOT NULL,
    lote_id INTEGER REFERENCES lote_inventario(id),
    biologico_id INTEGER REFERENCES biologico(id),
    codigo_lote VARCHAR(100) NOT NULL,
    cantidad_dosis INTEGER NOT NULL CHECK (cantidad_dosis > 0),
    tipo_salida VARCHAR(50) NOT NULL CHECK (tipo_salida IN ('Traslado', 'Vencimiento', 'Ruptura Cadena Frío', 'Ajuste de Inventario', 'Descarte/Dañada', 'Otro')),
    puesto_destino_id INTEGER REFERENCES puesto_salud(id),
    puesto_origen_id INTEGER REFERENCES puesto_salud(id),
    fecha_salida DATE NOT NULL DEFAULT CURRENT_DATE,
    responsable_id INTEGER REFERENCES usuario(id),
    motivo_detalle TEXT,
    estado VARCHAR(20) DEFAULT 'Completado' CHECK (estado IN ('Completado','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

-- Perfiles
INSERT INTO perfil (nombre, permisos) VALUES
('Administrador', '{"all": true}'),
('Director de Área', '{"reportes": true, "usuarios": false, "dosis": false}'),
('Estadígrafo', '{"reportes": true, "dosis": false, "alertas": true}'),
('Enfermero', '{"reportes": false, "dosis": true, "pacientes": true, "alertas": true}')
ON CONFLICT (nombre) DO NOTHING;

-- Biológicos Básicos
INSERT INTO biologico (id, nombre, dosis_totales) VALUES
(1, 'BCG', 1),
(2, 'Hepatitis B', 1),
(3, 'Pentavalente', 3),
(4, 'Neumococo', 3),
(5, 'Rotavirus', 2),
(6, 'SPR', 2),
(7, 'DPT Refuerzo', 2)
ON CONFLICT (nombre) DO NOTHING;

SELECT setval('biologico_id_seq', (SELECT MAX(id) FROM biologico));

-- Esquema Dosis Básico
INSERT INTO esquema_dosis (biologico_id, numero_dosis, edad_meses_recomendada, intervalo_minimo_dias) VALUES
(1, 1, 0, 0),
(2, 1, 0, 0),
(3, 1, 2, 0),
(3, 2, 4, 28),
(3, 3, 6, 28),
(4, 1, 2, 0),
(4, 2, 4, 28),
(4, 3, 12, 168),
(5, 1, 2, 0),
(5, 2, 4, 28),
(6, 1, 12, 0),
(6, 2, 18, 168),
(7, 1, 18, 0),
(7, 2, 48, 0)
ON CONFLICT (biologico_id, numero_dosis) DO NOTHING;
