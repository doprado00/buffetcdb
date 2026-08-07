import os
import jwt
import datetime
import mysql.connector
from mysql.connector import Error
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

# Configuração de Conexão com o MySQL 8.0
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',               # Substitua pelo seu usuário do MySQL se for diferente
    'password': '#Gui078383',  # Substitua pela sua senha do MySQL
    'database': 'buffet_elegance'
}

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