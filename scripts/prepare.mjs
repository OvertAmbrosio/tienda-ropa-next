#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

function readEnvFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function ensureEnv() {
  const root = process.cwd()
  const envPath = path.join(root, '.env')
  const examplePath = path.join(root, '.env.example')

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath)
      console.log('Created .env from .env.example')
    } else {
      console.warn('No .env or .env.example found. Skipping env creation.')
    }
  }
}

function ensureDbFolder() {
  const root = process.cwd()
  // Prefer .env, fallback to .env.example
  let envContent = readEnvFile(path.join(root, '.env'))
  if (!envContent) envContent = readEnvFile(path.join(root, '.env.example'))

  const match = envContent.match(/DATABASE_URL\s*=\s*"?file:(.+?)"?\s*$/m)
  if (!match) {
    console.warn('DATABASE_URL not found. Skipping db folder ensure.')
    return
  }
  const dbRelative = match[1].trim()
  const dbPath = path.join(root, dbRelative)
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`Created db directory: ${dir}`)
  }
}

function main() {
  ensureEnv()
  ensureDbFolder()
}

main()
