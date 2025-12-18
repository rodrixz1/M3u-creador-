
import React from 'react';
import { LogoIcon } from './icons/LogoIcon';

export const Header: React.FC = () => {
    return (
        <header className="bg-slate-900/70 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 flex items-center gap-4">
                 <LogoIcon />
                <div>
                    <h1 className="text-2xl font-bold text-white">M3U Playlist Creator</h1>
                    <p className="text-sm text-slate-400">Crea, previsualiza y guarda tus listas de reproducción M3U fácilmente.</p>
                </div>
            </div>
        </header>
    );
};
