# 100 LCDE Dijeron

Juego tipo *100 Mexicanos Dijeron* con dos vistas en dispositivos distintos:

- **Presentador** (`/`): ve todas las respuestas y controla el juego. Pide PIN.
- **Pantalla pública** (`/pantalla`): solo muestra lo que ya se reveló. Las respuestas ocultas nunca salen del servidor hacia esta pantalla.

## Correrlo en tu computadora (Visual Studio Code)

Necesitas [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm start
```

La terminal mostrará las direcciones. En la misma computadora:

- Presentador: http://localhost:3000/
- Pantalla: http://localhost:3000/pantalla

Para conectar **otros dispositivos** (celular, tablet, otra laptop, TV con navegador), deben estar en la **misma red Wi-Fi**. Abre en ellos la dirección con la IP que imprime la terminal, por ejemplo `http://192.168.1.20:3000/pantalla`. Si Windows pregunta por el firewall, permite el acceso en redes privadas.

El PIN por defecto es `lcde`. Cámbialo:

```bash
# Windows (PowerShell)
$env:ADMIN_PIN="miPinSecreto"; npm start
# Mac / Linux
ADMIN_PIN=miPinSecreto npm start
```

En la pantalla pública toca una vez para activar el sonido (los navegadores lo exigen).

## Subirlo a la web

GitHub por sí solo (GitHub Pages) **no sirve** para esto porque solo hospeda páginas estáticas y aquí se necesita un servidor. Sube el código a un repositorio de GitHub y conéctalo a un servicio que ejecute Node, por ejemplo Render, Railway o Fly.io.

Ejemplo con Render:

1. Sube esta carpeta a un repositorio (`git init`, `git add .`, `git commit`, `git push`).
2. En Render crea un **Web Service** desde ese repositorio.
3. Build command: `npm install`. Start command: `npm start`.
4. En *Environment* agrega la variable `ADMIN_PIN` con tu PIN.
5. Usa la URL pública que te dé: `https://tu-app.onrender.com/` (presentador) y `https://tu-app.onrender.com/pantalla`.

Nota: en los planes gratuitos de estos servicios el servidor puede dormirse tras un rato sin uso y tardar en despertar. Abre la página unos minutos antes del evento. Además el estado del juego se guarda en `state.json`, que en algunos servicios gratuitos se borra al reiniciar.

## Estructura

```
server.js        servidor HTTP + WebSocket (PIN, sincronización, ocultar respuestas)
ejemplo.json     preguntas de ejemplo (solo las recibe el presentador)
public/index.html   el juego completo (presentador y pantalla)
```
