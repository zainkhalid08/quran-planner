/**
 * @file plan-encoder.js
 * @description Pure utility module for obfuscating and parsing Quran reading plans in URLs.
 *
 * What is this file for:
 * - Packs plan configuration ({ days, startSurahIdx, startAyah, startDate }) into a compact, non-readable token.
 * - Safely unpacks and validates tokens when a shared URL is opened, returning sanitized parameters.
 *
 * Format Details:
 * - Payload structure: compact JSON { d: days, s: startSurahIdx, a: startAyah, t: "YYYY-MM-DD" }
 *   (keys 's' and 'a' omitted when default to keep length small).
 * - Transport: Base64URL (URL-safe characters `-` and `_`, no padding `=`).
 */

import { CONSTANTS, SURAHS } from '../data/surahs.js';

/**
 * Converts a standard Base64 string to a URL-safe Base64URL string.
 * @param {string} b64
 * @returns {string}
 */
function toBase64Url(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts a URL-safe Base64URL string back to standard Base64 with padding.
 * @param {string} b64url
 * @returns {string}
 */
function fromBase64Url(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  return b64;
}

/**
 * Encodes plan parameters into an opaque, URL-safe Base64URL token.
 *
 * @param {Object} params
 * @param {number} params.days - Number of days (> 0).
 * @param {number} [params.startSurahIdx=0] - Starting Surah index (0..113).
 * @param {number} [params.startAyah=1] - Starting Ayah within the surah (>= 1).
 * @param {string|Date} [params.startDate] - Start date (ISO or YYYY-MM-DD).
 * @returns {string} Encoded token string.
 */
export function encodePlan(params) {
  if (!params || !params.days || params.days < 1) {
    throw new Error('encodePlan: Invalid plan parameters.');
  }

  const payload = {
    d: Number(params.days)
  };

  const surahIdx = Number(params.startSurahIdx) || 0;
  if (surahIdx > 0 && surahIdx < CONSTANTS.TOTAL_SURAHS) {
    payload.s = surahIdx;
  }

  const ayah = Number(params.startAyah) || 1;
  if (ayah > 1) {
    payload.a = ayah;
  }

  if (params.startDate) {
    const d = params.startDate instanceof Date ? params.startDate : new Date(params.startDate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      payload.t = `${year}-${month}-${day}`;
    }
  }

  const jsonString = JSON.stringify(payload);
  // UTF-8 safe base64 encoding in browser environment
  const base64 = btoa(unescape(encodeURIComponent(jsonString)));
  return toBase64Url(base64);
}

/**
 * Decodes an opaque URL token and validates its contents against Quran structural constraints.
 *
 * @param {string} token - The encoded token string from the URL.
 * @returns {Object|null} Sanitized plan parameters or null if token is corrupted/invalid.
 */
export function decodePlan(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const trimmed = token.trim();
    if (!trimmed) return null;

    const b64 = fromBase64Url(trimmed);
    const jsonString = decodeURIComponent(escape(atob(b64)));
    const payload = JSON.parse(jsonString);

    if (!payload || typeof payload !== 'object') return null;

    // Validate days
    const days = parseInt(payload.d, 10);
    if (isNaN(days) || days < 1 || days > CONSTANTS.TOTAL_AYAHS) {
      return null;
    }

    // Validate startSurahIdx
    let startSurahIdx = 0;
    if (payload.s !== undefined) {
      const parsedSurah = parseInt(payload.s, 10);
      if (!isNaN(parsedSurah) && parsedSurah >= 0 && parsedSurah < CONSTANTS.TOTAL_SURAHS) {
        startSurahIdx = parsedSurah;
      } else {
        return null;
      }
    }

    // Validate startAyah
    let startAyah = 1;
    const maxAyahs = SURAHS[startSurahIdx]?.ayahs || 7;
    if (payload.a !== undefined) {
      const parsedAyah = parseInt(payload.a, 10);
      if (!isNaN(parsedAyah) && parsedAyah >= 1 && parsedAyah <= maxAyahs) {
        startAyah = parsedAyah;
      } else {
        return null;
      }
    }

    // Validate startDate format (YYYY-MM-DD)
    let startDate = null;
    if (payload.t && typeof payload.t === 'string') {
      const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(payload.t);
      if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1;
        const day = parseInt(dateMatch[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          startDate = payload.t;
        }
      }
    }

    return {
      days,
      startSurahIdx,
      startAyah,
      startDate
    };
  } catch (err) {
    console.warn('decodePlan failed to parse token:', err);
    return null;
  }
}
