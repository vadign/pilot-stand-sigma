import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const defaultArgs = ['-ksSL', '--connect-timeout', '20', '--max-time', '60', '-A', 'Mozilla/5.0 (compatible; SigmaLiveSync/1.0)']

export const curlFetchText = async (url: string, extraArgs: string[] = []): Promise<string> => {
  const { stdout } = await execFileAsync('curl', [...defaultArgs, ...extraArgs, url], {
    maxBuffer: 16 * 1024 * 1024,
  })

  return stdout
}

export const curlFetchJson = async <T>(url: string, extraArgs: string[] = []): Promise<T> => {
  const text = await curlFetchText(url, extraArgs)
  return JSON.parse(text) as T
}
