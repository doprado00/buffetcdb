import os
from flask import Flask, request, jsonify
import mysql.connector
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env
load_dotenv()

app = Flask(__name__)

# Configuração do Banco de Dados usando variáveis de ambiente
db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

@app.route('/login', methods=['POST'])
def login():
    dados = request.json
    usuario = dados.get('usuario')
    senha = dados.get('senha')

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    
    # Busca o usuário no banco
    cursor.execute("SELECT * FROM proprietarios WHERE usuario = %s", (usuario,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()

    # Nota: Para produção, use hashes de senha. 
    # Aqui estamos comparando diretamente conforme a necessidade imediata.
    if user and (user['senha'] == senha or check_password_hash(user['senha_hash'], senha)):
        return jsonify({"success": True, "message": "Login realizado!"}), 200
    else:
        return jsonify({"success": False, "message": "Usuário ou senha inválidos"}), 401

if __name__ == '__main__':
    app.run(debug=True)
