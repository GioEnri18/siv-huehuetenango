-- SIV Huehuetenango - Database Schema

-- Extensión para uuid y otras utilidades si se requieren (opcional)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- FUNCIONES DE UTILIDAD (Triggers)
-- ==========================================
CREATE OR REPLACE FUNCTION trg_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TABLAS
-- ==========================================

-- 1. Puesto de Salud (Se crea primero para evitar dependencias circulares complejas)
CREATE TABLE puesto_salud (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    comunidad VARCHAR(150) NOT NULL,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER, -- Se vincula luego a usuario
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER -- Se vincula luego a usuario
);

-- 2. Perfil (Roles del sistema)
CREATE TABLE perfil (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    permisos JSONB DEFAULT '{}',
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER
);

-- 3. Usuario
CREATE TABLE usuario (
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

-- Agregar FKs pendientes de creado_por y actualizado_por a puesto_salud y perfil
ALTER TABLE puesto_salud ADD CONSTRAINT fk_puesto_creado_por FOREIGN KEY (creado_por) REFERENCES usuario(id);
ALTER TABLE puesto_salud ADD CONSTRAINT fk_puesto_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuario(id);
ALTER TABLE perfil ADD CONSTRAINT fk_perfil_creado_por FOREIGN KEY (creado_por) REFERENCES usuario(id);
ALTER TABLE perfil ADD CONSTRAINT fk_perfil_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuario(id);

-- 4. Login (Bitácora de sesión)
CREATE TABLE login (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_origen VARCHAR(50),
    resultado VARCHAR(50), -- Exitoso, Fallido
    token_jti VARCHAR(255)
);

-- 5. Perfil Usuario Detalle (Ficha personal)
CREATE TABLE perfil_usuario_detalle (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id) UNIQUE,
    telefono VARCHAR(20),
    dpi VARCHAR(20) UNIQUE,
    cargo VARCHAR(100),
    fecha_ingreso DATE,
    idiomas JSONB DEFAULT '[]', -- ej: ["Español", "Mam"]
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

-- 6. Tutor
CREATE TABLE tutor (
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

-- 7. Niño
CREATE TABLE nino (
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

-- 8. Biológico (Catálogo de vacunas)
CREATE TABLE biologico (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    dosis_totales INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Anulado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por INTEGER REFERENCES usuario(id)
);

-- 9. Esquema Dosis (Calendario)
CREATE TABLE esquema_dosis (
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

-- 10. Dosis Aplicada
CREATE TABLE dosis_aplicada (
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

-- 11. Alerta Rezago
CREATE TABLE alerta_rezago (
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

-- 12. Incidente Dosis (Desperfectos)
CREATE TABLE incidente_dosis (
    id SERIAL PRIMARY KEY,
    biologico_id INTEGER REFERENCES biologico(id),
    lote VARCHAR(50) NOT NULL,
    dosis_aplicada_id INTEGER REFERENCES dosis_aplicada(id), -- Opcional
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

-- 13. Lote Inventario
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

-- 14. Ingreso Vacuna (Recepción y Ticket)
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

-- 15. Salida Vacuna (Egresos y Traslados)
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

-- ==========================================
-- ASIGNACIÓN DE TRIGGERS
-- ==========================================
CREATE TRIGGER trg_puesto_salud_upd BEFORE UPDATE ON puesto_salud FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_perfil_upd BEFORE UPDATE ON perfil FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_usuario_upd BEFORE UPDATE ON usuario FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_perfil_usuario_upd BEFORE UPDATE ON perfil_usuario_detalle FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_tutor_upd BEFORE UPDATE ON tutor FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_nino_upd BEFORE UPDATE ON nino FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_biologico_upd BEFORE UPDATE ON biologico FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_esquema_dosis_upd BEFORE UPDATE ON esquema_dosis FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_dosis_aplicada_upd BEFORE UPDATE ON dosis_aplicada FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_alerta_rezago_upd BEFORE UPDATE ON alerta_rezago FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_incidente_dosis_upd BEFORE UPDATE ON incidente_dosis FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_lote_inventario_upd BEFORE UPDATE ON lote_inventario FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_ingreso_vacuna_upd BEFORE UPDATE ON ingreso_vacuna FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();
CREATE TRIGGER trg_salida_vacuna_upd BEFORE UPDATE ON salida_vacuna FOR EACH ROW EXECUTE FUNCTION trg_actualizar_timestamp();


-- ==========================================
-- PROCEDIMIENTO ALMACENADO (SP)
-- ==========================================
CREATE OR REPLACE FUNCTION sp_registrar_dosis(
    p_nino_id INTEGER,
    p_biologico_id INTEGER,
    p_numero_dosis INTEGER,
    p_fecha DATE,
    p_lote VARCHAR,
    p_usuario_id INTEGER,
    p_puesto_id INTEGER,
    p_sincronizado BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
    v_fecha_nacimiento DATE;
    v_edad_meses INTEGER;
    v_edad_recomendada INTEGER;
    v_intervalo_minimo INTEGER;
    v_ultima_dosis_fecha DATE;
    v_dias_transcurridos INTEGER;
    v_id_dosis_insertada INTEGER;
BEGIN
    -- 1. Obtener fecha de nacimiento del niño
    SELECT fecha_nacimiento INTO v_fecha_nacimiento FROM nino WHERE id = p_nino_id AND estado = 'Activo';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Niño no encontrado o no activo.';
    END IF;

    -- Calcular edad en meses al momento de la aplicación
    v_edad_meses := (EXTRACT(YEAR FROM age(p_fecha, v_fecha_nacimiento)) * 12) + EXTRACT(MONTH FROM age(p_fecha, v_fecha_nacimiento));

    -- 2. Obtener datos del esquema
    SELECT edad_meses_recomendada, intervalo_minimo_dias 
    INTO v_edad_recomendada, v_intervalo_minimo
    FROM esquema_dosis 
    WHERE biologico_id = p_biologico_id AND numero_dosis = p_numero_dosis AND estado = 'Activo';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esquema de dosis no encontrado.';
    END IF;

    -- 3. Validación de edad mínima (asumiendo que edad recomendada es lo mínimo permisible o cercano)
    -- Podríamos flexibilizar esto, pero como regla estricta:
    -- (Opcional) IF v_edad_meses < v_edad_recomendada THEN RAISE EXCEPTION 'El niño no tiene la edad recomendada.'; END IF;

    -- 4. Validación de intervalo si no es la primera dosis
    IF p_numero_dosis > 1 THEN
        SELECT MAX(fecha_aplicacion) INTO v_ultima_dosis_fecha
        FROM dosis_aplicada
        WHERE nino_id = p_nino_id AND biologico_id = p_biologico_id AND estado = 'Activo';

        IF v_ultima_dosis_fecha IS NOT NULL THEN
            v_dias_transcurridos := p_fecha - v_ultima_dosis_fecha;
            IF v_dias_transcurridos < v_intervalo_minimo THEN
                RAISE EXCEPTION 'No se cumple el intervalo mínimo de % días. Días transcurridos: %.', v_intervalo_minimo, v_dias_transcurridos;
            END IF;
        ELSE
            RAISE EXCEPTION 'No se encontró registro de la dosis anterior.';
        END IF;
    END IF;

    -- 5. Insertar la dosis
    INSERT INTO dosis_aplicada (
        nino_id, biologico_id, numero_dosis, fecha_aplicacion, lote, usuario_id, puesto_id, sincronizado, creado_por, actualizado_por
    ) VALUES (
        p_nino_id, p_biologico_id, p_numero_dosis, p_fecha, p_lote, p_usuario_id, p_puesto_id, p_sincronizado, p_usuario_id, p_usuario_id
    ) RETURNING id INTO v_id_dosis_insertada;

    -- 6. Resolver alertas de rezago pendientes para este niño y vacuna
    UPDATE alerta_rezago
    SET estado = 'Resuelta', actualizado_en = CURRENT_TIMESTAMP, actualizado_por = p_usuario_id
    WHERE nino_id = p_nino_id AND biologico_id = p_biologico_id AND estado IN ('Pendiente', 'En seguimiento');

    RETURN v_id_dosis_insertada;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- DATOS INICIALES
-- ==========================================

-- Perfiles
INSERT INTO perfil (nombre, permisos) VALUES
('Administrador', '{"all": true}'),
('Director de Área', '{"reportes": true, "usuarios": false, "dosis": false}'),
('Estadígrafo', '{"reportes": true, "dosis": false, "alertas": true}'),
('Enfermero', '{"reportes": false, "dosis": true, "pacientes": true, "alertas": true}');

-- Biológicos Básicos
INSERT INTO biologico (id, nombre, dosis_totales) VALUES
(1, 'BCG', 1),
(2, 'Hepatitis B', 1),
(3, 'Pentavalente', 3),
(4, 'Neumococo', 3),
(5, 'Rotavirus', 2),
(6, 'SPR', 2),
(7, 'DPT Refuerzo', 2);
-- Reseteo de secuencia manual porque insertamos con ID explícito
SELECT setval('biologico_id_seq', 7);

-- Esquema Dosis Básico (Valores aproximados estándar)
INSERT INTO esquema_dosis (biologico_id, numero_dosis, edad_meses_recomendada, intervalo_minimo_dias) VALUES
(1, 1, 0, 0),    -- BCG: Recién nacido
(2, 1, 0, 0),    -- Hep B: Recién nacido (primeras 24h)
(3, 1, 2, 0),    -- Penta 1: 2 meses
(3, 2, 4, 28),   -- Penta 2: 4 meses, min 4 semanas
(3, 3, 6, 28),   -- Penta 3: 6 meses, min 4 semanas
(4, 1, 2, 0),    -- Neumo 1: 2 meses
(4, 2, 4, 28),   -- Neumo 2: 4 meses
(4, 3, 12, 168), -- Neumo Refuerzo: 12 meses (aprox 6 meses despues de la 2da)
(5, 1, 2, 0),    -- Rota 1: 2 meses
(5, 2, 4, 28),   -- Rota 2: 4 meses
(6, 1, 12, 0),   -- SPR 1: 12 meses
(6, 2, 18, 168), -- SPR 2: 18 meses (6 meses depsues)
(7, 1, 18, 0),   -- DPT 1er Refuerzo: 18 meses
(7, 2, 48, 0);   -- DPT 2do Refuerzo: 4 años
