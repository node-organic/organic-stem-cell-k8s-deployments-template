#!/usr/bin/env node

const StackUpgrade = require('organic-stack-upgrade')
const path = require('path')
const {forEach} = require('p-iteration')

const execute = async function ({destDir = process.cwd(), answers} = {}) {
  let stack = new StackUpgrade({
    destDir: destDir,
    packagejson: path.join(__dirname, '/package.json')
  })
  if (!await stack.checkUpgrade('organic-stem-core-template', '^2.1.0')) {
    throw new Error('organic-stem-core-template ^2.1.0 not found, are you working into the repo root?')
  }
  let resulted_answers = answers || {}
  if (!resulted_answers['cell-name']) {
    resulted_answers['cell-name'] = await stack.ask('cell-name?')
  }
  let loadCellInfo = require(path.join(destDir, 'cells/node_modules/lib/load-cell-info'))
  let cellInfo = await loadCellInfo(resulted_answers['cell-name'])
  if (!cellInfo) throw new Error(resulted_answers['cell-name'] + ' should be recognizable organic cell')
  resulted_answers['cwd'] = cellInfo.dna.cwd
  resulted_answers['cdp'] = cellInfo.dnaBranchPath
    .replace(/\./g, path.sep)
    .replace(resulted_answers['cell-name'], '')
  let sourceDirs = [
    path.join(__dirname, 'seed-dna')
  ]
  if (resulted_answers['cwd']) {
    sourceDirs.push(path.join(__dirname, 'seed-cwd'))
  }
  resulted_answers = await stack.configure({
    sourceDirs: sourceDirs,
    answers: resulted_answers
  })
  await forEach(sourceDirs, async (sourceDir) => {
    await stack.merge({
      sourceDir: sourceDir,
      answers: resulted_answers
    })
  })
  await stack.updateJSON()
  let cellName = resulted_answers['cell-name']
  console.info(`run npm install on ${cellName}...`)
  await stack.exec(`npx angel repo cell ${cellName} -- npm install`)
}

if (module.parent) {
  module.exports = execute
} else {
  execute().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
