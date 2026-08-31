-- ============================================================
--  create_db_user.sql
--  Script para criar o banco de dados e um usuário dedicado
--  com permissões mínimas necessárias para a aplicação.
--
--  INSTRUÇÕES DE USO:
--    1. Execute como administrador do MySQL (ex: root):
--         mysql -u root -p < create_db_user.sql
--    2. Substitua 'TROQUE_PELA_SENHA_REAL' por uma senha forte
--       antes de executar.
--    3. Após executar, atualize DB_USER e DB_PASSWORD no .env.
-- ============================================================

-- Cria o banco de dados (caso ainda não exista)
CREATE DATABASE IF NOT EXISTS buffet_elegance
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Remove o usuário caso já exista (evita conflitos em re-execuções)
DROP USER IF EXISTS 'buffet_app'@'127.0.0.1';
DROP USER IF EXISTS 'buffet_app'@'localhost';

-- Cria o usuário dedicado para a aplicação
CREATE USER 'buffet_app'@'127.0.0.1' IDENTIFIED BY 'TROQUE_PELA_SENHA_REAL';
CREATE USER 'buffet_app'@'localhost'  IDENTIFIED BY 'TROQUE_PELA_SENHA_REAL';

-- Concede apenas as permissões necessárias para a aplicação operar
-- (SELECT, INSERT, UPDATE, DELETE para operação; CREATE, DROP, ALTER para init_db)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX
    ON buffet_elegance.*
    TO 'buffet_app'@'127.0.0.1';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX
    ON buffet_elegance.*
    TO 'buffet_app'@'localhost';

-- Aplica as permissões imediatamente
FLUSH PRIVILEGES;

-- Verificação: lista os privilégios concedidos
SHOW GRANTS FOR 'buffet_app'@'127.0.0.1';
