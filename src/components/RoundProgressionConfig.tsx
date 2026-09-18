import React, { useState, useEffect, useMemo } from 'react';
import { GameRules, RoundProgressionMode } from '../types';
import { getMaxCards, getCardSequenceForProgression } from '../utils/pocha';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Triangle,
  Equal,
  Sliders,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Check,
  Info,
} from 'lucide-react';

interface RoundProgressionConfigProps {
  numPlayers: number;
  deckCards: number;
  rules: GameRules;
  onChangeRules: (updatedRules: GameRules) => void;
}

export const RoundProgressionConfig: React.FC<RoundProgressionConfigProps> = ({
  numPlayers,
  deckCards,
  rules,
  onChangeRules,
}) => {
  const maxCards = useMemo(() => getMaxCards(numPlayers, deckCards), [numPlayers, deckCards]);

  const activeMode: RoundProgressionMode = rules.roundProgressionMode || 'standard';
  const constantCards = rules.constantCardsCount || Math.min(5, maxCards);
  const constantRounds = rules.constantRoundsCount || numPlayers * 2;
  const roundsPerLevel = rules.roundsPerLevel || 1;

  // Manual custom sequence state
  const [customSequence, setCustomSequence] = useState<number[]>(() => {
    if (rules.customCardSequence && rules.customCardSequence.length > 0) {
      return rules.customCardSequence;
    }
    // Default initial custom sequence: 1 -> 5 -> 1
    const peak = Math.min(5, maxCards);
    const seq: number[] = [];
    for (let c = 1; c <= peak; c++) seq.push(c);
    for (let c = peak - 1; c >= 1; c--) seq.push(c);
    return seq;
  });

  const [textInputSequence, setTextInputSequence] = useState<string>(() => customSequence.join(', '));
  const [textError, setTextError] = useState<string | null>(null);

  // Sync custom sequence when text input changes
  const handleTextSequenceChange = (text: string) => {
    setTextInputSequence(text);
    const parts = text.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const parsed: number[] = [];
    let hasInvalid = false;

    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 1 || num > maxCards) {
        hasInvalid = true;
        break;
      }
      parsed.push(num);
    }

    if (hasInvalid) {
      setTextError(`Cada ronda debe tener entre 1 y ${maxCards} cartas.`);
    } else if (parsed.length === 0) {
      setTextError('La secuencia no puede estar vacía.');
    } else {
      setTextError(null);
      setCustomSequence(parsed);
      onChangeRules({
        ...rules,
        customCardSequence: parsed,
      });
    }
  };

  // Change mode
  const handleSelectMode = (mode: RoundProgressionMode) => {
    const updated: GameRules = {
      ...rules,
      roundProgressionMode: mode,
      constantCardsCount: constantCards,
      constantRoundsCount: constantRounds,
      roundsPerLevel,
      customCardSequence: customSequence,
    };
    onChangeRules(updated);
  };

  // Update constant cards count
  const handleConstantCardsChange = (cards: number) => {
    const clamped = Math.max(1, Math.min(maxCards, cards));
    onChangeRules({
      ...rules,
      constantCardsCount: clamped,
    });
  };

  // Update constant rounds count
  const handleConstantRoundsChange = (roundsCount: number) => {
    const clamped = Math.max(1, Math.min(60, roundsCount));
    onChangeRules({
      ...rules,
      constantRoundsCount: clamped,
    });
  };

  // Update rounds per level (1 hand per level vs numPlayers hands per level)
  const handleRoundsPerLevelChange = (count: number) => {
    onChangeRules({
      ...rules,
      roundsPerLevel: count,
    });
  };

  // Custom Sequence Item Handlers
  const handleAddRoundToCustom = (cardsVal: number = 1) => {
    const next = [...customSequence, Math.max(1, Math.min(maxCards, cardsVal))];
    setCustomSequence(next);
    setTextInputSequence(next.join(', '));
    setTextError(null);
    onChangeRules({
      ...rules,
      customCardSequence: next,
    });
  };

  const handleRemoveLastCustomRound = () => {
    if (customSequence.length <= 1) return;
    const next = customSequence.slice(0, -1);
    setCustomSequence(next);
    setTextInputSequence(next.join(', '));
    setTextError(null);
    onChangeRules({
      ...rules,
      customCardSequence: next,
    });
  };

  const handleUpdateCustomRoundValue = (index: number, delta: number) => {
    const next = [...customSequence];
    const current = next[index];
    const updated = Math.max(1, Math.min(maxCards, current + delta));
    if (updated !== current) {
      next[index] = updated;
      setCustomSequence(next);
      setTextInputSequence(next.join(', '));
      setTextError(null);
      onChangeRules({
        ...rules,
        customCardSequence: next,
      });
    }
  };

  // Quick Presets for Custom Mode
  const applyPreset = (presetName: 'pyramid5' | 'allMax' | 'allOnes' | 'invert' | 'doubleEach') => {
    let next: number[] = [];
    if (presetName === 'pyramid5') {
      const peak = Math.min(5, maxCards);
      for (let c = 1; c <= peak; c++) next.push(c);
      for (let c = peak - 1; c >= 1; c--) next.push(c);
    } else if (presetName === 'allMax') {
      next = Array(numPlayers * 2).fill(maxCards);
    } else if (presetName === 'allOnes') {
      next = Array(numPlayers).fill(1);
    } else if (presetName === 'invert') {
      next = [...customSequence].reverse();
    } else if (presetName === 'doubleEach') {
      next = customSequence.flatMap((c) => [c, c]);
    }

    if (next.length > 0) {
      setCustomSequence(next);
      setTextInputSequence(next.join(', '));
      setTextError(null);
      onChangeRules({
        ...rules,
        customCardSequence: next,
      });
    }
  };

  // Calculate live preview sequence
  const currentSequence = useMemo(() => {
    return getCardSequenceForProgression(activeMode, numPlayers, maxCards, {
      constantCardsCount: constantCards,
      constantRoundsCount: constantRounds,
      roundsPerLevel,
      customCardSequence: customSequence,
    });
  }, [activeMode, numPlayers, maxCards, constantCards, constantRounds, roundsPerLevel, customSequence]);

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Estructura y Cartas por Ronda
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Nuevo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Elige cómo progresa el número de cartas o diseña una secuencia manual a tu medida.
            </p>
          </div>
        </div>

        {/* Live Badge Summary */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-mono font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-amber-400">
            {currentSequence.length} {currentSequence.length === 1 ? 'ronda' : 'rondas'} en total
          </span>
        </div>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. Estándar */}
        <button
          type="button"
          onClick={() => handleSelectMode('standard')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
            activeMode === 'standard'
              ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-lg">🏆</span>
              {activeMode === 'standard' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="font-bold text-xs text-white">Estándar Oficial</div>
            <div className="text-[10px] text-slate-400 leading-tight">
              1s ➔ Subida ➔ Máximas ➔ Bajada ➔ 1s
            </div>
          </div>
          <span className="text-[9px] font-bold text-amber-400/90 mt-2 block">Oficial española</span>
        </button>

        {/* 2. Ascendente */}
        <button
          type="button"
          onClick={() => handleSelectMode('ascending')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
            activeMode === 'ascending'
              ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <TrendingUp className={`w-5 h-5 ${activeMode === 'ascending' ? 'text-emerald-400' : 'text-slate-400'}`} />
              {activeMode === 'ascending' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="font-bold text-xs text-white">Ascendente</div>
            <div className="text-[10px] text-slate-400 leading-tight">
              De 1 a {maxCards} cartas progresivamente
            </div>
          </div>
          <span className="text-[9px] font-bold text-emerald-400 mt-2 block">Solo subida</span>
        </button>

        {/* 3. Descendente */}
        <button
          type="button"
          onClick={() => handleSelectMode('descending')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
            activeMode === 'descending'
              ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <TrendingDown className={`w-5 h-5 ${activeMode === 'descending' ? 'text-blue-400' : 'text-slate-400'}`} />
              {activeMode === 'descending' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="font-bold text-xs text-white">Descendente</div>
            <div className="text-[10px] text-slate-400 leading-tight">
              De {maxCards} a 1 carta decreciendo
            </div>
          </div>
          <span className="text-[9px] font-bold text-blue-400 mt-2 block">Solo bajada</span>
        </button>

        {/* 4. Pirámide */}
        <button
          type="button"
          onClick={() => handleSelectMode('pyramid')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
            activeMode === 'pyramid'
              ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Triangle className={`w-5 h-5 ${activeMode === 'pyramid' ? 'text-purple-400' : 'text-slate-400'}`} />
              {activeMode === 'pyramid' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="font-bold text-xs text-white">Pirámide</div>
            <div className="text-[10px] text-slate-400 leading-tight">
              1 ➔ {maxCards} ➔ 1 sin esperas
            </div>
          </div>
          <span className="text-[9px] font-bold text-purple-400 mt-2 block">Sube y baja</span>
        </button>

        {/* 5. Rondas Constantes */}
        <button
          type="button"
          onClick={() => handleSelectMode('constant')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
            activeMode === 'constant'
              ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Equal className={`w-5 h-5 ${activeMode === 'constant' ? 'text-amber-400' : 'text-slate-400'}`} />
              {activeMode === 'constant' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="font-bold text-xs text-white">Rondas Constantes</div>
            <div className="text-[10px] text-slate-400 leading-tight">
              Siempre el mismo nº de cartas
            </div>
          </div>
          <span className="text-[9px] font-bold text-amber-400 mt-2 block">Cartas fijas</span>
        </button>

        {/* 6. Manual / Personalizado */}
        <button
          type="button"
          onClick={() => handleSelectMode('custom')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
            activeMode === 'custom'
              ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Sliders className={`w-5 h-5 ${activeMode === 'custom' ? 'text-pink-400' : 'text-slate-400'}`} />
              {activeMode === 'custom' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="font-bold text-xs text-white">Manual Libre</div>
            <div className="text-[10px] text-slate-400 leading-tight">
              Escribe o ajusta ronda a ronda
            </div>
          </div>
          <span className="text-[9px] font-bold text-pink-400 mt-2 block">100% editable</span>
        </button>
      </div>

      {/* Mode-Specific Detailed Controls */}

      {/* A. Sub-controles para Ascendente / Descendente / Pirámide */}
      {(activeMode === 'ascending' || activeMode === 'descending' || activeMode === 'pyramid') && (
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300">
              ¿Cuántas manos jugar en cada nivel de cartas?
            </span>
            <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => handleRoundsPerLevelChange(1)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  roundsPerLevel === 1
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1 mano por nivel (Rápida)
              </button>
              <button
                type="button"
                onClick={() => handleRoundsPerLevelChange(numPlayers)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  roundsPerLevel === numPlayers
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1 vuelta completa ({numPlayers} manos por nivel)
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {roundsPerLevel === 1
              ? `Juego dinámico y ágil: cada mano cambia el número de cartas hasta completar la secuencia.`
              : `Todos los jugadores repartirán exactamente una vez con cada número de cartas antes de cambiar de nivel.`}
          </p>
        </div>
      )}

      {/* B. Sub-controles para Rondas Constantes */}
      {activeMode === 'constant' && (
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cartas por ronda */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Número de cartas por mano:
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {constantCards} {constantCards === 1 ? 'carta' : 'cartas'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleConstantCardsChange(constantCards - 1)}
                  disabled={constantCards <= 1}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-30 text-white cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={maxCards}
                  value={constantCards}
                  onChange={(e) => handleConstantCardsChange(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleConstantCardsChange(constantCards + 1)}
                  disabled={constantCards >= maxCards}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-30 text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1.5 pt-1">
                {[1, 3, 5, maxCards].filter((v, i, a) => a.indexOf(v) === i && v <= maxCards).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleConstantCardsChange(val)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                      constantCards === val
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {val === maxCards ? `Máx (${val})` : `${val} c.`}
                  </button>
                ))}
              </div>
            </div>

            {/* Total de rondas a jugar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Total de rondas a jugar:
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {constantRounds} rondas
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleConstantRoundsChange(constantRounds - 1)}
                  disabled={constantRounds <= 1}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-30 text-white cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={constantRounds}
                  onChange={(e) => handleConstantRoundsChange(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 text-center font-bold text-sm text-white py-1 rounded-lg focus:border-amber-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleConstantRoundsChange(constantRounds + 1)}
                  disabled={constantRounds >= 60}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-30 text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1.5 pt-1">
                {[
                  { label: `1 Vuelta (${numPlayers}R)`, count: numPlayers },
                  { label: `2 Vueltas (${numPlayers * 2}R)`, count: numPlayers * 2 },
                  { label: '10 Rondas', count: 10 },
                  { label: '20 Rondas', count: 20 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleConstantRoundsChange(item.count)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                      constantRounds === item.count
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* C. Sub-controles para Manual / Personalizado */}
      {activeMode === 'custom' && (
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4 animate-in fade-in duration-150">
          {/* Text input for sequence */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <span>Escribe la secuencia separada por comas:</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Valores de 1 a {maxCards}
              </span>
            </div>
            <input
              type="text"
              value={textInputSequence}
              onChange={(e) => handleTextSequenceChange(e.target.value)}
              placeholder="Ej: 1, 2, 3, 4, 5, 4, 3, 2, 1"
              className={`w-full bg-slate-900 border rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-white focus:outline-none transition ${
                textError ? 'border-rose-500 text-rose-300' : 'border-slate-700 focus:border-amber-400'
              }`}
            />
            {textError && (
              <p className="text-xs text-rose-400 font-medium">{textError}</p>
            )}
          </div>

          {/* Preset Buttons & Quick Add/Remove */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Preajustes rápidos:</span>
              <button
                type="button"
                onClick={() => applyPreset('pyramid5')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                1 a 5 y vuelta
              </button>
              <button
                type="button"
                onClick={() => applyPreset('allMax')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Solo Máximas ({maxCards})
              </button>
              <button
                type="button"
                onClick={() => applyPreset('invert')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Invertir
              </button>
              <button
                type="button"
                onClick={() => applyPreset('doubleEach')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Duplicar Manos
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleAddRoundToCustom(customSequence[customSequence.length - 1] || 1)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Ronda</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveLastCustomRound}
                disabled={customSequence.length <= 1}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition disabled:opacity-30 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Quitar Última</span>
              </button>
            </div>
          </div>

          {/* Interactive chips with mini +/- controls */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold block mb-2">
              Ajuste individual por ronda (pulsa + o - en cada ronda):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {customSequence.map((cards, idx) => (
                <div
                  key={idx}
                  className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 space-x-1.5"
                >
                  <span className="text-[10px] text-slate-500 font-mono">R{idx + 1}:</span>
                  <span className="text-xs font-black text-amber-400 min-w-3 text-center">{cards}🎴</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomRoundValue(idx, -1)}
                    disabled={cards <= 1}
                    className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 flex items-center justify-center text-[10px] font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomRoundValue(idx, 1)}
                    disabled={cards >= maxCards}
                    className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 flex items-center justify-center text-[10px] font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visual Sequence Ribbon / Timeline Preview */}
      <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center space-x-1.5">
            <span>Secuencia resultante:</span>
            <span className="text-slate-400 font-normal">
              ({currentSequence.length} rondas, máximo {Math.max(...currentSequence, 1)} cartas)
            </span>
          </span>
          <span className="text-[11px] text-slate-400">
            Desliza para ver la curva completa ➔
          </span>
        </div>

        {/* Scrollable ribbon of cards */}
        <div className="flex items-end gap-1 overflow-x-auto pb-2 pt-4 px-1 scrollbar-thin">
          {currentSequence.map((cards, idx) => {
            const heightPercent = Math.max(25, Math.round((cards / maxCards) * 100));
            const isMax = cards === maxCards;
            const isSingle = cards === 1;

            return (
              <div
                key={idx}
                className="flex flex-col items-center shrink-0 group relative cursor-default"
                style={{ width: '26px' }}
                title={`Ronda ${idx + 1}: ${cards} ${cards === 1 ? 'carta' : 'cartas'}`}
              >
                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-150 flex items-center justify-center text-[9px] font-black ${
                    isMax
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : isSingle
                      ? 'bg-blue-500/50 text-white'
                      : 'bg-slate-700 text-slate-200 group-hover:bg-amber-500/70'
                  }`}
                  style={{ height: `${Math.max(22, heightPercent * 0.45)}px` }}
                >
                  {cards}
                </div>
                {/* Round Number Footer */}
                <span className="text-[8px] font-mono text-slate-400 mt-1">
                  R{idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
