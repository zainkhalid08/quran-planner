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

// Initialize UI events, forms, theme toggles, and tooltips
initUIEvents();

// Restore any previously generated plan from persistent storage
loadSavedPlan();
