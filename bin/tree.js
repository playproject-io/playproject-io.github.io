#!/usr/bin/env node

const fs = require('fs').promises
const path = require('path')

const default_ignore_patterns = [
  '/node_modules',
  '.git'
]

function should_ignore (file_path, ignore_patterns) {
  const normalized_path = file_path.replace(/\\/g, '/')

  for (const pattern of ignore_patterns) {
    if (pattern.startsWith('/')) {
      const pattern_without_slash = pattern.slice(1)
      if (normalized_path === pattern_without_slash || normalized_path.startsWith(`${pattern_without_slash}/`)) {
        return true
      }
      continue
    }
    const regex_pattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')

    const regex = new RegExp(`^${regex_pattern}$|${regex_pattern}/|/${regex_pattern}$`)
    if (regex.test(normalized_path)) {
      return true
    }
  }
  return false
}

async function walk_directory (dir, ignore_patterns) {
  const files = []
  const root_dir = process.cwd()

  async function walk (current_path, relative_path = '') {
    const entries = await fs.readdir(current_path, { withFileTypes: true })

    for (const entry of entries) {
      const full_path = path.join(current_path, entry.name)
      const rel_path = path.join(relative_path, entry.name)
      const normalized_path = rel_path.replace(/\\/g, '/')

      if (should_ignore(normalized_path, ignore_patterns)) {
        continue
      }
      if (entry.isDirectory()) {
        await walk(full_path, rel_path)
      } else {
        files.push(normalized_path)
      }
    }
  }

  await walk(dir)
  return files
}

async function main () {
  const files = await walk_directory(process.cwd(), default_ignore_patterns)
  files.sort()
  await fs.writeFile(
    path.join(process.cwd(), 'index.json'),
    JSON.stringify(files, null, 2)
  )
  console.log('Successfully generated index.json')
}

main()
