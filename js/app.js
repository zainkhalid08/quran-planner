/**
 * @file app.js
 * @description Main application entry point for Quran Planner.
 *
 * What is this file for:
 * - Bootstraps the application when the page loads as an ES module.
 *
 * What you can find in this file:
 * - Imports of core lifecycle initializers (`initUIEvents`, `loadSavedPlan`).
 * - Invocation of event listener binding and saved plan restoration from persistent storage.
 */

import { initUIEvents } from './ui/events.js';
import { loadSavedPlan } from './services/plan-service.js';
import { loadPlanFromUrl } from './services/share-service.js';

// Initialize UI events, forms, theme toggles, and tooltips
initUIEvents();

// If URL has a shared plan token, render it; otherwise restore previously saved plan
const loadedFromUrl = loadPlanFromUrl();
if (!loadedFromUrl) {
  loadSavedPlan();
}
