import asyncio
import os
import sys
import uvicorn
from dotenv import load_dotenv

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

# Forzar el uso de SelectorEventLoop en Windows antes de iniciar Uvicorn.
# Esto es necesario porque psycopg (el driver de Postgres) en modo asíncrono
# no es compatible con el ProactorEventLoop por defecto en Windows.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

if __name__ == "__main__":
    host = os.environ["BACKEND_HOST"]
    port = int(os.environ["BACKEND_PORT"])
    reload = os.getenv("DEBUG", "true").lower() in ("true", "1", "t", "y", "yes")
    
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)

