import React, { useState, useEffect, useRef } from 'react';
import {
  SavedGameRecord,
  deleteSavedGame,
  clearAllSavedGames,
  getSavedGames,
  exportSavedGameAsJSON,
  exportAllSavedGamesAsJSON,
  parseAndImportGamesJSON,
} from '../utils/history';
import { Game } from '../types';
import {
  FolderArchive,
  Trash2,
  X,
  Trophy,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Download,
  Upload,
  Play,
  FileJson,
  Share2,
} from 'lucide-react';

interface SavedGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedGames?: SavedGameRecord[];
  onGamesUpdated?: (updated: SavedGameRecord[]) => void;
  onGameDeleted?: () => void;
  onLoadGame?: (game: Game) => void;
}

export const SavedGamesModal: React.FC<SavedGamesModalProps> = ({
  isOpen,
  onClose,
  savedGames: propSavedGames,
  onGamesUpdated,
  onGameDeleted,
  onLoadGame,
}) => {
  const [internalGames, setInternalGames] = useState<SavedGameRecord[]>(() => getSavedGames());
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [gameToDeleteId, setGameToDeleteId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copiedGameId, setCopiedGameId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (propSavedGames) {
        setInternalGames(propSavedGames);
      } else {
        setInternalGames(getSavedGames());
      }
      setImportStatus(null);
    }
  }, [isOpen, propSavedGames]);

  if (!isOpen) return null;

  const currentGames = propSavedGames || internalGames;

  const handleDeleteOne = (id: string) => {
    const updated = deleteSavedGame(id);
    setInternalGames(updated);
    if (onGamesUpdated) onGamesUpdated(updated);
    if (onGameDeleted) onGameDeleted();
    setGameToDeleteId(null);
  };

  const handleClearAll = () => {
    clearAllSavedGames();
    setInternalGames([]);
    if (onGamesUpdated) onGamesUpdated([]);
    if (onGameDeleted) onGameDeleted();
    setShowClearConfirm(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedGameId((prev) => (prev === id ? null : id));
  };

  // JSON Import Processing
  const processJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setImportStatus({ type: 'error', message: 'El archivo está vacío o no se pudo leer.' });
        return;
      }
      const result = parseAndImportGamesJSON(content);
      if (result.success) {
        const updated = getSavedGames();
        setInternalGames(updated);
        if (onGamesUpdated) onGamesUpdated(updated);
        setImportStatus({ type: 'success', message: result.message });
      } else {
        setImportStatus({ type: 'error', message: result.message });
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'Error de lectura al abrir el archivo seleccionado.' });
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processJsonFile(file);
    }
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processJsonFile(file);
    }
  };

  const handleExportOne = (e: React.MouseEvent, record: SavedGameRecord) => {
    e.stopPropagation();
    exportSavedGameAsJSON(record);
    setCopiedGameId(record.id);
    setTimeout(() => setCopiedGameId(null), 2500);
  };

  const handleExportAll = () => {
    exportAllSavedGamesAsJSON(currentGames);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 relative">
        {/* Drag Over Visual Indicator */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 bg-amber-500/20 backdrop-blur-sm border-2 border-dashed border-amber-400 rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl mb-3">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            <h4 className="text-xl font-black text-white">Suelta aquí tu archivo JSON</h4>
            <p className="text-sm font-semibold text-amber-300 mt-1">
              Se importarán automáticamente las partidas guardadas a tu historial
            </p>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-500 p-5 text-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-950/20 backdrop-blur flex items-center justify-center text-slate-950 font-bold">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg leading-tight">Historial y Copias de Seguridad</h3>
              <p className="text-xs font-semibold text-slate-950/80">
                Podios, estadísticas y exportación/importación JSON entre dispositivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-950/20 hover:bg-slate-950/30 transition text-slate-950 cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Storage count, Import JSON, Export All JSON, Clear */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-300">
              {currentGames.length} {currentGames.length === 1 ? 'partida almacenada' : 'partidas almacenadas'}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Import Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Importar partida o historial completo desde archivo .json"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Importar JSON</span>
            </button>

            {/* Export All Button */}
            {currentGames.length > 0 && (
              <button
                type="button"
                onClick={handleExportAll}
                className="bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                title="Descargar copia de seguridad con todo el historial en un único archivo JSON"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Exportar Todo (.json)</span>
              </button>
            )}

            {/* Clear All Button */}
            {currentGames.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer"
                title="Borrar todas las partidas del historial"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            )}
          </div>
        </div>

        {/* Import Status Alert Banner */}
        {importStatus && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b animate-in fade-in ${
              importStatus.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : 'bg-rose-950/90 text-rose-200 border-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{importStatus.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportStatus(null)}
              className="p-1 hover:bg-white/10 rounded text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Clear All Confirmation overlay */}
        {showClearConfirm && (
          <div className="p-4 bg-rose-950/90 border-b border-rose-800/80 text-rose-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>
                ¿Estás seguro de que quieres <strong>borrar todas las partidas guardadas</strong>? Esta acción liberará espacio pero no se puede deshacer.
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg transition cursor-pointer"
              >
                Sí, Borrar Todo
              </button>
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-300 text-sm flex-1">
          {currentGames.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-950/50 border-2 border-dashed border-slate-800 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                <FileJson className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">No hay partidas en el historial</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Las partidas que completes se guardarán automáticamente aquí. También puedes importar archivos JSON de partidas jugadas en otros móviles o dispositivos.
                </p>
              </div>

              {/* Quick Import Box in Empty State */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl transition shadow-lg cursor-pointer inline-flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar Partida desde Archivo JSON</span>
                </button>
                <p className="text-[11px] text-slate-500 mt-2">
                  o arrastra y suelta aquí cualquier archivo <code>.json</code> exportado
                </p>
              </div>
            </div>
          ) : (
            currentGames.map((gameRecord) => {
              const isExpanded = expandedGameId === gameRecord.id;
              const isDeletingThis = gameToDeleteId === gameRecord.id;
              const isJustExported = copiedGameId === gameRecord.id;
              const dateObj = new Date(gameRecord.date);
              const dateFormatted = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Fecha guardada';

              return (
                <div
                  key={gameRecord.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all shadow-md hover:border-slate-700/80"
                >
                  {/* Card Main Row */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-base">
                          {gameRecord.name || 'Partida de Pocha'}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                          {gameRecord.totalRounds} rondas
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{dateFormatted}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{gameRecord.numPlayers} jugadores</span>
                        </span>
                      </div>
                    </div>

                    {/* Winner badge & actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                      {gameRecord.winner && (
                        <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg mr-1">
                          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="text-left">
                            <span className="text-[10px] uppercase font-bold text-amber-400/80 block leading-none">
                              Ganador
                            </span>
                            <span className="font-black text-xs text-amber-300">
                              {gameRecord.winner.playerName} ({gameRecord.winner.points} pts)
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-1.5">
                        {/* Export JSON button */}
                        <button
                          type="button"
                          onClick={(e) => handleExportOne(e, gameRecord)}
                          className={`p-2 rounded-lg border transition cursor-pointer flex items-center space-x-1 text-xs font-bold ${
                            isJustExported
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-300 hover:text-white'
                          }`}
                          title="Descargar archivo JSON de esta partida para compartir con amigos o guardar copia"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                          <span className="hidden md:inline">JSON</span>
                        </button>

                        {/* Resume / Load into annotator if gameData exists */}
                        {gameRecord.gameData && onLoadGame && (
                          <button
                            type="button"
                            onClick={() => {
                              onLoadGame(gameRecord.gameData!);
                              onClose();
                            }}
                            className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white transition cursor-pointer flex items-center space-x-1 text-xs font-bold"
                            title="Cargar esta partida en el anotador principal"
                          >
                            <Play className="w-3.5 h-3.5 fill-emerald-400" />
                            <span className="hidden md:inline">Cargar</span>
                          </button>
                        )}

                        {/* Expand classification toggle */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(gameRecord.id)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Ver clasificación detallada"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => setGameToDeleteId(gameRecord.id)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                          title="Eliminar esta partida"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Delete Single Game overlay */}
                  {isDeletingThis && (
                    <div className="p-3 bg-rose-950/90 border-t border-rose-800 text-xs flex items-center justify-between gap-2 text-rose-200">
                      <span>¿Eliminar permanentemente este registro de partida?</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setGameToDeleteId(null)}
                          className="px-2.5 py-1 bg-slate-800 text-slate-300 font-bold rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDeleteOne(gameRecord.id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded Classification Table */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Clasificación Final de la Partida</span>
                        </h5>

                        <button
                          type="button"
                          onClick={(e) => handleExportOne(e, gameRecord)}
                          className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1 font-bold cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Exportar JSON de esta partida</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                              <th className="pb-2">Pos.</th>
                              <th className="pb-2">Jugador</th>
                              <th className="pb-2 text-right">Puntos</th>
                              <th className="pb-2 text-right">Aciertos</th>
                              <th className="pb-2 text-right">% Acierto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {gameRecord.rankings.map((rankItem) => {
                              const isFirst = rankItem.rank === 1;
                              return (
                                <tr
                                  key={rankItem.name}
                                  className={isFirst ? 'bg-amber-500/10 font-bold text-amber-300' : 'text-slate-300'}
                                >
                                  <td className="py-2 font-black">
                                    {isFirst ? '🥇 1º' : rankItem.rank === 2 ? '🥈 2º' : rankItem.rank === 3 ? '🥉 3º' : `${rankItem.rank}º`}
                                  </td>
                                  <td className="py-2">
                                    <div className="flex items-center space-x-2">
                                      <span>{rankItem.avatar}</span>
                                      <span className="font-bold text-white">{rankItem.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 text-right font-black text-amber-400">
                                    {rankItem.points} pts
                                  </td>
                                  <td className="py-2 text-right text-slate-400">
                                    {rankItem.hits}
                                  </td>
                                  <td className="py-2 text-right font-bold text-emerald-400">
                                    {rankItem.hitPercentage}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Share2 className="w-4 h-4 text-amber-400/80" />
            <span>Los archivos JSON son compatibles con cualquier móvil, tablet o PC.</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar Historial
          </button>
        </div>
      </div>
    </div>
  );
};

