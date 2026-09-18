import React from 'react';
import { HelpCircle, X, Shield, Award, Target, Flame, AlertCircle } from 'lucide-react';
import { GameRules } from '../types';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules?: GameRules;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, rules }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-5 text-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <HelpCircle className="w-6 h-6 fill-slate-950" />
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Normas y Sistema de Puntuación</h3>
              <p className="text-xs font-semibold text-slate-900/80">
                Reglamento Oficial de La Pocha & Opciones Personalizadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-950/20 hover:bg-slate-950/30 transition text-slate-950 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm flex-1">
          {/* Section 1: Regla de Puntuación */}
          <section className="space-y-3">
            <h4 className="font-extrabold text-amber-400 text-base flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>1. Sistema de Puntuación Básica</span>
            </h4>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <p>
                En cada ronda, antes de jugar las cartas, cada jugador declara las bazas que cree
                que va a ganar (Subasta). Al finalizar la ronda:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 font-medium">
                <li>
                  <strong className="text-emerald-400">Si ACIERTAS exactamente:</strong> +10 puntos por
                  acertar + 5 puntos por cada baza hecha.
                </li>
                <li>
                  <strong className="text-rose-400">Si FALLAS (por arriba o por abajo):</strong> -10 puntos
                  por fallar - 5 puntos por cada baza de diferencia con la que pediste.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: Regla de Apuestas a Cero (Pedir 0 Bazas) */}
          <section className="space-y-3">
            <h4 className="font-extrabold text-amber-400 text-base flex items-center space-x-2">
              <Target className="w-5 h-5 text-amber-400" />
              <span>2. Apuestas a Cero (Pedir 0 Bazas / Pocha a Cero)</span>
            </h4>
            <div className="bg-gradient-to-br from-slate-950 to-slate-900/90 border border-amber-500/30 p-4 rounded-xl space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Pedir cero bazas es una de las decisiones más tácticas de la Pocha. La aplicación permite elegir si quieres premiar el mérito de no llevarse bazas o penalizar el juego pasivo:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Premio por acertar 0 */}
                <div className="bg-slate-900 p-3 rounded-lg border border-emerald-500/30 space-y-1.5">
                  <span className="font-black text-emerald-400 block flex items-center space-x-1">
                    <span>✓ Al ACERTAR 0 Bazas:</span>
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    <li>• <strong>Estándar (+10 pts):</strong> 10 base + 5×0 = +10 pts (+20 en Oros).</li>
                    <li>• <strong>Escalar por Dificultad (+10 + 2×cartas):</strong> En 8 cartas ganas +26 pts (muy difícil no llevarse nada con tantas cartas).</li>
                    <li>• <strong>Penalizar Cero Fácil (+5 pts):</strong> Reduce la ganancia para desincentivar el juego conservador.</li>
                    <li>• <strong>Superpremio (+20 pts):</strong> +20 puntos fijos.</li>
                  </ul>
                </div>

                {/* Penalización por fallar 0 */}
                <div className="bg-slate-900 p-3 rounded-lg border border-rose-500/30 space-y-1.5">
                  <span className="font-black text-rose-400 block flex items-center space-x-1">
                    <span>✗ Al FALLAR con 0 Bazas:</span>
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    <li>• <strong>Estándar (-10 - 5×baza):</strong> Resta 10 de base y 5 por cada baza involuntaria ganada.</li>
                    <li>• <strong>Castigo Doble (-20 - 10×baza):</strong> Penalización duplicada por "comerse" bazas tras pedir cero.</li>
                    <li>• <strong>Penalización Agravada (-20 - 5×baza):</strong> Base agravada de -20 puntos por fallar cero.</li>
                  </ul>
                </div>
              </div>

              {rules && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-xs flex items-center justify-between text-amber-200">
                  <span className="font-bold">Regla activa en esta partida:</span>
                  <span className="font-mono font-black">
                    Acierto 0: {rules.zeroBidRule === 'scaled_cards' ? 'Escalar por Cartas (+10 + 2×cartas)' : rules.zeroBidRule === 'reduced_penalty' ? '+5 pts reducidos' : rules.zeroBidRule === 'bonus_reward' ? '+20 pts' : rules.zeroBidRule === 'custom_points' ? `+${rules.zeroBidCustomPoints ?? 10} pts` : '+10 pts (Estándar)'} | Fallo 0: {rules.zeroBidFailPenalty === 'double_penalty' ? 'Castigo Doble' : rules.zeroBidFailPenalty === 'harsh_20' ? 'Penalización Agravada' : 'Estándar'}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Regla de Pocha (Pedir todas las bazas en 4+ cartas) */}
          <section className="space-y-3">
            <h4 className="font-extrabold text-amber-400 text-base flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>3. Regla de "Pocha" (Pedir todas las bazas en 4+ cartas)</span>
            </h4>
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-3 text-amber-200">
              <p className="font-semibold text-xs leading-relaxed">
                A partir de manos de 4 o más cartas (4, 5, 6, 7, 8, 9, 10...), si un jugador pide <strong>TODAS LAS BAZAS</strong> de la mano, está pidiendo <strong>POCHA</strong>. Se calcula: <em>5 ptos × bazas + 10 (base)</em>, multiplicado por 2 por Pocha (y por 2 adicional si es Oros). Si falla, se resta exactamente esa misma cantidad:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-amber-500/20">
                  <span className="font-bold text-amber-400 block mb-0.5">Pocha de 4 Cartas (en Oros):</span>
                  4 × 5 = 20 + 10 = 30 ptos. Doble por Pocha = 60 ptos, y doble por Oros = <strong>120 Puntos</strong>.
                  <br /><span className="text-emerald-400 font-bold">Acierto: +120 ptos</span> | <span className="text-rose-400 font-bold">Fallo: -120 ptos</span>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-amber-500/20">
                  <span className="font-bold text-amber-400 block mb-0.5">Pocha de 8 Cartas (en Oros):</span>
                  8 × 5 = 40 + 10 = 50 ptos. Doble por Pocha = 100 ptos, y doble por Oros = <strong>200 Puntos</strong>.
                  <br /><span className="text-emerald-400 font-bold">Acierto: +200 ptos</span> | <span className="text-rose-400 font-bold">Fallo: -200 ptos</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Regla de Oros Doble */}
          <section className="space-y-3">
            <h4 className="font-extrabold text-amber-300 text-base flex items-center space-x-2">
              <span>🪙</span>
              <span>4. Puntuación Especial para Triunfo de Oros</span>
            </h4>
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-3 text-amber-200">
              <p className="font-semibold text-xs leading-relaxed">
                Cuando el palo de triunfo de la mano es <strong>OROS</strong>, la puntuación estándar de acierto o fallo se multiplica por dos. (La Pocha ya aplica su propia puntuación de doble del doble).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/90 p-3 rounded-lg border border-amber-500/20">
                  <span className="font-bold text-emerald-400 block mb-1">
                    Ejemplo Acierto en Oros:
                  </span>
                  Si un jugador pide 2 bazas y las acierta en Oros:
                  <br />
                  10 pts/baza (20) + 20 por acertar = <strong>40 Puntos</strong>.
                </div>
                <div className="bg-slate-900/90 p-3 rounded-lg border border-amber-500/20">
                  <span className="font-bold text-rose-400 block mb-1">
                    Ejemplo Fallo en Oros:
                  </span>
                  Si un jugador pide 2 bazas y no las acierta (falla por 2):
                  <br />
                  -10 pts/baza (-20) - 20 por fallar = <strong>-40 Puntos</strong>.
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Prohibición del Repartidor */}
          <section className="space-y-3">
            <h4 className="font-extrabold text-slate-200 text-base flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>5. Regla del Repartidor (Prohibido Empatar)</span>
            </h4>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <p>
                El repartidor (Dealer) es el último en decir sus bazas pedidas. La suma total de
                las bazas pedidas por todos los jugadores{' '}
                <strong className="text-rose-400">NO puede ser igual</strong> al número total de
                cartas repartidas en esa mano.
              </p>
              <p className="text-xs text-slate-400 italic">
                Esto garantiza que siempre haya al menos un jugador que falle en cada mano.
              </p>
            </div>
          </section>

          {/* Section 6: Progresión de las Rondas y Subastado */}
          <section className="space-y-3">
            <h4 className="font-extrabold text-slate-200 text-base flex items-center space-x-2">
              <span>🃏</span>
              <span>6. Estructura de la Partida y Modos de Progresión</span>
            </h4>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div>
                <span className="font-bold text-amber-400 block mb-1">Estructura Estándar Oficial:</span>
                <ol className="list-decimal list-inside space-y-1 font-medium text-slate-300">
                  <li><strong>Primera Vuelta (1 Carta):</strong> 1 mano por jugador repartiendo 1 carta.</li>
                  <li><strong>Subida:</strong> 2, 3, 4... cartas hasta el número máximo permitido por la baraja.</li>
                  <li><strong className="text-purple-300">Máximas & Subastado:</strong> Manos con todas las cartas repartidas.</li>
                  <li><strong>Bajada:</strong> Descenso escalonado desde Máximas-1 hasta 2 cartas.</li>
                  <li><strong>Vuelta Final (1 Carta):</strong> 1 mano por jugador cerrando la partida.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="font-bold text-amber-400 block mb-1">Modos Alternativos y Definición Manual:</span>
                <p className="text-slate-300 leading-relaxed">
                  En la configuración previa a la partida puedes activar otros modos según el tiempo disponible del grupo:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400">
                  <li><strong className="text-slate-200">Ascendente:</strong> Partida que sube de 1 al máximo de cartas.</li>
                  <li><strong className="text-slate-200">Descendente:</strong> Comienza en el máximo de cartas y baja hasta 1.</li>
                  <li><strong className="text-slate-200">Pirámide:</strong> Sube de 1 al máximo y desciende directo a 1.</li>
                  <li><strong className="text-slate-200">Rondas Constantes:</strong> Todas las manos con un número fijo de cartas (ej. 5 cartas fijas durante 10 rondas).</li>
                  <li><strong className="text-slate-200">Manual Personalizado:</strong> Diseña libremente cuántas cartas se juegan en cada ronda individual.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition cursor-pointer"
          >
            Entendido, volver al juego
          </button>
        </div>
      </div>
    </div>
  );
};
