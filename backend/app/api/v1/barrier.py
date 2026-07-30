"""
Simulador visual de barrera para pruebas locales.

Endpoints:
  POST /api/v1/barrier/trigger     <- recibe la senal del backend (webhook)
  GET  /api/v1/barrier/events      <- SSE stream para el simulador (EventSource)
  GET  /api/v1/barrier/simulator   <- sirve la pagina HTML del simulador

Uso:
  1. Abrir http://localhost:8000/api/v1/barrier/simulator en el PC
  2. Configurar el webhook del dispositivo a http://localhost:8000/api/v1/barrier/trigger
  3. Cuando el backend detecte un vehiculo autorizado, la barrera animada sube
"""

import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Literal

from app.api.v1.auth import require_scanner, require_staff
from app.db.models import Usuario
from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

router = APIRouter()

# Cola global de eventos (max 20 para evitar memoria ilimitada)
_event_queue: asyncio.Queue = asyncio.Queue(maxsize=20)


class BarrierTriggerPayload(BaseModel):
    action: Literal["open"] = "open"
    direction: Literal["ENTRADA", "SALIDA"] = "ENTRADA"


@router.post("/trigger", summary="Señal de apertura de barrera")
async def trigger_barrier(
    payload: BarrierTriggerPayload,
    _: Usuario = Depends(require_scanner),
):
    """Recibe la señal del backend y la propaga al simulador via SSE."""
    event = await enqueue_barrier_event(payload.direction, payload.action)
    return {"ok": True, "queued": event}


async def enqueue_barrier_event(
    direction: str,
    action: str = "open",
) -> dict[str, str]:
    event = {
        "direction": direction,
        "action": action,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    # No bloquear si la cola está llena (drop silencioso del evento más antiguo)
    if _event_queue.full():
        try:
            _event_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
    await _event_queue.put(event)
    return event


@router.get("/events", summary="SSE stream del simulador de barrera")
async def barrier_events(_: Usuario = Depends(require_staff)):
    """Streaming SSE para que el simulador reciba eventos en tiempo real."""

    async def generate() -> AsyncGenerator[str, None]:
        # Enviar ping inicial para confirmar conexion
        yield "data: {\"type\":\"connected\"}\n\n"
        while True:
            try:
                event = await asyncio.wait_for(_event_queue.get(), timeout=25.0)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Keepalive cada 25s para que el cliente no cierre la conexion
                yield ": keepalive\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ─── HTML del simulador ────────────────────────────────────────────────────────
_SIMULATOR_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🚧 Simulador de Barrera — Lector de Placas UAGRM</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0f1e;
    --card: #111827;
    --border: rgba(255,255,255,0.08);
    --entry: #22c55e;
    --exit: #3b82f6;
    --closed: #94a3b8;
    --text: #f1f5f9;
    --muted: #64748b;
  }

  body {
    font-family: 'Inter', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 2rem 1rem;
  }

  header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  header .eyebrow {
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 0.5rem;
  }

  header h1 {
    font-size: 1.6rem;
    font-weight: 800;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* ── Tarjeta barrera ─────────────────────────────── */
  .barrier-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 2.5rem 3rem;
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }

  /* ── Barrera visual ─────────────────────────────── */
  .barrier-scene {
    width: 100%;
    height: 180px;
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  /* Poste vertical */
  .barrier-post {
    width: 18px;
    height: 130px;
    background: linear-gradient(180deg, #475569 0%, #1e293b 100%);
    border-radius: 6px 6px 0 0;
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
  }

  /* Brazo de la barrera */
  .barrier-arm {
    width: 220px;
    height: 14px;
    border-radius: 7px;
    background: repeating-linear-gradient(
      90deg,
      #ef4444 0px, #ef4444 30px,
      #f1f5f9 30px, #f1f5f9 50px
    );
    position: absolute;
    bottom: 113px;
    left: 50%;
    transform-origin: left center;
    transform: translateX(0%) rotate(0deg);
    transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 3;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }

  .barrier-arm.open-entry {
    background: repeating-linear-gradient(
      90deg,
      #22c55e 0px, #22c55e 30px,
      #f1f5f9 30px, #f1f5f9 50px
    );
    transform: rotate(-90deg);
    box-shadow: 0 0 20px rgba(34,197,94,0.5);
  }

  .barrier-arm.open-exit {
    background: repeating-linear-gradient(
      90deg,
      #3b82f6 0px, #3b82f6 30px,
      #f1f5f9 30px, #f1f5f9 50px
    );
    transform: rotate(-90deg);
    box-shadow: 0 0 20px rgba(59,130,246,0.5);
  }

  /* Suelo */
  .barrier-ground {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, transparent, #334155, transparent);
    border-radius: 3px;
  }

  /* ── Badge de estado ────────────────────────────── */
  .status-badge {
    padding: 0.6rem 1.5rem;
    border-radius: 99px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-badge.waiting {
    background: rgba(148,163,184,0.1);
    color: var(--muted);
    border: 1px solid rgba(148,163,184,0.2);
  }

  .status-badge.entry {
    background: rgba(34,197,94,0.15);
    color: var(--entry);
    border: 1px solid rgba(34,197,94,0.3);
    animation: pulse-entry 2s infinite;
  }

  .status-badge.exit {
    background: rgba(59,130,246,0.15);
    color: var(--exit);
    border: 1px solid rgba(59,130,246,0.3);
    animation: pulse-exit 2s infinite;
  }

  @keyframes pulse-entry {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); }
    50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  }

  @keyframes pulse-exit {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.3); }
    50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
  }

  /* ── Dot indicador conexión SSE ─────────────────── */
  .conn-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #ef4444;
    transition: background 0.3s;
  }
  .conn-dot.connected { background: #22c55e; }

  /* ── Historial ───────────────────────────────────── */
  .history-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    width: 100%;
    max-width: 480px;
  }

  .history-card h2 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
  }

  .history-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
    font-size: 0.8rem;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .history-item .dir-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 99px;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .history-item .dir-badge.entry { background: rgba(34,197,94,0.15); color: var(--entry); }
  .history-item .dir-badge.exit  { background: rgba(59,130,246,0.15); color: var(--exit); }

  .empty-history {
    color: var(--muted);
    font-size: 0.85rem;
    text-align: center;
    padding: 1rem 0;
  }

  .conn-info {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--muted);
    margin-top: 0.5rem;
  }
</style>
</head>
<body>

<header>
  <p class="eyebrow">Sistema Universitario · Lector de Placas UAGRM</p>
  <h1>🚧 Simulador de Barrera</h1>
</header>

<div class="barrier-card">
  <!-- Escena de la barrera -->
  <div class="barrier-scene">
    <div class="barrier-post"></div>
    <div class="barrier-arm" id="barrierArm"></div>
    <div class="barrier-ground"></div>
  </div>

  <!-- Badge de estado -->
  <div class="status-badge waiting" id="statusBadge">
    <span>⏳</span>
    <span id="statusText">Esperando vehículo...</span>
  </div>

  <!-- Indicador de conexión SSE -->
  <div class="conn-info">
    <div class="conn-dot" id="connDot"></div>
    <span id="connLabel">Conectando al servidor...</span>
  </div>
</div>

<!-- Historial de eventos -->
<div class="history-card">
  <h2>Historial de Accesos</h2>
  <ul class="history-list" id="historyList">
    <li class="empty-history" id="emptyMsg">No hay eventos registrados aún.</li>
  </ul>
</div>

<script>
  const arm = document.getElementById('barrierArm');
  const badge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const connDot = document.getElementById('connDot');
  const connLabel = document.getElementById('connLabel');
  const historyList = document.getElementById('historyList');
  const emptyMsg = document.getElementById('emptyMsg');

  let closeTimer = null;
  const history = [];

  function openBarrier(direction) {
    const isEntry = direction === 'ENTRADA';
    
    // Animar brazo
    arm.className = 'barrier-arm ' + (isEntry ? 'open-entry' : 'open-exit');

    // Actualizar badge
    badge.className = 'status-badge ' + (isEntry ? 'entry' : 'exit');
    statusText.textContent = isEntry ? '✅ ACCESO AUTORIZADO — INGRESO' : '🔵 ACCESO AUTORIZADO — SALIDA';

    // Auto-cerrar después de 4 segundos
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      arm.className = 'barrier-arm';
      badge.className = 'status-badge waiting';
      statusText.textContent = '⏳ Esperando vehículo...';
    }, 4000);
  }

  function addHistory(direction, ts) {
    const isEntry = direction === 'ENTRADA';
    const date = new Date(ts);
    const time = date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    history.unshift({ direction, time });
    if (history.length > 10) history.pop();

    if (emptyMsg) emptyMsg.remove();
    historyList.innerHTML = '';
    history.forEach(h => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <span class="dir-badge ${h.direction === 'ENTRADA' ? 'entry' : 'exit'}">${h.direction}</span>
        <span style="color:#94a3b8">${h.time}</span>
      `;
      historyList.appendChild(li);
    });
  }

  // ── Conexión SSE ──────────────────────────────────
  function connectSSE() {
    const evtSource = new EventSource('/api/v1/barrier/events');

    evtSource.onopen = () => {
      connDot.className = 'conn-dot connected';
      connLabel.textContent = 'Conectado al servidor — esperando señal';
    };

    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected') return; // ping inicial
        if (data.action === 'open') {
          openBarrier(data.direction || 'ENTRADA');
          addHistory(data.direction || 'ENTRADA', data.ts);
        }
      } catch (_) {}
    };

    evtSource.onerror = () => {
      connDot.className = 'conn-dot';
      connLabel.textContent = 'Desconectado — reintentando...';
      evtSource.close();
      setTimeout(connectSSE, 3000); // Reintentar en 3s
    };
  }

  connectSSE();
</script>
</body>
</html>
"""


@router.get("/simulator", response_class=HTMLResponse, summary="Simulador visual de barrera")
async def barrier_simulator(_: Usuario = Depends(require_staff)):
    """Página HTML del simulador de barrera. Abre en el navegador del PC."""
    return HTMLResponse(content=_SIMULATOR_HTML)
