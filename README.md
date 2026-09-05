# SIV Huehuetenango

Sistema Web para el Control de Inmunización Infantil en los Puestos de Salud de la Cabecera Departamental de Huehuetenango, Guatemala.

## Objetivo
Digitalizar el registro nominal de vacunación infantil (0-6 años), reemplazando el registro en papel, para reducir la deserción vacunal y acelerar la generación de reportes.

## Arquitectura
- **Frontend:** React + Vite (Soporte Offline-First planeado para PWA)
- **Backend:** Node.js + Express
- **Base de Datos:** PostgreSQL
- **Infraestructura:** Docker Compose

## Roles del Sistema
- Administrador
- Director de Área
- Estadígrafo
- Enfermero

## Instrucciones de Instalación y Ejecución

### Opción 1: Unificada con un solo comando (Recomendada)
Desde la raíz del proyecto, simplemente ejecuta:
```bash
npm run dev
```
o ejecuta el archivo `iniciar.bat` haciendo doble clic.
Esto iniciará simultáneamente el Backend (puerto 3000) y el Frontend (puerto 5173).

### Opción 2: Usando Docker

1. Clonar o descargar el repositorio.
2. Abrir una terminal en la raíz del proyecto.
3. Ejecutar:
   ```bash
   docker-compose up --build
   ```
4. El sistema estará disponible en:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Base de Datos: localhost:5432

### Opción 2: Instalación Local (Sin Docker)
Requiere tener instalados PostgreSQL, Node.js (v18+) y NPM.

**1. Base de Datos:**
- Crea una base de datos en PostgreSQL llamada `siv_huehuetenango`.
- Ejecuta el script de inicialización ubicado en `database/schema.sql`.

**2. Backend:**
- Ve a la carpeta `backend/`.
- Copia el archivo `.env.example` a `.env` y ajusta las credenciales de tu base de datos local.
- Instala dependencias y ejecuta el servidor:
  ```bash
  cd backend
  npm install
  npm run dev
  ```

**3. Frontend:**
- Ve a la carpeta `frontend/`.
- Instala dependencias y ejecuta el entorno de desarrollo:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- El frontend estará disponible en http://localhost:5173.

## Notas Adicionales
- **Baja Lógica:** Todos los registros eliminados se mantienen en la base de datos con el campo `estado = 'Anulado'`, garantizando la integridad referencial y de auditoría.
- **Alertas de Rezago:** Un cron job nocturno se encarga de analizar los esquemas de dosis aplicadas contra la edad del niño para generar alertas preventivas o críticas de rezago.
