import os
import json
import jwt
import datetime
import sqlite3
from flask import Flask, request, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash
from flask_cors import CORS

app = Flask(__name__)
# Tenta carregar secret key do ambiente ou .env se disponível
app.secret_key = os.getenv('SECRET_KEY', 'buffet_elegance_secret_123')

# Configurações de sessão e CORS
CORS(app, supports_credentials=True, origins=["null", "http://127.0.0.1:5500", "http://localhost:5500"])

def get_db_connection():
    conn = sqlite3.connect('buffet.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Cria a tabela de proprietários se não existir
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS proprietarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL
        )
    """)
    
    # Cria a tabela de cardápio se não existir
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cardapio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria TEXT NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT
        )
    """)
    
    # Garante que o usuário 'admin' existe
    cursor.execute("SELECT COUNT(*) FROM proprietarios WHERE usuario = 'admin'")
    if cursor.fetchone()[0] == 0:
        senha_hash = generate_password_hash('admin123')
        cursor.execute("INSERT INTO proprietarios (usuario, senha_hash) VALUES ('admin', ?)", (senha_hash,))
        
    # Garante que o usuário 'crisodarp' também existe (usado no MySQL anteriormente)
    cursor.execute("SELECT COUNT(*) FROM proprietarios WHERE usuario = 'crisodarp'")
    if cursor.fetchone()[0] == 0:
        senha_hash = generate_password_hash('odarpbuffet1202')
        cursor.execute("INSERT INTO proprietarios (usuario, senha_hash) VALUES ('crisodarp', ?)", (senha_hash,))
    
    # Insere cardápio de exemplo se estiver vazio
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

init_db()

def verify_token(token):
    try:
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        return True
    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False

@app.route('/login', methods=['POST'])
def login():
    dados = request.json
    usuario = dados.get('usuario')
    senha = dados.get('senha')

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
                "message": "Login realizado!",
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
    session.clear()
    return jsonify({"success": True, "message": "Logout realizado!"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)