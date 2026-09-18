import React, { useEffect, useState, useRef } from 'react';
import { PlayerStats, Game, Round, Player } from '../types';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Share2,
  Copy,
  Check,
  RotateCcw,
  X,
  Sparkles,
  Award,
  Download,
  FileText,
  Image as ImageIcon,
  Target,
  Shield,
  Flame,
  Coins,
  CheckCircle2,
  XCircle,
  BarChart3,
  Eye,
  TrendingUp,
  Percent,
  FileJson,
} from 'lucide-react';
import { exportActiveGameAsJSON } from '../utils/history';

interface GameSummaryModalProps {
  isOpen: boolean;
  stats: PlayerStats[];
  game?: Game | null;
  rounds?: Round[];
  players?: Player[];
  onClose: () => void;
  onNewGame: () => void;
  onOpenStats?: () => void;
}

export const GameSummaryModal: React.FC<GameSummaryModalProps> = ({
  isOpen,
  stats,
  game,
  rounds,
  players,
  onClose,
  onNewGame,
  onOpenStats,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'podium' | 'details' | 'image_preview'>('podium');
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Trigger festive confetti celebration
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
      });
      // Pre-generate image preview data URL
      setTimeout(() => {
        generateSummaryImagePreview();
      }, 100);
    }
  }, [isOpen, stats]);

  if (!isOpen || stats.length === 0) return null;

  const winner = stats[0];
  const second = stats[1];
  const third = stats[2];

  const totalRoundsPlayed = rounds?.filter((r) => r.phase === 'completed').length || stats[0]?.totalRounds || 0;

  // Highlights & Distinctions
  const bestSniper = [...stats].sort((a, b) => b.hitPercentage - a.hitPercentage)[0];
  const mostConsistent = [...stats].sort((a, b) => a.avgErrorMargin - b.avgErrorMargin)[0];
  const goldKing = [...stats].sort((a, b) => b.orosPoints - a.orosPoints)[0];
  const streakMaster = [...stats].sort((a, b) => b.maxStreak - a.maxStreak)[0];
  const mostMisses = [...stats].sort((a, b) => b.totalMisses - a.totalMisses)[0];

  // 1. Generate Formatted Text Summary (for WhatsApp / Clipboard / .txt)
  const generateShareText = (isTxtFile: boolean = false): string => {
    const dateStr = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isTxtFile) {
      let txt = `======================================================================\n`;
      txt += `                 🎴 LA POCHA - INFORME FINAL DE PARTIDA 🎴\n`;
      txt += `======================================================================\n\n`;
      txt += `Fecha y Hora: ${dateStr}\n`;
      txt += `Rondas Completadas: ${totalRoundsPlayed} rondas\n`;
      txt += `Total de Jugadores: ${stats.length}\n`;
      if (game?.rules) {
        txt += `Baraja: ${game.rules.deckCards || 40} cartas\n`;
        txt += `Regla Oros Dobles: ${game.rules.doubleOros ? 'Sí' : 'No'}\n`;
        txt += `Regla Repartidor: ${game.rules.forbiddenDealerBid ? 'Prohibido empatar' : 'Libre'}\n`;
      }
      txt += `\n----------------------------------------------------------------------\n`;
      txt += `🏆 PODIO DE GANADORES\n`;
      txt += `----------------------------------------------------------------------\n`;
      stats.forEach((st, idx) => {
        const medal = idx === 0 ? '👑 1º [CAMPEÓN]' : idx === 1 ? '🥈 2º [SUBCAMPEÓN]' : idx === 2 ? '🥉 3º' : `   ${idx + 1}º`;
        const missPct = 100 - st.hitPercentage;
        txt += `${medal.padEnd(20)} ${st.player.name.padEnd(16)}: ${String(st.totalPoints).padStart(4)} pts | Aciertos: ${st.totalHits}/${st.totalRounds} (${st.hitPercentage}%) | Fallos: ${st.totalMisses}/${st.totalRounds} (${missPct}%)\n`;
      });

      txt += `\n----------------------------------------------------------------------\n`;
      txt += `📊 TABLA DETALLADA DE ESTADÍSTICAS (ACIERTOS Y FALLOS)\n`;
      txt += `----------------------------------------------------------------------\n`;
      txt += `Pos  Jugador          Puntos  Aciertos (%)      Fallos (%)       Bazas (P/R)  Oros    Racha  Mejor Mano\n`;
      txt += `----------------------------------------------------------------------\n`;
      stats.forEach((st) => {
        const missPct = 100 - st.hitPercentage;
        const rankStr = `${st.rank}º`.padEnd(5);
        const nameStr = st.player.name.padEnd(16);
        const ptsStr = `${st.totalPoints} pts`.padEnd(8);
        const hitsStr = `${st.totalHits}/${st.totalRounds} (${st.hitPercentage}%)`.padEnd(18);
        const missesStr = `${st.totalMisses}/${st.totalRounds} (${missPct}%)`.padEnd(17);
        const bidsStr = `${st.totalBids}/${st.totalActuals}`.padEnd(13);
        const orosStr = `${st.orosPoints >= 0 ? '+' : ''}${st.orosPoints} pts`.padEnd(8);
        const streakStr = `${st.maxStreak} max`.padEnd(7);
        const bestStr = st.bestRound ? `R${st.bestRound.roundNumber} (+${st.bestRound.points})` : '-';
        txt += `${rankStr}${nameStr}${ptsStr}${hitsStr}${missesStr}${bidsStr}${orosStr}${streakStr}${bestStr}\n`;
      });

      txt += `\n----------------------------------------------------------------------\n`;
      txt += `🎖️ DISTINCIONES Y CUADRO DE HONOR\n`;
      txt += `----------------------------------------------------------------------\n`;
      if (bestSniper) txt += `• 🎯 Mejor Francotirador: ${bestSniper.player.name} con ${bestSniper.hitPercentage}% de aciertos (${bestSniper.totalHits} de ${bestSniper.totalRounds})\n`;
      if (mostConsistent) txt += `• 🛡️ Más Preciso / Regular: ${mostConsistent.player.name} con margen de error medio de ${mostConsistent.avgErrorMargin} bazas\n`;
      if (goldKing) txt += `• 🪙 Rey de los Oros: ${goldKing.player.name} con ${goldKing.orosPoints} puntos conseguidos en Oros\n`;
      if (streakMaster) txt += `• 🔥 Mayor Racha de Aciertos: ${streakMaster.player.name} con ${streakMaster.maxStreak} manos consecutivas acertadas\n`;
      if (mostMisses && mostMisses.totalMisses > 0) txt += `• 💥 Más Castigado por los Fallos: ${mostMisses.player.name} con ${mostMisses.totalMisses} fallos (${100 - mostMisses.hitPercentage}%)\n`;

      txt += `\n----------------------------------------------------------------------\n`;
      txt += `📝 DESGLOSE JUGADOR POR JUGADOR\n`;
      txt += `----------------------------------------------------------------------\n`;
      stats.forEach((st) => {
        const missPct = 100 - st.hitPercentage;
        txt += `\n[${st.rank}º] ${st.player.name}\n`;
        txt += ` - Puntuación Total: ${st.totalPoints} puntos\n`;
        txt += ` - Aciertos: ${st.totalHits} de ${st.totalRounds} manos (${st.hitPercentage}% acierto)\n`;
        txt += ` - Fallos: ${st.totalMisses} de ${st.totalRounds} manos (${missPct}% fallo)\n`;
        txt += ` - Bazas Pedidas: ${st.totalBids} | Bazas Realizadas: ${st.totalActuals} (Diferencia: ${st.totalActuals - st.totalBids >= 0 ? '+' : ''}${st.totalActuals - st.totalBids})\n`;
        txt += ` - Puntos en Oros: ${st.orosPoints} pts | Puntos en Normales: ${st.normalPoints} pts\n`;
        txt += ` - Racha Máxima de Aciertos: ${st.maxStreak} seguidas\n`;
        txt += ` - Mejor Mano: ${st.bestRound ? `Ronda ${st.bestRound.roundNumber} (+${st.bestRound.points} pts)` : 'Ninguna'}\n`;
        txt += ` - Peor Mano: ${st.worstRound ? `Ronda ${st.worstRound.roundNumber} (${st.worstRound.points} pts)` : 'Ninguna'}\n`;
        txt += ` - Margen de Error Medio: ${st.avgErrorMargin} bazas/mano\n`;
      });

      txt += `\n======================================================================\n`;
      txt += `Anotado y Analizado con el Anotador Oficial de La Pocha 🃏\n`;
      txt += `======================================================================\n`;
      return txt;
    }

    // WhatsApp / Telegram Message text
    let text = `🎴 *RESULTADO FINAL DE LA POCHA* 🎴\n`;
    text += `📅 ${dateStr} • 🃏 ${totalRoundsPlayed} Rondas\n\n`;
    text += `🏆 *PODIO Y CLASIFICACIÓN:*\n`;
    stats.forEach((st, idx) => {
      const medal = idx === 0 ? '👑 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `▫️ ${idx + 1}º`;
      const missPct = 100 - st.hitPercentage;
      text += `${medal} *${st.player.name}*: *${st.totalPoints} pts*\n`;
      text += `   └ ✓ ${st.totalHits} aciertos (${st.hitPercentage}%) | ✗ ${st.totalMisses} fallos (${missPct}%)\n`;
    });

    text += `\n🎖️ *CUADRO DE HONOR:*\n`;
    if (bestSniper) text += `🎯 Francotirador: *${bestSniper.player.name}* (${bestSniper.hitPercentage}% aciertos)\n`;
    if (goldKing) text += `🪙 Rey de Oros: *${goldKing.player.name}* (${goldKing.orosPoints} pts)\n`;
    if (streakMaster) text += `🔥 Racha Récord: *${streakMaster.player.name}* (${streakMaster.maxStreak} seguidos)\n`;

    text += `\n🃏 _Anotado con Anotador y Analizador de La Pocha_`;
    return text;
  };

  // 2. Export Text File (.txt)
  const handleDownloadTxt = () => {
    const text = generateShareText(true);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filenameDate = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pocha_resultado_${filenameDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShareFeedback('¡Archivo de texto (.txt) descargado!');
    setTimeout(() => setShareFeedback(null), 3500);
  };

  // 3. Copy Formatted Message to Clipboard
  const handleCopy = () => {
    const text = generateShareText(false);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setShareFeedback('¡Resumen copiado para WhatsApp/Telegram!');
    setTimeout(() => {
      setCopied(false);
      setShareFeedback(null), 3000;
    }, 3000);
  };

  // 4. Generate High-Res Image on Canvas (1200px width, Retina quality)
  const drawSummaryCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const width = 1200;
    const headerHeight = 220;
    const podiumHeight = 280;
    const badgesHeight = 130;
    const tableHeaderHeight = 60;
    const playerRowHeight = 76;
    const footerHeight = 110;

    const totalHeight =
      headerHeight +
      podiumHeight +
      badgesHeight +
      tableHeaderHeight +
      stats.length * playerRowHeight +
      footerHeight +
      60;

    canvas.width = width;
    canvas.height = totalHeight;

    // Background Dark Luxury Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, totalHeight);
    bgGradient.addColorStop(0, '#090d16');
    bgGradient.addColorStop(0.5, '#0b1329');
    bgGradient.addColorStop(1, '#070b14');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, totalHeight);

    // Decorative subtle golden corner glow
    const radial = ctx.createRadialGradient(width / 2, 0, 50, width / 2, 0, 600);
    radial.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
    radial.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, 500);

    // Outer Border Frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, totalHeight - 40);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, width - 52, totalHeight - 52);

    // Header Content
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('🎴 LA POCHA - RESUMEN DE LA PARTIDA 🎴', width / 2, 85);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const dateStr = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    ctx.fillText(
      `Partida Finalizada • ${totalRoundsPlayed} Rondas • ${stats.length} Jugadores • ${dateStr}`,
      width / 2,
      130
    );

    // Subtitle divider line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 160);
    ctx.lineTo(width - 100, 160);
    ctx.stroke();

    // PODIUM BOXES (1st, 2nd, 3rd)
    const podiumY = 190;
    const podiumWidth = 320;
    const podiumGap = 30;

    // 2nd Place Card (Silver)
    if (second) {
      const x = (width - (podiumWidth * 3 + podiumGap * 2)) / 2;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      roundRect(ctx, x, podiumY + 30, podiumWidth, 210, 18, true, true);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('🥈', x + podiumWidth / 2, podiumY + 75);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('2º PUESTO', x + podiumWidth / 2, podiumY + 105);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 24px sans-serif';
      ctx.fillText(second.player.name, x + podiumWidth / 2, podiumY + 140);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '900 28px sans-serif';
      ctx.fillText(`${second.totalPoints} pts`, x + podiumWidth / 2, podiumY + 180);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(
        `✓ ${second.totalHits} (${second.hitPercentage}%)  ✗ ${second.totalMisses} (${100 - second.hitPercentage}%)`,
        x + podiumWidth / 2,
        podiumY + 215
      );
    }

    // 1st Place Card (Gold Champion)
    if (winner) {
      const x = (width - (podiumWidth * 3 + podiumGap * 2)) / 2 + podiumWidth + podiumGap;
      const grad = ctx.createLinearGradient(x, podiumY, x, podiumY + 240);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      roundRect(ctx, x, podiumY, podiumWidth, 240, 20, true, true);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('👑 🥇', x + podiumWidth / 2, podiumY + 55);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 18px sans-serif';
      ctx.fillText('¡CAMPEÓN DE LA POCHA!', x + podiumWidth / 2, podiumY + 90);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px sans-serif';
      ctx.fillText(winner.player.name, x + podiumWidth / 2, podiumY + 130);

      ctx.fillStyle = '#fef08a';
      ctx.font = '900 36px sans-serif';
      ctx.fillText(`${winner.totalPoints} pts`, x + podiumWidth / 2, podiumY + 180);

      ctx.fillStyle = '#34d399';
      ctx.font = '900 16px sans-serif';
      ctx.fillText(
        `✓ ${winner.totalHits} aciertos (${winner.hitPercentage}%) • ✗ ${winner.totalMisses} fallos`,
        x + podiumWidth / 2,
        podiumY + 218
      );
    }

    // 3rd Place Card (Bronze)
    if (third) {
      const x = (width - (podiumWidth * 3 + podiumGap * 2)) / 2 + (podiumWidth + podiumGap) * 2;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      roundRect(ctx, x, podiumY + 45, podiumWidth, 195, 18, true, true);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('🥉', x + podiumWidth / 2, podiumY + 90);

      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('3º PUESTO', x + podiumWidth / 2, podiumY + 118);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 24px sans-serif';
      ctx.fillText(third.player.name, x + podiumWidth / 2, podiumY + 150);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '900 26px sans-serif';
      ctx.fillText(`${third.totalPoints} pts`, x + podiumWidth / 2, podiumY + 188);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(
        `✓ ${third.totalHits} (${third.hitPercentage}%)  ✗ ${third.totalMisses} (${100 - third.hitPercentage}%)`,
        x + podiumWidth / 2,
        podiumY + 220
      );
    }

    // HONOR BADGES ROW
    const badgesY = podiumY + 270;
    const badgeW = (width - 120 - 45) / 4;

    const badges = [
      {
        icon: '🎯',
        label: 'FRANCOTIRADOR',
        val: `${bestSniper?.player.name || '-'} (${bestSniper?.hitPercentage || 0}%)`,
        color: '#10b981',
      },
      {
        icon: '🛡️',
        label: 'MÁS REGULAR',
        val: `${mostConsistent?.player.name || '-'} (±${mostConsistent?.avgErrorMargin || 0} b)`,
        color: '#38bdf8',
      },
      {
        icon: '🪙',
        label: 'REY DE OROS',
        val: `${goldKing?.player.name || '-'} (${goldKing?.orosPoints || 0} pts)`,
        color: '#fbbf24',
      },
      {
        icon: '🔥',
        label: 'MAYOR RACHA',
        val: `${streakMaster?.player.name || '-'} (${streakMaster?.maxStreak || 0} seguidas)`,
        color: '#f97316',
      },
    ];

    badges.forEach((b, i) => {
      const bx = 60 + i * (badgeW + 15);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, bx, badgesY, badgeW, 90, 14, true, true);

      ctx.textAlign = 'left';
      ctx.font = '28px sans-serif';
      ctx.fillText(b.icon, bx + 15, badgesY + 45);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(b.label, bx + 55, badgesY + 32);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 15px sans-serif';
      ctx.fillText(b.val, bx + 55, badgesY + 62);
    });

    // TABLE SECTION
    const tableY = badgesY + 115;
    const tableX = 60;
    const tableW = width - 120;

    // Table Header Row
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, tableX, tableY, tableW, 46, 10, true, false);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('POS & JUGADOR', tableX + 25, tableY + 30);

    ctx.textAlign = 'center';
    ctx.fillText('PUNTOS', tableX + 370, tableY + 30);
    ctx.fillText('ACIERTOS (✓)', tableX + 530, tableY + 30);
    ctx.fillText('FALLOS (✗)', tableX + 710, tableY + 30);
    ctx.fillText('BAZAS (P/R)', tableX + 880, tableY + 30);
    ctx.fillText('RACHA MAX', tableX + 1010, tableY + 30);

    // Table Player Rows
    stats.forEach((st, idx) => {
      const rowY = tableY + 54 + idx * playerRowHeight;
      const isEven = idx % 2 === 0;

      ctx.fillStyle = isEven ? 'rgba(15, 23, 42, 0.85)' : 'rgba(30, 41, 59, 0.5)';
      ctx.strokeStyle = idx === 0 ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      roundRect(ctx, tableX, rowY, tableW, playerRowHeight - 8, 12, true, true);

      // Player color stripe on left
      ctx.fillStyle = st.player.color || '#f59e0b';
      roundRect(ctx, tableX + 6, rowY + 6, 6, playerRowHeight - 20, 3, true, false);

      // Rank & Avatar & Name
      ctx.textAlign = 'left';
      ctx.fillStyle = idx === 0 ? '#fbbf24' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#d97706' : '#94a3b8';
      ctx.font = '900 18px sans-serif';
      ctx.fillText(`${st.rank}º`, tableX + 25, rowY + 42);

      ctx.font = '22px sans-serif';
      ctx.fillText(st.player.avatar || '👤', tableX + 65, rowY + 44);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px sans-serif';
      ctx.fillText(st.player.name, tableX + 105, rowY + 43);

      // Total Points (Bold Gold)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 22px sans-serif';
      ctx.fillText(`${st.totalPoints} pts`, tableX + 370, rowY + 43);

      // Aciertos Badge (Emerald)
      ctx.fillStyle = '#10b981';
      ctx.font = '900 18px sans-serif';
      ctx.fillText(`${st.totalHits}/${st.totalRounds}`, tableX + 530, rowY + 36);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`(${st.hitPercentage}%)`, tableX + 530, rowY + 56);

      // Fallos Badge (Rose)
      const missPct = 100 - st.hitPercentage;
      ctx.fillStyle = '#f43f5e';
      ctx.font = '900 18px sans-serif';
      ctx.fillText(`${st.totalMisses}/${st.totalRounds}`, tableX + 710, rowY + 36);
      ctx.fillStyle = '#fb7185';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`(${missPct}%)`, tableX + 710, rowY + 56);

      // Bazas (P/R)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${st.totalBids} / ${st.totalActuals}`, tableX + 880, rowY + 43);

      // Max Streak
      ctx.fillStyle = '#f97316';
      ctx.font = '900 17px sans-serif';
      ctx.fillText(`🔥 ${st.maxStreak}`, tableX + 1010, rowY + 43);
    });

    // FOOTER
    const footerY = tableY + 54 + stats.length * playerRowHeight + 35;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Anotador y Analizador de La Pocha • https://ai.studio/build', width / 2, footerY);

    return canvas;
  };

  // Helper to draw rounded rectangles on canvas
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: boolean,
    stroke: boolean
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  // Generate Image Data URL for Preview
  const generateSummaryImagePreview = () => {
    try {
      const canvas = drawSummaryCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      setGeneratedImageDataUrl(dataUrl);
    } catch (e) {
      console.error('Error generating summary canvas:', e);
    }
  };

  // Download Image PNG
  const handleDownloadImage = () => {
    setDownloadingImage(true);
    try {
      const canvas = drawSummaryCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const filenameDate = new Date().toISOString().slice(0, 10);
      a.href = dataUrl;
      a.download = `pocha_resumen_${filenameDate}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setShareFeedback('¡Imagen PNG de resumen descargada!');
      setTimeout(() => setShareFeedback(null), 3500);
    } catch (e) {
      console.error('Error downloading image:', e);
    } finally {
      setDownloadingImage(false);
    }
  };

  // Web Share API for Mobile / Desktop sharing
  const handleShareImage = async () => {
    try {
      const canvas = drawSummaryCanvas();
      if (canvas.toBlob && navigator.share) {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'pocha_resumen.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  title: 'Resumen de Partida - La Pocha',
                  text: `¡Partida finalizada! 🏆 Campeón: ${winner?.player.name} con ${winner?.totalPoints} pts.`,
                  files: [file],
                });
                return;
              } catch (err) {
                // User cancelled or share dismissed
              }
            }
          }
          // Fallback to download
          handleDownloadImage();
        });
      } else {
        handleDownloadImage();
      }
    } catch (e) {
      handleDownloadImage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-5 sm:p-6 text-slate-950 text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-950/20 hover:bg-slate-950/30 transition text-slate-950 cursor-pointer"
            title="Cerrar resumen"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 mx-auto bg-slate-950/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl mb-2 shadow-inner">
            🏆
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">¡Fin de la Partida!</h2>
          <p className="text-xs sm:text-sm font-bold text-slate-950/80 mt-1">
            Enhorabuena a <span className="underline font-black">{winner?.player.name}</span> por proclamarse Campeón con {winner?.totalPoints} puntos
          </p>
        </div>

        {/* Action Bar: Export Text / Image / Copy */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Tabs switch */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('podium')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'podium'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Podio & Aciertos</span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'details'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Tabla de Fallos y Aciertos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('image_preview');
                generateSummaryImagePreview();
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'image_preview'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Tarjeta Gráfica</span>
            </button>
          </div>

          {/* Export Quick Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadTxt}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Descargar informe completo en archivo de texto (.txt)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Descargar .txt</span>
            </button>

            {game && (
              <button
                onClick={() => {
                  exportActiveGameAsJSON(game);
                  setShareFeedback('Archivo JSON de la partida descargado.');
                  setTimeout(() => setShareFeedback(null), 3000);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                title="Descargar JSON completo de la partida para compartir o guardar"
              >
                <FileJson className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Descargar JSON</span>
              </button>
            )}

            <button
              onClick={handleDownloadImage}
              disabled={downloadingImage}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Descargar tarjeta en imagen PNG de alta calidad"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Descargar Imagen (.png)</span>
            </button>

            <button
              onClick={handleShareImage}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer shadow-md"
              title="Compartir tarjeta gráfica o enviar por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartir</span>
            </button>
          </div>
        </div>

        {/* Temporary Feedback Banner */}
        {shareFeedback && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 px-4 py-2 text-xs font-bold flex items-center justify-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-white flex-1">
          {/* TAB 1: PODIUM & SUMMARY */}
          {activeTab === 'podium' && (
            <div className="space-y-6">
              {/* Podium Section */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 items-end pt-2 pb-1">
                {/* 2nd Place */}
                {second && (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-center flex flex-col items-center">
                    <span className="text-2xl sm:text-3xl mb-1">🥈</span>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400">2º Puesto</span>
                    <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-full">
                      {second.player.name}
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-300 mt-1">
                      {second.totalPoints} pts
                    </span>
                    <div className="mt-1 flex items-center space-x-1 text-[10px] font-bold">
                      <span className="text-emerald-400">✓ {second.hitPercentage}%</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-rose-400">✗ {100 - second.hitPercentage}%</span>
                    </div>
                  </div>
                )}

                {/* 1st Place Winner */}
                {winner && (
                  <div className="bg-gradient-to-b from-amber-500/20 to-slate-800 border-2 border-amber-500 rounded-2xl p-3.5 sm:p-4 text-center flex flex-col items-center shadow-xl scale-105">
                    <span className="text-3xl sm:text-4xl mb-1 animate-bounce">👑</span>
                    <span className="text-[10px] sm:text-xs font-black uppercase text-amber-400 tracking-wider">
                      ¡CAMPEÓN!
                    </span>
                    <span className="font-black text-sm sm:text-base text-amber-200 truncate max-w-full">
                      {winner.player.name}
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-amber-300 mt-1">
                      {winner.totalPoints} pts
                    </span>
                    <div className="mt-1 flex items-center space-x-1 text-[11px] font-black">
                      <span className="text-emerald-400">✓ {winner.hitPercentage}% aciertos</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {winner.totalHits} aciertos / {winner.totalMisses} fallos
                    </span>
                  </div>
                )}

                {/* 3rd Place */}
                {third && (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-center flex flex-col items-center">
                    <span className="text-2xl sm:text-3xl mb-1">🥉</span>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400">3º Puesto</span>
                    <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-full">
                      {third.player.name}
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-300 mt-1">
                      {third.totalPoints} pts
                    </span>
                    <div className="mt-1 flex items-center space-x-1 text-[10px] font-bold">
                      <span className="text-emerald-400">✓ {third.hitPercentage}%</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-rose-400">✗ {100 - third.hitPercentage}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Honor Badges & Distinctions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950/80 border border-emerald-500/30 p-3 rounded-xl flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg shrink-0">
                    🎯
                  </div>
                  <div className="truncate">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Francotirador
                    </span>
                    <span className="font-black text-xs text-emerald-400 truncate block">
                      {bestSniper?.player.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {bestSniper?.hitPercentage}% aciertos
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-sky-500/30 p-3 rounded-xl flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-lg shrink-0">
                    🛡️
                  </div>
                  <div className="truncate">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Más Regular
                    </span>
                    <span className="font-black text-xs text-sky-400 truncate block">
                      {mostConsistent?.player.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ±{mostConsistent?.avgErrorMargin} error/mano
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-amber-500/30 p-3 rounded-xl flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg shrink-0">
                    🪙
                  </div>
                  <div className="truncate">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Rey de Oros
                    </span>
                    <span className="font-black text-xs text-amber-400 truncate block">
                      {goldKing?.player.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {goldKing?.orosPoints} pts en Oros
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-orange-500/30 p-3 rounded-xl flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center text-lg shrink-0">
                    🔥
                  </div>
                  <div className="truncate">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Mayor Racha
                    </span>
                    <span className="font-black text-xs text-orange-400 truncate block">
                      {streakMaster?.player.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {streakMaster?.maxStreak} aciertos seguidos
                    </span>
                  </div>
                </div>
              </div>

              {/* Player Cards Breakdown with Hit & Miss Proportions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Resumen de Fallos, Aciertos y Puntuación:</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {totalRoundsPlayed} rondas disputadas
                  </span>
                </h4>

                <div className="space-y-2.5">
                  {stats.map((st) => {
                    const missPct = 100 - st.hitPercentage;
                    return (
                      <div
                        key={st.player.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          {/* Player Identity */}
                          <div className="flex items-center space-x-2.5">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                st.rank === 1
                                  ? 'bg-amber-500 text-slate-950'
                                  : st.rank === 2
                                  ? 'bg-slate-300 text-slate-950'
                                  : st.rank === 3
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {st.rank}º
                            </span>
                            <span className="text-lg">{st.player.avatar}</span>
                            <div>
                              <span className="font-black text-sm text-white block leading-tight">
                                {st.player.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Bazas: {st.totalBids} pedidas / {st.totalActuals} ganadas (dif: {st.totalActuals - st.totalBids >= 0 ? `+${st.totalActuals - st.totalBids}` : st.totalActuals - st.totalBids})
                              </span>
                            </div>
                          </div>

                          {/* Total Points */}
                          <div className="text-right">
                            <span className="font-black text-amber-300 text-base sm:text-lg block leading-tight">
                              {st.totalPoints} <span className="text-xs text-slate-400 font-normal">pts</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Oros: {st.orosPoints >= 0 ? `+${st.orosPoints}` : st.orosPoints} pts
                            </span>
                          </div>
                        </div>

                        {/* Proportional Hits vs Misses Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-emerald-400 flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{st.totalHits} Aciertos ({st.hitPercentage}%)</span>
                            </span>
                            <span className="text-rose-400 flex items-center space-x-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{st.totalMisses} Fallos ({missPct}%)</span>
                            </span>
                          </div>

                          {/* Dual Progress Bar */}
                          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-500"
                              style={{ width: `${st.hitPercentage}%` }}
                              title={`${st.totalHits} aciertos (${st.hitPercentage}%)`}
                            />
                            <div
                              className="bg-rose-500 h-full transition-all duration-500"
                              style={{ width: `${missPct}%` }}
                              title={`${st.totalMisses} fallos (${missPct}%)`}
                            />
                          </div>
                        </div>

                        {/* Additional Metrics Strip */}
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900 text-[10px] text-slate-400">
                          <div>
                            <span className="text-slate-500 block">Racha Máxima:</span>
                            <span className="font-bold text-orange-300">🔥 {st.maxStreak} seguidas</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Mejor Mano:</span>
                            <span className="font-bold text-emerald-400">
                              {st.bestRound ? `R${st.bestRound.roundNumber} (+${st.bestRound.points} pts)` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Peor Mano:</span>
                            <span className="font-bold text-rose-400">
                              {st.worstRound ? `R${st.worstRound.roundNumber} (${st.worstRound.points} pts)` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED STATS TABLE */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 font-extrabold text-sm text-amber-300 flex items-center justify-between">
                  <span>Tabla Comparativa de Rendimiento (Aciertos y Fallos)</span>
                  <span className="text-xs text-slate-400 font-normal">
                    {stats.length} jugadores • {totalRoundsPlayed} manos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                      <tr>
                        <th className="p-3">Pos & Jugador</th>
                        <th className="p-3 text-center">Puntos</th>
                        <th className="p-3 text-center">Aciertos (✓)</th>
                        <th className="p-3 text-center">Fallos (✗)</th>
                        <th className="p-3 text-center">% Acierto</th>
                        <th className="p-3 text-center">% Fallo</th>
                        <th className="p-3 text-center">Bazas (P/R)</th>
                        <th className="p-3 text-center">Oros</th>
                        <th className="p-3 text-center">Racha Max</th>
                        <th className="p-3 text-center">Error Medio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {stats.map((st) => {
                        const missPct = 100 - st.hitPercentage;
                        return (
                          <tr key={st.player.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 font-bold text-white">
                              <div className="flex items-center space-x-2">
                                <span className="text-amber-400 font-black w-4">{st.rank}º</span>
                                <span>{st.player.avatar}</span>
                                <span>{st.player.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-black text-amber-300 text-sm">
                              {st.totalPoints} pts
                            </td>
                            <td className="p-3 text-center font-black text-emerald-400">
                              {st.totalHits} / {st.totalRounds}
                            </td>
                            <td className="p-3 text-center font-black text-rose-400">
                              {st.totalMisses} / {st.totalRounds}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black border border-emerald-500/30">
                                {st.hitPercentage}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-black border border-rose-500/30">
                                {missPct}%
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-300 font-mono">
                              {st.totalBids} / {st.totalActuals}
                            </td>
                            <td className="p-3 text-center font-bold text-amber-300">
                              {st.orosPoints >= 0 ? `+${st.orosPoints}` : st.orosPoints}
                            </td>
                            <td className="p-3 text-center font-black text-orange-400">
                              🔥 {st.maxStreak}
                            </td>
                            <td className="p-3 text-center text-slate-400 font-mono">
                              ±{st.avgErrorMargin}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Text Summary Quick Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-amber-300 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Resumen de Texto para Copiar / Exportar</span>
                  </h5>
                  <button
                    onClick={handleCopy}
                    className="text-xs bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 p-3 rounded-lg text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-44 overflow-y-auto border border-slate-800">
                  {generateShareText(false)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: IMAGE PREVIEW */}
          {activeTab === 'image_preview' && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h4 className="font-extrabold text-sm text-amber-300 flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Tarjeta Gráfica de Resumen Final</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Imagen de alta definición lista para descargar y compartir en WhatsApp, grupos o redes sociales.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadImage}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar PNG</span>
                  </button>
                </div>
              </div>

              {/* Image Preview Container */}
              <div className="bg-slate-950 p-2 sm:p-4 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center max-h-[500px]">
                {generatedImageDataUrl ? (
                  <img
                    src={generatedImageDataUrl}
                    alt="Tarjeta de Resumen de La Pocha"
                    className="max-h-[460px] w-auto object-contain rounded-xl shadow-lg border border-slate-800"
                  />
                ) : (
                  <div className="p-8 text-slate-500 text-xs">Generando imagen de resumen...</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {onOpenStats && (
              <button
                onClick={onOpenStats}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>Ver Gráficas y Estadísticas</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar para WhatsApp'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Cerrar
            </button>

            <button
              onClick={onNewGame}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Empezar Nueva Partida</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
