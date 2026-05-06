import os
import json
from flask import Flask, request, jsonify, session
import mysql.connector
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
from flask_cors import CORS

# Carrega as variáveis do arquivo .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'buffet_elegance_secret_123')

# Configurações de sessão (mantidas para compatibilidade, mas o foco agora é Token)
app.config.update(
    SESSION_COOKIE_SAMESITE=None,
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=True
)

# CORS configurado
CORS(app, supports_credentials=True, origins=["null", "http://127.0.0.1:5500", "http://localhost:5500"])

# Configuração do Banco de Dados
db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS proprietarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario VARCHAR(50) UNIQUE NOT NULL,
                senha_hash VARCHAR(255) NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cardapio (
                id INT AUTO_INCREMENT PRIMARY KEY,
                categoria VARCHAR(50) NOT NULL,
                nome VARCHAR(100) NOT NULL,
                descricao TEXT
            )
        """)
        
        cursor.execute("SELECT COUNT(*) FROM proprietarios WHERE usuario = 'crisodarp'")
        if cursor.fetchone()[0] == 0:
            senha_padrao_hash = generate_password_hash('odarpbuffet1202')
            cursor.execute("INSERT INTO proprietarios (usuario, senha_hash) VALUES ('crisodarp', %s)", (senha_padrao_hash,))
        
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Erro ao inicializar banco de dados: {e}")

init_db()

# Simples token para desenvolvimento local
LOCAL_TOKEN = "buffet_elegance_2026_token"

@app.route('/login', methods=['POST'])
def login():
    dados = request.json
    usuario = dados.get('usuario')
    senha = dados.get('senha')

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM proprietarios WHERE usuario = %s", (usuario,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user and user.get('senha_hash') and check_password_hash(user['senha_hash'], senha):
            return jsonify({
                "success": True, 
                "message": "Login realizado!",
                "token": LOCAL_TOKEN,
                "user": usuario
            }), 200
        else:
            return jsonify({"success": False, "message": "Usuário ou senha inválidos"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": "Erro interno"}), 500

@app.route('/api/menu', methods=['GET'])
def get_menu():
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
    # Verifica o token enviado no Header Authorization
    auth_token = request.headers.get('Authorization')
    if auth_token != LOCAL_TOKEN:
        return jsonify({"success": False, "message": "Não autorizado"}), 403

    items = request.json
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM cardapio")
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
    session.clear()
    return jsonify({"success": True, "message": "Logout realizado!"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
