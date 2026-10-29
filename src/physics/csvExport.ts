/**
 * ONDAS LAB 3D - Utilitário de Exportação de Dados em CSV (Padrão Brasileiro)
 * - Separador de colunas: ';'
 * - Separador decimal: ',' (vírgula)
 * - Cabeçalho estruturado com grandezas e unidades entre parênteses
 * - Codificação UTF-8 com BOM (\uFEFF) para compatibilidade nativa com Microsoft Excel e LibreOffice Calc
 */

import { ChartSeries, DataPoint } from '../types/physics';

/**
 * Converte um número para string com vírgula decimal no padrão brasileiro pt-BR.
 * Trata valores indefinidos ou nulos retornando string vazia.
 */
export function formatBrazilianDecimal(val: number | undefined | null, digits: number = 4): string {
  if (val === undefined || val === null || isNaN(val)) return '';
  return val.toFixed(digits).replace('.', ',');
}

/**
 * Gera string CSV formatada no padrão brasileiro.
 * @param data Lista de pontos de dados gravados pela simulação
 * @param series Metadados das grandezas ativas (nome, unidade, chave)
 * @param xLabel Rótulo do eixo temporal ou independente (padrão: "Tempo")
 * @param xUnit Unidade de medida do eixo x (padrão: "s")
 * @param digits Casas decimais para arredondamento (padrão: 4)
 */
export function formatDataToBrazilianCsv(
  data: DataPoint[],
  series: ChartSeries[],
  xLabel: string = 'Tempo',
  xUnit: string = 's',
  digits: number = 4
): string {
  if (!data || data.length === 0) return '';

  // Cabeçalho estruturado com unidades de medida
  const headerCols = [
    `${xLabel}${xUnit ? ` (${xUnit})` : ''}`,
    ...series.map((s) => `${s.label}${s.unit ? ` (${s.unit})` : ''}`),
  ];
  const header = headerCols.join(';');

  // Linhas numéricas com ';' como separador e ',' como vírgula decimal
  const rows = data.map((d) => {
    const xVal = formatBrazilianDecimal(d.t, digits);
    const seriesVals = series.map((s) => {
      const val = d[s.key];
      return formatBrazilianDecimal(val, digits);
    });
    return [xVal, ...seriesVals].join(';');
  });

  // Prefixo UTF-8 Byte Order Mark (\uFEFF) garante abertura sem caracteres corrompidos no Excel
  return '\uFEFF' + [header, ...rows].join('\r\n');
}

/**
 * Dispara o download automático do arquivo CSV gerado no navegador.
 */
export function downloadSimulationCsv(filename: string, csvContent: string): void {
  if (!csvContent || typeof document === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', safeFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
