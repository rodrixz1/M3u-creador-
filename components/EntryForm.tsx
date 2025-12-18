
import React, { useState, useRef } from 'react';
import { PlaylistItem } from '../types';
import { FolderIcon } from './icons/FolderIcon';
import { UploadIcon } from './icons/UploadIcon';

interface EntryFormProps {
    onAddItem: (item: Omit<PlaylistItem, 'id'>) => void;
    onAddItems: (items: Omit<PlaylistItem, 'id'>[]) => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({ onAddItem, onAddItems }) => {
    const [name, setName] = useState('');
    const [group, setGroup] = useState('');
    const [logo, setLogo] = useState('');
    const [url, setUrl] = useState('');
    const [localServerPort, setLocalServerPort] = useState('8000');
    const m3uInputRef = useRef<HTMLInputElement>(null);
    const directoryInputRef = useRef<HTMLInputElement>(null);

    const cleanFileName = (fileName: string): string => {
        const nameWithoutExt = fileName.lastIndexOf('.') > 0 ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
        return nameWithoutExt.replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const parseM3uContent = (content: string): Omit<PlaylistItem, 'id'>[] => {
        const lines = content.split('\n');
        const items: Omit<PlaylistItem, 'id'>[] = [];
        let currentItem: Partial<Omit<PlaylistItem, 'id'>> = {};

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('#EXTINF:')) {
                const nameMatch = trimmed.match(/,(.*)$/);
                if (nameMatch) currentItem.name = nameMatch[1].trim();

                const groupMatch = trimmed.match(/group-title="([^"]+)"/);
                if (groupMatch) currentItem.group = groupMatch[1];

                const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
                if (logoMatch) currentItem.logo = logoMatch[1];
            } else if (trimmed && !trimmed.startsWith('#')) {
                currentItem.url = trimmed;
                if (currentItem.name && currentItem.url) {
                    items.push({
                        name: currentItem.name,
                        url: currentItem.url,
                        group: currentItem.group || '',
                        logo: currentItem.logo || '',
                    });
                }
                currentItem = {};
            }
        });
        return items;
    };

    const handleM3uUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const newItems = parseM3uContent(content);
            
            if (newItems.length > 0) {
                onAddItems(newItems);
                alert(`Se han importado ${newItems.length} canales.`);
            } else {
                alert('No se encontraron canales válidos en el archivo M3U.');
            }
            if (m3uInputRef.current) m3uInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleDirectoryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileList = Array.from(files) as File[];
        const mediaItems: Omit<PlaylistItem, 'id'>[] = [];
        const m3uPromises: Promise<Omit<PlaylistItem, 'id'>[]>[] = [];

        fileList.forEach(file => {
            if (file.name.startsWith('.')) return;

            const isM3u = /\.(m3u|m3u8)$/i.test(file.name);
            const isMedia = /\.(mp4|mkv|avi|mp3|m4a|ts)$/i.test(file.name);

            if (isM3u) {
                const promise = new Promise<Omit<PlaylistItem, 'id'>[]>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const content = event.target?.result as string;
                        resolve(parseM3uContent(content));
                    };
                    reader.onerror = () => resolve([]);
                    reader.readAsText(file);
                });
                m3uPromises.push(promise);
            } else if (isMedia) {
                mediaItems.push({
                    name: cleanFileName(file.name),
                    url: `http://localhost:${localServerPort}/${file.name}`,
                    group: 'Local / Folder',
                    logo: '',
                });
            }
        });

        const parsedM3uResults = await Promise.all(m3uPromises);
        const allPlaylistItems = parsedM3uResults.flat();
        const totalItems = [...mediaItems, ...allPlaylistItems];

        if (totalItems.length > 0) {
            onAddItems(totalItems);
            alert(`Escaneo completado: ${mediaItems.length} archivos locales y ${allPlaylistItems.length} canales de listas M3U encontrados.`);
        } else {
            alert('No se encontraron archivos de medios ni listas M3U válidas.');
        }

        if (directoryInputRef.current) directoryInputRef.current.value = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !url.trim()) return;

        onAddItem({ name, group, logo, url });
        setName('');
        setGroup('');
        setLogo('');
        setUrl('');
    };

    return (
        <div className="bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-sky-400 mb-4">Añadir Canales</h2>
            
            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    type="button"
                    onClick={() => m3uInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-md transition-colors text-sm font-medium border border-slate-600"
                >
                    <UploadIcon />
                    Importar M3U
                </button>
                <button
                    type="button"
                    onClick={() => directoryInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-md transition-colors text-sm font-medium border border-slate-600"
                >
                    <FolderIcon />
                    Escanear Carpeta
                </button>
                <input
                    type="file"
                    ref={m3uInputRef}
                    onChange={handleM3uUpload}
                    accept=".m3u,.m3u8"
                    className="hidden"
                />
                <input
                    type="file"
                    ref={directoryInputRef}
                    onChange={handleDirectoryChange}
                    webkitdirectory=""
                    directory=""
                    className="hidden"
                />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre del Canal</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                            placeholder="Ej: CNN International"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Grupo / Categoría</label>
                        <input
                            type="text"
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                            placeholder="Ej: Noticias"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">URL del Logo (Opcional)</label>
                    <input
                        type="url"
                        value={logo}
                        onChange={(e) => setLogo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                        placeholder="https://ejemplo.com/logo.png"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">URL de Transmisión</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                        placeholder="http://servidor:puerto/canal.m3u8"
                        required
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-all shadow-lg shadow-sky-900/20"
                    >
                        Añadir a la Lista
                    </button>
                </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Puerto Servidor Local (para archivos locales)</label>
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        value={localServerPort}
                        onChange={(e) => setLocalServerPort(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-md py-1 px-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-500 italic">Usado para generar URLs tipo localhost si se escanean carpetas con videos.</p>
                </div>
            </div>
        </div>
    );
};
