// src/views/scannerView.js
import { icon, renderFoodImage } from '../components/icons.js';
import { store } from '../state/store.js';
import { ANALYZER_PRESETS } from '../data/catalog.js';
import {
  getAllSelectableFoodProfiles,
  resolveNutritionFromKey,
} from '../data/yoloFoodCatalog.js';
import { runDualYoloFoodAnalysis } from '../services/yoloFoodDetector.js';
import { findAllergyConflicts } from '../utils/nutrition.js';
import { showToast } from '../components/toast.js';

function renderBoundingBoxes(boxes = []) {
  if (!boxes || boxes.length === 0) return '';
  return boxes
    .map((b) => {
      const left = Math.round(b.x1 * 100);
      const top = Math.round(b.y1 * 100);
      const width = Math.max(12, Math.round((b.x2 - b.x1) * 100));
      const height = Math.max(12, Math.round((b.y2 - b.y1) * 100));
      const borderColor = b.color || '#B8F527';
      return `
        <div
          class="absolute pointer-events-none transition-all duration-300 z-10"
          style="left:${left}%; top:${top}%; width:${width}%; height:${height}%; border: 2px solid ${borderColor}; border-radius: 12px; box-shadow: 0 0 12px ${borderColor}40;"
        >
          <span
            class="absolute -top-6 left-0 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow"
            style="background:${borderColor}; color:#090A0C;"
          >
            ${b.modelTag}: ${b.label}
          </span>
        </div>
      `;
    })
    .join('');
}

export function renderScannerView(state, ui) {
  const scanner = ui.scannerState;
  const activePreset =
    ANALYZER_PRESETS.find((p) => p.id === scanner.selectedPresetId) || ANALYZER_PRESETS[0];

  const baseResult = scanner.result || activePreset;
  const previewSrc = scanner.customUpload?.dataUrl || activePreset.image;
  const mult = scanner.portionMultiplier || 1;

  const estCalories = Math.round(baseResult.calories * mult);
  const estProtein = Math.round(baseResult.proteinG * mult);
  const estCarbs = Math.round(baseResult.carbsG * mult);
  const estFat = Math.round(baseResult.fatG * mult);
  const estFiber = Math.round(baseResult.fiberG * mult);
  const estSodium = Math.round((baseResult.sodiumMg || 380) * mult);
  const estIron = Math.round((baseResult.ironMg || 2.1) * mult * 10) / 10;

  const conflicts = findAllergyConflicts(baseResult.allergens, state.profile.allergies);
  const summary = scanner.detectionSummary;
  const allSelectableFoods = getAllSelectableFoodProfiles();

  return `
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-1 rounded-full bg-[#B8F527]/15 border border-[#B8F527]/40 text-[11px] font-semibold text-[#658C0A] dark:text-[#B8F527]">
              Model 1: YOLOv8n Pretrained (Food + Dining Bowls)
            </span>
            <span class="px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/40 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
              Model 2: YOLOv8n Custom South Asian &amp; Global Food-20
            </span>
          </div>
          <h1 class="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white mt-2">
            Food Photo Analyzer
          </h1>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl">
            Upload a food photo to run dual YOLOv8n detection, confirm the identified dish &amp; dining bowl, and unlock full macro analysis.
          </p>
        </div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">Dual-YOLO Ensemble · Verify allergens</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Viewfinder & Sample Presets -->
        <div class="lg:col-span-6 rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-6 space-y-5">
          <!-- Viewfinder Drop Zone -->
          <div
            id="scanner-dropzone"
            class="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 group"
          >
            ${renderFoodImage(previewSrc, baseResult.name, 'w-full h-full object-cover')}
            <div class="absolute inset-0 bg-black/20 pointer-events-none"></div>

            <!-- YOLO Bounding Boxes Overlay -->
            ${!scanner.isScanning && summary?.boundingBoxes ? renderBoundingBoxes(summary.boundingBoxes) : ''}

            <!-- Neon Lime Corner Brackets -->
            <div class="absolute inset-4 pointer-events-none">
              <span class="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-[#B8F527] rounded-tl-lg"></span>
              <span class="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-[#B8F527] rounded-tr-lg"></span>
              <span class="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-[#B8F527] rounded-bl-lg"></span>
              <span class="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-[#B8F527] rounded-br-lg"></span>
            </div>

            ${
              scanner.isScanning
                ? `
              <div class="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-20">
                <div class="absolute inset-x-6 top-6 bottom-6 overflow-hidden pointer-events-none">
                  <div class="h-0.5 w-full bg-[#B8F527] shadow-[0_0_16px_#B8F527] scan-beam"></div>
                </div>
                <span class="px-4 py-2 rounded-full bg-zinc-950/90 border border-[#B8F527]/60 text-[#B8F527] text-xs font-semibold text-center">
                  Running YOLOv8n Pretrained + Custom Food-20...
                </span>
              </div>
            `
                : ''
            }
          </div>

          <!-- Upload & Scan CTA Controls -->
          <div class="flex flex-col sm:flex-row gap-3">
            <label
              for="food-file-input"
              class="flex-1 cursor-pointer py-3 px-4 rounded-full border border-dashed border-zinc-300 dark:border-[#343843] bg-zinc-50 dark:bg-[#191C22] hover:border-[#B8F527] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-2 transition-colors"
            >
              ${icon('upload', 'w-4 h-4 text-[#658C0A] dark:text-[#B8F527]')}
              <span>Upload or Drop Photo</span>
              <input id="food-file-input" type="file" accept="image/*" class="sr-only" />
            </label>

            <button
              type="button"
              data-action="run-scan"
              ${scanner.isScanning ? 'disabled' : ''}
              class="py-3 px-6 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] disabled:opacity-60 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              ${icon('scan', 'w-4 h-4')}
              <span>${scanner.isScanning ? 'Analyzing...' : 'Re-Analyze Photo'}</span>
            </button>
          </div>

          <!-- Sample Meal Presets -->
          <div class="space-y-2.5 pt-1">
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Sample Meal Presets</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              ${ANALYZER_PRESETS.map((preset) => {
                const selected = !scanner.customUpload && scanner.selectedPresetId === preset.id;
                return `
                  <button
                    type="button"
                    data-preset="${preset.id}"
                    class="text-left rounded-2xl overflow-hidden border transition-colors ${
                      selected
                        ? 'border-[#B8F527] bg-[#B8F527]/10'
                        : 'border-zinc-200 dark:border-[#262932] bg-zinc-50 dark:bg-[#1A1C22] hover:border-zinc-400'
                    }"
                  >
                    <div class="h-16 overflow-hidden">
                      ${renderFoodImage(preset.image, preset.name, 'w-full h-full object-cover')}
                    </div>
                    <div class="p-2">
                      <p class="text-[11px] font-semibold text-zinc-900 dark:text-white truncate">${preset.name}</p>
                      <p class="text-[10px] font-mono-num text-zinc-500 dark:text-zinc-400">${preset.calories} kcal</p>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Right Column: Step 1 (Confirmation Gate) OR Step 2 (Confirmed Macro Analysis) -->
        <div class="lg:col-span-6 rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] overflow-hidden">
          ${
            scanner.isScanning
              ? `
            <div class="p-6 space-y-5" aria-busy="true">
              <div class="h-6 w-48 rounded-lg skeleton-shimmer"></div>
              <div class="h-16 w-40 rounded-2xl skeleton-shimmer"></div>
              <div class="grid grid-cols-3 gap-3">
                <div class="h-20 rounded-2xl skeleton-shimmer"></div>
                <div class="h-20 rounded-2xl skeleton-shimmer"></div>
                <div class="h-20 rounded-2xl skeleton-shimmer"></div>
              </div>
              <div class="h-28 rounded-2xl skeleton-shimmer"></div>
            </div>
          `
              : scanner.awaitingConfirmation && summary
              ? `
            <!-- STEP 1: DUAL-MODEL DETECTION CONFIRMATION PANEL -->
            <div class="p-6 space-y-5">
              <div class="p-4 rounded-2xl bg-[#B8F527]/10 border border-[#B8F527]/40 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-wider text-[#658C0A] dark:text-[#B8F527]">
                    Step 1 · Confirm Detected Food
                  </span>
                  <span class="text-[11px] font-mono-num text-zinc-500 dark:text-zinc-400">
                    Container: ${summary.containerLabel}
                  </span>
                </div>
                <h2 class="font-display text-xl font-bold text-zinc-950 dark:text-white">
                  Both YOLOv8n models analyzed your photo
                </h2>
                <p class="text-xs text-zinc-600 dark:text-zinc-300">
                  Please verify the detected dish below (or pick the exact match) and click <strong>Confirm &amp; Continue</strong> to calculate calories, macros, and allergen alerts.
                </p>
              </div>

              <!-- Detected Candidates from Dual Models -->
              <div class="space-y-2.5">
                <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Detected Food Candidates (Click to Select):
                </p>
                <div class="space-y-2">
                  ${summary.candidates
                    .map((cand) => {
                      const isChosen =
                        (scanner.selectedCandidateKey || summary.selectedCandidateKey) === cand.key;
                      return `
                        <button
                          type="button"
                          data-candidate-key="${cand.key}"
                          class="w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                            isChosen
                              ? 'border-[#B8F527] bg-[#B8F527]/12 shadow-sm'
                              : 'border-zinc-200 dark:border-[#262932] bg-zinc-50 dark:bg-[#191C22] hover:border-zinc-400'
                          }"
                        >
                          <div>
                            <div class="flex items-center gap-2">
                              <span class="text-sm font-bold text-zinc-950 dark:text-white">${cand.name}</span>
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono-num font-semibold bg-zinc-200 dark:bg-[#262932] text-zinc-800 dark:text-[#B8F527]">
                                ${cand.confidence}% match
                              </span>
                            </div>
                            <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              Detected by: ${cand.modelSource}
                            </p>
                          </div>
                          <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isChosen ? 'border-[#B8F527] bg-[#B8F527] text-zinc-950' : 'border-zinc-400'
                          }">
                            ${isChosen ? '✓' : ''}
                          </div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>

              <!-- Manual Override Dropdown (in case user wants to pick another South Asian/Global dish) -->
              <div class="space-y-1.5 pt-1">
                <label for="manual-food-override" class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Not exact? Override from South Asian &amp; Global Food-20 Catalog:
                </label>
                <select
                  id="manual-food-override"
                  class="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-[#1C1F25] border border-zinc-200 dark:border-[#2B2E36] text-xs font-semibold text-zinc-900 dark:text-white"
                >
                  ${allSelectableFoods
                    .map((item) => {
                      const activeKey = scanner.selectedCandidateKey || summary.selectedCandidateKey;
                      return `<option value="${item.key}" ${activeKey === item.key ? 'selected' : ''}>${item.name} (~${item.calories} kcal)</option>`;
                    })
                    .join('')}
                </select>
              </div>

              <!-- Confirm & Proceed CTA -->
              <div class="pt-2">
                <button
                  type="button"
                  data-action="confirm-detected-food"
                  class="w-full py-3.5 px-6 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  ${icon('check', 'w-4 h-4')}
                  <span>Confirm Food &amp; Load Nutrition Breakdown</span>
                </button>
              </div>
            </div>
          `
              : `
            <!-- STEP 2: CONFIRMED DISH NUTRITION & LOGGING -->
            <div class="p-6 space-y-6">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-medium text-[#658C0A] dark:text-[#B8F527]">
                      Confirmed Dish · ${baseResult.confidence}% confidence
                    </p>
                    ${
                      summary
                        ? `<button type="button" data-action="reopen-confirmation" class="text-[11px] underline text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Change food</button>`
                        : ''
                    }
                  </div>
                  <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white mt-1">${baseResult.name}</h2>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Estimated portion: ${baseResult.portion} (${mult}x)
                  </p>
                </div>

                <!-- Portion Multiplier -->
                <div class="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#1C1F25]">
                  ${[0.5, 1, 1.5]
                    .map(
                      (m) => `
                    <button
                      type="button"
                      data-portion="${m}"
                      class="px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold transition-colors ${
                        mult === m
                          ? 'bg-[#B8F527] text-zinc-950'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }"
                    >${m}x</button>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <!-- Big Neon Calorie Readout -->
              <div class="py-4 px-5 rounded-2xl bg-zinc-50 dark:bg-[#191C22] flex items-baseline justify-between gap-4">
                <div>
                  <span class="font-display text-4xl sm:text-5xl font-bold tabular-nums text-zinc-950 dark:text-[#B8F527]">${estCalories}</span>
                  <span class="ml-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">kcal approx.</span>
                </div>
                <span class="text-xs text-zinc-500 dark:text-zinc-400">${(baseResult.ingredients || []).slice(0, 3).join(', ')}</span>
              </div>

              <!-- 3 Macro Cards -->
              <div class="grid grid-cols-3 gap-3">
                <div class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/70 dark:border-[#262932]">
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">Protein</p>
                  <p class="font-mono-num text-xl font-bold text-zinc-950 dark:text-[#B8F527] mt-1">${estProtein}g</p>
                </div>
                <div class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/70 dark:border-[#262932]">
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">Carbs</p>
                  <p class="font-mono-num text-xl font-bold text-zinc-950 dark:text-white mt-1">${estCarbs}g</p>
                </div>
                <div class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#191C22] border border-zinc-200/70 dark:border-[#262932]">
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">Fat</p>
                  <p class="font-mono-num text-xl font-bold text-zinc-950 dark:text-white mt-1">${estFat}g</p>
                </div>
              </div>

              <!-- Full Nutrition Facts -->
              <div class="rounded-2xl border border-zinc-200 dark:border-[#262932] divide-y divide-zinc-200 dark:divide-[#23262E] text-xs">
                <div class="px-4 py-2.5 flex justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Dietary Fiber</span>
                  <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${estFiber} g</span>
                </div>
                <div class="px-4 py-2.5 flex justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Estimated Sodium</span>
                  <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${estSodium} mg</span>
                </div>
                <div class="px-4 py-2.5 flex justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Estimated Iron</span>
                  <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${estIron} mg</span>
                </div>
              </div>

              <!-- Allergy Warning -->
              ${
                conflicts.length > 0
                  ? `
                <div class="p-3.5 rounded-2xl bg-amber-500/12 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200" role="alert">
                  ${icon('alert', 'w-4 h-4 shrink-0 mt-0.5 text-amber-500')}
                  <div>
                    <p class="font-semibold">Potential Allergy Notice: ${conflicts.join(', ')}</p>
                    <p class="mt-0.5 opacity-90">Visual recognition cannot guarantee ingredient purity or cross-contact safety. Always verify directly.</p>
                  </div>
                </div>
              `
                  : `
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Detected allergens: ${baseResult.allergens?.length ? baseResult.allergens.join(', ') : 'None flagged'}. Visual estimates cannot guarantee absence of trace allergens.
                </p>
              `
              }

              <!-- Meal Type & Add to My Log -->
              <div class="flex flex-col sm:flex-row gap-3 pt-1">
                <label for="scan-meal-type" class="sr-only">Meal slot</label>
                <select
                  id="scan-meal-type"
                  class="px-4 py-3 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] border border-[#B8F527] text-xs font-bold text-zinc-950 shadow-[0_0_16px_rgba(184,245,39,0.45)] focus:outline-none focus:ring-2 focus:ring-[#B8F527] cursor-pointer transition-colors"
                >
                  ${['Breakfast', 'Lunch', 'Snack', 'Dinner']
                    .map(
                      (slot) =>
                        `<option value="${slot}" class="bg-white dark:bg-[#131518] text-zinc-950 dark:text-white font-semibold" ${(scanner.selectedMealType || baseResult.mealType) === slot ? 'selected' : ''}>${slot}</option>`
                    )
                    .join('')}
                </select>
                <button
                  type="button"
                  data-action="add-scanned-log"
                  class="flex-1 py-3 px-6 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  ${icon('plus', 'w-4 h-4')}
                  <span>Add to My Log</span>
                </button>
              </div>
            </div>
          `
          }
        </div>
      </div>
    </div>
  `;
}

async function triggerDualYoloScan(customDataUrl = null, fileName = '') {
  const current = store.getUI().scannerState;
  const activePreset =
    ANALYZER_PRESETS.find((p) => p.id === current.selectedPresetId) || ANALYZER_PRESETS[0];

  const nextCustomUpload = customDataUrl
    ? { dataUrl: customDataUrl, fileName }
    : current.customUpload;

  const targetImageSrc = nextCustomUpload?.dataUrl || activePreset.image;
  const targetFileName = nextCustomUpload?.fileName || activePreset.name;

  store.setUI({
    scannerState: {
      ...current,
      isScanning: true,
      awaitingConfirmation: true,
      isConfirmed: false,
      customUpload: nextCustomUpload,
    },
  });

  try {
    const summary = await runDualYoloFoodAnalysis(targetImageSrc, {
      fileName: targetFileName,
      presetId: current.selectedPresetId,
    });

    const latest = store.getUI().scannerState;
    const topKey = summary.selectedCandidateKey;
    const initialProfile = resolveNutritionFromKey(
      topKey,
      summary.candidates[0]?.confidence || 92,
      summary.containerLabel
    );

    store.setUI({
      scannerState: {
        ...latest,
        isScanning: false,
        awaitingConfirmation: true,
        isConfirmed: false,
        detectionSummary: summary,
        selectedCandidateKey: topKey,
        result: {
          ...initialProfile,
          image: targetImageSrc,
        },
        selectedMealType: initialProfile.mealType,
      },
    });
  } catch (err) {
    console.error('YOLO detection error:', err);
    showToast('Could not analyze photo, showing fallback preset', 'warning');
    const latest = store.getUI().scannerState;
    store.setUI({
      scannerState: {
        ...latest,
        isScanning: false,
        awaitingConfirmation: false,
        isConfirmed: true,
        result: activePreset,
      },
    });
  }
}

export function bindScannerViewEvents(root) {
  // Preset Buttons
  root.querySelectorAll('[data-preset]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-preset');
      const preset = ANALYZER_PRESETS.find((p) => p.id === id) || ANALYZER_PRESETS[0];
      store.setUI({
        scannerState: {
          ...store.getUI().scannerState,
          selectedPresetId: id,
          customUpload: null,
          portionMultiplier: 1,
          selectedMealType: preset.mealType,
          result: preset,
          awaitingConfirmation: false,
          isConfirmed: true,
          detectionSummary: null,
        },
      });
    })
  );

  // Run Scan Button
  root.querySelector('[data-action="run-scan"]')?.addEventListener('click', () => {
    triggerDualYoloScan();
  });

  // Candidate Selection Chips in Step 1
  root.querySelectorAll('[data-candidate-key]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-candidate-key');
      const current = store.getUI().scannerState;
      store.setUI({
        scannerState: {
          ...current,
          selectedCandidateKey: key,
        },
      });
    })
  );

  // Manual Override Dropdown in Step 1
  root.querySelector('#manual-food-override')?.addEventListener('change', (e) => {
    const key = e.target.value;
    const current = store.getUI().scannerState;
    store.setUI({
      scannerState: {
        ...current,
        selectedCandidateKey: key,
      },
    });
  });

  // Confirm Detected Food Button (Moves from Step 1 -> Step 2)
  root.querySelector('[data-action="confirm-detected-food"]')?.addEventListener('click', () => {
    const current = store.getUI().scannerState;
    const summary = current.detectionSummary;
    const chosenKey = current.selectedCandidateKey || summary?.selectedCandidateKey || 'biryani';
    const matchedCand = summary?.candidates?.find((c) => c.key === chosenKey);
    const conf = matchedCand?.confidence || 92;
    const containerLabel = summary?.containerLabel || 'Dining Bowl';

    const confirmedProfile = resolveNutritionFromKey(chosenKey, conf, containerLabel);
    const activePreset =
      ANALYZER_PRESETS.find((p) => p.id === current.selectedPresetId) || ANALYZER_PRESETS[0];

    store.setUI({
      scannerState: {
        ...current,
        awaitingConfirmation: false,
        isConfirmed: true,
        result: {
          ...confirmedProfile,
          image: current.customUpload?.dataUrl || activePreset.image,
        },
        selectedMealType: confirmedProfile.mealType,
      },
    });

    showToast(`Confirmed: ${confirmedProfile.name}`);
  });

  // Reopen Confirmation Link
  root.querySelector('[data-action="reopen-confirmation"]')?.addEventListener('click', () => {
    const current = store.getUI().scannerState;
    store.setUI({
      scannerState: {
        ...current,
        awaitingConfirmation: true,
        isConfirmed: false,
      },
    });
  });

  // Portion Multiplier Buttons
  root.querySelectorAll('[data-portion]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const mult = Number(btn.getAttribute('data-portion')) || 1;
      store.setUI({
        scannerState: {
          ...store.getUI().scannerState,
          portionMultiplier: mult,
        },
      });
    })
  );

  // Meal Slot Selector
  root.querySelector('#scan-meal-type')?.addEventListener('change', (e) => {
    store.setUI({
      scannerState: {
        ...store.getUI().scannerState,
        selectedMealType: e.target.value,
      },
    });
  });

  // File Upload Handler
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      triggerDualYoloScan(reader.result, file.name);
    };
    reader.readAsDataURL(file);
  };

  root.querySelector('#food-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  });

  const dropzone = root.querySelector('#scanner-dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('ring-2', 'ring-[#B8F527]');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('ring-2', 'ring-[#B8F527]');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('ring-2', 'ring-[#B8F527]');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    });
  }

  // Add to My Log
  root.querySelector('[data-action="add-scanned-log"]')?.addEventListener('click', async () => {
    const scanner = store.getUI().scannerState;
    const preset =
      ANALYZER_PRESETS.find((p) => p.id === scanner.selectedPresetId) || ANALYZER_PRESETS[0];
    const base = scanner.result || preset;
    const mult = scanner.portionMultiplier || 1;

    if (!store.getState().isAuthenticated) {
      store.demoSignIn();
    }

    const saved = await store.addFoodLog({
      name: base.name,
      mealType: scanner.selectedMealType || base.mealType,
      calories: Math.round(base.calories * mult),
      proteinG: Math.round(base.proteinG * mult),
      carbsG: Math.round(base.carbsG * mult),
      fatG: Math.round(base.fatG * mult),
      fiberG: Math.round(base.fiberG * mult),
      portion: `${base.portion} (${mult}x)`,
      image: scanner.customUpload?.dataUrl || base.image,
      confidence: base.confidence,
      allergens: base.allergens,
      source: 'Photo Scan',
    });

    if (!saved) return;
    showToast(`Added ${base.name} to My Foods`);
    store.setView('myfoods');
  });
}
