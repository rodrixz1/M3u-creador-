
import React from 'react';
import { CodeIcon } from './icons/CodeIcon';

interface M3uPreviewProps {
    content: string;
}

export const M3uPreview: React.FC<M3uPreviewProps> = ({ content }) => {
    return (
        <div className="bg-slate-800 rounded-lg shadow-lg p-6">
             <h2 className="text-xl font-bold text-sky-400 mb-4 flex items-center gap-2">
                <CodeIcon />
                Contenido del Archivo .m3u
            </h2>
            <textarea
                readOnly
                value={content}
                className="w-full h-64 bg-slate-900 border border-slate-600 text-slate-300 rounded-md p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="#EXTM3U&#10;El contenido de su archivo .m3u aparecerá aquí..."
            />
        </div>
    );
};
