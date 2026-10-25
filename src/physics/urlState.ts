/**
 * ONDAS LAB 3D - URL State Serialization & Restoration Utility
 * Handles lossless encoding and decoding of lab selections and slider parameters
 * in URL hashes and query parameters, enabling full shareability and deep-linking.
 */

import { ModuleId, isValidModuleId } from '../types/physics';

export interface ParsedLabUrlState {
  labId: ModuleId | 'home';
  moduleId: ModuleId | null;
  params: Record<string, any>;
}

/**
 * Coerces raw string query parameter value to typed JavaScript primitive:
 * number, boolean, or string.
 */
export function coerceParamValue(rawVal: string): any {
  if (rawVal === 'true') return true;
  if (rawVal === 'false') return false;
  if (rawVal === 'null') return null;
  if (rawVal === 'undefined') return undefined;

  // Check if it's a valid finite number (including scientific notation or decimals)
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(rawVal.trim())) {
    const num = Number(rawVal);
    if (!isNaN(num) && Number.isFinite(num)) {
      return num;
    }
  }

  // Otherwise return decoded string
  return decodeURIComponent(rawVal);
}

/**
 * Serializes a lab ID and slider parameters into a URL hash string.
 * Example: serializeLabUrlState('standing_waves', { harmonic: 2, boundary: 'both_fixed' })
 *       => '#standing_waves?harmonic=2&boundary=both_fixed'
 */
export function serializeLabUrlState(labId: string, params?: Record<string, any>): string {
  if (!labId || labId === 'home') {
    return '';
  }

  if (!params || Object.keys(params).length === 0) {
    return `#${encodeURIComponent(labId)}`;
  }

  const queryParts: string[] = [];
  const sortedKeys = Object.keys(params).sort();

  for (const key of sortedKeys) {
    const val = params[key];
    if (val === undefined || val === null) continue;

    if (typeof val === 'object') {
      // Serialize compact objects (e.g., probe coords {x, y})
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(val))}`);
    } else {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }

  if (queryParts.length === 0) {
    return `#${encodeURIComponent(labId)}`;
  }

  return `#${encodeURIComponent(labId)}?${queryParts.join('&')}`;
}

/**
 * Parses a full URL, query string, or hash string into labId and typed parameters.
 * Supports:
 * - `#standing_waves?harmonic=2&boundary=both_fixed`
 * - `#lab=standing_waves&harmonic=2`
 * - `?module=standing_waves&harmonic=2`
 * - `#standing_waves`
 * - Fallbacks to 'home' on missing or invalid labId.
 */
export function parseLabUrlState(urlOrHash: string): ParsedLabUrlState {
  const result: ParsedLabUrlState = {
    labId: 'home',
    moduleId: null,
    params: {},
  };

  if (!urlOrHash || typeof urlOrHash !== 'string') {
    return result;
  }

  try {
    let rawStr = urlOrHash.trim();

    // If it's a full URL, extract hash and search
    let searchPart = '';
    let hashPart = '';

    if (rawStr.includes('http://') || rawStr.includes('https://') || rawStr.startsWith('/')) {
      const parsedUrl = new URL(rawStr, 'https://ondaslab3d.local');
      searchPart = parsedUrl.search;
      hashPart = parsedUrl.hash;
    } else {
      // It might be just a hash like '#doppler?v=50' or search '?module=doppler'
      if (rawStr.includes('#')) {
        const parts = rawStr.split('#');
        searchPart = parts[0];
        hashPart = '#' + parts.slice(1).join('#');
      } else if (rawStr.startsWith('?')) {
        searchPart = rawStr;
      } else {
        hashPart = '#' + rawStr;
      }
    }

    let detectedLabId: string | null = null;
    let queryParamsString = '';

    // 1. Process hash portion first (primary for SPA client-side deep links)
    if (hashPart && hashPart.length > 1) {
      const cleanHash = hashPart.replace(/^#+/, '');

      if (cleanHash.includes('?')) {
        const [idPart, qPart] = cleanHash.split('?');
        detectedLabId = idPart;
        queryParamsString = qPart;
      } else if (cleanHash.includes('&') || cleanHash.includes('=')) {
        // Hash formatted as query string: e.g. #lab=shm&freq=1.5
        queryParamsString = cleanHash;
      } else {
        detectedLabId = cleanHash;
      }
    }

    // 2. Parse query parameters from hash or search
    const searchParams = new URLSearchParams(queryParamsString || searchPart);

    // If lab wasn't in hash anchor, check query keys: 'lab', 'module', 'id'
    if (!detectedLabId) {
      detectedLabId = searchParams.get('lab') || searchParams.get('module') || searchParams.get('id');
    }

    // Populate parsed parameters object
    searchParams.forEach((val, key) => {
      // Don't duplicate lab identifier into params dictionary
      if (['lab', 'module', 'id'].includes(key)) {
        if (!detectedLabId) detectedLabId = val;
        return;
      }

      // Check if it's a JSON object string
      if (val.startsWith('{') && val.endsWith('}')) {
        try {
          result.params[key] = JSON.parse(val);
          return;
        } catch {
          // Fall through to standard coerce
        }
      }

      result.params[key] = coerceParamValue(val);
    });

    if (detectedLabId && isValidModuleId(detectedLabId)) {
      result.labId = detectedLabId as ModuleId;
      result.moduleId = detectedLabId as ModuleId;
    } else {
      result.labId = 'home';
      result.moduleId = null;
    }
  } catch {
    result.labId = 'home';
    result.moduleId = null;
    result.params = {};
  }

  return result;
}

/**
 * Returns the initial parameter value from URL if available, or fallback.
 */
export function getInitialParamFromUrl<T>(labId: ModuleId, paramKey: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const parsed = parseLabUrlState(window.location.href);
  if (parsed.labId === labId && parsed.params[paramKey] !== undefined) {
    return parsed.params[paramKey] as T;
  }
  return defaultValue;
}

/**
 * Returns full shareable URL with the specified lab and parameters.
 */
export function getShareableUrl(labId: string, params?: Record<string, any>): string {
  if (typeof window === 'undefined') {
    return `https://ondaslab3d.local/${serializeLabUrlState(labId, params)}`;
  }
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}${serializeLabUrlState(labId, params)}`;
}

/**
 * Copies the shareable simulation link to clipboard.
 * Supports modern Clipboard API and legacy fallback.
 */
export async function copyShareableSimulationLink(
  labId: string,
  params?: Record<string, any>
): Promise<boolean> {
  const url = getShareableUrl(labId, params);

  // Modern navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Fallback below
    }
  }

  // Fallback using textarea execCommand
  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch {
    // Both failed
  }

  return false;
}
