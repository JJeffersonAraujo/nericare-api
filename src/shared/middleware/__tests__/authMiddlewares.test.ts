import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import { jwtConfig } from '../../../config/jwt.ts'
import {
  parseAuthenticatedUser,
  authMiddleware,
  isValidRole
} from '../authMiddlewares.ts'

describe('Validação e Hardening de Autenticação JWT (authMiddlewares)', () => {

  describe('parseAuthenticatedUser (Validação estrita de payload)', () => {
    it('deve extrair e tipar corretamente um payload válido com ID numérico', () => {
      const payload = {
        id: 10,
        nome: 'Dr. Roberto',
        email: 'roberto@hospital.com',
        role: Role.PROFISSIONAL
      }
      const user = parseAuthenticatedUser(payload)
      assert.ok(user)
      assert.strictEqual(user.id, 10)
      assert.strictEqual(user.nome, 'Dr. Roberto')
      assert.strictEqual(user.email, 'roberto@hospital.com')
      assert.strictEqual(user.role, Role.PROFISSIONAL)
    })

    it('deve converter ID string numérico válido para number inteiro positivo', () => {
      const payload = {
        id: '25',
        nome: 'Enfermeira Ana',
        email: 'ana@hospital.com',
        role: Role.GESTOR
      }
      const user = parseAuthenticatedUser(payload)
      assert.ok(user)
      assert.strictEqual(user.id, 25)
      assert.strictEqual(user.role, Role.GESTOR)
    })

    it('deve rejeitar ID inválido (string não-numérica, negativo ou zero)', () => {
      assert.strictEqual(parseAuthenticatedUser({ id: 'abc', email: 'a@a.com', role: Role.USER }), null)
      assert.strictEqual(parseAuthenticatedUser({ id: -5, email: 'a@a.com', role: Role.USER }), null)
      assert.strictEqual(parseAuthenticatedUser({ id: 0, email: 'a@a.com', role: Role.USER }), null)
      assert.strictEqual(parseAuthenticatedUser({ id: 3.14, email: 'a@a.com', role: Role.USER }), null)
      assert.strictEqual(parseAuthenticatedUser({ email: 'a@a.com', role: Role.USER }), null)
    })

    it('deve rejeitar payload com e-mail inválido ou ausente', () => {
      assert.strictEqual(parseAuthenticatedUser({ id: 1, email: '', role: Role.ADMIN }), null)
      assert.strictEqual(parseAuthenticatedUser({ id: 1, email: 'email_sem_arroba', role: Role.ADMIN }), null)
      assert.strictEqual(parseAuthenticatedUser({ id: 1, role: Role.ADMIN }), null)
    })

    it('deve rejeitar payload com role não pertencente ao enum Role do Prisma', () => {
      assert.strictEqual(parseAuthenticatedUser({ id: 1, email: 'a@a.com', role: 'SUPERUSER' }), null)
      assert.strictEqual(parseAuthenticatedUser({ id: 1, email: 'a@a.com', role: 123 }), null)
      assert.strictEqual(parseAuthenticatedUser({ id: 1, email: 'a@a.com' }), null)
    })

    it('deve validar corretamente se uma role é válida via isValidRole', () => {
      assert.strictEqual(isValidRole(Role.ADMIN), true)
      assert.strictEqual(isValidRole(Role.GESTOR), true)
      assert.strictEqual(isValidRole(Role.PROFISSIONAL), true)
      assert.strictEqual(isValidRole(Role.USER), true)
      assert.strictEqual(isValidRole('INVALIDO'), false)
      assert.strictEqual(isValidRole(null), false)
    })
  })

  describe('authMiddleware (Interceptação HTTP Express)', () => {

    function createMockRes() {
      const res: any = {
        statusCode: 200,
        body: null,
        status(code: number) {
          this.statusCode = code
          return this
        },
        json(data: any) {
          this.body = data
          return this
        }
      }
      return res
    }

    it('deve retornar HTTP 401 quando o cabeçalho Authorization não for informado', async () => {
      const req: any = { headers: {} }
      const res = createMockRes()
      let nextCalled = false

      await authMiddleware(req, res, () => { nextCalled = true })

      assert.strictEqual(res.statusCode, 401)
      assert.deepStrictEqual(res.body, { message: 'Token não informado' })
      assert.strictEqual(nextCalled, false)
    })

    it('deve retornar HTTP 401 quando o cabeçalho Authorization não usar o prefixo Bearer', async () => {
      const req: any = { headers: { authorization: 'Basic 123456' } }
      const res = createMockRes()
      let nextCalled = false

      await authMiddleware(req, res, () => { nextCalled = true })

      assert.strictEqual(res.statusCode, 401)
      assert.deepStrictEqual(res.body, { message: 'Formato de token inválido' })
      assert.strictEqual(nextCalled, false)
    })

    it('deve retornar HTTP 401 quando o token tiver assinatura inválida', async () => {
      const req: any = { headers: { authorization: 'Bearer token_invalido_corrompido' } }
      const res = createMockRes()
      let nextCalled = false

      await authMiddleware(req, res, () => { nextCalled = true })

      assert.strictEqual(res.statusCode, 401)
      assert.deepStrictEqual(res.body, { message: 'Token inválido' })
      assert.strictEqual(nextCalled, false)
    })

    it('deve retornar HTTP 401 com mensagem específica quando o token estiver expirado', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'user@test.com', role: Role.ADMIN },
        jwtConfig.secret,
        { expiresIn: '-1s' } // Já criado expirado
      )

      const req: any = { headers: { authorization: `Bearer ${expiredToken}` } }
      const res = createMockRes()
      let nextCalled = false

      await authMiddleware(req, res, () => { nextCalled = true })

      assert.strictEqual(res.statusCode, 401)
      assert.deepStrictEqual(res.body, { message: 'Token expirado' })
      assert.strictEqual(nextCalled, false)
    })

    it('deve retornar HTTP 401 quando o token tiver assinatura válida mas payload inconsistente', async () => {
      // Token assinado com sucesso pelo secret do sistema, mas sem campo role
      const payloadInconsistente = jwt.sign(
        { id: 'nao_numerico', email: 'user@test.com' },
        jwtConfig.secret
      )

      const req: any = { headers: { authorization: `Bearer ${payloadInconsistente}` } }
      const res = createMockRes()
      let nextCalled = false

      await authMiddleware(req, res, () => { nextCalled = true })

      assert.strictEqual(res.statusCode, 401)
      assert.deepStrictEqual(res.body, { message: 'Payload do token inconsistente' })
      assert.strictEqual(nextCalled, false)
    })

    it('deve autenticar com sucesso quando o token for válido e consistente', async () => {
      const validToken = jwt.sign(
        { id: 7, nome: 'Dr. Lucas', email: 'lucas@hospital.com', role: Role.ADMIN },
        jwtConfig.secret,
        { expiresIn: '15m' }
      )

      const req: any = { headers: { authorization: `Bearer ${validToken}` } }
      const res = createMockRes()
      let nextCalled = false

      await authMiddleware(req, res, () => { nextCalled = true })

      assert.strictEqual(nextCalled, true)
      assert.ok(req.user)
      assert.strictEqual(req.user.id, 7)
      assert.strictEqual(req.user.nome, 'Dr. Lucas')
      assert.strictEqual(req.user.email, 'lucas@hospital.com')
      assert.strictEqual(req.user.role, Role.ADMIN)
    })
  })
})
