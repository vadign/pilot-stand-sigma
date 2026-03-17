import { normalizeText } from './normalize'
import type { AskSigmaIntent } from './types'
import { parseRoleCommand, stripSafetyWakeWord } from './voice/voiceRegex'

const navigationMap: Record<string, string> = {
  'открой сводку': '/briefing',
  'открой историю': '/history',
  'открой сценарии': '/scenarios',
  'открой регламенты': '/regulations',
  'открой цифровых заместителей': '/deputies',
  'открой инциденты': '/operations',
}

const districtRegex = /(советский|ленинский|центральный|кольцово|академгородок)/i

export const detectSpecialIntent = (input: string): AskSigmaIntent | null => {
  const normalized = normalizeText(stripSafetyWakeWord(input))

  const roleCommand = parseRoleCommand(input)
  if (roleCommand) {
    return {
      type: 'role_switch',
      role: roleCommand.role,
      district: roleCommand.district,
      confidence: 0.99,
    }
  }

  const navItem = Object.entries(navigationMap).find(([command]) => normalized.startsWith(command))
  if (navItem) {
    return {
      type: 'navigate',
      entity: 'dashboard',
      route: navItem[1],
      confidence: 0.95,
    }
  }

  if (/^(?:фокус|покажи|открой)\s+/i.test(normalized) && districtRegex.test(normalized)) {
    return {
      type: 'focus',
      district: normalized.match(districtRegex)?.[1],
      confidence: 0.8,
    }
  }

  return null
}
