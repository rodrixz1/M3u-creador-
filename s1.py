#!/usr/bin/env python3
"""
Servidor HTTP simple para compartir archivos M3U
Servirá TODOS los archivos .m3u del directorio actual
Uso: python3 m3u_server.py [puerto]
"""

import http.server
import socketserver
import os
import sys
import glob
from datetime import datetime
from pathlib import Path

class M3UFileHandler(http.server.SimpleHTTPRequestHandler):
    """Manejador que solo sirve archivos .m3u y la página de índice"""
    
    def log_message(self, format, *args):
        """Registro personalizado de accesos"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        client_ip = self.client_address[0]
        print(f"[{timestamp}] {client_ip} - {self.path} - {format % args}")
    
    def do_GET(self):
        """Maneja las peticiones GET"""
        # Normalizar la ruta
        path = self.path.split('?')[0].split('#')[0]
        
        # Ruta raíz: mostrar índice de archivos .m3u
        if path == "/" or path == "":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            
            # Generar página HTML con lista de archivos
            html = self._generate_index_page()
            self.wfile.write(html.encode('utf-8'))
            return
        
        # Verificar si es un archivo .m3u
        if path.endswith('.m3u'):
            file_path = path[1:]  # Remover el slash inicial
            
            # Seguridad: prevenir directory traversal
            if '..' in file_path or file_path.startswith('/'):
                self.send_error(403, "Acceso denegado")
                return
            
            # Verificar si el archivo existe
            if os.path.exists(file_path):
                self.send_response(200)
                self.send_header("Content-type", "audio/x-mpegurl")
                self.send_header("Content-Disposition", f'attachment; filename="{os.path.basename(file_path)}"')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                
                # Leer y enviar el archivo
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, f"Archivo '{file_path}' no encontrado")
            return
        
        # Para cualquier otra ruta, mostrar error o redirigir al índice
        self.send_error(404, "Solo se permiten archivos .m3u. Vea la lista en /")
    
    def _generate_index_page(self):
        """Genera la página HTML con la lista de archivos .m3u"""
        # Buscar todos los archivos .m3u en el directorio actual
        m3u_files = sorted(glob.glob("*.m3u"))
        
        if not m3u_files:
            files_list = "<p><strong>No se encontraron archivos .m3u en este directorio.</strong></p>"
        else:
            files_list = "<ul>\n"
            for file in m3u_files:
                file_size = os.path.getsize(file)
                size_kb = file_size / 1024
                modified = datetime.fromtimestamp(os.path.getmtime(file)).strftime("%Y-%m-%d %H:%M:%S")
                
                files_list += f'''<li>
                    <a href="/{file}" download><strong>{file}</strong></a>
                    <br>
                    <small>Tamaño: {size_kb:.1f} KB | Modificado: {modified}</small>
                    <br>
                    <a href="/{file}" style="color: #4CAF50;">📥 Descargar</a> | 
                    <a href="/{file}" target="_blank" style="color: #2196F3;">👁️ Ver en navegador</a>
                </li>\n'''
            files_list += "</ul>"
        
        # Información del servidor
        server_ip = self.server.server_address[0]
        server_port = self.server.server_address[1]
        current_dir = os.getcwd()
        
        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Servidor M3U</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }}
        .header {{
            background: linear-gradient(135deg, #1a237e, #311b92);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
        .file-list {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        ul {{
            list-style-type: none;
            padding: 0;
        }}
        li {{
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #4CAF50;
            background-color: #f9f9f9;
        }}
        a {{
            text-decoration: none;
            color: #1a237e;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .info-box {{
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        code {{
            background: #f1f1f1;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>📺 Servidor de Archivos M3U</h1>
        <p>Compartiendo listas de reproducción IPTV</p>
    </div>
    
    <div class="info-box">
        <h3>📡 Información del Servidor</h3>
        <p><strong>Dirección:</strong> <code>http://{server_ip}:{server_port}/</code></p>
        <p><strong>Directorio:</strong> <code>{current_dir}</code></p>
        <p><strong>Archivos M3U encontrados:</strong> {len(m3u_files)}</p>
    </div>
    
    <div class="file-list">
        <h2>📁 Archivos Disponibles</h2>
        {files_list}
    </div>
    
    <div class="info-box">
        <h3>🔧 Cómo usar</h3>
        <p><strong>Para descargar:</strong> Haz clic en cualquier enlace de arriba</p>
        <p><strong>Para usar en reproductores:</strong> 
        <br>1. VLC: Medios → Abrir ubicación de red → Pegar URL
        <br>2. IPTV Smarters: Añadir lista M3U → Pegar URL</p>
        <p><strong>URL de ejemplo:</strong> <code>http://{server_ip}:{server_port}/nombre_archivo.m3u</code></p>
    </div>
    
    <footer style="text-align: center; margin-top: 30px; color: #666;">
        <p>Servidor M3U simple | {datetime.now().year}</p>
    </footer>
</body>
</html>"""

def get_local_ip():
    """Obtiene la IP local del servidor"""
    import socket
    try:
        # Crear un socket temporal para obtener la IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

def main():
    """Función principal"""
    # Configurar puerto (8000 por defecto)
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Error: El puerto debe ser un número")
            sys.exit(1)
    
    # Obtener IP local
    local_ip = get_local_ip()
    
    # Mostrar información
    print("=" * 60)
    print("🎬 SERVVIDOR HTTP SIMPLE PARA ARCHIVOS M3U")
    print("=" * 60)
    print(f"📂 Directorio actual: {os.getcwd()}")
    print(f"🌐 Servidor iniciado en:")
    print(f"   Local:    http://localhost:{port}")
    print(f"   Red:      http://{local_ip}:{port}")
    print(f"📡 Puerto: {port}")
    print("=" * 60)
    print("📁 Archivos .m3u encontrados:")
    
    # Listar archivos .m3u
    m3u_files = glob.glob("*.m3u")
    if m3u_files:
        for i, file in enumerate(sorted(m3u_files), 1):
            size = os.path.getsize(file)
            print(f"   {i}. {file} ({size/1024:.1f} KB)")
    else:
        print("   No se encontraron archivos .m3u")
    
    print("=" * 60)
    print("⚡ Presiona Ctrl+C para detener el servidor")
    print("=" * 60)
    
    try:
        # Configurar y lanzar el servidor
        handler = M3UFileHandler
        with socketserver.TCPServer((HOST, port), handler) as httpd:
            httpd.allow_reuse_address = True
            print(f"🚀 Servidor iniciado correctamente...")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Servidor detenido por el usuario")
    except OSError as e:
        print(f"❌ Error: No se puede iniciar el servidor en el puerto {port}")
        print(f"   Razón: {e}")
        print("   Intenta con otro puerto: python3 m3u_server.py 8080")

if __name__ == "__main__":
    HOST = "0.0.0.0"  # Escuchar en todas las interfaces
    main()
