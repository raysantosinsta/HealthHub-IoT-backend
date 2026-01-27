# AuthService

## Responsabilidade
O `AuthService` é responsável por **autenticação, autorização e gestão de usuários** dentro do sistema.
Ele centraliza a validação de credenciais, geração de tokens JWT, registro de usuários e operações sensíveis
como troca de senha.

---

## Dependências
Este serviço depende diretamente de:

- `PrismaService`
  - Utilizado com **SQL direto** para controle fino de queries e joins.
- `JwtService`
  - Responsável pela geração e assinatura de tokens JWT.

---

## Métodos Disponíveis

### `validateUser(email: string, password: string)`
#### Objetivo
Validar as credenciais de um usuário no processo de login.

#### Fluxo
1. Busca o usuário pelo email utilizando SQL direto.
2. Realiza `LEFT JOIN` com a tabela `Company` para enriquecer o contexto.
3. Verifica se o usuário existe.
4. Compara a senha informada com a senha armazenada no banco.
5. Remove a senha do objeto final retornado.
6. Retorna os dados do usuário + empresa associada.

#### Observações Importantes
- A comparação de senha **é feita em texto puro**.
- Logs detalhados são usados para debug durante o desenvolvimento.
- Lança `UnauthorizedException` em qualquer falha de autenticação.

#### Riscos Conhecidos
- Uso de senha em texto puro **não é seguro para produção**.
- Logs podem expor informações sensíveis se não forem removidos.

---

### `login(user: any)`
#### Objetivo
Gerar um token JWT para um usuário autenticado.

#### Payload do Token
```json
{
  "sub": "userId",
  "email": "user@email.com",
  "role": "ADMIN | STAFF",
  "companyId": "companyId"
}
