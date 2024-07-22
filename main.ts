import Commands from "@hackbg/cmds"
import EventEmitter from 'node:events'

export default class UndexerCommands extends Commands {
  // see https://github.com/hackbg/fadroma/blob/v2/packages/namada/namada.ts
  // for examples how to define commands

  constructor (...args) {
    super(...args)
    this.log.label = ''
  }

  sync = this.command({
    name: "sync",
    info: "create database"
  }, async () => {
    this.log.br().log('Creating database...')
    const { default: db } = await import('./src/db.js')
    await db.sync()
    this.log.br().log('Done.')
  })

  syncForce = this.command({
    name: "sync drop",
    info: "UNSAFE: delete and re-create database with latest schema"
  }, async () => {
    this.log.br().log('Recreating database...')
    const { default: db } = await import('./src/db.js')
    await db.sync({ force: true })
    this.log.br().log('Done.')
  })

  syncAlter = this.command({
    name: "sync alter",
    info: "UNSAFE: alter database to latest schema"
  }, async () => {
    this.log.br().log('Altering database...')
    const { default: db } = await import('./src/db.js')
    await db.sync({ alter: true })
    this.log.br().log('Done.')
  })

  api = this.command({
    name: "api",
    info: "run the API server"
  }, () => import('./bin/api.js'))

  indexer = this.command({
    name: "index",
    info: "run the indexer"
  }, () => import('./bin/indexer.js'))

  block = this.command({
    name: 'block',
    info: 'fetch, print, and index a block of transactions',
    args: 'HEIGHT'
  }, async (height: number) => {
    const t0 = performance.now()
    const { updateBlock } = await import('./src/block.js')
    const { default: getRPC } = await import('./src/rpc.js')
    const chain = await getRPC(height)
    // Fetch and decode block
    const block = await chain.fetchBlock({ height })
    height ??= block.height
    // Print block and transactions
    this.log.br().log(block)
    for (const transaction of block.transactions) {
      this.log.br().log(transaction)
    }
    // Write block to database
    this.log.br().log('Syncing database...')
    const { default: db } = await import('./src/db.js')
    await db.sync()
    this.log.br().log('Saving block', height, 'to database...').br()
    await updateBlock({ chain, height, block, })
    this.log.info('Done in', performance.now() - t0, 'msec')
  })

  validatorsFetch = this.command({
    name: 'validators fetch',
    info: 'fetch current info about validators'
  }, async () => {
    const { default: getRPC } = await import('./src/rpc.js')
    const chain = await getRPC()
    console.log(Object.values(await chain.fetchValidators()))
  })

  validatorsUpdate = this.command({
    name: 'validators update',
    info: 'fetch validators and update in db'
  }, async () => {
    const { default: getRPC } = await import('./src/rpc.js')
    const chain = await getRPC()
    const { updateValidators } = await import('./src/validator.js')
    const validators = await updateValidators(chain)
    for (const i in validators) {
      console.log(`#${Number(i)+1}:`, validators[i])
    }
  })

  validatorsStates = this.command({
    name: 'validators states',
    info: 'count validators in database by state'
  }, async (height: number) => {
    const { callRoute, dbValidatorStates } = await import('./src/routes.js')
    const states = await callRoute(dbValidatorStates)
    console.log({states})
  })

  validatorsQuery = this.command({
    name: 'validators query',
    info: 'query validators from db'
  }, async (height: number) => {
    const { validatorsTop } = await import('./src/query.js')
    const validators = (await validatorsTop()).map(x=>x.toJSON());
    console.log(validators)
    const { routes } = await import('./src/routes.js')
    const dbValidatorByHash = Object.fromEntries(routes)['/validator']
    for (const { publicKey } of validators) {
      console.log(await new Promise((resolve, reject)=>dbValidatorByHash(
        { query: { publicKey, uptime: 100 } },
        { status: code => ({
            send: (data) => (code===200)
              ? resolve(data)
              : reject(Object.assign(new Error(`route returned ${code}`), data))
          }) } )))
    }
  })

  queries = this.command({
    name: 'queries',
    info: 'test all db queries',
  }, async () => {
    for (const [name, item] of Object.entries(await import('./src/query.js'))) {
      if (typeof item === 'function') {
        this.log.br().log(name)
        this.log(await item())
      }
    }
  })

  parameters = this.command({
    name: 'parameters',
    info: 'fetch chain parameters'
  }, async () => {
    const { default: getRPC } = await import('./src/rpc.js')
    const chain      = await getRPC()
    const parameters = await chain.fetchProtocolParameters()
    console.log({parameters})
  })

  proposal = this.command({
    name: 'proposal fetch',
    args: 'ID',
    info: 'fetch proposal from chain'
  }, (id: string) =>
    import('./src/rpc.js')
      .then(({ default: getRPC })=>getRPC())
      .then(chain=>chain.fetchProposalInfo(id))
      .then(({ id, proposal, votes, result })=>this.log
        .log(proposal)
        .log(votes)
        .log(result)))

}
