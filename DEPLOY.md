# Guía de Despliegue VOLT - AWS Cloud

Para que VOLT funcione a escala profesional en AWS, sigue estos pasos:

## 1. Configuración de Base de Datos (Supabase)
*   Crea un proyecto en [Supabase](https://supabase.com).
*   Ejecuta el contenido de `volt/schema.sql` en el SQL Editor de Supabase.
*   Crea un Storage Bucket llamado `onboarding-docs` y ponlo como público (o configura políticas de lectura).

## 2. Preparación para AWS (App Runner - Recomendado)
AWS App Runner es la forma más rápida y moderna de desplegar contenedores.

### Pasos:
1.  **Sube el código a GitHub:** Crea un repo privado con la carpeta `volt/`.
2.  **AWS Console:** Busca "App Runner" > "Create Service".
3.  **Source:** Selecciona "Source code repository" y conecta tu GitHub.
4.  **Runtime:** Selecciona `Node.js 18`.
5.  **Build Command:** `npm install`
6.  **Start Command:** `node server.js`
7.  **Environment Variables:** Agrega todas las que están en `.env.example`.
8.  **Networking:** Asegúrate de que el puerto sea `3000`.

## 3. Configuración de Mercado Pago
*   Obtén tu `Access Token` desde el panel de desarrolladores de Mercado Pago.
*   Configura el Webhook en Mercado Pago apuntando a: `https://tu-url-de-aws.aws.com/api/webhook`.
*   Evento a escuchar: `payment`.

---
*VOLT - Cloud Architecture by Senior Fullstack Agent*
