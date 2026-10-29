import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChartSeries, DataPoint } from '../../types/physics';
import { Download, Table, Eye, EyeOff } from 'lucide-react';
import { formatDataToBrazilianCsv, downloadSimulationCsv } from '../../physics/csvExport';

interface ScientificChartProps {
  data: DataPoint[];
  series: ChartSeries[];
  currentTime: number;
  xLabel?: string;
  xUnit?: string;
  height?: number;
  title?: string;
}

export const ScientificChart: React.FC<ScientificChartProps> = ({
  data,
  series,
  currentTime,
  xLabel = 'Tempo',
  xUnit = 's',
  height = 180,
  title = 'Gráficos Cinemáticos e Energéticos Sincronizados',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    series.forEach((s) => {
      map[s.key] = true;
    });
    return map;
  });

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // CSV Export no padrão brasileiro (; e vírgula decimal)
  const exportCSV = () => {
    if (data.length === 0) return;
    const csvContent = formatDataToBrazilianCsv(data, series, xLabel, xUnit);
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    downloadSimulationCsv(`ondas_lab_${safeTitle}_${Date.now()}.csv`, csvContent);
  };

  // Find min/max values
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (data.length === 0) {
      return { xMin: 0, xMax: 10, yMin: -1, yMax: 1 };
    }
    const xMin = data[0].t;
    const xMax = Math.max(data[data.length - 1].t, xMin + 1);

    let yMin = Infinity;
    let yMax = -Infinity;

    data.forEach((pt) => {
      series.forEach((s) => {
        if (activeSeries[s.key] && pt[s.key] !== undefined) {
          const val = pt[s.key];
          if (val < yMin) yMin = val;
          if (val > yMax) yMax = val;
        }
      });
    });

    if (yMin === Infinity || yMax === -Infinity) {
      yMin = -1;
      yMax = 1;
    }

    // Add 15% padding on Y
    const span = Math.max(0.1, yMax - yMin);
    return {
      xMin,
      xMax,
      yMin: yMin - span * 0.15,
      yMax: yMax + span * 0.15,
    };
  }, [data, series, activeSeries]);

  // Current instantaneous values
  const currentValues = useMemo<Record<string, number>>(() => {
    if (data.length === 0) return {};
    // Find closest index
    let closest = data[0];
    let minDiff = Infinity;
    for (const pt of data) {
      const diff = Math.abs(pt.t - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    return closest as Record<string, number>;
  }, [data, currentTime]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 30;

    const graphW = w - padL - padR;
    const graphH = h - padT - padB;

    // Clear background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, w, h);

    // Coordinate transforms
    const toScreenX = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * graphW;
    const toScreenY = (y: number) => padT + graphH - ((y - yMin) / (yMax - yMin)) * graphH;

    // Grid lines - horizontal
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = yMin + (i / ySteps) * (yMax - yMin);
      const sy = toScreenY(yVal);
      ctx.beginPath();
      ctx.moveTo(padL, sy);
      ctx.lineTo(w - padR, sy);
      ctx.stroke();

      ctx.fillText(yVal.toFixed(2), padL - 8, sy);
    }

    // Grid lines - vertical (time)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
      const xVal = xMin + (i / xSteps) * (xMax - xMin);
      const sx = toScreenX(xVal);
      ctx.beginPath();
      ctx.moveTo(sx, padT);
      ctx.lineTo(sx, h - padB);
      ctx.stroke();

      ctx.fillText(`${xVal.toFixed(1)}${xUnit}`, sx, h - padB + 6);
    }

    // Zero line if inside range
    if (yMin <= 0 && yMax >= 0) {
      const y0 = toScreenY(0);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padL, y0);
      ctx.lineTo(w - padR, y0);
      ctx.stroke();
    }

    // Draw active curves
    series.forEach((s) => {
      if (!activeSeries[s.key] || data.length === 0) return;

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = s.color;

      let started = false;
      for (let i = 0; i < data.length; i++) {
        const pt = data[i];
        if (pt[s.key] !== undefined) {
          const sx = toScreenX(pt.t);
          const sy = toScreenY(pt[s.key]);
          if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }
      ctx.stroke();
    });

    // Draw Synchronized Time Scrubber Marker
    if (currentTime >= xMin && currentTime <= xMax) {
      const scrubX = toScreenX(currentTime);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(scrubX, padT);
      ctx.lineTo(scrubX, h - padB);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top scrubber bead
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(scrubX, padT, 4, 0, Math.PI * 2);
      ctx.fill();

      // Points on active curves
      series.forEach((s) => {
        if (!activeSeries[s.key] || currentValues[s.key] === undefined) return;
        const cy = toScreenY(currentValues[s.key]);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(scrubX, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }, [data, series, activeSeries, currentTime, xMin, xMax, yMin, yMax, xUnit, currentValues]);

  return (
    <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 shadow-lg">
      {/* Top Header & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {title}
          </span>
          <span className="text-xs text-cyan-400 font-mono">
            t = {currentTime.toFixed(2)} {xUnit}
          </span>
        </div>

        {/* Series badges / toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {series.map((s) => {
            const active = activeSeries[s.key];
            const val = currentValues[s.key];
            return (
              <button
                key={s.key}
                onClick={() => toggleSeries(s.key)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors border ${
                  active
                    ? 'bg-slate-800/90 border-slate-700 text-slate-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/50 text-slate-500 opacity-60'
                }`}
                title={`Alternar ${s.label}`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="font-medium">{s.label}:</span>
                <span className="font-mono text-cyan-300">
                  {val !== undefined ? val.toFixed(2) : '--'}
                </span>
                <span className="text-slate-400 text-[10px]">{s.unit}</span>
                {active ? <Eye className="w-3 h-3 text-slate-400 ml-0.5" /> : <EyeOff className="w-3 h-3 text-slate-600 ml-0.5" />}
              </button>
            );
          })}

          {/* Table toggle & CSV export */}
          <button
            onClick={() => setShowTable(!showTable)}
            className={`p-1 rounded text-slate-400 hover:text-white transition-colors border border-slate-800 ${
              showTable ? 'bg-cyan-950/40 border-cyan-800 text-cyan-300' : 'bg-slate-800'
            }`}
            title="Exibir tabela de dados"
            aria-label="Exibir tabela de dados numéricos"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={exportCSV}
            aria-label="Exportar medições em CSV"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-xs cursor-pointer"
            title="Exportar CSV (padrão brasileiro: ';' e vírgula decimal)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Chart */}
      {!showTable ? (
        <div className="relative w-full" style={{ height: `${height}px` }}>
          <canvas ref={canvasRef} className="w-full h-full block rounded" />
        </div>
      ) : (
        <div className="w-full overflow-y-auto max-h-48 text-xs font-mono mt-1 border border-slate-800 rounded">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 sticky top-0 text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-1.5 pl-3">{xLabel} ({xUnit})</th>
                {series.map((s) => (
                  <th key={s.key} className="p-1.5" style={{ color: s.color }}>
                    {s.label} ({s.unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {data.slice(-50).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-1.5 pl-3 text-slate-300">{row.t.toFixed(3)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="p-1.5 text-slate-300">
                      {row[s.key] !== undefined ? row[s.key].toFixed(3) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
