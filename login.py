import os
import jwt
import datetime
import uuid
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

load_dotenv()
from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from flask_cors import CORS

# Application Initialization
app = Flask(__name__)

# Upload configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GALERIA_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'imagens', 'galeria')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

os.makedirs(GALERIA_UPLOAD_FOLDER, exist_ok=True)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Load secret key from environment — never falls back to a hardcoded value in production
app.secret_key = os.getenv('SECRET_KEY')
if not app.secret_key:
    raise RuntimeError(
        "SECRET_KEY não definida. Adicione SECRET_KEY ao seu arquivo .env antes de iniciar o servidor."
    )

# Enable CORS for frontend clients
CORS(app, supports_credentials=True, origins=[
    "null", 
    "http://127.0.0.1:5500", 
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    "http://localhost:8000"
])

# Configuração do banco de dados lida exclusivamente a partir do arquivo .env
MYSQL_CONFIG = {
    'host':     os.getenv('DB_HOST', '127.0.0.1'),
    'user':     os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
}

# Validação obrigatória: interrompe a inicialização se alguma variável crítica estiver ausente
_missing_vars = [k for k, v in MYSQL_CONFIG.items() if v is None]
if _missing_vars:
    raise RuntimeError(
        f"Variáveis de ambiente obrigatórias ausentes no .env: {', '.join(_missing_vars).upper()}"
    )

# ==========================================
# Database Helpers & Initialization
# ==========================================

def get_db_connection():
    """
    Cria e retorna a conexão com o banco MySQL.
    """
    return mysql.connector.connect(**MYSQL_CONFIG)


def init_db():
    """
    Inicializa as tabelas do MySQL e insere dados padrões se estiverem vazias.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Tabela de proprietários / admins
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS proprietarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario VARCHAR(255) UNIQUE NOT NULL,
                senha_hash VARCHAR(255) NOT NULL
            )
        """)

        # Tabela do cardápio
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cardapio (
                id INT AUTO_INCREMENT PRIMARY KEY,
                categoria VARCHAR(100) NOT NULL,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT
            )
        """)

        # Tabela da galeria de fotos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS galeria_fotos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT,
                categoria VARCHAR(100) NOT NULL DEFAULT 'eventos',
                filename VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Garantir usuário 'admin'
        cursor.execute("SELECT COUNT(*) AS total FROM proprietarios WHERE usuario = 'admin'")
        if cursor.fetchone()['total'] == 0:
            senha_hash = generate_password_hash('admin123')
            cursor.execute("INSERT INTO proprietarios (usuario, senha_hash) VALUES (%s, %s)", ('admin', senha_hash))

        # Garantir usuário 'crisodarp'
        cursor.execute("SELECT COUNT(*) AS total FROM proprietarios WHERE usuario = 'crisodarp'")
        if cursor.fetchone()['total'] == 0:
            senha_hash = generate_password_hash('odarpbuffet1202')
            cursor.execute("INSERT INTO proprietarios (usuario, senha_hash) VALUES (%s, %s)", ('crisodarp', senha_hash))

        # Inserir cardápio padrão se estiver vazio
        cursor.execute("SELECT COUNT(*) AS total FROM cardapio")
        if cursor.fetchone()['total'] == 0:
            itens_padrao = [
                ('entradas', 'Canapés de Salmão Defumado', 'Com cream cheese e raspas de limão siciliano'),
                ('entradas', 'Bruschettas de Cogumelos', 'Mix de cogumelos frescos com azeite de trufas'),
                ('principais', 'Filé Mignon ao Molho Madeira', 'Acompanhado de risoto de parmesão'),
                ('principais', 'Salmão Grelhado com Ervas', 'Com purê de mandioquinha e legumes grelhados'),
                ('sobremesas', 'Petit Gâteau de Chocolate Belga', 'Com sorvete artesanal de baunilha'),
                ('sobremesas', 'Cheesecake de Frutas Vermelhas', 'Com calda artesanal e base crocante')
            ]
            cursor.executemany(
                "INSERT INTO cardapio (categoria, nome, descricao) VALUES (%s, %s, %s)",
                itens_padrao
            )

        conn.commit()
        cursor.close()
        conn.close()
        print("Banco de dados MySQL inicializado com sucesso!")
    except Error as e:
        print(f"Erro ao inicializar o MySQL: {e}")


# Initialize DB upon script load
init_db()


# ==========================================
# Authentication Helpers
# ==========================================

def verify_token(token):
    """
    Decodes and validates JWT authentication tokens.
    """
    try:
        # Trata o envio do cabeçalho caso venha como "Bearer <token>"
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
            
        jwt.decode(token, app.secret_key, algorithms=['HS256'])
        return True
    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False


# ==========================================
# API Routes
# ==========================================

@app.route('/login', methods=['POST'])
def login():
    """
    Authenticates owners/admins and returns a JWT token.
    """
    dados = request.json or {}
    usuario = dados.get('usuario')
    senha = dados.get('senha')

    if not usuario or not senha:
        return jsonify({"success": False, "message": "Informe usuário e senha"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM proprietarios WHERE usuario = %s", (usuario,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user and check_password_hash(user['senha_hash'], senha):
            token = jwt.encode({
                'user': usuario,
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
            }, app.secret_key, algorithm='HS256')

            return jsonify({
                "success": True,
                "message": "Login realizado com sucesso!",
                "token": token,
                "user": usuario
            }), 200
        else:
            return jsonify({"success": False, "message": "Usuário ou senha inválidos"}), 401
    except Exception as e:
        print(f"Erro no login: {e}")
        return jsonify({"success": False, "message": "Erro interno no servidor"}), 500


@app.route('/api/menu', methods=['GET'])
def get_menu():
    """
    Retrieves all menu items ordered by category and ID.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM cardapio ORDER BY categoria, id")
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(items), 200
    except Exception as e:
        print(f"Erro ao carregar menu: {e}")
        return jsonify({"error": "Erro ao carregar cardápio"}), 500


@app.route('/api/menu/update', methods=['POST'])
def update_menu():
    """
    Updates the entire menu. Requires a valid JWT token in the Authorization header.
    """
    auth_token = request.headers.get('Authorization')
    if not auth_token or not verify_token(auth_token):
        return jsonify({"success": False, "message": "Não autorizado"}), 403

    items = request.json
    if not isinstance(items, list):
        return jsonify({"success": False, "message": "Formato de dados inválido"}), 400

    for item in items:
        if not all(k in item for k in ('categoria', 'nome', 'descricao')):
            return jsonify({"success": False, "message": "Dados do cardápio incompletos"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Limpa o cardápio e insere os novos itens
        cursor.execute("TRUNCATE TABLE cardapio")
        for item in items:
            cursor.execute(
                "INSERT INTO cardapio (categoria, nome, descricao) VALUES (%s, %s, %s)",
                (item['categoria'], item['nome'], item['descricao'])
            )

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True, "message": "Cardápio atualizado!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar menu: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================
# Gallery API Routes
# ==========================================

@app.route('/imagens/galeria/<path:filename>')
def serve_galeria_image(filename):
    """
    Serves gallery images from the imagens/galeria/ folder.
    """
    return send_from_directory(GALERIA_UPLOAD_FOLDER, filename)


@app.route('/api/galeria', methods=['GET'])
def get_galeria():
    """
    Retrieves all gallery photos ordered by creation date (newest first).
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Suporta tanto 'created_at' quanto 'criado_em' como coluna de data
        try:
            cursor.execute("SELECT * FROM galeria_fotos ORDER BY created_at DESC")
        except Exception:
            cursor.execute("SELECT * FROM galeria_fotos ORDER BY criado_em DESC")
        fotos = cursor.fetchall()
        cursor.close()
        conn.close()
        # Convert ALL datetime fields to string for JSON serialization
        for foto in fotos:
            for key, val in foto.items():
                if hasattr(val, 'isoformat'):
                    foto[key] = val.isoformat()
        return jsonify(fotos), 200
    except Exception as e:
        print(f"Erro ao carregar galeria: {e}")
        return jsonify({"error": "Erro ao carregar galeria"}), 500


@app.route('/api/galeria/upload', methods=['POST'])
def upload_galeria():
    """
    Uploads a new photo to the gallery. Requires a valid JWT token.
    Expects multipart/form-data with 'foto', 'titulo', 'descricao', 'categoria' fields.
    """
    auth_token = request.headers.get('Authorization')
    if not auth_token or not verify_token(auth_token):
        return jsonify({"success": False, "message": "Não autorizado"}), 403

    if 'foto' not in request.files:
        return jsonify({"success": False, "message": "Nenhuma foto enviada"}), 400

    file = request.files['foto']
    titulo = request.form.get('titulo', '').strip()
    descricao = request.form.get('descricao', '').strip()
    categoria = request.form.get('categoria', 'eventos').strip()

    if not titulo:
        return jsonify({"success": False, "message": "Título é obrigatório"}), 400

    if file.filename == '':
        return jsonify({"success": False, "message": "Nenhum arquivo selecionado"}), 400

    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "Formato de arquivo não suportado. Use PNG, JPG, JPEG, GIF ou WebP."}), 400

    try:
        # Generate a unique filename to avoid conflicts
        ext = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(GALERIA_UPLOAD_FOLDER, unique_filename)
        file.save(filepath)

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "INSERT INTO galeria_fotos (titulo, descricao, categoria, filename) VALUES (%s, %s, %s, %s)",
            (titulo, descricao, categoria, unique_filename)
        )
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Foto adicionada com sucesso!",
            "foto": {
                "id": new_id,
                "titulo": titulo,
                "descricao": descricao,
                "categoria": categoria,
                "filename": unique_filename
            }
        }), 201
    except Exception as e:
        print(f"Erro ao fazer upload: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/galeria/<int:foto_id>', methods=['DELETE'])
def delete_galeria(foto_id):
    """
    Deletes a gallery photo by ID. Requires a valid JWT token.
    Also removes the physical file from disk.
    """
    auth_token = request.headers.get('Authorization')
    if not auth_token or not verify_token(auth_token):
        return jsonify({"success": False, "message": "Não autorizado"}), 403

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT filename FROM galeria_fotos WHERE id = %s", (foto_id,))
        foto = cursor.fetchone()

        if not foto:
            cursor.close()
            conn.close()
            return jsonify({"success": False, "message": "Foto não encontrada"}), 404

        # Remove physical file
        filepath = os.path.join(GALERIA_UPLOAD_FOLDER, foto['filename'])
        if os.path.exists(filepath):
            os.remove(filepath)

        cursor.execute("DELETE FROM galeria_fotos WHERE id = %s", (foto_id,))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Foto excluída com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao excluir foto: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/logout', methods=['POST'])
def logout():
    """
    Clears server-side session.
    """
    session.clear()
    return jsonify({"success": True, "message": "Logout realizado!"}), 200


# ==========================================
# Main Execution
# ==========================================

if __name__ == '__main__':
    app.run(debug=True, port=5000)