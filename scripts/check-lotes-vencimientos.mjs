#!/usr/bin/env node
/**
 * Regresion ligera de helpers de lotes/vencimientos (nucleo-lotes-sucursales).
 *
 * MOTIVO: el frontend no tiene runner de tests (no hay vitest ni @vue/test-utils
 * y no se instalan dependencias). Este script usa SOLO tooling ya presente
 * (`typescript` para transpilar en memoria + `node:assert`), asi que la evidencia
 * es "helper unitario", NO TDD estricto de componentes.
 *
 * No es un build de la app: transpila unica y aislada los dos modulos puros.
 *
 * Ejecutar: npm run test:lotes
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const outDir = join(projectRoot, 'node_modules', '.tmp', 'lotes-checks');

const MODULES = {
  producto: 'src/domain/types/producto.ts',
  vencimientos: 'src/application/composables/useAlertasVencimiento.ts',
};

mkdirSync(outDir, { recursive: true });

async function cargarModulo(clave) {
  const relativo = MODULES[clave];
  const fuente = readFileSync(join(projectRoot, relativo), 'utf8');

  const { outputText } = ts.transpileModule(fuente, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      verbatimModuleSyntax: false,
    },
    fileName: relativo,
  });

  const destino = join(outDir, `${clave}.mjs`);
  writeFileSync(destino, outputText, 'utf8');

  return import(pathToFileURL(destino).href);
}

const {
  diasHastaVencimiento,
  diasVencidosAbsolutos,
  esConflictoReconciliacion,
  esFechaVencida,
  etiquetaVencimiento,
  mensajeErrorVenta,
  normalizarAlertasVencimiento: normalizarAlertasConReloj,
  normalizarAsignaciones,
  normalizarResumenVencimientos,
} = await cargarModulo('vencimientos');

const HOY = new Date(2026, 9, 5); // 2026-10-05, hora local
const HOY_ISO = '2026-10-05';
// El fallback de dias debe usar el mismo reloj que las fixtures, no la fecha
// de ejecucion del script. No se modifica el reloj global de la aplicacion.
const normalizarAlertasVencimiento = (raw) => normalizarAlertasConReloj(raw, HOY);

let fallos = 0;
let total = 0;

function prueba(nombre, fn) {
  total += 1;
  try {
    fn();
    console.log(`  ok  ${nombre}`);
  } catch (error) {
    fallos += 1;
    console.error(`FALLA ${nombre}\n      ${error.message}`);
  }
}

console.log('\nR4.3 / R9 — fechas: vencido permitido, nunca bloqueante');

prueba('fecha pasada esta vencida', () => {
  assert.equal(esFechaVencida('2026-09-25', HOY), true);
});

prueba('el dia de hoy NO esta vencido', () => {
  assert.equal(esFechaVencida(HOY_ISO, HOY), false);
});

prueba('fecha futura NO esta vencida', () => {
  assert.equal(esFechaVencida('2026-12-31', HOY), false);
});

prueba('timestamp ISO se trunca a fecha sin corrimiento UTC', () => {
  assert.equal(esFechaVencida('2026-09-25T00:00:00.000Z', HOY), true);
  assert.equal(diasHastaVencimiento('2026-10-20T10:00:00.000Z', HOY), 15);
});

prueba('dias restantes exactos', () => {
  assert.equal(diasHastaVencimiento('2026-11-19', HOY), 45);
  assert.equal(diasHastaVencimiento('2026-09-25', HOY), -10);
});

prueba('dias vencidos siempre positivos', () => {
  assert.equal(diasVencidosAbsolutos('2026-09-25', HOY), 10);
  assert.equal(diasVencidosAbsolutos('2026-11-19', HOY), 0);
});

console.log('\nR9.1 / R9.2 — flags canonicos de lote');

prueba('R9.1 proximoVencimiento + diasParaVencer se respetan', () => {
  const [alerta] = normalizarAlertasVencimiento([
    {
      loteId: 'lote-1',
      numeroLote: 'A-15',
      fechaVencimiento: '2026-11-19',
      productoId: 'prod-1',
      nombreProducto: 'Paracetamol',
      cantidad: 10,
      proximoVencimiento: true,
      diasParaVencer: 45,
      vencido: false,
    },
  ]);

  assert.equal(alerta.tipo, 'proximo');
  assert.equal(alerta.vencido, false);
  assert.equal(alerta.proximoVencimiento, true);
  assert.equal(alerta.diasParaVencer, 45);
  assert.equal(alerta.diasVencido, undefined);
});

prueba('R9.2 vencido + diasVencido se respetan', () => {
  const [alerta] = normalizarAlertasVencimiento([
    {
      loteId: 'lote-2',
      numeroLote: 'B-7',
      fechaVencimiento: '2026-09-25',
      productoId: 'prod-2',
      nombreProducto: 'Amoxicilina',
      cantidad: 4,
      vencido: true,
      diasVencido: 10,
    },
  ]);

  assert.equal(alerta.tipo, 'vencido');
  assert.equal(alerta.vencido, true);
  assert.equal(alerta.proximoVencimiento, false);
  assert.equal(alerta.diasVencido, 10);
  assert.equal(alerta.diasParaVencer, undefined);
});

prueba('R9.3 conserva tipo y mensaje del servidor', () => {
  const [alerta] = normalizarAlertasVencimiento([
    { tipo: 'vencido', loteId: 'lote-3', fechaVencimiento: '2026-09-25', mensaje: 'Lote vencido' },
  ]);

  assert.equal(alerta.tipo, 'vencido');
  assert.equal(alerta.mensaje, 'Lote vencido');
});

prueba('sin diasVencido del servidor se deriva de la fecha (informativo)', () => {
  const [alerta] = normalizarAlertasVencimiento([
    { loteId: 'lote-4', fechaVencimiento: '2026-09-25' },
  ]);

  assert.equal(alerta.diasVencido, 10);
});

prueba('campos fuera de contrato (diasRestantes) se ignoran', () => {
  const [alerta] = normalizarAlertasVencimiento([
    { loteId: 'lote-5', fechaVencimiento: '2026-11-19', diasRestantes: 45 },
  ]);

  assert.equal(alerta.diasParaVencer, 45, 'se deriva de la fecha, no de diasRestantes');
});

prueba('entradas sin fecha utilizable se descartan sin inventar datos', () => {
  const alertas = normalizarAlertasVencimiento([
    { loteId: 'lote-6' },
    { loteId: 'lote-7', fechaVencimiento: 'no-es-fecha' },
    null,
    'basura',
  ]);

  assert.deepEqual(alertas, []);
  assert.deepEqual(normalizarAlertasVencimiento(undefined), []);
});

console.log('\nR6 / R9.4 — asignaciones canonicas en items[].asignaciones');

prueba('asignaciones se normalizan con flags R9', () => {
  const asignaciones = normalizarAsignaciones({
    id: 'item-1',
    asignaciones: [
      {
        loteId: 'lote-9',
        numeroLote: 'C-3',
        fechaVencimiento: '2026-09-25',
        cantidad: 2,
        vencido: true,
        diasVencido: 10,
      },
      {
        loteId: 'lote-10',
        numeroLote: 'C-4',
        fechaVencimiento: '2026-12-01',
        cantidad: 3,
        proximoVencimiento: true,
        diasParaVencer: 57,
      },
    ],
  });

  assert.equal(asignaciones.length, 2);
  assert.equal(asignaciones[0].vencido, true);
  assert.equal(asignaciones[0].diasVencido, 10);
  assert.equal(asignaciones[1].proximoVencimiento, true);
  assert.equal(asignaciones[1].diasParaVencer, 57);
});

prueba('items[].lotes NO es el nombre canonico: no se reinterpreta', () => {
  const asignaciones = normalizarAsignaciones({
    id: 'item-2',
    lotes: [{ loteId: 'lote-11', fechaVencimiento: '2026-09-25', cantidad: 1, vencido: true }],
  });

  assert.deepEqual(asignaciones, []);
});

prueba('no medicamento (R10) sin asignaciones devuelve lista vacia', () => {
  assert.deepEqual(normalizarAsignaciones({ id: 'item-3' }), []);
  assert.deepEqual(normalizarAsignaciones(null), []);
});

console.log('\nR9 — etiquetas visibles');

prueba('badge de vencido muestra dias vencidos', () => {
  assert.equal(
    etiquetaVencimiento({ tipo: 'vencido', vencido: true, diasVencido: 10, diasParaVencer: undefined, fechaVencimiento: '2026-09-25' }),
    'Vencido (10 días)',
  );
});

prueba('badge de proximo vencimiento muestra dias restantes', () => {
  assert.equal(
    etiquetaVencimiento({ tipo: 'proximo', vencido: false, diasVencido: undefined, diasParaVencer: 45, fechaVencimiento: '2026-11-19' }),
    'Próximo a vencer (45 días)',
  );
});

console.log('\nR9 — resumen no bloqueante');

prueba('sin umbral del servidor el resumen no inventa la ventana', () => {
  const alertas = normalizarAlertasVencimiento([
    { loteId: 'lote-12', fechaVencimiento: '2026-09-25' },
    { loteId: 'lote-13', fechaVencimiento: '2026-11-19', proximoVencimiento: true },
  ]);

  const resumen = normalizarResumenVencimientos(null, alertas);

  assert.equal(resumen.diasAlerta, null);
  assert.equal(resumen.totalAlertas, 2);
  assert.equal(resumen.vencidos, 1);
  assert.equal(resumen.proximos, 0);
});

prueba('umbral del servidor se respeta tal cual', () => {
  const resumen = normalizarResumenVencimientos(
    { diasAlerta: 60, totalAlertas: 5, vencidos: 2, proximos: 3 },
    [],
  );

  assert.deepEqual(resumen, { diasAlerta: 60, totalAlertas: 5, vencidos: 2, proximos: 3 });
});

prueba('sin datos no hay resumen que mostrar', () => {
  assert.equal(normalizarResumenVencimientos(undefined, []), null);
});

console.log('\nR1.6 / R7 / R11 — conflicto de reconciliacion');

prueba('409 con mensaje de reconciliacion se detecta', () => {
  assert.equal(
    esConflictoReconciliacion({
      response: { status: 409, data: { message: 'Stock sin saldos de lote reconciliados' } },
    }),
    true,
  );
});

prueba('400 de validacion NO se confunde con reconciliacion', () => {
  assert.equal(
    esConflictoReconciliacion({ response: { status: 400, data: { message: ['cantidad invalida'] } } }),
    false,
  );
});

prueba('el mensaje de reconciliacion explica que no se descontó inventario', () => {
  const mensaje = mensajeErrorVenta({
    response: { status: 409, data: { message: 'reconciliacion pendiente del lote 5' } },
  });

  assert.match(mensaje, /no se desconto inventario/i);
  assert.match(mensaje, /reconciliacion pendiente del lote 5/i);
});

prueba('error generico conserva el mensaje del backend', () => {
  assert.equal(
    mensajeErrorVenta({ response: { status: 500, data: { message: 'Error interno' } } }),
    'Error interno',
  );
});

console.log(`\n${total - fallos}/${total} pruebas OK`);

if (fallos > 0) {
  console.error(`${fallos} prueba(s) fallaron`);
  process.exit(1);
}
