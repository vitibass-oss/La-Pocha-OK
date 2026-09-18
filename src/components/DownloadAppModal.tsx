import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Download,
  X,
  Laptop,
  CheckCircle2,
  Copy,
  Sparkles,
  Share2,
  Globe,
  Tablet,
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Anotador de La Pocha (La Podrida)',
          text: '¡Abre el anotador de La Pocha para nuestras partidas de cartas! Funciona 100% offline.',
          url: currentUrl,
        });
      } catch (_) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `¡Hola! Aquí tienes el anotador de La Pocha (La Podrida) para nuestras partidas de cartas. Puedes instalarlo y funciona sin conexión (offline):\n${currentUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-500 p-5 text-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-950/20 rounded-xl">
              <Share2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-xl leading-tight">Compartir & Usar Offline (iPad y Móviles)</h3>
              <p className="text-xs font-bold text-slate-950/80">
                Comparte con tus amigos de juego y juega sin internet en cualquier dispositivo
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

        {/* Content */}
        <div className="p-6 space-y-6 text-slate-200 overflow-y-auto max-h-[75vh]">
          {/* Quick Share Buttons Box */}
          <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>1. Enviar el enlace a tus amigos de juego</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pásales el enlace por WhatsApp o compártelo directamente. Podrán abrirlo en su iPad o teléfono y guardarlo para jugar sin conexión:
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleWhatsAppShare}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md cursor-pointer"
              >
                <span>💬</span>
                <span>Compartir por WhatsApp</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir enlace...</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-2 border border-slate-700 cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">¡Enlace Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2 rounded-lg truncate border border-slate-800">
              {currentUrl}
            </div>
          </div>

          {/* iPad / iOS Callout - Star Instruction */}
          <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-rose-400 font-extrabold text-sm">
              <Tablet className="w-5 h-5 text-rose-400" />
              <span>📱 Cómo instalar en iPad / iPhone (Safari) - 100% Offline</span>
            </div>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>Para que funcione en el iPad sin internet en la mesa de cartas:</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-200">
                <li>
                  Abre este enlace en el navegador <strong>Safari</strong> del iPad o iPhone (no en el navegador interno de WhatsApp).
                </li>
                <li>
                  Toca el botón <strong>Compartir</strong> en Safari (el icono de un <strong>cuadrado con flecha hacia arriba ⎋</strong>).
                </li>
                <li>
                  Baja por el menú y selecciona <strong>«Añadir a la pantalla de inicio»</strong> (+).
                </li>
                <li>
                  Toca <strong>«Añadir»</strong> arriba a la derecha.
                </li>
              </ol>
              <p className="bg-rose-500/10 text-rose-200 p-2 rounded-lg border border-rose-500/20 text-[11px] font-semibold">
                ✨ ¡Listo! Se creará el icono de <strong>La Podrida</strong> en la pantalla del iPad. Al abrirlo, ocupará toda la pantalla sin barras de navegación y funcionará aunque no haya Wi-Fi ni cobertura.
              </p>
            </div>
          </div>

          {/* Android & PC/Mac Quick Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Android */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>En Android (Google Chrome)</span>
              </div>
              <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Abre el enlace en <strong>Chrome</strong>.</li>
                <li>Pulsa el botón de <strong>3 puntos verticales (⋮)</strong> arriba a la derecha.</li>
                <li>Elige <strong>«Instalar aplicación»</strong> o <strong>«Añadir a la pantalla de inicio»</strong>.</li>
                <li>Se instalará como una app nativa offline.</li>
              </ol>
            </div>

            {/* PC / Mac */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                <Monitor className="w-4 h-4 shrink-0" />
                <span>En Ordenador (Windows / Mac)</span>
              </div>
              <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Abre en Chrome o Edge fuera de marcos.</li>
                <li>En la barra de direcciones verás el icono <strong>Instalar app (💻⬇️)</strong>.</li>
                <li>Haz clic en <strong>Instalar</strong>.</li>
                <li>Crea un acceso directo en tu Escritorio para abrir en cualquier momento.</li>
              </ol>
            </div>
          </div>

          {/* GitHub Repository & GitHub Pages Instructions */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Publicar permanentemente desde tu repositorio de GitHub (GitHub Pages)</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Como ya tienes tu repositorio en GitHub, puedes activar <strong>GitHub Pages</strong> para que tus amigos tengan una dirección web permanente tipo <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">https://tu-usuario.github.io/tu-repo/</code>:
            </p>
            <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-start space-x-2">
                <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[11px]">Paso 1</span>
                <span>Entra en tu repositorio en GitHub desde el ordenador o móvil.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[11px]">Paso 2</span>
                <span>Ve a la pestaña <strong>Settings</strong> (Configuración) &gt; menú lateral izquierdo <strong>Pages</strong>.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[11px]">Paso 3</span>
                <span>En la sección <strong>«Build and deployment»</strong>, en el desplegable <strong>Source</strong> cambia a: <strong>«GitHub Actions»</strong>.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[11px]">Paso 4</span>
                <span>
                  El archivo de despliegue <code className="text-amber-300 font-mono">.github/workflows/deploy.yml</code> ya está configurado. Al hacer push (o pulsar <em>Actions &gt; Deploy to GitHub Pages &gt; Run workflow</em>), ¡GitHub compilará y publicará tu web automáticamente y gratis!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
