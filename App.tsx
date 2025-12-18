
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PlaylistItem } from './types';
import { EntryForm } from './components/EntryForm';
import { PlaylistPreview } from './components/PlaylistPreview';
import { M3uPreview } from './components/M3uPreview';
import { Header } from './components/Header';
import { ServerStatus } from './components/ServerStatus';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ClearIcon } from './components/icons/ClearIcon';

const App: React.FC = () => {
    const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
    const [serverActive, setServerActive] = useState(false);

    const addPlaylistItem = useCallback((item: Omit<PlaylistItem, 'id'>) => {
        const newItem: PlaylistItem = { ...item, id: crypto.randomUUID() };
        setPlaylistItems(prevItems => [...prevItems, newItem]);
    }, []);

    const addPlaylistItems = useCallback((items: Omit<PlaylistItem, 'id'>[]) => {
        const newItems: PlaylistItem[] = items.map(item => ({
            ...item,
            id: crypto.randomUUID()
        }));
        setPlaylistItems(prevItems => [...prevItems, ...newItems]);
    }, []);

    const updatePlaylistItem = useCallback((updatedItem: PlaylistItem) => {
        setPlaylistItems(prevItems => 
            prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
        );
    }, []);

    const removePlaylistItem = useCallback((id: string) => {
        setPlaylistItems(prevItems => prevItems.filter(item => item.id !== id));
    }, []);

    const deduplicatePlaylist = useCallback(() => {
        setPlaylistItems(prevItems => {
            const seenUrls = new Set();
            const uniqueItems = prevItems.filter(item => {
                if (seenUrls.has(item.url)) return false;
                seenUrls.add(item.url);
                return true;
            });
            const removedCount = prevItems.length - uniqueItems.length;
            if (removedCount > 0) {
                alert(`Fusión completada: se eliminaron ${removedCount} canales duplicados.`);
            } else {
                alert("No se encontraron canales duplicados.");
            }
            return uniqueItems;
        });
    }, []);

    const clearPlaylist = useCallback(() => {
        if (window.confirm('¿Estás seguro de que deseas vaciar toda la lista?')) {
            setPlaylistItems([]);
        }
    }, []);

    const m3uContent = useMemo(() => {
        const header = '#EXTM3U';
        const body = playlistItems.map(item => {
            const groupTitle = item.group ? ` group-title="${item.group}"` : '';
            const tvgLogo = item.logo ? ` tvg-logo="${item.logo}"` : '';
            return `#EXTINF:-1${groupTitle}${tvgLogo},${item.name}\n${item.url}`;
        }).join('\n');
        return playlistItems.length > 0 ? `${header}\n${body}` : '';
    }, [playlistItems]);

    useEffect(() => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SET_M3U_CONTENT',
                content: m3uContent
            });
            setServerActive(true);
        }
    }, [m3uContent]);

    const handleSave = () => {
        if(playlistItems.length === 0) {
            alert("La lista de reproducción está vacía.");
            return;
        }
        const blob = new Blob([m3uContent], { type: 'application/mpegurl;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'playlist_editada.m3u';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans pb-12">
            <Header />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* Columna Izquierda: Entradas y Estado (4/12) */}
                    <div className="xl:col-span-4 flex flex-col gap-6">
                        <EntryForm onAddItem={addPlaylistItem} onAddItems={addPlaylistItems} />
                        
                        <ServerStatus isActive={serverActive && playlistItems.length > 0} />

                        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
                            <h2 className="text-xl font-bold text-sky-400 mb-4">Exportación y Acciones</h2>
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={handleSave}
                                    disabled={playlistItems.length === 0}
                                    className="flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg"
                                >
                                    <DownloadIcon />
                                    Descargar .m3u
                                </button>
                                <button
                                    onClick={clearPlaylist}
                                    disabled={playlistItems.length === 0}
                                    className="flex items-center justify-center gap-2 bg-slate-700 text-red-400 font-bold py-3 px-4 rounded-lg hover:bg-red-900/20 hover:text-red-300 transition-colors border border-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ClearIcon />
                                    Borrar Todo
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Gestor con Reproductor y Preview (8/12) */}
                    <div className="xl:col-span-8 flex flex-col gap-8">
                        <PlaylistPreview 
                            items={playlistItems} 
                            onRemoveItem={removePlaylistItem} 
                            onUpdateItem={updatePlaylistItem}
                            onDeduplicate={deduplicatePlaylist}
                        />
                        <M3uPreview content={m3uContent} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
