
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'https://esm.sh/hls.js';

interface VideoPlayerProps {
    url: string;
    onStatusChange?: (status: 'loading' | 'online' | 'error') => void;
    onNext?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onStatusChange, onNext }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const loadStream = () => {
        const video = videoRef.current;
        if (!video || !url) return;

        let hls: Hls | null = null;
        setError(null);
        onStatusChange?.('loading');

        if (Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                manifestLoadingMaxRetry: 2,
                levelLoadingMaxRetry: 2,
                xhrSetup: (xhr) => {
                    xhr.withCredentials = false;
                }
            });
            
            hls.loadSource(url);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {
                    console.log("Auto-play blocked");
                });
                onStatusChange?.('online');
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error("HLS Fatal Error:", data);
                    setError('Error de conexión o bloqueo CORS. La señal no puede reproducirse en este navegador.');
                    onStatusChange?.('error');
                    hls?.destroy();
                }
            });
            return hls;
        } 
        else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(() => {});
                onStatusChange?.('online');
            });
            video.addEventListener('error', () => {
                setError('Error al cargar el stream nativo.');
                onStatusChange?.('error');
            });
            return null;
        } else {
            setError('Navegador no compatible con HLS (.m3u8)');
            onStatusChange?.('error');
            return null;
        }
    };

    useEffect(() => {
        const hlsInstance = loadStream();
        return () => {
            if (hlsInstance) hlsInstance.destroy();
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = "";
            }
        };
    }, [url, isRetrying]);

    return (
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-2xl group">
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 z-20 animate-in fade-in duration-300">
                    <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                        <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-2">Señal no disponible</h3>
                    <p className="text-[11px] text-slate-400 max-w-xs mb-6 leading-relaxed">
                        Este canal tiene un error fatal o está bloqueado por políticas de seguridad (CORS).
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsRetrying(!isRetrying)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-600 transition-all"
                        >
                            Reintentar
                        </button>
                        {onNext && (
                            <button 
                                onClick={onNext}
                                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-sky-900/40 transition-all"
                            >
                                Siguiente Canal
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                />
            )}
            
            {/* Overlay superior */}
            <div className="absolute top-3 left-3 flex gap-2 pointer-events-none z-10">
                 <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black text-white border border-white/10 uppercase tracking-tighter">
                    Stream Test
                </div>
            </div>

            {/* Botón flotante para siguiente canal (visible al pasar el mouse si no hay error) */}
            {!error && onNext && (
                <button 
                    onClick={onNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-sky-600 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 backdrop-blur-sm border border-white/10"
                    title="Siguiente canal"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </div>
    );
};
