
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PlaylistItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { ListIcon } from './icons/ListIcon';
import { VideoPlayer } from './VideoPlayer';

interface PlaylistPreviewProps {
    items: PlaylistItem[];
    onRemoveItem: (id: string) => void;
    onUpdateItem: (item: PlaylistItem) => void;
    onDeduplicate: () => void;
}

export const PlaylistPreview: React.FC<PlaylistPreviewProps> = ({ items, onRemoveItem, onUpdateItem, onDeduplicate }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<PlaylistItem | null>(null);
    const [previewItem, setPreviewItem] = useState<PlaylistItem | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<Record<string, 'loading' | 'online' | 'error'>>({});
    const [isBulkTesting, setIsBulkTesting] = useState(false);
    const [testProgress, setTestProgress] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    
    const shouldStopTest = useRef(false);

    // Filtrado de canales basado en el término de búsqueda
    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return items;
        const lowerSearch = searchTerm.toLowerCase();
        return items.filter(item => 
            item.name.toLowerCase().includes(lowerSearch) || 
            item.group.toLowerCase().includes(lowerSearch)
        );
    }, [items, searchTerm]);

    const stats = useMemo(() => {
        const total = items.length;
        const online = Object.values(verificationStatus).filter(s => s === 'online').length;
        const offline = Object.values(verificationStatus).filter(s => s === 'error').length;
        const pending = total - (online + offline);
        return { total, online, offline, pending };
    }, [items, verificationStatus]);

    const startEditing = (item: PlaylistItem) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleSave = () => {
        if (editForm) {
            onUpdateItem(editForm);
            cancelEditing();
        }
    };

    const handleVerifySingle = (item: PlaylistItem) => {
        setPreviewItem(item);
    };

    const playNext = useCallback(() => {
        if (!previewItem) return;
        const currentIndex = items.findIndex(i => i.id === previewItem.id);
        const nextIndex = (currentIndex + 1) % items.length;
        setPreviewItem(items[nextIndex]);
    }, [previewItem, items]);

    const verifyChannel = async (item: PlaylistItem) => {
        setVerificationStatus(prev => ({ ...prev, [item.id]: 'loading' }));
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 7000);

            // Ping ligero usando fetch
            await fetch(item.url, { 
                method: 'GET', 
                mode: 'no-cors',
                signal: controller.signal 
            });
            
            clearTimeout(timeoutId);
            setVerificationStatus(prev => ({ ...prev, [item.id]: 'online' }));
            return true;
        } catch (err) {
            setVerificationStatus(prev => ({ ...prev, [item.id]: 'error' }));
            return false;
        }
    };

    const runBulkTest = async () => {
        if (items.length === 0) return;
        setIsBulkTesting(true);
        shouldStopTest.current = false;
        setTestProgress(0);

        for (let i = 0; i < items.length; i++) {
            if (shouldStopTest.current) break;
            setTestProgress(i + 1);
            await verifyChannel(items[i]);
            // Pausa estratégica para no ser bloqueado
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        setIsBulkTesting(false);
    };

    const stopBulkTest = () => {
        shouldStopTest.current = true;
        setIsBulkTesting(false);
    };

    const clearBrokenChannels = () => {
        const brokenIds = Object.keys(verificationStatus).filter(id => verificationStatus[id] === 'error');
        if (brokenIds.length === 0) {
            alert("No hay canales marcados como Offline para limpiar. Ejecuta el Auto-Test primero.");
            return;
        }
        if (window.confirm(`¿Confirmas eliminar definitivamente los ${brokenIds.length} canales caídos?`)) {
            brokenIds.forEach(id => onRemoveItem(id));
            setVerificationStatus(prev => {
                const next = { ...prev };
                brokenIds.forEach(id => delete next[id]);
                return next;
            });
        }
    };

    const getStatusBadge = (id: string) => {
        const status = verificationStatus[id];
        if (!status) return null;
        
        const config = {
            loading: { text: '...', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
            online: { text: 'Online', class: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' },
            error: { text: 'Offline', class: 'bg-red-500/10 text-red-500 border-red-500/20' }
        };
        
        return (
            <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-black tracking-widest transition-all duration-300 ${config[status].class}`}>
                {config[status].text}
            </span>
        );
    };

    return (
        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700 flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-sky-400 flex items-center gap-2">
                        <ListIcon />
                        Gestión y Fusión de Listas
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                            {stats.total} Canales
                        </span>
                        {stats.online > 0 && <span className="text-[10px] text-green-500 font-bold">● {stats.online} Online</span>}
                        {stats.offline > 0 && <span className="text-[10px] text-red-500 font-bold">● {stats.offline} Caídos</span>}
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {isBulkTesting ? (
                        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
                            <span className="text-[10px] font-black text-sky-500 animate-pulse">TEST: {testProgress}/{items.length}</span>
                            <button onClick={stopBulkTest} className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase">Detener</button>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={runBulkTest}
                                disabled={items.length === 0}
                                className="px-3 py-1.5 bg-slate-900 text-sky-400 border border-sky-900/40 rounded-lg text-[9px] font-black hover:bg-sky-500/10 transition-all flex items-center gap-2 disabled:opacity-30"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                TESTEAR SEÑAL
                            </button>
                            <button 
                                onClick={onDeduplicate}
                                disabled={items.length === 0}
                                className="px-3 py-1.5 bg-slate-900 text-amber-400 border border-amber-900/40 rounded-lg text-[9px] font-black hover:bg-amber-500/10 transition-all flex items-center gap-2 disabled:opacity-30"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                FUSIÓN (DEDUP)
                            </button>
                            <button 
                                onClick={clearBrokenChannels}
                                disabled={stats.offline === 0}
                                className="px-3 py-1.5 bg-slate-900 text-red-400 border border-red-900/40 rounded-lg text-[9px] font-black hover:bg-red-500/10 transition-all flex items-center gap-2 disabled:opacity-30"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                LIMPIAR CAÍDOS
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Buscador de Canales */}
            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o categoría..."
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {previewItem && (
                <div className="mb-8 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auditoría:</span>
                            <span className="text-xs font-bold text-white truncate max-w-[150px]">{previewItem.name}</span>
                            {getStatusBadge(previewItem.id)}
                        </div>
                        <button onClick={() => setPreviewItem(null)} className="text-[10px] font-black text-slate-400 hover:text-white uppercase bg-slate-700 px-2 py-1 rounded">Cerrar</button>
                    </div>
                    <VideoPlayer 
                        url={previewItem.url} 
                        onStatusChange={(status) => setVerificationStatus(prev => ({...prev, [previewItem.id]: status}))}
                        onNext={playNext}
                    />
                </div>
            )}

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar max-h-[600px] min-h-[400px]">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-700/50 rounded-3xl bg-slate-900/20">
                        <svg className="w-12 h-12 text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">
                            {searchTerm ? 'No hay resultados' : 'Sin Canales'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {filteredItems.map((item) => (
                            <div key={item.id} className={`group relative bg-slate-900/40 border p-4 rounded-2xl transition-all duration-300 ${previewItem?.id === item.id ? 'border-sky-500 ring-4 ring-sky-500/5 shadow-2xl bg-slate-900' : 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-900/80'}`}>
                                {editingId === item.id && editForm ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Nombre" />
                                            <input className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none" value={editForm.group} onChange={e => setEditForm({...editForm, group: e.target.value})} placeholder="Grupo" />
                                        </div>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono" value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})} placeholder="URL de transmisión" />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={cancelEditing} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white uppercase">Descartar</button>
                                            <button onClick={handleSave} className="px-6 py-2 bg-sky-600 text-white rounded-xl text-xs font-black shadow-lg shadow-sky-900/20">Actualizar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-800/80 rounded-xl flex items-center justify-center border border-slate-700 overflow-hidden flex-shrink-0">
                                            {item.logo ? (
                                                <img src={item.logo} alt="" className="w-full h-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                            ) : (
                                                <span className="text-sky-500 font-black text-xl">{item.name.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-3 truncate">
                                                    <h3 className="font-bold text-slate-200 truncate text-sm tracking-tight">{item.name}</h3>
                                                    {getStatusBadge(item.id)}
                                                </div>
                                                {item.group && (
                                                    <span className="text-[8px] bg-slate-800/80 text-slate-500 px-2 py-0.5 rounded border border-slate-700 uppercase font-black tracking-tighter">
                                                        {item.group}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleVerifySingle(item)} className="text-[10px] font-black uppercase text-sky-400 hover:text-sky-300 tracking-wider">
                                                    Verificar
                                                </button>
                                                <button onClick={() => startEditing(item)} className="text-[10px] font-black uppercase text-slate-500 hover:text-white tracking-wider">
                                                    Editar
                                                </button>
                                                <button onClick={() => onRemoveItem(item.id)} className="text-[10px] font-black uppercase text-red-500/50 hover:text-red-400 tracking-wider ml-auto">
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
