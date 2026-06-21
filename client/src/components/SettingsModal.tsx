// Modal de ajustes visuales del tablero. Permite modificar en vivo la
// escala de los tiles, los offsets del tablero y la escala del océano,
// para que el usuario cuadre los PNG a ojo. Los valores se persisten en
// localStorage vía settingsStore.
//
// Incluye un textarea para copiar/pegar la configuración completa en
// formato JSON, útil para compartir ajustes entre sesiones o navegadores.

import { useMemo, useState } from 'react';
import { useSettingsStore } from '../state/settingsStore';
import type { BoardSettings } from '../state/settingsStore';

interface Props {
  onClose: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, hint, onChange }: SliderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm text-slate-200">{label}</label>
        <span className="text-xs tabular-nums text-amber-300 font-mono">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-400 cursor-pointer"
      />
      <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>
    </div>
  );
}

export default function SettingsModal({ onClose }: Props) {
  const s = useSettingsStore();
  // Estado local del textarea. Se sincroniza con el store al copiar/importar.
  // Mantenemos un estado separado para que el usuario pueda editarlo manualmente
  // sin que cada keystroke dispare un cambio en el store.
  const currentJson = useMemo(
    () =>
      JSON.stringify(
        {
          tileScale: s.tileScale,
          offsetX: s.offsetX,
          offsetY: s.offsetY,
          oceanScale: s.oceanScale,
        },
        null,
        2,
      ),
    [s.tileScale, s.offsetX, s.offsetY, s.oceanScale],
  );

  const [jsonText, setJsonText] = useState(currentJson);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentJson);
      setCopyStatus('ok');
      setTimeout(() => setCopyStatus('idle'), 1500);
    } catch {
      setCopyStatus('err');
      setTimeout(() => setCopyStatus('idle'), 1500);
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<BoardSettings>;
      // Validar que las claves existan y sean números.
      const patch: Partial<BoardSettings> = {};
      if (typeof parsed.tileScale === 'number') patch.tileScale = parsed.tileScale;
      if (typeof parsed.offsetX === 'number') patch.offsetX = parsed.offsetX;
      if (typeof parsed.offsetY === 'number') patch.offsetY = parsed.offsetY;
      if (typeof parsed.oceanScale === 'number') patch.oceanScale = parsed.oceanScale;
      s.set(patch);
      setImportStatus('ok');
      setJsonText(JSON.stringify({ ...s, ...patch }, null, 2));
      setTimeout(() => setImportStatus('idle'), 1500);
    } catch {
      setImportStatus('err');
      setTimeout(() => setImportStatus('idle'), 1500);
    }
  };

  const handleSyncTextarea = () => {
    setJsonText(currentJson);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="bg-slate-800 rounded-2xl border border-sky-500/40 p-6 w-96 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-xl text-sky-300 mb-1">Ajustes visuales</h2>
        <p className="text-xs text-slate-400 mb-4">
          Mueve los sliders para cuadrar los tiles con el tablero. Los cambios
          se aplican en vivo y se guardan en el navegador.
        </p>

        <Slider
          label="Escala de tiles"
          value={s.tileScale}
          min={0.5}
          max={2.0}
          step={0.01}
          hint="Tamaño de los PNG de terreno respecto al hex (1 = encaje exacto)."
          onChange={(v) => s.set({ tileScale: v })}
        />

        <Slider
          label="Offset horizontal"
          value={s.offsetX}
          min={-300}
          max={300}
          step={1}
          hint="Desplaza todo el tablero a la izquierda/derecha en píxeles."
          onChange={(v) => s.set({ offsetX: v })}
        />

        <Slider
          label="Offset vertical"
          value={s.offsetY}
          min={-300}
          max={300}
          step={1}
          hint="Desplaza todo el tablero arriba/abajo en píxeles."
          onChange={(v) => s.set({ offsetY: v })}
        />

        <Slider
          label="Offset horizontal del tile"
          value={s.tileOffsetX}
          min={-100}
          max={100}
          step={1}
          hint="Mueve la imagen del PNG dentro del hex (si el arte no está centrado)."
          onChange={(v) => s.set({ tileOffsetX: v })}
        />

        <Slider
          label="Offset vertical del tile"
          value={s.tileOffsetY}
          min={-100}
          max={100}
          step={1}
          hint="Mueve la imagen del PNG dentro del hex (si el arte no está centrado)."
          onChange={(v) => s.set({ tileOffsetY: v })}
        />

        {/* Textarea para copiar/importar la configuración como JSON */}
        <div className="mt-5 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm text-slate-200">Config (JSON)</label>
            <div className="flex gap-1.5">
              <button
                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                onClick={handleSyncTextarea}
                title="Sincronizar el textarea con los valores actuales de los sliders"
              >
                ↻ Sync
              </button>
              <button
                className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs text-white"
                onClick={handleCopy}
              >
                {copyStatus === 'ok' ? '✓ Copiado' : copyStatus === 'err' ? '✗ Error' : 'Copiar'}
              </button>
              <button
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
                onClick={handleImport}
              >
                {importStatus === 'ok' ? '✓ OK' : importStatus === 'err' ? '✗ Error' : 'Importar'}
              </button>
            </div>
          </div>
          <textarea
            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-400 resize-y"
            value={jsonText}
            spellCheck={false}
            onChange={(e) => setJsonText(e.target.value)}
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Edita el JSON y pulsa <strong>Importar</strong> para aplicar. O pulsa <strong>Copiar</strong> para llevarte los valores actuales.
          </p>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <button
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            onClick={s.reset}
          >
            Restablecer
          </button>
          <button
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-900 font-medium text-sm"
            onClick={onClose}
          >
            Hecho
          </button>
        </div>
      </div>
    </div>
  );
}
