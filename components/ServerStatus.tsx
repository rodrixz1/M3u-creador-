
import React, { useState } from 'react';

interface ServerStatusProps {
    isActive: boolean;
}

export const ServerStatus: React.FC<ServerStatusProps> = ({ isActive }) => {
    const [copied, setCopied] = useState(false);
    const serverUrl = `${window.location.origin}/playlist.m3u`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(serverUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-sky-400">Servidor M3U Interno</h2>
                <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {isActive ? 'En Línea' : 'Inactivo'}
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-sm text-slate-400">
                    Tu lista está siendo servida localmente. Puedes usar esta URL en reproductores de IPTV compatibles:
                </p>
                
                <div className="flex gap-2">
                    <input
                        readOnly
                        value={serverUrl}
                        className="flex-grow bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-white font-mono text-xs focus:outline-none"
                    />
                    <button
                        onClick={copyToClipboard}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors border border-slate-600"
                    >
                        {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                </div>

                <div className="p-3 bg-amber-900/20 border border-amber-900/30 rounded-md">
                    <p className="text-[11px] text-amber-400 leading-relaxed">
                        <strong>Nota:</strong> Este servidor vive en la memoria de tu navegador. Si cierras esta pestaña, la URL dejará de funcionar. Para acceso remoto, utiliza el botón "Descargar .m3u".
                    </p>
                </div>
            </div>
        </div>
    );
};
