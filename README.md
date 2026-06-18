# BigQuery Release Notes Tracker & Tweeter 🚀

Este proyecto es una aplicación web moderna y ágil que te permite monitorear las notas de versión oficiales de **Google Cloud BigQuery**, filtrar las novedades interactivamente, y publicar borradores optimizados de las actualizaciones en **X (Twitter)** con un solo clic.

---

## 🎨 Características Principales

* **Fragmentación de Novedades**: Divide automáticamente las notas de versión agrupadas de un día en tarjetas de cambios individuales (ej: *Feature*, *Announcement*, *Fix*), permitiéndote seleccionar y compartir de forma precisa.
* **Caché con Tolerancia a Fallos**: Implementa almacenamiento local en [cache.json](./cache.json) con expiración de 1 hora. Si falla la red o el feed de Google Cloud, el backend Flask recurre a la caché y la interfaz notifica de forma visual el modo desconectado.
* **Redactor de Tuits Inteligente**: Genera borradores pre-formateados en español a partir del cambio seleccionado. Normaliza la longitud de los enlaces de acuerdo al estándar de Twitter (donde cualquier enlace consume exactamente 23 caracteres) para evitar exceder el límite de 280 caracteres.
* **Filtrado en Tiempo Real**: Caja de búsqueda interactiva en el cliente que filtra dinámicamente por tipo de badge, fecha o texto libre.
* **Estética Premium**: Interfaz fluida con un diseño oscuro glassmórfico, animaciones CSS personalizadas y notificaciones Toast interactivas.

---

## 🛠️ Tecnologías Utilizadas

* **Backend**: Python 3 con el framework micro [Flask](./app.py) (sin dependencias complejas, usando librerías nativas como `urllib` y `xml.etree`).
* **Frontend**: HTML5 Semántico, CSS3 "Vanilla" (con variables CSS y filtros de desenfoque), y JavaScript "Vanilla" moderno.

---

## 📁 Estructura del Proyecto

```text
├── app.py                  # Servidor Flask, obtención de feed, parsing y caché
├── requirements.txt        # Dependencias de Python (Flask)
├── cache.json              # Caché local generada automáticamente
├── .gitignore              # Archivos y carpetas excluidos de Git
├── templates/
│   └── index.html          # Interfaz principal de usuario en HTML5
└── static/
    ├── css/
    │   └── styles.css      # Sistema de diseño, animaciones y diseño responsivo
    └── js/
        └── app.js          # Control de UI, lógica de Twitter, búsqueda y notificaciones
```

---

## ⚙️ Instalación y Configuración

Sigue estos pasos para ejecutar el proyecto en tu entorno local:

### 1. Activar el Entorno Virtual
El proyecto incluye un entorno virtual de Python pre-configurado en la carpeta `venv/`. Actívalo desde tu terminal:

**En macOS y Linux:**
```bash
source venv/bin/activate
```

**En Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

### 2. Instalar las Dependencias
Una vez activado el entorno virtual, instala Flask ejecutando:

```bash
pip install -r requirements.txt
```

### 3. Iniciar la Aplicación
Arranca el servidor de desarrollo local de Flask:

```bash
python app.py
```

El servidor comenzará a escucharse en:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔄 Funcionamiento de la API

El servidor Flask expone dos endpoints principales en formato JSON:

* **`GET /api/releases`**: Obtiene las notas de versión de la caché local si esta es menor a 1 hora. Si está expirada, descarga el XML original de Google Cloud, lo parsea y actualiza la caché.
* **`GET /api/releases/refresh`**: Fuerza la descarga inmediata del feed XML oficial de Google Cloud, actualizando la caché y retornando la información más reciente al navegador.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
