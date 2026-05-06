import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

def fix_admin():
    try:
        print(f"Conectando ao banco {db_config['database']}...")
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Garante que a tabela existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS proprietarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario VARCHAR(50) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                senha_hash VARCHAR(255)
            )
        """)
        
        # Verifica se o admin já existe
        cursor.execute("SELECT id FROM proprietarios WHERE usuario = 'admin'")
        result = cursor.fetchone()
        
        if result:
            print("Usuário 'admin' já existe. Atualizando a senha para 'admin123'...")
            cursor.execute("UPDATE proprietarios SET senha = 'admin123' WHERE usuario = 'admin'")
        else:
            print("Criando usuário 'admin' com senha 'admin123'...")
            cursor.execute("INSERT INTO proprietarios (usuario, senha) VALUES ('admin', 'admin123')")
        
        conn.commit()
        print("Tudo pronto! Tente logar novamente agora.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"ERRO: {e}")

if __name__ == "__main__":
    fix_admin()
