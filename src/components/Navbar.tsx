import React from 'react';
import {
  Trophy,
  BarChart3,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  Download,
  FolderArchive,
  CheckCircle2,
  PlayCircle,
  RefreshCw,
  FileJson,
  Share2,
} from 'lucide-react';

interface NavbarProps {
  appName: string;
  onNewGame: () => void;
  onShowStats: () => void;
  onShowRules: () => void;
  onShowHistory?: () => void;
  onShowDownload?: () => void;
  onExportGameJson?: () => void;
  onResetRound: () => void;
  onResetAppToZero?: () => void;
  isGameActive: boolean;
  currentRoundNum?: number;
  totalRoundsNum?: number;
  completedRoundsNum?: number;
  currentRoundCards?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  appName,
  onNewGame,
  onShowStats,
  onShowRules,
  onShowHistory,
  onShowDownload,
  onExportGameJson,
  onResetRound,
  onResetAppToZero,
  isGameActive,
  currentRoundNum,
  totalRoundsNum,
  completedRoundsNum = 0,
  currentRoundCards,
}) => {
  const safeTotal = totalRoundsNum && totalRoundsNum > 0 ? totalRoundsNum : 0;
  const progressPercent = safeTotal > 0 ? Math.round((completedRoundsNum / safeTotal) * 100) : 0;
  const remainingRounds = Math.max(0, safeTotal - completedRoundsNum);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-xl shadow-md shadow-amber-500/20">
            🎴
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-amber-200 via-amber-100 to-white bg-clip-text text-transparent">
              {appName}
            </h1>
            <p className="text-xs text-amber-400/80 font-medium hidden sm:block">
              La Pocha • Contador & Analizador
            </p>
          </div>
        </div>

        {/* Round Progress Badge */}
        {isGameActive && currentRoundNum && totalRoundsNum && (
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">
              Ronda <span className="text-amber-400 font-bold">{currentRoundNum}</span> de {totalRoundsNum}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isGameActive && (
            <>
              <button
                onClick={onShowStats}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition border border-amber-500/30 hover:border-amber-500/60 shadow-sm cursor-pointer"
                title="Ver Estadísticas y Análisis"
              >
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Estadísticas</span>
              </button>

              <button
                onClick={onResetRound}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition border border-slate-700 cursor-pointer"
                title="Reiniciar o Corregir Ronda"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span className="hidden md:inline">Reiniciar Ronda</span>
              </button>

              {onExportGameJson && (
                <button
                  onClick={onExportGameJson}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition border border-sky-500/40 hover:border-sky-400 shadow-sm cursor-pointer"
                  title="Exportar archivo JSON de esta partida para compartir con amigos o guardar"
                >
                  <FileJson className="w-4 h-4 text-sky-400" />
                  <span className="hidden lg:inline">Exportar JSON</span>
                </button>
              )}
            </>
          )}

          {onShowHistory && (
            <button
              onClick={onShowHistory}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border border-slate-700 cursor-pointer"
              title="Ver Almacén de Partidas Guardadas e Histórico de Ganadores"
            >
              <FolderArchive className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Histórico</span>
            </button>
          )}

          {onShowDownload && (
            <button
              onClick={onShowDownload}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border border-amber-500/30 cursor-pointer shadow-sm"
              title="Compartir con amigos o Instalar Offline (iPad, iPhone, Android, PC)"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Compartir</span>
            </button>
          )}

          <button
            onClick={onShowRules}
            className="p-2 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Normas y Puntuaciones"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {onResetAppToZero && (
            <button
              onClick={onResetAppToZero}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 px-2 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 hover:border-rose-500/50 transition cursor-pointer"
              title="Reiniciar aplicación de cero (restablecer todos los datos y cachés)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xl:inline">Reiniciar de Cero</span>
            </button>
          )}

          <button
            onClick={onNewGame}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isGameActive ? 'Nueva Partida' : 'Crear Partida'}</span>
          </button>
        </div>
      </div>

      {/* Visual Game Progress Bar Strip beneath Navbar */}
      {isGameActive && safeTotal > 0 && (
        <div
          id="game-progress-bar-container"
          className="bg-slate-950/90 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2 transition-all shadow-inner"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs">
            {/* Progress Counter */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <div className="flex items-center space-x-1.5 font-medium text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Progreso:{' '}
                  <strong className="text-white font-bold">{completedRoundsNum}</strong> de{' '}
                  <strong className="text-amber-400 font-bold">{safeTotal}</strong> rondas completadas
                </span>
              </div>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {progressPercent}%
              </span>
            </div>

            {/* Current Active Round & Remaining Info */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-slate-400 text-[11px] sm:text-xs">
              {completedRoundsNum >= safeTotal ? (
                <span className="text-amber-300 font-bold flex items-center space-x-1">
                  <span>🎉</span>
                  <span>¡Partida completada!</span>
                </span>
              ) : (
                <>
                  {currentRoundNum && (
                    <span className="flex items-center space-x-1">
                      <PlayCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        En juego: <strong className="text-slate-200">Mano #{currentRoundNum}</strong>
                        {currentRoundCards ? (
                          <span className="text-slate-400 font-normal">
                            {' '}({currentRoundCards} {currentRoundCards === 1 ? 'carta' : 'cartas'})
                          </span>
                        ) : null}
                      </span>
                    </span>
                  )}
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span>
                    Restantes: <strong className="text-slate-300 font-semibold">{remainingRounds}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="max-w-7xl mx-auto mt-1.5 h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}
    </header>
  );
};
