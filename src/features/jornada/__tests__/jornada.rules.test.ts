import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  calcularAtraso,
  calcularExtras,
  calcularNoturno,
  calcularMinutosTrabalhados
} from '../rules/jornada.rules.ts'

describe('Regras de Negócio de Jornada e Plantões (NeriCare)', () => {

  it('deve calcular corretamente os minutos trabalhados em uma jornada regular', () => {
    const inicio = new Date('2026-10-27T08:00:00Z')
    const fim = new Date('2026-10-27T17:00:00Z') // 9 horas = 540 minutos
    const minutos = calcularMinutosTrabalhados(inicio, fim)
    assert.strictEqual(minutos, 540)
  })

  it('deve calcular atraso quando o profissional inicia após o horário planejado', () => {
    const planejado = new Date('2026-10-27T08:00:00Z')
    const executado = new Date('2026-10-27T08:35:00Z') // 35 minutos de atraso
    const atraso = calcularAtraso(planejado, executado)
    assert.strictEqual(atraso, 35)
  })

  it('não deve apontar atraso quando o profissional chega adiantado ou no horário exato', () => {
    const planejado = new Date('2026-10-27T08:00:00Z')
    const executado = new Date('2026-10-27T07:45:00Z') // Chegou 15 min antes
    const atraso = calcularAtraso(planejado, executado)
    assert.strictEqual(atraso, 0)
  })

  it('deve calcular horas extras quando o plantão encerra após o horário planejado', () => {
    const planejado = new Date('2026-10-27T17:00:00Z')
    const executado = new Date('2026-10-27T18:45:00Z') // 1h45m = 105 minutos extras
    const extras = calcularExtras(planejado, executado)
    assert.strictEqual(extras, 105)
  })

  it('não deve apontar horas extras quando o profissional encerra antes do previsto', () => {
    const planejado = new Date('2026-10-27T17:00:00Z')
    const executado = new Date('2026-10-27T16:50:00Z')
    const extras = calcularExtras(planejado, executado)
    assert.strictEqual(extras, 0)
  })

  it('deve calcular minutos noturnos corretamente entre 22h e 05h', () => {
    // Plantão das 21:00 às 01:00
    // Período noturno (>= 22h): 22:00 às 01:00 = 3 horas = 180 minutos
    const inicio = new Date('2026-10-27T21:00:00')
    const fim = new Date('2026-10-28T01:00:00')
    const noturno = calcularNoturno(inicio, fim)
    assert.strictEqual(noturno, 180)
  })

  it('deve retornar 0 minutos noturnos para plantão integralmente diurno', () => {
    const inicio = new Date('2026-10-27T08:00:00')
    const fim = new Date('2026-10-27T18:00:00')
    const noturno = calcularNoturno(inicio, fim)
    assert.strictEqual(noturno, 0)
  })

  it('deve calcular período noturno completo em plantão de 12 horas que cruza a madrugada', () => {
    // Plantão das 19:00 às 07:00 do dia seguinte
    // Horário noturno: 22:00 até 05:00 = 7 horas = 420 minutos
    const inicio = new Date('2026-10-27T19:00:00')
    const fim = new Date('2026-10-28T07:00:00')
    const noturno = calcularNoturno(inicio, fim)
    assert.strictEqual(noturno, 420)
  })

})
