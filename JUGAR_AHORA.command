#!/bin/bash
# JUGAR_AHORA ya NO usa Craco ni el puerto 3000 (era la fuente de fallos).
# Hace lo mismo que PROBAR_JUEGO_MAC: compila el front y sirve todo en :8000.

ROOT="$(cd "$(dirname "$0")" && pwd)"
exec bash "$ROOT/PROBAR_JUEGO_MAC.command"
