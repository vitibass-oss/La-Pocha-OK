import React from 'react';
import { RecentWinner } from '../utils/history';
import { Trophy, Crown, Calendar, Users, Target, Trash2, FolderArchive, ArrowRight } from 'lucide-react';

interface RecentWinnersBoardProps {
  winners: RecentWinner[];
  onOpenHistoryModal?: () => void;
}

export const RecentWinnersBoard: React.FC<RecentWinnersBoardProps> = ({
  winners,
  onOpenHistoryModal,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
              <span>Cuadro de Honor • Últimos 5 Ganadores</span>
            </h3>
            <p className="text-xs text-slate-400">
              Historial persistente de victorias guardado en este dispositivo
            </p>
          </div>
        </div>

        {onOpenHistoryModal && (
          <button
            type="button"
            onClick={onOpenHistoryModal}
            className="text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Ver Todas las Partidas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Winners List */}
      {winners.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800 space-y-2">
          <span className="text-3xl block mb-1">👑</span>
          <p className="text-sm font-bold text-slate-300">Aún no hay campeones registrados</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Completa tu primera partida de Pocha para inaugurar este cuadro de honor histórico.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {winners.map((winner, idx) => {
            const dateObj = new Date(winner.date);
            const dateStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
              : 'Reciente';

            const medalBadge =
              idx === 0
                ? { label: 'Último Campeón', color: 'from-amber-500/30 to-yellow-500/10 border-amber-500/50 text-amber-300' }
                : { label: `${idx + 1}º Ganador`, color: 'from-slate-800/80 to-slate-900/80 border-slate-700/80 text-slate-300' };

            return (
              <div
                key={winner.id || idx}
                className={`bg-gradient-to-b ${medalBadge.color} border rounded-xl p-3.5 flex flex-col justify-between space-y-3 relative overflow-hidden transition-all hover:scale-[1.02]`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 flex items-center space-x-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>{idx === 0 ? '🏆 Campeón' : `#${idx + 1}`}</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{dateStr}</span>
                  </span>
                </div>

                {/* Winner Info */}
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border font-bold shrink-0 shadow"
                    style={{
                      backgroundColor: `${winner.playerColor || '#eab308'}25`,
                      borderColor: winner.playerColor || '#eab308',
                    }}
                  >
                    {winner.playerAvatar || '👑'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm text-white truncate">
                      {winner.playerName}
                    </h4>
                    <p className="text-xs font-black text-amber-300">
                      {winner.points} pts
                    </p>
                  </div>
                </div>

                {/* Footer Details */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3 h-3 text-slate-500" />
                    <span>{winner.totalPlayers} jug.</span>
                  </span>
                  {winner.hitPercentage !== undefined && (
                    <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                      <Target className="w-3 h-3" />
                      <span>{winner.hitPercentage}%</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
