"""
Utilitário para gerar hashes de senha seguros utilizando a Werkzeug.
Utilize este script para criar novas senhas de proprietário/administrador.
"""

from werkzeug.security import generate_password_hash, check_password_hash

def main():
    senha = input("Digite a senha para gerar o hash: ")
    if senha:
        senha_hash = generate_password_hash(senha)
        print(f"\nSenha: {senha}")
        print(f"Hash Gerado: {senha_hash}\n")

if __name__ == "__main__":
    main()
