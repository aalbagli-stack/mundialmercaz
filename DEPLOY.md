# Guía de Deploy — La Polla Mundialera de la Colonia

## Antes de desplegar: verificar que todo funciona local

1. Abre http://localhost:3456
2. Regístrate con tu email, recibe OTP, entra
3. Verifica que:
   - Recibiste el badge 🔒 Admin (porque tu email está en el SQL)
   - Puedes llenar pronósticos y se guardan (aparece "Guardado ✓" abajo derecha)
   - En "Admin" puedes ingresar resultados reales
   - Si cierras sesión y vuelves a entrar, los datos siguen ahí

---

## Paso 1 — Subir a Netlify (drag & drop, gratis, 2 minutos)

1. Ve a https://app.netlify.com/drop
2. **Arrastra la carpeta completa `polla-mundialera`** al recuadro de Netlify
3. Espera ~30 segundos — te da un link tipo `https://amazing-kadima-abc123.netlify.app`
4. Prueba el link: deberías ver la misma pantalla de login

### Cambiar el nombre del subdominio (opcional)

1. En Netlify: **Site settings → Change site name**
2. Elige algo como `polla-colonia` → queda `https://polla-colonia.netlify.app`

### Conectar dominio propio (opcional)

Si tienes un dominio (ej. `pollacolonia.cl` o `polla.cis.cl`):
1. Netlify → **Domain management → Add custom domain**
2. Te dice los registros DNS que tienes que agregar en tu proveedor de dominio
3. Netlify te da HTTPS gratis automáticamente

---

## Paso 2 — Configurar Supabase para el dominio de producción

Una vez tengas el link de Netlify (ej. `https://polla-colonia.netlify.app`):

1. Ve a tu proyecto en Supabase → **Authentication → URL Configuration**
2. En **Site URL**, pon: `https://polla-colonia.netlify.app`
3. En **Redirect URLs**, agrega:
   - `https://polla-colonia.netlify.app`
   - `http://localhost:3456` (para seguir probando en local)
4. Guarda

Esto es necesario para que los emails de OTP redirijan al dominio correcto.

---

## Paso 3 — Personalizar el email del OTP (opcional pero recomendado)

Para que el email que reciben los participantes se vea más lindo:

1. Supabase → **Authentication → Email Templates → Magic Link**
2. Cambia el Subject a algo como: `Tu código para La Polla Mundialera`
3. El body puede ser algo así (asegúrate que contenga `{{ .Token }}`):

```html
<h2>La Polla Mundialera de la Colonia</h2>
<p>Tu código de acceso es:</p>
<h1 style="font-size: 32px; letter-spacing: 8px; color: #3f9e8a;">{{ .Token }}</h1>
<p>Este código expira en 1 hora.</p>
<p>Si no solicitaste este código, ignora este email.</p>
```

---

## Paso 4 — Compartir con la comunidad

Manda el link a tu grupo de WhatsApp/email. Cada persona:
1. Entra al link
2. Ingresa su email + nombre
3. Recibe OTP, entra
4. Llena su pronóstico

Los datos quedan en la nube. Aunque cambien de dispositivo o borren cookies, entran con su email y ven sus datos.

---

## Actualizar la app después

Si modificas código localmente y quieres actualizar el sitio:
1. Netlify → tu sitio → **Deploys**
2. Arrastra de nuevo la carpeta `polla-mundialera` al área de deploy
3. En ~30 seg está actualizado

---

## Costos

- **Netlify**: gratis hasta 100 GB/mes (tu caso usa <1 GB/mes)
- **Supabase**: gratis hasta 50K usuarios + 500 MB DB (tu caso ~200 usuarios, KB de data)

Todo cero costo para tu uso.

---

## Preguntas frecuentes

**¿Y si quiero agregar otro admin?**
Ejecuta en Supabase SQL Editor:
```sql
update public.profiles set is_admin = true where email = 'otro@email.com';
```

**¿Puedo ver todos los pronósticos sin ser admin?**
Los usuarios normales pueden ver el leaderboard (ranking) y los partidos con sus propios pronósticos, pero no pueden ver los pronósticos detallados de otros. Solo el admin.

**¿Qué pasa si alguien olvida el email con el que se registró?**
Les pides que te digan con qué email entraron. Si no se acuerdan, pueden crearse una cuenta nueva con otro email (perderán el historial anterior).

**¿El admin puede editar los pronósticos de otros?**
Sí, pero respeta el bloqueo por horario: si un partido ya empezó, ni el admin ni nadie puede cambiar ese resultado.

**¿Los pronósticos se bloquean automáticamente?**
Sí, cada partido tiene su fecha/hora exacta del calendario FIFA 2026. Una vez que la hora del partido llega, los inputs se deshabilitan.
