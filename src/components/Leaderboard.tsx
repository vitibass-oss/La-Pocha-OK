import React from 'react';
import { Player, PlayerStats, Round } from '../types';
import { Trophy, TrendingUp, Award, Flame, CheckCircle2, XCircle } from 'lucide-react';

interface LeaderboardProps {
  stats: PlayerStats[];
  currentRound?: Round;
  onOpenAddPlayerModal?: () => void;
  onOpenReorderPlayersModal?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  stats,
  currentRound,
  onOpenAddPlayerModal,
  onOpenReorderPlayersModal,
}) => {
  const rankMedals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-white text-base">Clasificación en Directo</h3>
        </div>
        <div className="flex items-center space-x-2">
          {onOpenReorderPlayersModal && (
            <button
              onClick={onOpenReorderPlayersModal}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1"
              title="Cambiar orden físico de los jugadores en la mesa"
            >
              <span>🪑 Posición Mesa</span>
            </button>
          )}
          {onOpenAddPlayerModal && (
            <button
              onClick={onOpenAddPlayerModal}
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1"
              title="Añadir un jugador a mitad de partida"
            >
              <span>➕ Añadir</span>
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard Cards List */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {stats.map((st, idx) => {
          const medal = rankMedals[idx] || `${st.rank}º`;
          const currentRoundScore = currentRound?.scores[st.player.id];
          const hasCurrentRoundPoints =
            currentRound?.phase === 'completed' && currentRoundScore?.points !== undefined;

          return (
            <div
              key={st.player.id}
              className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                idx === 0
                  ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20 shadow-md'
                  : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              {/* Left: Position, Avatar, Name */}
              <div className="flex items-center space-x-3">
                <span className="text-lg font-black w-7 text-center">{medal}</span>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold border border-slate-700"
                  style={{ backgroundColor: `${st.player.color}20`, borderColor: st.player.color }}
                >
                  {st.player.avatar}
                </div>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-white text-sm sm:text-base">
                      {st.player.name}
                    </span>
                    {st.currentStreak >= 2 && (
                      <span
                        className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold px-1.5 py-0.2 rounded-full flex items-center space-x-0.5"
                        title={`Racha de ${st.currentStreak} aciertos`}
                      >
                        <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{st.currentStreak}</span>
                      </span>
                    )}
                  </div>

                  {/* Hit percentage bar */}
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-1.5 rounded-full"
                        style={{ width: `${st.hitPercentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {st.hitPercentage}% aciertos ({st.totalHits}/{st.totalRounds})
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Points */}
              <div className="text-right flex flex-col items-end">
                <span
                  className={`text-xl sm:text-2xl font-black ${
                    st.totalPoints >= 0 ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  {st.totalPoints} <span className="text-xs font-normal text-slate-400">pts</span>
                </span>

                {/* Show current round points gained if completed */}
                {hasCurrentRoundPoints && (
                  <span
                    className={`text-xs font-bold ${
                      currentRoundScore.points >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {currentRoundScore.points >= 0 ? `+${currentRoundScore.points}` : currentRoundScore.points} esta ronda
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
