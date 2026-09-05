# Guía de Despliegue de Producción - SIV Huehuetenango

Esta guía documenta los métodos de despliegue para el **Sistema Web para el Control de Inmunización Infantil de Huehuetenango**.

---

## Opción 1: Despliegue Local / Servidor On-Premise con Docker (Recomendado)

Ideal para centros de salud, puestos de salud o servidores locales del área de salud.

### Requisitos Previos
- Docker Desktop o Docker Engine + Docker Compose v2.

### Pasos para Desplegar:

1. **Abrir la terminal en la raíz del proyecto.**
2. **Ejecutar el comando de compilación e inicio en segundo plano:**
   ```bash
   docker-compose up -d --build
   ```
3. **Verificar el estado de los servicios:**
   ```bash
   docker-compose ps
   ```
4. **Acceder a la aplicación:**
   - **Frontend:** [http://localhost](http://localhost) o [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3000/api/healthcheck](http://localhost:3000/api/healthcheck)

5. **Ver registros/logs de los contenedores:**
   ```bash
   docker-compose logs -f
   ```

6. **Detener la aplicación:**
   ```bash
   docker-compose down
   ```

---

## Opción 2: Despliegue en Servidor VPS Cloud (Ubuntu/Debian)

Ideal si se cuenta con un servidor dedicado o VPS en proveedores como DigitalOcean, Hetzner, AWS, Linode o GCP.

### Pasos:

1. **Instalar Docker y Docker Compose en el servidor VPS:**
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin
   ```

2. **Clonar el proyecto en el servidor:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd siv-huehuetenango
   ```

3. **Configurar Variables de Entorno de Producción:**
   Crear un archivo `.env` en la raíz del backend con credenciales seguras:
   ```env
   DB_HOST=postgres
   DB_USER=siv_prod_user
   DB_PASSWORD=UnaContrasenaSuperSegura2026!
   DB_NAME=siv_huehuetenango
   DB_PORT=5432
   JWT_SECRET=UnTokenJWTMuySeguroYAleatorio12345!
   PORT=3000
   ```

4. **Ejecutar los servicios con Docker Compose:**
   ```bash
   docker compose up -d --build
   ```

5. *(Opcional)* **Configurar HTTPS con Certbot y Nginx Host:**
   Apuntar el nombre de dominio al VPS y generar certificado SSL gratuito con Let's Encrypt.

---

## Opción 3: Despliegue en Plataformas PaaS (Vercel / Render / Supabase)

### 1. Base de Datos (Supabase / Render PostgreSQL)
- Crear una instancia de PostgreSQL en Render, Supabase o Neon.
- Ejecutar el script `database/schema.sql` en la base de datos remota.

### 2. Backend (Render / Railway / Fly.io)
- Crear un nuevo Web Service desde GitHub seleccionando la carpeta `backend/`.
- Comando de instalación: `npm install`
- Comando de inicio: `npm start`
- Configurar las variables de entorno en el panel de control (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, etc.).

### 3. Frontend (Vercel / Netlify)
- Crear un nuevo proyecto importando el repositorio de GitHub seleccionando el subdirectorio `frontend/`.
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Variable de Entorno: `VITE_API_URL` apuntando a la URL pública del backend desplegado.

---

## Lista de Comprobación y Seguridad antes de Producción

- [x] **Compilación de Frontend:** Verificar que `npm run build` ejecute sin errores.
- [ ] **Secretos de Producción:** Cambiar `JWT_SECRET` por una clave única y aleatoria.
- [ ] **Contraseñas de Usuarios:** Asegurarse de actualizar las contraseñas por defecto de los roles de demostración.
- [ ] **Respaldos de Base de Datos:** Configurar tareas cron para respaldos periódicos con `pg_dump`:
  ```bash
  docker exec -t siv_db pg_dump -U postgres siv_huehuetenango > backup_$(date +%Y%m%d).sql
  ```
