"""
Buffet Elegance / Seleto Buffet - Backend API Server
Flask application providing authentication, owner panel logic, and dynamic menu API.
"""

import os
import jwt
import datetime
import sqlite3
from flask import Flask, request, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash
from flask_cors import CORS

# Application Initialization
app = Flask(__name__)

# Load secret key from environment or fallback default
app.secret_key = os.getenv('SECRET_KEY', 'buffet_elegance_secret_123')

# Enable CORS for frontend clients
CORS(app, supports_credentials=True, origins=[
    "null", 
    "http://127.0.0.1:5500", 
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    "http://localhost:8000"
])

DATABASE_FILE = 'buffet.db'


# ==========================================
# Database Helpers & Initialization
# ==========================================

def get_db_connection():
    """
    Creates and returns a connection to the SQLite database with Row factory enabled.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """
    Initializes database tables and inserts default admin accounts and initial menu items if empty.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Table for owners / admins
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS proprietarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL
        )
    """)

    # Table for menu items
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cardapio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria TEXT NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT
        )
    """)

    # Ensure 'admin' user exists
    cursor.execute("SELECT COUNT(*) FROM proprietarios WHERE usuario = 'admin'")
    if cursor.fetchone()[0] == 0:
        senha_hash = generate_password_hash('admin123')
        cursor.execute("INSERT INTO proprietarios (usuario, senha_hash) VALUES ('admin', ?)", (senha_hash,))

    # Ensure 'crisodarp' user exists
    cursor.execute("SELECT COUNT(*) FROM proprietarios WHERE usuario = 'crisodarp'")
    if cursor.fetchone()[0] == 0:
        senha_hash = generate_password_hash('odarpbuffet1202')
        cursor.execute("INSERT INTO proprietarios (usuario, senha_hash) VALUES ('crisodarp', ?)", (senha_hash,))

    # Insert default sample menu if empty
    cursor.execute("SELECT COUNT(*) FROM cardapio")
    if cursor.fetchone()[0] == 0:
        cursor.executemany(
            "INSERT INTO cardapio (categoria, nome, descricao) VALUES (?, ?, ?)",
            [
                ('entradas', 'Canapés de Salmão Defumado', 'Com cream cheese e raspas de limão siciliano'),
                ('entradas', 'Bruschettas de Cogumelos', 'Mix de cogumelos frescos com azeite de trufas'),
                ('principais', 'Filé Mignon ao Molho Madeira', 'Acompanhado de risoto de parmesão'),
                ('principais', 'Salmão Grelhado com Ervas', 'Com purê de mandioquinha e legumes grelhados'),
                ('sobremesas', 'Petit Gâteau de Chocolate Belga', 'Com sorvete artesanal de baunilha'),
                ('sobremesas', 'Cheesecake de Frutas Vermelhas', 'Com calda artesanal e base crocante')
            ]
        )

    conn.commit()
    conn.close()


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
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
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
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM proprietarios WHERE usuario = ?", (usuario,))
        user = cursor.fetchone()
        conn.close()

        if user and check_password_hash(user['senha_hash'], senha):
            token = jwt.encode({
                'user': usuario,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
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
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cardapio ORDER BY categoria, id")
        items = [dict(row) for row in cursor.fetchall()]
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

        cursor.execute("DELETE FROM cardapio")
        for item in items:
            cursor.execute(
                "INSERT INTO cardapio (categoria, nome, descricao) VALUES (?, ?, ?)",
                (item['categoria'], item['nome'], item['descricao'])
            )

        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Cardápio atualizado!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar menu: {e}")
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