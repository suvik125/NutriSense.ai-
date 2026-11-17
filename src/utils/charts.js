// Pure SVG charts & glowing rings matching the dark charcoal + neon lime reference

export function renderCalorieRingSVG({
  consumed = 0,
  target = 2200,
  size = 210,
  strokeWidth = 16,
  label = 'kcal',
  sublabel = '',
  showRemaining = false,
}) {
  const safeTarget = Math.max(1, Number(target) || 2200);
  const safeConsumed = Math.max(0, Number(consumed) || 0);
  const ratio = Math.min(1, safeConsumed / safeTarget);
  const remaining = Math.max(0, safeTarget - safeConsumed);
  const isOver = safeConsumed > safeTarget;

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 270-degree open bottom gauge ring matching top-left reference screenshot!
  const arcFraction = 0.78;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * arcFraction;
  const filledLength = arcLength * ratio;
  const rotation = 130; // starts bottom-left, sweeps clockwise across top to bottom-right

  const displayNumber = showRemaining
    ? new Intl.NumberFormat('en-US').format(Math.round(remaining))
    : new Intl.NumberFormat('en-US').format(Math.round(safeConsumed));

  const ringColor = isOver ? '#F59E0B' : '#B8F527';

  return `
    <div class="relative inline-flex items-center justify-center" style="width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="overflow-visible" aria-hidden="true">
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${r}"
          fill="none"
          stroke="currentColor"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-dasharray="${arcLength} ${circumference}"
          transform="rotate(${rotation} ${cx} ${cy})"
          class="text-zinc-200 dark:text-[#262930]"
        />
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${r}"
          fill="none"
          stroke="${ringColor}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-dasharray="${filledLength} ${circumference}"
          transform="rotate(${rotation} ${cx} ${cy})"
          class="ring-glow transition-all duration-500 ease-out"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <span class="font-display font-bold text-3xl sm:text-4xl tracking-tight tabular-nums text-zinc-900 dark:text-white leading-none">
          ${displayNumber}
        </span>
        <span class="mt-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          ${label}
        </span>
        ${sublabel ? `<span class="mt-1 text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">${sublabel}</span>` : ''}
      </div>
    </div>
  `;
}

export function renderMacroDonutSVG({ proteinG = 140, carbsG = 220, fatG = 68, size = 156 }) {
  const pKcal = Math.max(0, proteinG) * 4;
  const cKcal = Math.max(0, carbsG) * 4;
  const fKcal = Math.max(0, fatG) * 9;
  const total = Math.max(1, pKcal + cKcal + fKcal);

  const pPct = Math.round((pKcal / total) * 100);
  const cPct = Math.round((cKcal / total) * 100);
  const fPct = Math.max(0, 100 - pPct - cPct);

  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const gap = 4;

  const pLen = Math.max(0, (pPct / 100) * circ - gap);
  const cLen = Math.max(0, (cPct / 100) * circ - gap);
  const fLen = Math.max(0, (fPct / 100) * circ - gap);

  const pOffset = 0;
  const cOffset = -((pPct / 100) * circ);
  const fOffset = -(((pPct + cPct) / 100) * circ);

  return `
    <div class="flex flex-col sm:flex-row items-center gap-5">
      <div class="relative shrink-0" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="-rotate-90" aria-hidden="true">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" class="text-zinc-200 dark:text-[#262930]" />
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#B8F527" stroke-width="${strokeWidth}" stroke-linecap="round"
            stroke-dasharray="${pLen} ${circ}" stroke-dashoffset="${pOffset}" class="transition-all duration-300" />
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E4E4E7" stroke-width="${strokeWidth}" stroke-linecap="round"
            stroke-dasharray="${cLen} ${circ}" stroke-dashoffset="${cOffset}" class="transition-all duration-300 dark:opacity-85" />
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#71717A" stroke-width="${strokeWidth}" stroke-linecap="round"
            stroke-dasharray="${fLen} ${circ}" stroke-dashoffset="${fOffset}" class="transition-all duration-300" />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Macro Split</span>
          <span class="font-display font-bold text-lg tabular-nums text-zinc-900 dark:text-white">${pPct}/${cPct}/${fPct}</span>
        </div>
      </div>
      <div class="grid grid-cols-3 sm:grid-cols-1 gap-3 w-full text-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <span class="w-2.5 h-2.5 rounded-full bg-[#B8F527] shrink-0"></span>
            Protein
          </span>
          <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${proteinG}g (${pPct}%)</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <span class="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-200 shrink-0"></span>
            Carbs
          </span>
          <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${carbsG}g (${cPct}%)</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <span class="w-2.5 h-2.5 rounded-full bg-zinc-600 dark:bg-zinc-500 shrink-0"></span>
            Fat
          </span>
          <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${fatG}g (${fPct}%)</span>
        </div>
      </div>
    </div>
  `;
}

export function renderBMIGauge({ bmi = 22.4, category = 'Healthy Weight', gaugePercent = 30 }) {
  const clamped = Math.max(3, Math.min(97, Number(gaugePercent) || 30));
  return `
    <div class="space-y-2.5">
      <div class="flex items-baseline justify-between gap-3">
        <div>
          <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Body Mass Index (approx.)</span>
          <div class="flex items-baseline gap-2.5 mt-0.5">
            <span class="font-display font-bold text-2xl tabular-nums text-zinc-900 dark:text-white">${bmi.toFixed(1)}</span>
            <span class="text-xs font-semibold text-zinc-700 dark:text-[#B8F527]">${category}</span>
          </div>
        </div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">18.5 – 24.9 ref</span>
      </div>
      <div class="relative h-2.5 rounded-full bg-zinc-200 dark:bg-[#262930] overflow-visible">
        <div class="absolute inset-y-0 left-[14%] w-[26%] bg-[#B8F527]/35 rounded-full" title="Healthy reference zone"></div>
        <div
          class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#B8F527] border-2 border-zinc-950 shadow-sm transition-all duration-300"
          style="left: ${clamped}%"
          aria-label="BMI position ${bmi.toFixed(1)}"
        ></div>
      </div>
      <div class="flex justify-between text-[11px] font-mono-num text-zinc-500 dark:text-zinc-400">
        <span>15</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>40</span>
      </div>
    </div>
  `;
}

/**
 * 7-day or 30-day nutrition bar chart with target line (SVG) matching Analytics reference
 */
export function renderNutritionHistorySVG({ series = [], targetCalories = 2200, rangeDays = 7 }) {
  if (!series.length) return '';
  const width = 640;
  const height = 220;
  const padLeft = 44;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 28;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxVal = Math.max(targetCalories * 1.25, ...series.map((d) => d.calories), 1500);
  const yTicks = [0, Math.round(maxVal * 0.5), Math.round(maxVal)];

  const targetY = padTop + plotH - (targetCalories / maxVal) * plotH;
  const stepX = plotW / series.length;
  const barW = Math.max(6, Math.min(28, stepX * (rangeDays === 7 ? 0.52 : 0.62)));

  const gridLines = yTicks
    .map((tick) => {
      const y = padTop + plotH - (tick / maxVal) * plotH;
      return `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="currentColor" stroke-width="1" class="text-zinc-200 dark:text-[#262930]" />
        <text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" class="fill-zinc-500 dark:fill-zinc-400 text-[10px]" style="font-family:var(--font-mono);">${tick}</text>
      `;
    })
    .join('');

  const bars = series
    .map((d, idx) => {
      const barH = Math.max(3, (d.calories / maxVal) * plotH);
      const x = padLeft + idx * stepX + (stepX - barW) / 2;
      const y = padTop + plotH - barH;
      const isToday = idx === series.length - 1;
      const hitTarget = d.calories >= targetCalories * 0.85 && d.calories <= targetCalories * 1.15;
      const fill = isToday ? '#B8F527' : hitTarget ? '#6B7280' : '#3F3F46';
      const showLabel = rangeDays === 7 || idx % 5 === 0 || idx === series.length - 1;

      return `
        <g class="group">
          <rect
            x="${x.toFixed(1)}"
            y="${y.toFixed(1)}"
            width="${barW.toFixed(1)}"
            height="${barH.toFixed(1)}"
            rx="${Math.min(6, barW / 2).toFixed(1)}"
            fill="${fill}"
            class="transition-opacity duration-150 hover:opacity-90"
          >
            <title>${d.label}: ${d.calories} kcal (P ${d.proteinG}g · C ${d.carbsG}g · F ${d.fatG}g)</title>
          </rect>
          ${
            showLabel
              ? `<text x="${(x + barW / 2).toFixed(1)}" y="${height - 8}" text-anchor="middle" class="fill-zinc-500 dark:fill-zinc-400 text-[10px]" style="font-family:var(--font-mono);">${d.shortLabel}</text>`
              : ''
          }
        </g>
      `;
    })
    .join('');

  return `
    <div class="w-full overflow-hidden" data-testid="nutrition-history-chart">
      <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto block" role="img" aria-label="${rangeDays}-day calorie intake chart compared to target">
        ${gridLines}
        ${bars}
        <line
          x1="${padLeft}"
          y1="${targetY.toFixed(1)}"
          x2="${width - padRight}"
          y2="${targetY.toFixed(1)}"
          stroke="#B8F527"
          stroke-width="1.5"
          stroke-dasharray="5 4"
        />
        <text
          x="${width - padRight - 2}"
          y="${Math.max(12, targetY - 5).toFixed(1)}"
          text-anchor="end"
          class="fill-[#658C0A] dark:fill-[#B8F527] text-[10px] font-semibold"
          style="font-family:var(--font-mono);"
        >Target ${targetCalories} kcal</text>
      </svg>
    </div>
  `;
}
